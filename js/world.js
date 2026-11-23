/**
 * Le monde : ciel crépusculaire étoilé, lune, lac, îles low-poly, décor et lucioles.
 *
 * Choix « iGPU friendly » :
 *  - aucune ombre dynamique, aucune texture image (tout est procédural) ;
 *  - un seul plan d'eau avec un shader léger (reflet de lune + halos des lanternes) ;
 *  - décor répétitif (arbres, rochers, nénuphars) en InstancedMesh = 1 draw call par type ;
 *  - étoiles et lucioles animées dans le vertex shader (zéro coût CPU).
 */
import * as THREE from 'three';
import { CHAPTERS, WORLD } from './config.js';
import { mulberry32, ringRadius, routeSegments, distToSegment } from './layout.js';
import { makeGlowTexture, makeMoonTexture, fillInstances } from './utils.js';

export const MAX_WATER_GLOWS = 8;

const MOON_DIR = new THREE.Vector3(0.5, 0.36, -0.79).normalize();
const DUSK_DIR = new THREE.Vector3(-0.8, 0, -0.6).normalize();

export class World {
  constructor(scene, { lanternPositions = [] } = {}) {
    this.scene = scene;
    this.colliders = [];          // cercles {x, z, r} que la barque ne traverse pas
    this.lanternPositions = lanternPositions;
    this.rand = mulberry32(WORLD.seed);
    this.glowTex = makeGlowTexture();
    this.animated = [];           // petites animations de décor (phare…)

    scene.fog = new THREE.FogExp2(new THREE.Color('#29274d'), 0.0088);
    this._buildSky();
    this._buildLights();
    this._buildWater();
    this._buildIslands();
    this._buildScatter();
    this._buildFireflies();
  }

  /* ─────────────────────────── CIEL ─────────────────────────── */
  _buildSky() {
    this.skyGroup = new THREE.Group();
    this.scene.add(this.skyGroup);

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: true, // on n'applique pas le brouillard, mais on récupère fogColor pour fondre l'horizon
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uZenith: { value: new THREE.Color('#050817') },
          uMid: { value: new THREE.Color('#1a1a42') },
          uDusk: { value: new THREE.Color('#ff8f6b') },
          uDuskDir: { value: DUSK_DIR },
          uFinale: { value: 0 },
        },
      ]),
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uDusk; uniform vec3 uDuskDir;
        uniform float uFinale;
        uniform vec3 fogColor;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(uMid, uZenith, pow(h, 0.6));
          vec3 horiz = normalize(vec3(d.x, 0.0, d.z) + 1e-5);
          float dusk = pow(max(dot(horiz, uDuskDir), 0.0), 3.0) * (1.0 - smoothstep(0.0, 0.32, h));
          col += uDusk * dusk * (0.55 + uFinale * 0.6);
          col += vec3(0.25, 0.18, 0.05) * uFinale * (1.0 - h) * 0.25;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
          float hz = 1.0 - smoothstep(0.0, 0.14, d.y);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, hz);
        }`,
    });
    this.skyMat = skyMat;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 12), skyMat);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    this.skyGroup.add(sky);

    // Étoiles : un seul draw call, scintillement dans le shader
    const N = 1400;
    const pos = new Float32Array(N * 3);
    const phase = new Float32Array(N);
    const size = new Float32Array(N);
    const r = mulberry32(WORLD.seed + 11);
    for (let i = 0; i < N; i++) {
      const u = r() * Math.PI * 2;
      const y = 0.06 + Math.pow(r(), 0.8) * 0.94; // hémisphère supérieur
      const rad = Math.sqrt(1 - y * y);
      pos.set([Math.cos(u) * rad * 480, y * 480, Math.sin(u) * rad * 480], i * 3);
      phase[i] = r() * 100;
      size[i] = r() < 0.06 ? 2.6 + r() * 1.5 : 1.0 + r() * 1.3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uBoost: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aPhase; attribute float aSize;
        uniform float uTime; uniform float uPixelRatio; uniform float uBoost;
        varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.65 + 0.35 * sin(uTime * (0.6 + fract(aPhase) * 1.8) + aPhase);
          vA = tw * smoothstep(0.0, 60.0, position.y);
          gl_PointSize = aSize * (1.0 + uBoost * 0.6) * uPixelRatio * 1.6;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          gl_FragColor = vec4(vec3(0.92, 0.94, 1.0) * a, a);
        }`,
    });
    const stars = new THREE.Points(g, this.starMat);
    stars.renderOrder = -9;
    stars.frustumCulled = false;
    this.skyGroup.add(stars);

    // Lune
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeMoonTexture(), fog: false, depthWrite: false, transparent: true,
    }));
    moon.position.copy(MOON_DIR).multiplyScalar(440);
    moon.scale.setScalar(110);
    moon.renderOrder = -8;
    this.skyGroup.add(moon);
  }

  /* ─────────────────────────── LUMIÈRES ─────────────────────────── */
  _buildLights() {
    // Lumière d'ambiance ciel/sol : très bon marché, pas d'ombre.
    this.hemi = new THREE.HemisphereLight('#8a90d8', '#231c33', 1.25);
    this.scene.add(this.hemi);
    // Clair de lune : une seule directionnelle, SANS ombre.
    const moonLight = new THREE.DirectionalLight('#c7d0ff', 1.1);
    moonLight.position.copy(MOON_DIR).multiplyScalar(100);
    this.scene.add(moonLight);
  }

  /* ─────────────────────────── EAU ─────────────────────────── */
  _buildWater() {
    const glows = Array.from({ length: MAX_WATER_GLOWS }, () => new THREE.Vector3(0, 0, 0));
    this.waterUniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color('#070b1e') },
        uSky: { value: new THREE.Color('#2b2a5c') },
        uMoon: { value: new THREE.Color('#fff2d6') },
        uWarm: { value: new THREE.Color('#ffae5c') },
        // direction « artistique » plus basse que la vraie lune : le chemin de lune
        // se forme vers l'horizon (et non juste devant la barque)
        uMoonDir: { value: new THREE.Vector3(MOON_DIR.x, 0.05, MOON_DIR.z).normalize() },
        uBoat: { value: new THREE.Vector3(0, 0, 1) },
        uGlows: { value: glows },
      },
    ]);
    // merge() clone les valeurs : on garde la référence au tableau réellement utilisé
    this.waterGlows = this.waterUniforms.uGlows.value;

    const mat = new THREE.ShaderMaterial({
      fog: true,
      uniforms: this.waterUniforms,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uDeep; uniform vec3 uSky; uniform vec3 uMoon; uniform vec3 uWarm; uniform vec3 uMoonDir;
        uniform vec3 uBoat;
        uniform vec3 uGlows[${MAX_WATER_GLOWS}];
        varying vec3 vWorld;
        #include <fog_pars_fragment>

        float ripple(vec2 p, float t) {
          return sin(p.x * 0.42 + t * 0.9) * sin(p.y * 0.37 - t * 0.7)
               + 0.5 * sin((p.x + p.y) * 0.83 + t * 1.6)
               + 0.25 * sin((p.x * 1.7 - p.y * 1.3) + t * 2.3);
        }

        void main() {
          vec2 p = vWorld.xz;
          float t = uTime;
          float r = ripple(p, t);
          vec3 toCam = cameraPosition - vWorld;
          float dist = length(toCam);
          vec3 V = toCam / dist;

          // ciel reflété aux angles rasants (pseudo-Fresnel)
          float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
          vec3 col = mix(uDeep, uSky, fres * 0.85);

          // chemin de lune scintillant
          vec3 R = normalize(vec3(-V.x + r * 0.045, V.y, -V.z + r * 0.03));
          float md = max(dot(R, uMoonDir), 0.0);
          float shimmer = smoothstep(0.5, 1.6, r + 0.6);
          col += uMoon * (pow(md, 500.0) * 1.2 + pow(md, 70.0) * shimmer * 0.22);

          // petites crêtes argentées
          col += uSky * smoothstep(1.25, 1.7, r) * 0.25;

          // halo chaud de la lanterne de la barque (centré sous la proue)
          vec2 bd = p - uBoat.xy;
          col += uWarm * uBoat.z * exp(-dot(bd, bd) * 0.07) * (0.75 + 0.25 * r) * 0.5;

          // reflets des lanternes : tache + traînée vers la caméra
          for (int i = 0; i < ${MAX_WATER_GLOWS}; i++) {
            vec3 g = uGlows[i];
            if (g.z <= 0.001) continue;
            vec2 d = p - g.xy;
            vec2 c2l = normalize(g.xy - cameraPosition.xz + 1e-4);
            float along = dot(d, c2l);
            float across = d.x * c2l.y - d.y * c2l.x;
            float streak = exp(-across * across * 1.6) * exp(-max(-along, 0.0) * 0.12 - max(along, 0.0) * 2.0);
            streak *= 0.6 + 0.4 * sin(along * 2.6 + t * 2.0 + r);
            col += uWarm * g.z * (exp(-dot(d, d) * 0.15) * 0.6 + streak * 0.55);
          }

          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    const geo = new THREE.PlaneGeometry(1100, 1100, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(geo, mat);
    this.water.frustumCulled = false;
    this.water.name = 'water';
    this.scene.add(this.water);
  }

  /* ─────────────────────────── ÎLES ─────────────────────────── */
  _islandGeometry(radius, height, rand, palette) {
    const geo = new THREE.IcosahedronGeometry(1, radius > 8 ? 3 : 2); // non indexée
    const pos = geo.attributes.position;
    const s1 = rand() * 10, s2 = rand() * 10;
    const noise = (x, y, z) =>
      Math.sin(x * 3.1 + s1) * Math.sin(z * 2.7 + s2) * 0.5 +
      Math.sin((x + z) * 5.3 + y * 2.1 + s2) * 0.25 +
      Math.sin(y * 4.0 + x * 1.3 + s1) * 0.2;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = noise(x, y, z); // fonction de la position → sommets partagés déplacés identiquement
      const k = 1 + n * 0.2;
      x *= k; z *= k; y *= k;
      y = y > 0 ? y * (height / radius) * (1 + n * 0.35) : y * 0.22;
      pos.setXYZ(i, x * radius, y * radius, z * radius);
    }
    // Couleur par face (look low-poly) selon la hauteur du centre de la face
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let f = 0; f < pos.count; f += 3) {
      const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
      const h = cy / height;
      if (cy < 0.6) c.copy(palette.sand);
      else if (h < 0.5) c.copy(palette.grass);
      else if (h < 0.82) c.copy(palette.grass2);
      else c.copy(palette.rock);
      c.offsetHSL(0, 0, (rand() - 0.5) * 0.035);
      for (let v = 0; v < 3; v++) colors.set([c.r, c.g, c.b], (f + v) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }

  _buildIslands() {
    const rand = this.rand;
    const islandMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const palette = {
      sand: new THREE.Color('#9a8a6e'),
      grass: new THREE.Color('#355a44'),
      grass2: new THREE.Color('#2b4a3c'),
      rock: new THREE.Color('#6a6676'),
    };
    this.trees = [];
    this.islands = [];

    const addIsland = (x, z, radius, height, treeCount) => {
      const mesh = new THREE.Mesh(this._islandGeometry(radius, height, rand, palette), islandMat);
      mesh.position.set(x, -0.35, z);
      mesh.rotation.y = rand() * Math.PI * 2;
      this.scene.add(mesh);
      this.colliders.push({ x, z, r: radius * 1.12 });
      this.islands.push({ x, z, radius, height });
      for (let i = 0; i < treeCount; i++) {
        const a = rand() * Math.PI * 2;
        const q = 0.2 + rand() * 0.55;
        const s = 0.6 + rand() * 0.7;
        const y = height * Math.sqrt(Math.max(0, 1 - q * q)) - 0.9;
        this.trees.push({ x: x + Math.sin(a) * q * radius, y, z: z + Math.cos(a) * q * radius, s, ry: rand() * 6 });
      }
      return mesh;
    };

    // Les 5 îles-chapitres
    CHAPTERS.forEach((ch) => {
      const h = ch.radius * 0.42;
      addIsland(ch.center.x, ch.center.z, ch.radius, h, 12 + Math.floor(rand() * 6));
      this._landmark(ch, h * 0.93);
    });

    // Îlots décoratifs, à l'écart du parcours et des lanternes
    const segs = routeSegments();
    let tries = 0, placed = 0;
    while (placed < 10 && tries++ < 400) {
      const a = rand() * Math.PI * 2;
      const d = 30 + rand() * (WORLD.lakeRadius - 40);
      const p = { x: WORLD.lakeCenter.x + Math.sin(a) * d, z: WORLD.lakeCenter.z + Math.cos(a) * d };
      const r = 3 + rand() * 4;
      if (!this._isFree(p, r + 14, segs, 14 + r)) continue;
      addIsland(p.x, p.z, r, r * (0.4 + rand() * 0.3), 1 + Math.floor(rand() * 3));
      placed++;
    }

    // Arbres : deux étages de cônes, 2 InstancedMesh pour toutes les îles
    const coneGeo = new THREE.ConeGeometry(1, 2.6, 6);
    coneGeo.translate(0, 1.3, 0);
    const treeMat = new THREE.MeshLambertMaterial({ color: '#1f3a2e', flatShading: true });
    const low = new THREE.InstancedMesh(coneGeo, treeMat, this.trees.length);
    const top = new THREE.InstancedMesh(coneGeo, treeMat, this.trees.length);
    fillInstances(low, this.trees);
    fillInstances(top, this.trees.map((t) => ({ ...t, y: t.y + t.s * 1.3, s: t.s * 0.7 })));
    this.scene.add(low, top);
  }

  /** Vérifie qu'un point est loin des îles-chapitres, du parcours et des lanternes. */
  _isFree(p, islandMargin, segs, routeMargin) {
    for (const ch of CHAPTERS) {
      if (Math.hypot(p.x - ch.center.x, p.z - ch.center.z) < ringRadius(ch) + islandMargin) return false;
    }
    for (const c of this.colliders) if (Math.hypot(p.x - c.x, p.z - c.z) < c.r + islandMargin * 0.5) return false;
    if (segs) for (const s of segs) if (distToSegment(p, s.a, s.b) < routeMargin) return false;
    if (Math.hypot(p.x - WORLD.start.x, p.z - WORLD.start.z) < 18) return false;
    return true;
  }

  /** Un petit élément unique au sommet de chaque île (repère visuel du chapitre). */
  _landmark(ch, topY) {
    const g = new THREE.Group();
    g.position.set(ch.center.x, topY - 0.6, ch.center.z);
    const stone = new THREE.MeshLambertMaterial({ color: '#8b8796', flatShading: true });
    const wood = new THREE.MeshLambertMaterial({ color: '#5a4030', flatShading: true });
    const warm = new THREE.MeshBasicMaterial({ color: '#ffc27a' });
    const glow = (scale, color = '#ffb36b', opacity = 0.8) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTex, color, blending: THREE.AdditiveBlending, transparent: true,
        depthWrite: false, opacity, fog: false,
      }));
      s.scale.setScalar(scale);
      return s;
    };

    switch (ch.landmark) {
      case 'tree': { // le grand arbre de l'enfance
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 3, 6), wood);
        trunk.position.y = 1.5;
        g.add(trunk);
        const leaves = new THREE.MeshLambertMaterial({ color: '#2f5a3f', flatShading: true });
        [[0, 3.4, 0, 2.6], [1.3, 4.1, 0.4, 1.7], [-1.1, 4.3, -0.5, 1.8], [0.2, 5.2, 0.2, 1.6]].forEach(([x, y, z, s]) => {
          const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leaves);
          b.position.set(x, y, z);
          g.add(b);
        });
        break;
      }
      case 'lighthouse': { // un phare dont le faisceau tourne doucement
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 4.5, 8), new THREE.MeshLambertMaterial({ color: '#d9d4cc', flatShading: true }));
        base.position.y = 2.25;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.05, 0.8, 8), new THREE.MeshLambertMaterial({ color: '#a8484a', flatShading: true }));
        band.position.y = 2.6;
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 8), warm);
        lamp.position.y = 4.9;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.9, 8), stone);
        roof.position.y = 5.75;
        const l = glow(7);
        l.position.y = 4.9;
        const beamGeo = new THREE.ConeGeometry(2.2, 22, 12, 1, true);
        beamGeo.translate(0, -11, 0);
        beamGeo.rotateZ(Math.PI / 2);
        const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
          color: '#ffe2a8', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending,
          depthWrite: false, side: THREE.DoubleSide,
        }));
        const pivot = new THREE.Group();
        pivot.position.y = 4.9;
        pivot.add(beam);
        g.add(base, band, lamp, roof, l, pivot);
        this.animated.push((t) => { pivot.rotation.y = t * 0.35; });
        break;
      }
      case 'house': { // la maison familiale, fenêtres allumées
        const walls = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.6), new THREE.MeshLambertMaterial({ color: '#cdb9a0', flatShading: true }));
        walls.position.y = 1.1;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.7, 4), new THREE.MeshLambertMaterial({ color: '#7a3e3a', flatShading: true }));
        roof.position.y = 3.05;
        roof.rotation.y = Math.PI / 4;
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), stone);
        chimney.position.set(0.8, 3.4, 0.3);
        g.add(walls, roof, chimney);
        [[-0.75, 1.2, 1.31], [0.75, 1.2, 1.31], [0, 1.2, -1.31]].forEach(([x, y, z]) => {
          const w = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), warm);
          w.position.set(x, y, z);
          if (z < 0) w.rotation.y = Math.PI;
          g.add(w);
        });
        const l = glow(6, '#ffb36b', 0.45);
        l.position.set(0, 1.2, 1.6);
        g.add(l);
        break;
      }
      case 'arch': { // une arche de pierre : les chemins de la vie
        const arch = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.42, 5, 12, Math.PI), stone);
        arch.position.y = 0.2;
        const l = glow(3, '#c9b8ff', 0.7);
        l.position.y = 2.6;
        g.add(arch, l);
        this.animated.push((t) => { l.material.opacity = 0.5 + 0.25 * Math.sin(t * 1.3); });
        break;
      }
      case 'stele': { // une stèle qui attend la 55e lumière
        const st = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.2, 0.6), stone);
        st.position.y = 2.1;
        const top = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({ color: '#bfefff' }));
        top.position.y = 4.9;
        const l = glow(5, '#9fe3ff', 0.7);
        l.position.y = 4.9;
        g.add(st, top, l);
        this.animated.push((t) => { top.rotation.y = t * 0.6; top.position.y = 4.9 + Math.sin(t) * 0.15; });
        break;
      }
    }
    this.scene.add(g);
  }

  /* ─────────────────── ROCHERS & NÉNUPHARS ─────────────────── */
  _buildScatter() {
    const rand = this.rand;
    const nearLantern = (x, z, m) => this.lanternPositions.some((p) => Math.hypot(p.x - x, p.z - z) < m);

    // Rochers au pied des îles + quelques-uns en pleine eau
    const rocks = [];
    for (const isl of this.islands) {
      const n = Math.round(isl.radius * 0.5);
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2;
        const d = isl.radius * (1.0 + rand() * 0.25);
        const x = isl.x + Math.sin(a) * d, z = isl.z + Math.cos(a) * d;
        if (nearLantern(x, z, 4)) continue;
        const s = 0.5 + rand() * 1.1;
        rocks.push({ x, y: -0.1, z, s, sy: s * (0.6 + rand() * 0.6), rx: rand(), ry: rand() * 6 });
      }
    }
    const segs = routeSegments();
    for (let i = 0, tries = 0; i < 26 && tries < 500; tries++) {
      const a = rand() * Math.PI * 2;
      const d = 20 + rand() * WORLD.lakeRadius;
      const x = WORLD.lakeCenter.x + Math.sin(a) * d, z = WORLD.lakeCenter.z + Math.cos(a) * d;
      if (!this._isFree({ x, z }, 4, segs, 7)) continue;
      const s = 0.8 + rand() * 1.6;
      rocks.push({ x, y: -0.2, z, s, sy: s * 0.8, rx: rand(), ry: rand() * 6 });
      if (s > 1.4) this.colliders.push({ x, z, r: s * 1.1 });
      i++;
    }
    const rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshLambertMaterial({ color: '#4d4a58', flatShading: true }),
      rocks.length,
    );
    fillInstances(rockMesh, rocks);
    this.scene.add(rockMesh);

    // Nénuphars en grappes + quelques fleurs de lotus
    const pads = [];
    const flowers = [];
    const cluster = (cx, cz, n, spread) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * spread, z = cz + (rand() - 0.5) * spread;
        if (nearLantern(x, z, 2.5)) continue;
        if (this.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r * 0.9)) continue;
        const s = 0.45 + rand() * 0.55;
        pads.push({ x, y: 0.03 + rand() * 0.01, z, s, ry: rand() * 6 });
        if (rand() < 0.18) flowers.push({ x, y: 0.05, z, s: s * 0.9, ry: rand() * 6 });
      }
    };
    for (const isl of this.islands) {
      const k = isl.radius > 8 ? 3 : 1;
      for (let j = 0; j < k; j++) {
        const a = rand() * Math.PI * 2;
        const d = isl.radius * 1.25 + 2;
        cluster(isl.x + Math.sin(a) * d, isl.z + Math.cos(a) * d, 9, 7);
      }
    }
    // une grappe près du départ, pour la première impression
    cluster(WORLD.start.x - 7, WORLD.start.z - 6, 10, 6);
    cluster(WORLD.start.x + 8, WORLD.start.z - 12, 8, 5);

    const padGeo = new THREE.CircleGeometry(1, 9, 0.35, Math.PI * 2 - 0.35); // petite encoche
    padGeo.rotateX(-Math.PI / 2);
    const padMesh = new THREE.InstancedMesh(padGeo, new THREE.MeshLambertMaterial({ color: '#2c5a3e', side: THREE.DoubleSide }), pads.length);
    fillInstances(padMesh, pads);
    const flowerGeo = new THREE.ConeGeometry(0.22, 0.28, 5, 1, true);
    flowerGeo.rotateX(Math.PI);
    flowerGeo.translate(0, 0.14, 0);
    const flowerMesh = new THREE.InstancedMesh(flowerGeo, new THREE.MeshLambertMaterial({ color: '#f4b8cc', emissive: '#4a2030', side: THREE.DoubleSide }), Math.max(1, flowers.length));
    fillInstances(flowerMesh, flowers);
    this.scene.add(padMesh, flowerMesh);
  }

  /* ─────────────────────────── LUCIOLES ─────────────────────────── */
  _buildFireflies() {
    const rand = this.rand;
    const pts = [];
    for (const isl of this.islands) {
      const n = isl.radius > 8 ? 38 : 6;
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2;
        const d = isl.radius * (0.6 + rand() * 0.9);
        pts.push(isl.x + Math.sin(a) * d, 0.8 + rand() * 4, isl.z + Math.cos(a) * d);
      }
    }
    const N = pts.length / 3;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(Float32Array.from({ length: N }, () => rand()), 1));
    this.fireflyMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color('#d8ff9a') } },
      vertexShader: /* glsl */ `
        attribute float aPhase; uniform float uTime; uniform float uPixelRatio;
        varying float vA;
        void main() {
          vec3 p = position;
          float ph = aPhase * 6.2831;
          p.x += sin(uTime * 0.35 + ph * 3.0) * 1.2;
          p.y += sin(uTime * 0.6 + ph * 5.0) * 0.5;
          p.z += cos(uTime * 0.3 + ph * 2.0) * 1.2;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = pow(0.5 + 0.5 * sin(uTime * 1.7 + ph * 9.0), 2.0);
          gl_PointSize = 9.0 * uPixelRatio * (12.0 / max(-mv.z, 1.0));
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          gl_FragColor = vec4(uColor * a, a);
        }`,
    });
    const ff = new THREE.Points(g, this.fireflyMat);
    this.scene.add(ff);
  }

  setPixelRatio(pr) {
    this.starMat.uniforms.uPixelRatio.value = pr;
    this.fireflyMat.uniforms.uPixelRatio.value = pr;
  }

  /**
   * @param {number} t temps écoulé (s)
   * @param {THREE.Vector3} camPos position caméra (le ciel la suit)
   * @param {THREE.Vector3} boatPos
   * @param {{x,z,i}[]} glows reflets des lanternes (max MAX_WATER_GLOWS)
   */
  update(t, camPos, boatPos, boatLight, glows) {
    this.skyGroup.position.copy(camPos);
    this.starMat.uniforms.uTime.value = t;
    this.fireflyMat.uniforms.uTime.value = t;
    const u = this.waterUniforms;
    u.uTime.value = t;
    u.uBoat.value.set(boatPos.x, boatPos.z, boatLight);
    this.water.position.set(boatPos.x, 0, boatPos.z); // le plan suit la barque, les vagues restent en coord. monde
    for (let i = 0; i < MAX_WATER_GLOWS; i++) {
      const g = glows[i];
      if (g) this.waterGlows[i].set(g.x, g.z, g.i);
      else this.waterGlows[i].set(0, 0, 0);
    }
    for (const fn of this.animated) fn(t);
  }
}

/**
 * Les 55 lanternes flottantes.
 *
 * Cycle de vie d'une lanterne :
 *   idle      → éteinte, posée sur son flotteur, petite lueur qui « respire » (repère de loin)
 *   igniting  → la flamme naît (≈1 s)
 *   rising    → elle s'élève lentement dans le ciel en dérivant au vent (≈16 s)
 *   sky       → elle flotte parmi les étoiles
 *   formation → (finale) elle rejoint sa place dans le grand « 55 » céleste
 *
 * Perf : géométries et matériaux partagés ; AUCUNE PointLight par lanterne
 * (la lueur = un sprite additif + un reflet calculé dans le shader de l'eau).
 */
import * as THREE from 'three';
import { makeLanternGeometry, easeInOut, easeOut } from './utils.js';
import { mulberry32 } from './layout.js';

const RISE_DURATION = 16;

export class LanternField {
  constructor(scene, memories, glowTex) {
    this.scene = scene;
    const rand = mulberry32(5555);
    this.shared = {
      floatGeo: new THREE.CylinderGeometry(0.62, 0.72, 0.18, 8),
      floatMat: new THREE.MeshLambertMaterial({ color: '#5b4231', flatShading: true }),
      bodyGeo: makeLanternGeometry(1.05),
      unlitMat: new THREE.MeshLambertMaterial({ color: '#6d5a4c', emissive: '#1c120a', flatShading: true }),
      litMat: new THREE.MeshBasicMaterial({ color: '#ffc685' }),
      capGeo: new THREE.CylinderGeometry(0.18, 0.26, 0.09, 8),
      capMat: new THREE.MeshLambertMaterial({ color: '#3a2a20' }),
      flameGeo: new THREE.SphereGeometry(0.13, 6, 4),
      flameMat: new THREE.MeshBasicMaterial({ color: '#fff4c8' }),
      pickGeo: new THREE.SphereGeometry(1.7, 6, 4),
      pickMat: new THREE.MeshBasicMaterial(),
    };
    this.glowTex = glowTex;
    this.items = memories.map((m, i) => this._create(m, i, rand));
    this.pickables = this.items.map((it) => it.pick);
  }

  _create(memory, index, rand) {
    const s = this.shared;
    const root = new THREE.Group();
    root.position.set(memory.position.x, 0, memory.position.z);

    const float = new THREE.Mesh(s.floatGeo, s.floatMat);
    float.position.y = 0.05;
    const lift = new THREE.Group();
    lift.position.y = 0.16;
    const body = new THREE.Mesh(s.bodyGeo, s.unlitMat);
    const cap = new THREE.Mesh(s.capGeo, s.capMat);
    cap.position.y = 0.98;
    const flame = new THREE.Mesh(s.flameGeo, s.flameMat);
    flame.position.y = 0.38;
    flame.visible = false;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color: '#ffb36b', blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, opacity: 0.2, fog: false,
    }));
    glow.position.y = 0.5;
    glow.scale.setScalar(2.4);
    const pick = new THREE.Mesh(s.pickGeo, s.pickMat);
    pick.visible = false; // invisible mais « cliquable » (le raycaster ignore la visibilité)
    pick.position.y = 0.6;
    lift.add(body, cap, flame, glow, pick);
    root.add(float, lift);
    this.scene.add(root);

    const item = {
      index,
      memory,
      root, float, lift, body, flame, glow, pick,
      state: 'idle',
      lit: false,
      phase: rand() * Math.PI * 2,
      skyHeight: 20 + rand() * 22,
      wind: new THREE.Vector2(rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(4 + rand() * 6),
      timer: 0,
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      delay: 0,
      worldPos: new THREE.Vector3(),
    };
    pick.userData.item = item;
    return item;
  }

  get litCount() {
    return this.items.reduce((n, it) => n + (it.lit ? 1 : 0), 0);
  }

  /** Allume une lanterne (avec animation). */
  ignite(item) {
    if (item.lit) return;
    item.lit = true;
    item.state = 'igniting';
    item.timer = 0;
    item.body.material = this.shared.litMat;
    item.flame.visible = true;
    item.flame.scale.setScalar(0.01);
  }

  /** Lanterne déjà allumée lors d'une partie précédente : directement dans le ciel. */
  setLitInstant(item) {
    item.lit = true;
    item.state = 'sky';
    item.body.material = this.shared.litMat;
    item.flame.visible = true;
    item.flame.scale.setScalar(1);
    item.lift.position.set(item.wind.x, item.skyHeight, item.wind.y);
    item.glow.scale.setScalar(6);
    item.glow.material.opacity = 0.9;
  }

  /** Remet une lanterne à zéro (bouton « Recommencer »). */
  reset(item) {
    item.lit = false;
    item.state = 'idle';
    item.body.material = this.shared.unlitMat;
    item.flame.visible = false;
    item.lift.position.set(0, 0.16, 0);
    item.lift.rotation.set(0, 0, 0);
    item.glow.scale.setScalar(2.4);
  }

  nearestUnlit(pos) {
    let best = null, bestD = Infinity;
    for (const it of this.items) {
      if (it.lit) continue;
      const d = Math.hypot(it.root.position.x - pos.x, it.root.position.z - pos.z);
      if (d < bestD) { bestD = d; best = it; }
    }
    return { item: best, dist: bestD };
  }

  /** Position monde actuelle de la lanterne (utile pour la caméra « focus »). */
  worldPosition(item) {
    return item.worldPos.copy(item.lift.position).add(item.root.position).add({ x: 0, y: 0.5, z: 0 });
  }

  /**
   * Reflets pour le shader de l'eau : les N lanternes proches de la surface
   * les plus proches de la caméra → [{x, z, i}].
   */
  waterGlows(camPos, max, t) {
    const list = [];
    for (const it of this.items) {
      let w = 0;
      const h = it.lift.position.y;
      if (it.state === 'idle') w = 0.32 + 0.08 * Math.sin(t * 1.6 + it.phase);
      else if (it.state === 'igniting') w = 0.4 + it.timer * 0.9;
      else if (it.state === 'rising') w = 1.3 * Math.exp(-h / 9);
      if (w < 0.02) continue;
      const x = it.root.position.x + it.lift.position.x;
      const z = it.root.position.z + it.lift.position.z;
      list.push({ x, z, i: w, d: (x - camPos.x) ** 2 + (z - camPos.z) ** 2 });
    }
    list.sort((a, b) => a.d - b.d);
    return list.slice(0, max);
  }

  /** Finale : chaque lanterne rejoint un point du grand « 55 » dans le ciel. */
  startFormation(targets) {
    this.items.forEach((it, i) => {
      it.state = 'formation';
      it.timer = 0;
      it.delay = (i % 28) * 0.07 + Math.random() * 0.6;
      it.from.copy(it.lift.position);
      it.to.copy(targets[i]).sub(it.root.position);
    });
  }

  update(dt, t) {
    for (const it of this.items) {
      const { lift, glow, flame } = it;
      switch (it.state) {
        case 'idle': {
          lift.position.y = 0.16 + Math.sin(t * 1.2 + it.phase) * 0.05;
          it.float.position.y = 0.05 + Math.sin(t * 1.2 + it.phase) * 0.05;
          lift.rotation.z = Math.sin(t * 0.8 + it.phase) * 0.04;
          glow.material.opacity = 0.24 + 0.12 * Math.sin(t * 1.6 + it.phase);
          break;
        }
        case 'igniting': {
          it.timer += dt;
          const k = Math.min(1, it.timer / 1.1);
          flame.scale.setScalar(0.01 + easeOut(k));
          glow.material.opacity = 0.2 + 0.75 * k;
          glow.scale.setScalar(2.4 + Math.sin(k * Math.PI) * 6 + k * 2.6); // petit éclat puis halo stable
          if (k >= 1) { it.state = 'rising'; it.timer = 0; }
          break;
        }
        case 'rising': {
          it.timer += dt;
          const u = Math.min(1, it.timer / RISE_DURATION);
          const e = easeInOut(u);
          lift.position.set(it.wind.x * e, 0.16 + it.skyHeight * e, it.wind.y * e);
          lift.rotation.z = Math.sin(t * 1.1 + it.phase) * 0.09;
          lift.rotation.x = Math.sin(t * 0.9 + it.phase) * 0.06;
          glow.scale.setScalar(5 + u * 1);
          glow.material.opacity = 0.9 + Math.sin(t * 9 + it.phase) * 0.05;
          flame.scale.setScalar(0.9 + Math.sin(t * 15 + it.phase) * 0.1);
          if (u >= 1) it.state = 'sky';
          break;
        }
        case 'sky': {
          lift.position.y = it.skyHeight + Math.sin(t * 0.4 + it.phase) * 0.6;
          lift.rotation.z = Math.sin(t * 0.7 + it.phase) * 0.06;
          glow.material.opacity = 0.8 + Math.sin(t * 2.3 + it.phase) * 0.1;
          break;
        }
        case 'formation': {
          it.timer += dt;
          const u = Math.min(1, Math.max(0, (it.timer - it.delay) / 7));
          const e = easeInOut(u);
          lift.position.lerpVectors(it.from, it.to, e);
          lift.position.y += Math.sin(e * Math.PI) * 6;
          glow.scale.setScalar(6 + Math.sin(e * Math.PI) * 3 + (u >= 1 ? Math.sin(t * 2 + it.phase) * 0.6 : 0));
          glow.material.opacity = 0.95;
          if (u >= 1) lift.position.y = it.to.y + Math.sin(t * 0.8 + it.phase) * 0.25;
          break;
        }
      }
    }
  }
}

/** Polyligne d'un « 5 » dans une boîte 1 × 2 (x vers la droite, y vers le haut). */
const FIVE = [[1, 2], [0.08, 2], [0, 1.12], [0.45, 1.24], [0.82, 1.1], [1, 0.74], [0.97, 0.34], [0.72, 0.06], [0.36, 0], [0.04, 0.16]];

function samplePolyline(pts, n) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(l);
    total += l;
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    let d = (k / (n - 1)) * total;
    let i = 0;
    while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
    const t = Math.min(1, d / segs[i]);
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
  }
  return out;
}

/**
 * 55 points dessinant « 55 » dans le ciel.
 * @param {THREE.Vector3} center centre du dessin
 * @param {THREE.Vector3} right  vecteur horizontal « droite » vu de la caméra
 * @param {number} scale hauteur d'un chiffre = 2 × scale
 */
export function digitTargets(center, right, scale = 9) {
  const a = samplePolyline(FIVE, 28).map(([x, y]) => [x - 1.35, y]);
  const b = samplePolyline(FIVE, 27).map(([x, y]) => [x + 0.35, y]);
  return [...a, ...b].map(([x, y]) =>
    new THREE.Vector3().copy(center).addScaledVector(right, x * scale).add(new THREE.Vector3(0, (y - 1) * scale, 0)),
  );
}

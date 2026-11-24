/**
 * La barque : modèle low-poly, lanterne de proue (la SEULE lumière dynamique du jeu),
 * Papa qui rame (avatar 3D), physique douce, pilote automatique (clic sur l'eau) et sillage.
 *
 * Convention : heading = 0 → la barque regarde vers +z ; direction = (sin h, cos h).
 */
import * as THREE from 'three';
import { WORLD } from './config.js';
import { clamp, damp, angleDiff, makeLanternGeometry } from './utils.js';
import { Avatar3D } from './avatar.js';

const MAX_SPEED = 10;
const ACCEL = 7.5;
const REVERSE = 3.5;
const TURN_RATE = 1.5;

export class Boat {
  constructor(scene, glowTex) {
    this.scene = scene;
    this.position = new THREE.Vector3(WORLD.start.x, 0, WORLD.start.z);
    this.heading = WORLD.start.heading;
    this.speed = 0;
    this.steerSmooth = 0;
    this.target = null;          // pilote automatique : {x, z, stopAt}
    this.lightLevel = 1;
    this.rowPhase = 0;
    this.rowing = 0;
    this.lookUp = 0;             // Papa lève les yeux (lanterne qui s'envole)
    this.avatarFree = false;     // true : l'avatar est piloté ailleurs (intro : chute depuis le ciel)

    this.group = new THREE.Group();
    this._buildModel(glowTex);
    scene.add(this.group);
    this._buildWake();
  }

  _buildModel(glowTex) {
    const wood = new THREE.MeshLambertMaterial({ color: '#7a5236', flatShading: true, side: THREE.DoubleSide });
    const dark = new THREE.MeshLambertMaterial({ color: '#4a3020', flatShading: true });

    // Coque : demi-sphère étirée et effilée (forme de canoë)
    const hullGeo = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const hp = hullGeo.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const z = hp.getZ(i);
      hp.setX(i, hp.getX(i) * (1 - 0.6 * z * z)); // proue et poupe effilées
      hp.setY(i, hp.getY(i) + 0.3 * z * z);       // extrémités relevées
    }
    hullGeo.computeVertexNormals();
    const hull = new THREE.Mesh(hullGeo, wood);
    hull.scale.set(0.9, 0.55, 2.2);
    hull.position.y = 0.32;
    // Plancher
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 14), dark);
    floor.rotation.x = -Math.PI / 2;
    floor.scale.set(0.72, 1.85, 1);
    floor.position.y = 0.12;
    // Bancs : Papa est assis sur celui de devant, face à l'arrière (comme un rameur)
    const seatGeo = new THREE.BoxGeometry(1.5, 0.08, 0.32);
    const seat1 = new THREE.Mesh(seatGeo, wood); seat1.position.set(0, 0.26, -0.75);
    const seat2 = new THREE.Mesh(seatGeo, wood); seat2.position.set(0, 0.26, 0.6); seat2.scale.x = 0.9;

    // Rames : pivot sur le plat-bord, poignée côté intérieur (là où Papa pose les mains)
    const oarMat = dark;
    const shaftGeo = new THREE.BoxGeometry(2.3, 0.05, 0.05);
    shaftGeo.translate(2.3 / 2 - 0.58, 0, 0); // 0.58 de manche à l'intérieur
    const bladeGeo = new THREE.BoxGeometry(0.5, 0.02, 0.17);
    bladeGeo.translate(2.3 - 0.58 - 0.2, 0, 0);
    this.oars = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.76, 0.42, 0.25);
      const arm = new THREE.Group();     // l'axe x local pointe vers l'extérieur
      arm.scale.x = s;                   // miroir pour le côté gauche
      const shaft = new THREE.Mesh(shaftGeo, oarMat);
      const blade = new THREE.Mesh(bladeGeo, oarMat);
      const handle = new THREE.Object3D();
      handle.position.set(-0.58, 0, 0);
      arm.add(shaft, blade, handle);
      pivot.add(arm);
      return { s, pivot, handle, world: new THREE.Vector3() };
    });

    // Perche de proue
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.9, 5), dark);
    pole.position.set(0, 1.1, 1.75);
    pole.rotation.x = 0.35;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.55), dark);
    arm.position.set(0, 1.98, 2.15);

    // Lanterne de proue (MeshBasic = « émissive » gratuite) + halo + PointLight unique
    this.lanternPivot = new THREE.Group();
    this.lanternPivot.position.set(0, 1.95, 2.4);
    const body = new THREE.Mesh(makeLanternGeometry(0.42), new THREE.MeshBasicMaterial({ color: '#ffcf8f' }));
    body.position.y = -0.45;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: '#ffb066', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85,
    }));
    halo.scale.setScalar(2.6);
    halo.position.y = -0.27;
    this.halo = halo;
    this.lanternPivot.add(body, halo);

    this.light = new THREE.PointLight('#ffad5e', 26, 26, 1.6);
    this.light.position.set(0, 1.7, 2.4);

    // Papa : assis sur le banc avant, tourné vers l'arrière (donc vers la caméra)
    this.avatar = new Avatar3D();
    this.avatar.group.position.set(0, 0.3, 0.6);
    this.avatar.group.rotation.y = Math.PI;

    this.model = new THREE.Group();
    this.model.add(hull, floor, seat1, seat2, pole, arm, this.lanternPivot, this.light, this.avatar.group, ...this.oars.map((o) => o.pivot));
    this.group.add(this.model);
  }

  /** Sillage : un petit pool d'anneaux qui s'élargissent et s'effacent (réutilisés). */
  _buildWake() {
    const geo = new THREE.RingGeometry(0.85, 1, 24);
    geo.rotateX(-Math.PI / 2);
    this.wake = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: '#a9b8ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      m.visible = false;
      m.userData.life = 0;
      this.scene.add(m);
      this.wake.push(m);
    }
    this.wakeTimer = 0;
    this.wakeIndex = 0;
  }

  get forward() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  /** Petite impulsion (anneaux-guides). */
  boost(amount = 5) {
    this.speed = Math.min(this.speed + amount, MAX_SPEED * 1.7);
  }

  /** Papa lève les bras de joie (lanterne allumée). */
  celebrate() { this.avatar.celebrate(); }

  /** Pilote automatique vers un point. stopAt = distance d'arrêt. */
  sailTo(x, z, stopAt = 2.5) {
    this.target = { x, z, stopAt };
    this._stuck = 0;
    this._stuckFrom = null;
  }

  cancelAutopilot() { this.target = null; }

  teleport(x, z, heading) {
    this.position.set(x, 0, z);
    this.heading = heading ?? this.heading;
    this.speed = 0;
    this.target = null;
  }

  /**
   * @param {number} dt
   * @param {{throttle:number, steer:number}} input  valeurs -1..1 (clavier)
   * @param {{x,z,r}[]} colliders
   * @param {boolean} frozen  barque à l'arrêt (carte souvenir ouverte…)
   */
  update(dt, t, input, colliders, frozen = false) {
    let throttle = frozen ? 0 : input.throttle;
    let steer = frozen ? 0 : input.steer;

    // Le clavier reprend toujours la main sur le pilote automatique
    if (throttle !== 0 || steer !== 0) this.target = null;

    // Pilote automatique bloqué contre une île ? on abandonne après 3 s sans progrès
    if (this.target && !frozen) {
      this._stuck = (this._stuck || 0) + dt;
      if (!this._stuckFrom) this._stuckFrom = this.position.clone();
      if (this._stuck > 3) {
        if (this.position.distanceTo(this._stuckFrom) < 1.5) this.target = null;
        this._stuck = 0;
        this._stuckFrom.copy(this.position);
      }
    }

    if (this.target && !frozen) {
      const dx = this.target.x - this.position.x;
      const dz = this.target.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      const diff = angleDiff(this.heading, Math.atan2(dx, dz));
      steer = clamp(-diff * 2.2, -1, 1); // steer > 0 = tourner à droite = heading diminue
      const facing = Math.cos(diff);
      const stop = this.target.stopAt;
      if (dist <= stop + 0.6) {
        this.target = null;            // arrivé : la traînée de l'eau finit d'arrêter la barque
        throttle = 0;
      } else if (dist < stop + Math.max(0, this.speed) * 0.9 && this.speed > 2) {
        throttle = -0.5;               // on freine à l'approche
      } else {
        throttle = clamp((dist - stop) / 6, 0.3, 1) * Math.max(0.25, facing);
      }
    }

    // Accélération / frein / traînée
    if (throttle > 0 && this.speed < MAX_SPEED) this.speed += throttle * ACCEL * dt;
    else if (throttle < 0) this.speed += throttle * (this.speed > 0 ? ACCEL * 1.3 : REVERSE) * dt;
    this.speed *= Math.exp(-dt * (throttle === 0 ? 0.9 : 0.3));
    // l'élan d'un anneau-guide retombe doucement vers la vitesse de croisière
    if (this.speed > MAX_SPEED) this.speed = MAX_SPEED + (this.speed - MAX_SPEED) * Math.exp(-dt * 1.2);
    this.speed = clamp(this.speed, -MAX_SPEED * 0.4, MAX_SPEED * 1.7);
    if (Math.abs(this.speed) < 0.01) this.speed = 0;

    // Rotation : possible à l'arrêt (lentement), plus vive en mouvement
    this.steerSmooth += (steer - this.steerSmooth) * damp(6, dt);
    const speedFactor = 0.45 + 0.55 * clamp(Math.abs(this.speed) / 4, 0, 1);
    const dir = this.speed < -0.2 ? -1 : 1;
    this.heading -= this.steerSmooth * TURN_RATE * speedFactor * dir * dt;

    // Déplacement
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;

    // Collisions douces avec les îles et gros rochers (on glisse le long du bord)
    for (const c of colliders) {
      const dx = this.position.x - c.x, dz = this.position.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + 1.3;
      if (d < min && d > 0.001) {
        this.position.x = c.x + (dx / d) * min;
        this.position.z = c.z + (dz / d) * min;
        this.speed *= 0.92;
      }
    }
    // Bord du lac : un courant doux ramène vers le centre
    const lx = this.position.x - WORLD.lakeCenter.x, lz = this.position.z - WORLD.lakeCenter.z;
    const ld = Math.hypot(lx, lz);
    if (ld > WORLD.lakeRadius) {
      const push = (ld - WORLD.lakeRadius) * 2 * dt;
      this.position.x -= (lx / ld) * push;
      this.position.z -= (lz / ld) * push;
      this.speed *= 0.97;
    }

    // Animation : roulis, tangage, flottaison
    this.group.position.set(this.position.x, Math.sin(t * 1.3) * 0.06 - 0.05, this.position.z);
    this.group.rotation.y = this.heading;
    const roll = Math.sin(t * 0.9) * 0.035 + this.steerSmooth * clamp(this.speed / MAX_SPEED, -1, 1) * 0.09;
    const pitch = Math.sin(t * 1.1 + 1) * 0.02 - clamp(this.speed / MAX_SPEED, -1, 1.5) * 0.035;
    this.model.rotation.z = roll;
    this.model.rotation.x = pitch;
    // La lanterne se balance
    this.lanternPivot.rotation.x = Math.sin(t * 1.7) * 0.12 + this.speed * 0.012;
    this.lanternPivot.rotation.z = Math.sin(t * 1.3 + 2) * 0.08;
    // Flamme vivante
    const flick = 0.92 + Math.sin(t * 13) * 0.03 + Math.sin(t * 7.3) * 0.04;
    this.light.intensity = 26 * flick * this.lightLevel;
    this.halo.material.opacity = 0.75 * flick;

    this._updateOars(dt, roll, pitch, t);
    this._updateWake(dt);
  }

  /** Les rames suivent la vitesse ; l'avatar a les mains sur les poignées. */
  _updateOars(dt, roll, pitch, t) {
    const target = clamp(Math.abs(this.speed) / 5, 0, 1);
    this.rowing += (target - this.rowing) * damp(3, dt);
    this.rowPhase += dt * (2.2 + Math.abs(this.speed) * 0.25) * this.rowing * (this.speed < 0 ? -1 : 1);
    const sweep = Math.sin(this.rowPhase) * 0.55 * this.rowing;
    const dip = -0.22 + Math.cos(this.rowPhase) * 0.12 * this.rowing; // pale dans l'eau pendant la poussée
    for (const o of this.oars) {
      o.pivot.rotation.y = o.s * sweep;
      o.pivot.rotation.z = o.s * dip;
    }
    this.model.updateMatrixWorld(true);
    if (this.avatarFree) return;
    const hands = this.oars.map((o) => o.handle.getWorldPosition(o.world));
    // l'avatar est tourné de 180° : sa main gauche tient la rame de droite (+x) et inversement
    this.avatar.update(dt, t, {
      handsWorld: [hands[1], hands[0]],
      rowPhase: this.rowPhase,
      rowing: this.rowing,
      roll, pitch,
      lookUp: this.lookUp,
    });
  }

  _updateWake(dt) {
    const s = Math.abs(this.speed);
    this.wakeTimer -= dt;
    if (s > 1.5 && this.wakeTimer <= 0) {
      this.wakeTimer = 0.32 - Math.min(0.18, s * 0.015);
      const m = this.wake[this.wakeIndex++ % this.wake.length];
      const back = this.speed > 0 ? -1.6 : 1.6;
      m.position.set(this.position.x + Math.sin(this.heading) * back, 0.04, this.position.z + Math.cos(this.heading) * back);
      m.userData.life = 1;
      m.userData.strength = Math.min(1, s / MAX_SPEED);
      m.visible = true;
    }
    for (const m of this.wake) {
      if (!m.visible) continue;
      m.userData.life -= dt / 2.2;
      if (m.userData.life <= 0) { m.visible = false; continue; }
      const k = 1 - m.userData.life;
      m.scale.setScalar(0.9 + k * 3.2);
      m.material.opacity = m.userData.life * 0.22 * m.userData.strength;
    }
  }
}

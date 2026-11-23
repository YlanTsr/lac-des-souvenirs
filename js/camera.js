/**
 * Caméra cinématique :
 *  - suit la barque avec un amortissement exponentiel (indépendant du framerate) ;
 *  - glisser à la souris / au doigt = regarder autour ; après 2,5 s sans toucher,
 *    la caméra revient doucement derrière la barque (le suivi n'est jamais cassé) ;
 *  - molette = zoom ; un « clic court » (sans glisser) est transmis au jeu (onTap) ;
 *  - mode « focus » (regarder une lanterne qui s'élève) et mode « cinematic » (finale).
 */
import * as THREE from 'three';
import { clamp, damp } from './utils.js';

export class CameraRig {
  constructor(camera, dom, { onTap } = {}) {
    this.camera = camera;
    this.dom = dom;
    this.onTap = onTap;
    this.distance = 12;
    this.basePitch = 0.3;
    this.userYaw = 0;
    this.userPitch = 0;
    this.lastInteract = -Infinity;
    this.focus = null;        // THREE.Vector3 à regarder (optionnel)
    this.cinematic = null;    // { pos: Vector3, look: Vector3, speed }
    this.enabled = true;
    this.lookAt = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._drag = null;
    this._bind();
  }

  _bind() {
    const el = this.dom;
    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled || (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2)) return;
      this._drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, t: performance.now() };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      const d = this._drag;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      d.x = e.clientX; d.y = e.clientY;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) d.moved = true;
      if (d.moved) {
        this.userYaw -= dx * 0.005;
        this.userPitch = clamp(this.userPitch + dy * 0.004, -0.25, 0.9);
        this.lastInteract = performance.now();
        el.classList.add('dragging');
      }
    });
    const end = (e) => {
      const d = this._drag;
      if (!d || d.id !== e.pointerId) return;
      this._drag = null;
      el.classList.remove('dragging');
      if (!d.moved && performance.now() - d.t < 500 && this.onTap) this.onTap(e.clientX, e.clientY);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', (e) => { this._drag = null; el.classList.remove('dragging'); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.distance = clamp(this.distance + Math.sign(e.deltaY) * 1.2, 6, 26);
    }, { passive: false });
  }

  /** Recentre immédiatement (après une téléportation). */
  snap(boat) {
    this.userYaw = 0;
    this.userPitch = 0;
    this._computeFollow(boat);
    this.camera.position.copy(this._desired);
    this.lookAt.copy(this._look);
    this.camera.lookAt(this.lookAt);
  }

  _computeFollow(boat) {
    const p = boat.position;
    const angle = boat.heading + Math.PI + this.userYaw;
    const pitch = clamp(this.basePitch + this.userPitch, 0.05, 1.2);
    const dist = this.distance + Math.abs(boat.speed) * 0.25 + (this.focus ? 4 : 0);
    const hd = dist * Math.cos(pitch);
    this._desired.set(p.x + Math.sin(angle) * hd, 1.2 + dist * Math.sin(pitch) + (this.focus ? 1.5 : 0), p.z + Math.cos(angle) * hd);
    this._look.set(p.x + Math.sin(boat.heading) * 2.5, 1.4, p.z + Math.cos(boat.heading) * 2.5);
    if (this.focus) {
      // on suit la lanterne qui monte, sans jamais perdre complètement l'horizon
      const f = this._tmp ??= new THREE.Vector3();
      f.copy(this.focus);
      f.y = Math.min(f.y, 13);
      this._look.lerp(f, 0.65);
    }
  }

  update(dt, boat) {
    const now = performance.now();
    const idle = !this._drag && now - this.lastInteract > 2500;
    if (idle) {
      // retour en douceur derrière la barque
      this.userYaw *= Math.exp(-dt * 0.9);
      this.userPitch *= Math.exp(-dt * 0.9);
    }

    let lambdaPos = 3, lambdaLook = 4;
    if (this.cinematic) {
      this._desired.copy(this.cinematic.pos);
      this._look.copy(this.cinematic.look);
      lambdaPos = lambdaLook = this.cinematic.speed ?? 0.8;
    } else {
      this._computeFollow(boat);
      if (this.focus) { lambdaPos = 1.6; lambdaLook = 1.8; }
    }

    this.camera.position.lerp(this._desired, damp(lambdaPos, dt));
    if (this.camera.position.y < 0.8) this.camera.position.y = 0.8; // jamais sous l'eau
    this.lookAt.lerp(this._look, damp(lambdaLook, dt));
    this.camera.lookAt(this.lookAt);

    // Légère ouverture du champ de vision avec la vitesse (sensation de glisse)
    const fov = 55 + clamp(Math.abs(boat.speed) - 6, 0, 10) * 0.6;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * damp(2, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  /** Yaw horizontal de la caméra (pour orienter la boussole). */
  get yaw() {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    return Math.atan2(d.x, d.z);
  }
}

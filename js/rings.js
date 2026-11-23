/**
 * Anneaux-guides lumineux : posés entre les îles, ils indiquent le chemin
 * vers le prochain chapitre. Passer dedans donne une petite impulsion
 * et joue une note (les notes montent d'un anneau à l'autre).
 *
 * Seuls les anneaux qui mènent au chapitre « en cours » brillent vraiment,
 * avec une lumière qui court d'un anneau au suivant ; les autres restent discrets.
 */
import * as THREE from 'three';
import { computeGuideRings } from './layout.js';

export class GuideRings {
  constructor(scene, glowTex) {
    this.rings = computeGuideRings().map((r) => {
      const mat = new THREE.MeshBasicMaterial({
        color: '#9fe3ff', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.geo ??= new THREE.TorusGeometry(2.5, 0.09, 6, 32), mat);
      mesh.position.set(r.x, 1.5, r.z);
      mesh.rotation.y = r.heading;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: '#9fe3ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.15, fog: false,
      }));
      glow.scale.setScalar(5);
      mesh.add(glow);
      scene.add(mesh);
      return {
        ...r,
        mesh, mat, glow,
        dir: new THREE.Vector2(Math.sin(r.heading), Math.cos(r.heading)),
        lastSide: null,
        flash: 0,
        cooldown: 0,
      };
    });
  }

  /**
   * @param {number} activeSegment index du segment menant au prochain chapitre incomplet (-1 = aucun)
   * @returns {object|null} anneau traversé pendant cette frame
   */
  update(dt, t, boatPos, activeSegment) {
    let crossed = null;
    for (const r of this.rings) {
      const dx = boatPos.x - r.x, dz = boatPos.z - r.z;
      const along = dx * r.dir.x + dz * r.dir.y;
      const across = Math.abs(dx * r.dir.y - dz * r.dir.x);
      const side = along >= 0;
      r.cooldown = Math.max(0, r.cooldown - dt);
      // traversée = changement de côté du plan de l'anneau, près de son centre
      if (r.lastSide !== null && side !== r.lastSide && across < 2.6 && Math.abs(along) < 3 && r.cooldown === 0) {
        r.flash = 1;
        r.cooldown = 2;
        crossed = r;
      }
      r.lastSide = side;

      const active = r.segment === activeSegment;
      // lumière « qui court » le long des anneaux actifs
      const chase = active ? Math.pow(0.5 + 0.5 * Math.sin(t * 2.2 - r.order * 1.1), 3) : 0;
      r.flash = Math.max(0, r.flash - dt * 1.2);
      const base = active ? 0.45 + chase * 0.45 : activeSegment === -1 ? 0.22 : 0.1;
      r.mat.opacity = Math.min(1, base + r.flash);
      r.glow.material.opacity = (active ? 0.12 + chase * 0.25 : 0.04) + r.flash * 0.6;
      const s = 1 + r.flash * 0.25 + chase * 0.04;
      r.mesh.scale.setScalar(s);
      r.mesh.position.y = 1.5 + Math.sin(t * 0.8 + r.order) * 0.12;
      r.mesh.rotation.z = t * 0.15 + r.order;
    }
    return crossed;
  }
}

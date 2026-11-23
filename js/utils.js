/**
 * Petites fonctions partagées : maths, textures procédurales, géométrie de lanterne.
 * Toutes les textures sont dessinées dans un <canvas> minuscule : aucun fichier à charger.
 */
import * as THREE from 'three';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Facteur de lissage indépendant du framerate (amortissement exponentiel). */
export const damp = (lambda, dt) => 1 - Math.exp(-lambda * dt);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
/** Plus petite différence d'angle (-PI..PI). */
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Halo radial doux (sprites de lueur, lucioles…). */
export function makeGlowTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Disque lunaire avec halo. */
export function makeMoonTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const h = size / 2;
  const halo = g.createRadialGradient(h, h, size * 0.12, h, h, h);
  halo.addColorStop(0, 'rgba(255,244,220,0.55)');
  halo.addColorStop(0.35, 'rgba(200,200,255,0.12)');
  halo.addColorStop(1, 'rgba(200,200,255,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, size, size);
  const disc = g.createRadialGradient(h - 4, h - 4, 2, h, h, size * 0.16);
  disc.addColorStop(0, '#fffaf0');
  disc.addColorStop(1, '#f1e6cf');
  g.fillStyle = disc;
  g.beginPath();
  g.arc(h, h, size * 0.15, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Profil de lanterne en papier (tournée autour de l'axe Y). Hauteur ≈ 0.9. */
export function makeLanternGeometry(scale = 1) {
  const pts = [
    [0.0, 0.0], [0.26, 0.02], [0.4, 0.18], [0.46, 0.45], [0.4, 0.72], [0.26, 0.88], [0.0, 0.9],
  ].map(([r, y]) => new THREE.Vector2(r * scale, y * scale));
  const geo = new THREE.LatheGeometry(pts, 10);
  geo.computeVertexNormals();
  return geo;
}

/** Remplit une InstancedMesh à partir d'une liste {x,y,z,s,ry,sx?,sy?,sz?}. */
export function fillInstances(mesh, list) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  list.forEach((it, i) => {
    e.set(it.rx || 0, it.ry || 0, it.rz || 0);
    q.setFromEuler(e);
    p.set(it.x, it.y, it.z);
    s.set(it.sx ?? it.s, it.sy ?? it.s, it.sz ?? it.s);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.count = list.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

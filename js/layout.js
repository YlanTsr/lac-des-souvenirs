/**
 * Placement déterministe des lanternes et des anneaux-guides.
 * Ce module n'importe pas Three.js : il est aussi utilisé par
 * tools/generate-memories.mjs (Node) pour écrire data/memories.json.
 */
import { CHAPTERS, LANTERN_RING_OFFSET, WORLD, TOTAL_LANTERNS } from './config.js';

/** Petit générateur pseudo-aléatoire reproductible (même graine = même lac). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Répartit `total` lanternes entre les chapitres (55 / 5 = 11). */
export function lanternsPerChapter(total = TOTAL_LANTERNS, n = CHAPTERS.length) {
  const base = Math.floor(total / n);
  const extra = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Chapitre (1..5) d'une lanterne d'index 0..54. */
export function chapterForIndex(index) {
  const counts = lanternsPerChapter();
  let acc = 0;
  for (let c = 0; c < counts.length; c++) {
    acc += counts[c];
    if (index < acc) return c + 1;
  }
  return counts.length;
}

export const ringRadius = (ch) => ch.radius + LANTERN_RING_OFFSET;

/**
 * Positions (x, z) des 55 lanternes : un cercle autour de chaque île,
 * la 1re lanterne du chapitre est placée du côté par lequel on arrive,
 * puis on fait le tour de l'île (sens alterné d'une île à l'autre).
 */
export function computeLanternPositions() {
  const counts = lanternsPerChapter();
  const rand = mulberry32(WORLD.seed * 7 + 3);
  const out = [];
  let prev = WORLD.start;
  CHAPTERS.forEach((ch, ci) => {
    const n = counts[ci];
    const r = ringRadius(ch);
    // angle (convention sin/cos : x = sin(a), z = cos(a)) pointant vers l'arrivée
    const startAngle = Math.atan2(prev.x - ch.center.x, prev.z - ch.center.z);
    const dir = ci % 2 === 0 ? 1 : -1;
    for (let k = 0; k < n; k++) {
      const a = startAngle + dir * k * ((Math.PI * 2) / n) + (rand() - 0.5) * 0.12;
      const rr = r + (rand() - 0.5) * 3;
      out.push({
        chapter: ch.id,
        x: Math.round((ch.center.x + Math.sin(a) * rr) * 10) / 10,
        z: Math.round((ch.center.z + Math.cos(a) * rr) * 10) / 10,
      });
    }
    prev = ch.center;
  });
  return out;
}

/**
 * Segments du parcours (départ → île 1 → île 2 …) et anneaux-guides
 * posés sur chaque segment. Segment i mène au chapitre i+1.
 */
export function computeGuideRings() {
  const rings = [];
  let from = { x: WORLD.start.x, z: WORLD.start.z, r: 0 };
  CHAPTERS.forEach((ch, si) => {
    const dx = ch.center.x - from.x;
    const dz = ch.center.z - from.z;
    const len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    const a = { x: from.x + ux * (from.r + 6), z: from.z + uz * (from.r + 6) };
    const b = { x: ch.center.x - ux * (ringRadius(ch) + 6), z: ch.center.z - uz * (ringRadius(ch) + 6) };
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const count = Math.max(1, Math.min(4, Math.round(segLen / 15)));
    for (let k = 0; k < count; k++) {
      const t = (k + 1) / (count + 1);
      const side = Math.sin(t * Math.PI) * 3.5 * (si % 2 ? 1 : -1);
      rings.push({
        segment: si,
        order: k,
        count,
        x: a.x + (b.x - a.x) * t + -uz * side,
        z: a.z + (b.z - a.z) * t + ux * side,
        heading: Math.atan2(ux, uz),
      });
    }
    from = { x: ch.center.x, z: ch.center.z, r: ringRadius(ch) };
  });
  return rings;
}

/** Segments bruts du parcours (pour éviter d'y poser des rochers). */
export function routeSegments() {
  const segs = [];
  let from = WORLD.start;
  for (const ch of CHAPTERS) {
    segs.push({ a: { x: from.x, z: from.z }, b: { x: ch.center.x, z: ch.center.z } });
    from = ch.center;
  }
  return segs;
}

export function distToSegment(p, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z;
  const wx = p.x - a.x, wz = p.z - a.z;
  const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(p.x - (a.x + vx * t), p.z - (a.z + vz * t));
}

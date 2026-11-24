// Robot : éclaire calmement la forme inconnue la plus proche (vitesse ≈ flèches du clavier),
// puis la grande silhouette quand toutes les autres sont reconnues. Petit temps de réaction entre deux cibles.
export default function bot(s, t) {
  const c = (s._c ??= { x: 480, y: 270, wait: 0, last: null });
  const left = s.monsters.filter((m) => !m.done);
  let tgt;
  if (left.length) {
    left.sort((a, b) => Math.hypot(a.cx - c.x, a.cy - c.y) - Math.hypot(b.cx - c.x, b.cy - c.y));
    tgt = { x: left[0].cx, y: left[0].cy, key: left[0].key };
  } else tgt = { x: s.pjx, y: s.pjy, key: 'pj' };
  if (tgt.key !== c.last) { c.last = tgt.key; c.wait = 0.25 + Math.random() * 0.2; }
  if (c.wait > 0) { c.wait -= 1 / 60; return { pointer: { x: c.x, y: c.y, down: false } }; }
  const d = Math.hypot(tgt.x - c.x, tgt.y - c.y), step = 8.5;
  if (d > step) { c.x += ((tgt.x - c.x) / d) * step; c.y += ((tgt.y - c.y) / d) * step; } else { c.x = tgt.x; c.y = tgt.y; }
  return { pointer: { x: c.x, y: c.y, down: false } };
}

// Robot : clique les bonbons de la bonne couleur (~3 clics/s) et maintient « Cacher » quand un enfant arrive.
export default function bot(s, t) {
  if (!s) return {};
  const k = s.kid;
  if (k && (k.phase === 'up' || (k.phase === 'warn' && k.k > 0.6))) return { pointer: { x: 680, y: 502, down: true } };
  const phase = Math.floor(t / 0.16) % 2;
  const i = s.cells.findIndex((c) => c.c === s.target && c.drop <= 0.3);
  if (i < 0) return { pointer: { x: 480, y: 250, down: false } };
  const x = 485 - 3 * 60 + i * 60;
  return { pointer: { x, y: 250, down: phase === 1 } };
}

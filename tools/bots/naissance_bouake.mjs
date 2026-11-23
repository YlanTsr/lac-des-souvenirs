// Robot : vise l'étoile/lanterne atteignable la plus basse, en s'écartant des moustiques proches.
export default function bot(s) {
  if (!s) return {};
  let best = null;
  for (const it of s.items) {
    if (it.kind === 'bug' || it.y > 440) continue;
    const tt = (440 - it.y) / it.vy;
    if (Math.abs(it.x + it.vx * tt - s.x) > tt * 560 + 40) continue;
    if (!best || it.y > best.y) best = it;
  }
  let x = best ? best.x + best.vx * Math.min(0.3, (440 - best.y) / best.vy) : s.x;
  for (const b of s.items) if (b.kind === 'bug' && !b.out && b.y > 330 && b.y < 460 && Math.abs(b.x - x) < 60) x += b.x < x ? 90 : -90;
  return { pointer: { x, y: 300, down: false } };
}

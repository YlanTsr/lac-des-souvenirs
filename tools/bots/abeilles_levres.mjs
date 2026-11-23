// Robot : va vers le pot le plus proche en s'écartant des abeilles trop proches (≈ joueur attentif).
export default function bot(s) {
  if (!s) return {};
  const R = 27, hx = s.x, hy = s.y - 4.95 * R;
  const jar = s.jars.slice().sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
  let vx = 0, vy = 0;
  if (jar) { const dx = jar.x - s.x, dy = jar.y - s.y, d = Math.hypot(dx, dy) || 1; vx = dx / d; vy = dy / d; }
  for (const b of s.bees) {
    if (b.state !== 'fly' && b.state !== 'home') continue;
    for (const py of [hy, s.y - 3 * R]) {
      const dx = hx - b.x, dy = py - b.y, d = Math.hypot(dx, dy) || 1;
      if (d < 85) { const k = (85 - d) / 85 * 2.2; vx += (dx / d) * k; vy += (dy / d) * k; }
    }
  }
  return { left: vx < -0.3, right: vx > 0.3, up: vy < -0.3, down: vy > 0.3 };
}

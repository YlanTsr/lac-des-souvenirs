// Robot : suit à la souris la truite la plus proche de son sommet (avec un temps de réaction) et lance quand il est dessus.
let x = 480, y = 330, last = -1;
export default function bot(s, t) {
  if (t < 0.02) { x = 480; y = 330; last = -1; }
  const f = s.fish.filter((q) => q.state === 'jump' && q.t > 0.3).sort((a, b) => Math.abs(a.vy) - Math.abs(b.vy))[0];
  let press = false;
  if (f) {
    const tx = f.x, ty = f.y - 12 * f.k;
    x += (tx - x) * 0.12; y += (ty - y) * 0.12;
    if (Math.hypot(tx - x, ty - y) < 18 && s.reload === 0 && t - last > 0.25) { press = true; last = t; }
  }
  return { pointer: { x, y, down: press } };
}

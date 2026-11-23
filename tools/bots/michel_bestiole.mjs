// Robot : suit la bestiole avec la main (vitesse limitée, léger retard) et tape quand elle est dessous.
let x = 700, y = 450, last = 0, hist = [], down = false;
export default function bot(s, t) {
  if (!s) return {};
  if (t < last) { x = 700; y = 450; hist = []; }
  const dt = Math.max(0, t - last); last = t;
  hist.push({ t, x: s.bx, y: s.by });
  while (hist.length > 1 && hist[0].t < t - 0.12) hist.shift();
  const tx = hist[0].x, ty = hist[0].y;
  const d = Math.hypot(tx - x, ty - y), step = 650 * dt;
  if (d > step) { x += ((tx - x) / d) * step; y += ((ty - y) / d) * step; } else { x = tx; y = ty; }
  const want = s.gone <= 0 && Math.hypot(s.bx - x, s.by - y) < 20 && s.cool <= 0;
  down = want && !down;
  return { pointer: { x, y, down } };
}

// Robot : réagit aux indications du souffleur (≈ 0,35–0,6 s, se trompe parfois) et tente de
// rattraper chaque orange avec une petite erreur de timing (≈ un joueur attentif).
let lastCue = null, delay = 0, wrong = null, lastAir = null, offset = 0;
const DIRS = ['left', 'up', 'right', 'down'];

export default function bot(s) {
  const out = {};
  const c = s.cue;
  if (c) {
    if (c !== lastCue) {
      lastCue = c;
      delay = 0.35 + Math.random() * 0.3;
      wrong = Math.random() < 0.05 ? DIRS.find((d) => d !== c.dir) : null;
    }
    if (s.t - c.t0 > delay) out[wrong || c.dir] = true;
  }
  const o = s.air;
  if (o && !o.res) {
    if (o !== lastAir) { lastAir = o; offset = (Math.random() + Math.random() + Math.random() - 1.5) * 55; }
    if (o.vy > 0 && o.y >= o.ringY + offset) out.press = true;
  }
  return out;
}

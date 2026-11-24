// Robot : avance tant que le rideau ne frémit pas et que le cœur reste sous ~178 BPM,
// se fige pendant que la silhouette « bouge ». Petit temps de réaction humain.
export default function bot(s) {
  const c = (s._c ??= { rest: false, react: 0.15 + Math.random() * 0.15 });
  if (c.rest && s.bpm < 150) c.rest = false;
  if (!c.rest && s.bpm > 178) c.rest = true;
  const danger = (s.warn > 0 && s.warn < 0.55 - c.react) || s.sway > 0.1;
  return { hold: !c.rest && !danger };
}

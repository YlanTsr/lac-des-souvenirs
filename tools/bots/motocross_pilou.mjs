// Robot : regarde la jauge (avec un temps de réaction) et encourage quand Pilou ralentit sous le milieu du vert.
let last = -1, seen = [];
export default function bot(state, t) {
  if (t < 0.02) { last = -1; seen = []; }
  seen.push({ t, v: state.v });
  while (seen.length > 1 && seen[1].t <= t - 0.2) seen.shift(); // vitesse vue il y a ~0,2 s
  const v = seen[0].v;
  const press = v < 300 && t - last > 0.25;
  if (press) last = t;
  return { press };
}

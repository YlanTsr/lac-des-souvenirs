// Robot : appuie quand la fusée traverse son étoile (précision variable d'une partie à l'autre).
let tol = 14, lastT = 99;
export default function bot(state, t) {
  if (t < lastT) tol = 8 + Math.random() * 40; // nouvelle partie : un joueur plus ou moins précis
  lastT = t;
  const r = state.rocket;
  if (!r) return {};
  return { press: Math.abs(r.y - (r.target.y + tol * 0.5)) < 6 };
}

// Robot : alterne gauche / droite toutes les ~0,4 s (un joueur calme), avec un peu d'irrégularité.
export default function bot(state, t) {
  const k = Math.floor(t / 0.4);
  const phase = t % 0.4;
  if (phase > 0.06) return {};
  return k % 2 ? { right: true } : { left: true };
}

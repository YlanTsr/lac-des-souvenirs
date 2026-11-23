// Robot : appuie un peu avant l'éclatement de chaque bruit, avec une petite erreur humaine.
export default function bot(state, t) {
  const live = state.noises.find((n) => n.state === 'live');
  if (!live) return {};
  const target = live.burst - 0.06 + (live.jitter ??= (Math.random() - 0.5) * 0.5);
  return { press: t >= target };
}

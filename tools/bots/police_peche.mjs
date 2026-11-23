// Robot : se cache dès que la voiture arrive, ferre avec un temps de réaction humain quand le bouchon plonge.
export default function bot(state, t) {
  const pol = state.police;
  const hide = !!pol && (pol.phase === 'drive' || pol.phase === 'look' || (pol.phase === 'warn' && pol.k > 0.5));
  if (state.plunge > 0) state._react ??= t + 0.18 + Math.random() * 0.2;
  else state._react = null;
  return { down: hide, press: !hide && state._react != null && t >= state._react };
}

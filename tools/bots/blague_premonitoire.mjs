// Robot : freine quand la « vision » tombe sur le secteur doré, avec un léger retard humain variable.
export default function bot(state, t) {
  if (state.phase !== 'spin' || state.phaseT < 0.3) { state._wait = null; return {}; }
  const SEC = Math.PI / 4, slide = state.omega * 0.3;
  const local = ((((-Math.PI / 2) - (state.angle + slide)) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2);
  // le doré est [0, SEC) en local ; on vise son milieu, avec une erreur de ±70 ms
  if (state._wait == null && Math.abs(local - SEC / 2) < 0.05) state._wait = t + Math.random() * 0.16 - 0.08;
  return { press: state._wait != null && t >= state._wait };
}

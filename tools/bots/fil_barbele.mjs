// Robot : baisse la tête quand un fil approche (≈ un joueur attentif, avec un peu de jitter).
export default function bot(state) {
  const PX = 250;
  const next = state.wires.find((w) => !w.passed && !w.hit && w.x > PX - 30);
  const jitter = ((state.t * 7.3) % 1) * 40 - 20;
  return { hold: !!next && next.x - (PX + 14) < 70 + jitter && next.x - (PX + 14) > -40 };
}

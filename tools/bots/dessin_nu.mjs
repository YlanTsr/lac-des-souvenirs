// Robot : suit le contour en pointillés à la souris, avec un léger tremblement (≈ joueur appliqué).
export default function bot(state, t) {
  if (t < 0.3) return { pointer: { x: state.D[0].x, y: state.D[0].y, down: false } };
  const p = state.D[Math.min(state.D.length - 1, state.k + 5)];
  const n = 6;
  return { pointer: { x: p.x + (Math.random() - 0.5) * n, y: p.y + (Math.random() - 0.5) * n, down: true } };
}

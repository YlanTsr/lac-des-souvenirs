// Robot : balaie la tache en serpentin, souris enfoncée (≈ un joueur appliqué).
export default function bot(state, t) {
  const rows = 8, x0 = 470 - 135, span = 270, y0 = 268 - 95, dy = 190 / (rows - 1), period = 1.45;
  const row = Math.min(rows - 1, Math.floor(t / period));
  const k = (t % period) / period;
  return { pointer: { x: x0 + (row % 2 ? 1 - k : k) * span, y: y0 + row * dy, down: true } };
}

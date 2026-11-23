// Robot : balaie la clôture en serpentin, pinceau levé près des crottes visibles (≈ un joueur attentif).
export default function bot(state, t) {
  const rows = [197, 247, 297, 347, 378], x0 = 160, x1 = 820, speed = 720;
  const rowT = (x1 - x0) / speed + 0.08;
  const row = Math.min(rows.length - 1, Math.floor(t / rowT));
  const k = Math.min(1, (t % rowT) / ((x1 - x0) / speed));
  const x = row % 2 ? x1 - k * (x1 - x0) : x0 + k * (x1 - x0);
  let y = rows[row];
  let down = true;
  for (const st of state.stains) {
    if (st.kind !== 'crotte' || st.age < 0.5) continue;
    if (Math.hypot(st.x - x, st.y - y) < st.r + 20) down = false;
  }
  return { pointer: { x, y, down } };
}

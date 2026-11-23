// Robot : ramasse les objets évidents, renifle chaque « fourrure » avant de la prendre, évite le caca.
let goal = null, phase = 'move', t0 = 0;
export default function bot(s, t) {
  if (t < 0.02) { goal = null; phase = 'move'; }
  if (!goal || goal.picked || (goal.known && goal.kind === 'caca')) {
    goal = s.objs.find((o) => !o.picked && o.known && o.kind !== 'caca') || s.objs.find((o) => !o.picked && !o.known) || null;
    phase = 'move'; t0 = t;
  }
  if (!goal) return {};
  const p = { x: goal.x, y: goal.y - 12, down: false };
  if (phase === 'move') { if (t - t0 > 0.35) { phase = goal.known ? 'tap' : 'sniff'; t0 = t; } return { pointer: p }; }
  if (phase === 'tap') { phase = 'release'; return { pointer: { ...p, down: true } }; }
  if (phase === 'release') { phase = 'move'; t0 = t; return { pointer: p }; }
  if (phase === 'sniff') { if (goal.known) { phase = 'move'; t0 = t - 0.3; return { pointer: p }; } return { pointer: { ...p, down: true } }; }
  return { pointer: p };
}

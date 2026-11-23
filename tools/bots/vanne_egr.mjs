// Robot : file sous le prochain mot utile le plus bas (sans esquiver le français, ≈ joueur moyen).
const TARGET = ['THE', 'NEW', 'EGR', 'VALVE'];
export default function bot(s) {
  const need = TARGET[s.next];
  const cands = s.words.filter((w) => !w.done && w.txt === need && w.y < 300);
  if (!cands.length) return { pointer: { x: s.x, y: 400, down: false } };
  const w = cands.reduce((a, b) => (b.y > a.y ? b : a));
  return { pointer: { x: w.x, y: 400, down: false } };
}

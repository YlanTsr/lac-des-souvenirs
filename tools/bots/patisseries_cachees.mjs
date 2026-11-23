// Robot : trie chaque objet 0,35-0,6 s après son arrivée, avec ~4 % d'erreurs d'inattention.
let rt = 0.45, cur = null, wrong = false;
export default function bot(s) {
  if (!s || !s.item) { cur = null; return {}; }
  if (cur !== s.idx) { cur = s.idx; rt = 0.35 + Math.random() * 0.25; wrong = Math.random() < 0.04; }
  if (s.itemT < rt) return {};
  const left = s.item.pastry !== wrong;
  return { left, right: !left };
}

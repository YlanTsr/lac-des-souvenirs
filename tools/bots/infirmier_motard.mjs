// Robot : appuie la bonne flèche toutes les ~0,4 s, avec 10 % d'erreurs (≈ joueur attentif).
let last = -1;
export default function bot(s, t) {
  if (t < last) last = -1;
  if (t - last < 0.4) return {};
  last = t;
  const dirs = ['left', 'up', 'down', 'right'];
  const d = Math.random() < 0.1 ? dirs[Math.floor(Math.random() * 4)] : s.seq[s.idx];
  return { [d]: true };
}

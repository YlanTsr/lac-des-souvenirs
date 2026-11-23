// Robot : appuie la bonne flèche ~0,45 s après l'apparition de l'idée (≈ joueur attentif).
let seen = null, since = 0, prevT = 0;
export default function bot(s, t) {
  if (t < prevT) { seen = null; since = 0; }
  prevT = t;
  if (s.want !== seen) { seen = s.want; since = t; }
  if (s.want && t - since > 0.45 && t - since < 0.5) return { [s.want]: true };
  return {};
}

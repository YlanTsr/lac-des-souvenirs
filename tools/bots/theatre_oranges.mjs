// Robot : corrige dès que le curseur d'équilibre s'éloigne du centre (≈ un joueur attentif).
export default function bot(s) {
  return { left: s.b > 0.12, right: s.b < -0.12 };
}

// Robot : envoie dès que le surlignage est posé sur Séléna (≈ joueur attentif).
export default function bot(s) {
  return { press: s.order[s.hi] === 'selena' && s.stepT > 0.12 && s.stepT < 0.3 && s.reorderT > 0.15 && s.cooldown === 0 };
}

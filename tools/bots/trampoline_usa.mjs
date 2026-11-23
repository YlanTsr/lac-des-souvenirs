// Robot : saute hors du trampoline ~0,2 à 0,25 s après le claquement de porte (ignore les têtes à la fenêtre).
export default function bot(s) {
  const react = 0.2 + (s.ev % 2) * 0.05;
  const coming = s.son === 'bang' || s.son === 'run' || s.son === 'leap';
  return { press: s.papa === 'bounce' && coming && s.alertT > react };
}

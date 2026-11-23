// Robot : saute hors du trampoline ~0,35 s après l'apparition du « ! » (ignore les fausses alertes).
export default function bot(s) {
  const late = (s.son === 'warn' && s.sk > 0.35) || s.son === 'run';
  return { press: s.papa === 'bounce' && late };
}

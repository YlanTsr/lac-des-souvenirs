// Robot : humain très rapide — démarre après ~0,3 s de réaction puis alterne ← → à 6,6-7,4 coups/s.
// (Mesuré : à 6 coups/s le requin gagne toujours ; à 7 coups/s on gagne même en démarrant 0,5 s en retard.)
let rate = 7, lastT = 99;
export default function bot(state, t) {
  if (t < lastT) rate = 6.6 + Math.random() * 0.8;
  lastT = t;
  if (t < 0.3) return {};
  const k = Math.floor((t - 0.3) * rate);
  return k % 2 ? { right: true } : { left: true };
}

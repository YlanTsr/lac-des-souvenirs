// Robot : alterne ← → à une cadence variable d'une partie à l'autre (3 à 7,5 coups/s).
let rate = 5, lastT = 99;
export default function bot(state, t) {
  if (t < lastT) rate = 3 + Math.random() * 4.5;
  lastT = t;
  const k = Math.floor(t * rate);
  return k % 2 ? { right: true } : { left: true };
}

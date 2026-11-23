// Robot : dès que la tête de Maman commence à tomber, attend ~0,25 s (réaction) puis
// maintient Espace jusqu'à ce qu'elle se redresse, et relâche ~0,1 s plus tard.
let prevPhase = 'awake', since = 0, releaseAt = -1, prevT = 0;
export default function bot(s, t) {
  if (t < prevT) { prevPhase = 'awake'; since = 0; releaseAt = -1; }
  prevT = t;
  if (s.phase !== prevPhase) {
    if (s.phase === 'nod') since = t;
    else releaseAt = t + 0.1;
    prevPhase = s.phase;
  }
  const hold = (s.phase === 'nod' && t - since >= 0.25) || t < releaseAt;
  return { hold };
}

// Robot : appuie quand une note entre dans le cercle, avec une précision variable d'une partie à l'autre.
let err = 0, lastT = 99;
export default function bot(state, t) {
  if (t < lastT) err = (Math.random() - 0.3) * 0.32; // décalage moyen en secondes (en avance / en retard)
  lastT = t;
  const n = state.notes.find((m) => !m.hit && !m.miss);
  if (!n) return {};
  const jitter = (Math.random() - 0.5) * 0.12;
  return { press: Math.abs(t - (n.at + err + jitter)) < 1 / 120 + 0.004 };
}

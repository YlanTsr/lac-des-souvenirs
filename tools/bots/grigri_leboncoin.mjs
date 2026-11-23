// Robot : se retient jusqu'à ~75 % d'envie, puis relâche jusqu'à ~22 % (≈ un joueur qui surveille la jauge).
let releasing = false;
export default function bot(s) {
  if (!s) return {};
  if (s.urge > 75) releasing = true;
  if (s.urge < 22) releasing = false;
  return { hold: !releasing && s.tirade <= 0 };
}

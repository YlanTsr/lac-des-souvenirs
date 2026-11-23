// Robot : donne un coup de pied du côté d'un malfrat entré dans la portée (180 px) depuis un petit
// temps de réaction aléatoire (0,1 à 0,3 s) — trop lent face aux rapides ou aux arrivées des deux côtés.
const seen = new Map();
export default function bot(s, t) {
  if (t < 0.02) seen.clear();
  let left = false, right = false;
  for (const th of s.thieves) {
    if (th.state !== 'walk' || Math.abs(th.x - 480) > 180) continue;
    if (!seen.has(th)) seen.set(th, t + 0.1 + Math.random() * 0.2);
    if (t >= seen.get(th) && s.cool === 0) { if (th.side < 0) left = true; else right = true; }
  }
  if (left && right) right = false;
  return { left, right };
}

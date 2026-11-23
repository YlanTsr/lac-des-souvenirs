// Robot : crie du côté d'un malfrat entré dans la zone de portée depuis ~0,3 s.
const seen = new Map();
export default function bot(s, t) {
  if (t < 0.02) seen.clear();
  let left = false, right = false;
  for (const th of s.thieves) {
    if (th.state !== 'walk' || Math.abs(th.x - 480) > 240) continue;
    if (!seen.has(th)) seen.set(th, t);
    if (t - seen.get(th) > 0.3 && s.cool === 0) { if (th.side < 0) left = true; else right = true; }
  }
  if (left && right) right = false;
  return { left, right };
}

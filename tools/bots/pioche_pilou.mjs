// Robot : court vers le morceau de bijou le plus proche, mais s'écarte dès qu'il a VU l'ombre de la pioche sous ses pieds.
// Temps de réaction humain : il ne prend en compte une ombre (nouvelle ou qui vient de bondir) qu'au bout de 0,25 s ;
// avant ça, il continue ce qu'il faisait.
const REACTION = 0.25;
let last = {};

export default function bot(s, t) {
  if (t < 0.02) last = {};
  const seen = (s.phase === 'aim' || s.phase === 'strike') && s.aimAge >= REACTION;
  const fresh = (s.phase === 'aim' || s.phase === 'strike') && s.aimAge < REACTION;
  if (fresh) return last; // pas encore réagi
  let goal = null;
  if (seen && Math.abs(s.px - s.tx) < 80) {
    const dir = s.px >= s.tx ? 1 : -1;
    goal = s.tx + dir * 130;
    if (goal < 50 || goal > 910) goal = s.tx - dir * 130;
  } else {
    let best = Infinity;
    for (const m of s.pieces) {
      if (!m.rolling && m.y < 380) continue;
      const d = Math.abs(m.x - s.px);
      const inShadow = seen && Math.abs(m.x - s.tx) < 75;
      if (!inShadow && d < best) { best = d; goal = m.x; }
    }
  }
  last = goal == null ? {} : { left: goal < s.px - 12, right: goal > s.px + 12 };
  return last;
}

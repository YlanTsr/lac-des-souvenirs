// Robot : court vers la bille la plus proche, mais s'écarte dès que l'ombre de la pioche est sous ses pieds.
// Il réagit avec un petit temps de retard (≈ un joueur humain attentif).
export default function bot(s) {
  let goal = null;
  if ((s.phase === 'aim' || s.phase === 'strike') && Math.abs(s.px - s.tx) < 75) {
    goal = s.tx + (s.px >= s.tx ? 1 : -1) * 120;
    if (goal < 50 || goal > 910) goal = s.tx - (s.px >= s.tx ? 1 : -1) * 120;
  } else {
    let best = Infinity;
    for (const m of s.marbles) {
      if (!m.rolling && m.y < 380) continue;
      const d = Math.abs(m.x - s.px);
      const inShadow = (s.phase === 'aim' || s.phase === 'strike') && Math.abs(m.x - s.tx) < 70;
      if (!inShadow && d < best) { best = d; goal = m.x; }
    }
  }
  if (goal == null) return {};
  return { left: goal < s.px - 12, right: goal > s.px + 12 };
}

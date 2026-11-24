// Robot : ouvre les portes dans l'ordre, observe ~0,45 s, mange si c'est un vrai bonbon
// (se trompe 4 % du temps), sinon passe à la porte suivante.
export default function bot(s) {
  const c = (s._b ??= { x: 480, y: 270, look: 0, down: false, order: s.doors.map((d) => d.i).sort(() => Math.random() - 0.5) });
  let d = null;
  for (const i of c.order) { const dd = s.doors[i]; if (!dd.eaten && !(dd.open >= 1 && dd._skip)) { d = dd; break; } }
  if (!d) return { pointer: { x: c.x, y: c.y, down: false } };
  const dist = Math.hypot(d.x - c.x, d.y - c.y), step = 14;
  if (dist > step) { c.x += ((d.x - c.x) / dist) * step; c.y += ((d.y - c.y) / dist) * step; c.down = false; return { pointer: { x: c.x, y: c.y, down: false } }; }
  c.x = d.x; c.y = d.y;
  let click = false;
  if (d.open === 0 && !d.opening) click = true;
  else if (d.open >= 1) {
    c.look += 1 / 60;
    if (c.look > 0.45) {
      c.look = 0;
      const eat = d.kind === 'bonbon' ? Math.random() > 0.04 : Math.random() < 0.04;
      if (eat && !s.flying && s.cooldown === 0) click = true; else d._skip = true;
    }
  }
  click = click && !c.down;
  c.down = click;
  return { pointer: { x: c.x, y: c.y, down: click } };
}

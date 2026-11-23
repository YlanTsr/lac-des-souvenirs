// Robot : garde la lampe sur le voleur (ou sur son buisson) et alerte quand il est bien éclairé.
const BUSHES = [[160, 455], [330, 365], [515, 460], [640, 320], [790, 430], [450, 290]];
export default function bot(s) {
  if (!s) return {};
  const th = s.th;
  let x, y, vis = th.state === 'run' || th.state === 'peek';
  if (th.state === 'peek') { x = th.x + 34; y = th.y - 86; }
  else if (vis) { x = th.x; y = th.y - 55; }
  else { const b = BUSHES[th.bush] || BUSHES[0]; x = b[0]; y = b[1] - 60; }
  const near = Math.hypot(s.cx - x, s.cy - y) < 40;
  return { pointer: { x, y, down: false }, press: vis && near && s.torchOff === 0 };
}

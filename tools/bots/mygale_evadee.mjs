// Robot : suit la mygale avec la souris et abat le bocal quand elle s'arrête sous le bocal.
export default function bot(s) {
  if (!s) return {};
  const close = Math.hypot(s.jx - s.sx, s.jy - s.sy) < 14;
  return { pointer: { x: s.sx, y: s.sy, down: close && s.pause > 0.12 && s.slam === 0 && s.cool === 0 } };
}

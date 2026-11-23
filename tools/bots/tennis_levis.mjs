// Robot : se place sous la balle et frappe une fois quand elle atteint la zone de frappe.
let lastId = -1;
export default function bot(s) {
  if (!s) return {};
  const b = s.ball;
  const x = b.mode === 'in' ? b.x1 : 480;
  const press = b.mode === 'in' && b.u >= 0.97 && b.id !== lastId;
  if (press) lastId = b.id;
  return { press, pointer: { x, y: 300, down: false } };
}

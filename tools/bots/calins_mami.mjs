// Robot : se retourne du côté de Mami ~0,3-0,6 s après son apparition (ou après la feinte).
let seen = null, at = 0, rt = 0.4;
export default function bot(s, t) {
  if (!s || s.phase !== 'sneak') { seen = null; return {}; }
  if (seen !== s.side) { seen = s.side; at = t; rt = 0.3 + Math.random() * 0.3; }
  if (t - at >= rt) return { left: s.side < 0, right: s.side > 0 };
  return {};
}

// Robot : cache le singe pendant l'alerte « Hmm ? » et tant que Mami regarde (avec un petit temps de réaction).
export default function bot(s) {
  if (!s) return {};
  const hide = (s.mstate === 'warn' && s.mT < 0.4) || s.mstate === 'look';
  return { hold: hide };
}

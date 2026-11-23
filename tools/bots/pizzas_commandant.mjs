// Robot : avance seulement quand le projecteur est loin ou s'éloigne (≈ joueur attentif).
export default function bot(s) {
  const d = s.sx - s.x, v = s.sx - s.lastSx;
  const away = Math.sign(v) === Math.sign(d) || v === 0;
  const safe = Math.abs(d) > 230 || (Math.abs(d) > 95 && !away ? false : Math.abs(d) > 95 && away);
  return { hold: safe };
}

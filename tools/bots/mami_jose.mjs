// Robot : attend que la lumière révèle le bricoleur (+ temps de réaction), crie seulement si c'est José.
export default function bot(s) {
  if (!s || s.decided || !s.revealed) return {};
  return { press: s.who === 'jose' && s.rt > 1.15 };
}

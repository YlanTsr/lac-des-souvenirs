// Robot : suit la lettre attendue la plus basse (≈ un joueur attentif, avec un petit temps de réaction).
const WORD = 'PRINCESSE';
export default function bot(s) {
  const need = WORD[s.progress];
  const cands = (s.tiles || []).filter((t) => t.ch === need && t.y < 330);
  cands.sort((a, b) => b.y - a.y);
  const x = cands.length ? cands[0].x : s.x;
  return { pointer: { x, y: 300, down: false } };
}

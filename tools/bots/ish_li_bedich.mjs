// Robot : ne fait passer le mot que pendant que la craie crisse, et seulement s'il reste assez de mot à écrire.
export default function bot(s) {
  return { press: s.phase === 'write' && s.hopT < 0 && s.writeLeft > 0.25 };
}

// Robot : se place sous le prochain bon biscuit qui tombe (ou va tomber), sans chercher à esquiver les ratés.
export default function bot(s) {
  if (!s) return {};
  const good = s.cookies.filter((c) => c.good && c.y < 402 && c.phase !== 'belt');
  good.sort((a, b) => b.y - a.y);
  const x = good.length ? good[0].x : s.x;
  return { pointer: { x, y: 300, down: false } };
}

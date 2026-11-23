// Robot : saute quand le prochain obstacle arrive à ~0,33 s (sommet du saut au-dessus de lui).
export default function bot(s) {
  if (!s) return {};
  const next = s.obs.filter((o) => !o.hit && o.x > 150).sort((a, b) => a.x - b.x)[0];
  if (!next) return {};
  const v = (s.stun > 0 ? 340 * 0.55 : 340) + (next.kind === 'poule' ? 55 : 0);
  const d = next.x - 170;
  return { press: !s.air && d < v * 0.36 && d > v * 0.2 };
}

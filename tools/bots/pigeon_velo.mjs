// Robot : serre ~5 fois par seconde, s'écarte au dernier moment quand une ombre vise son dos, puis revient.
export default function bot(s, t) {
  const danger = s.drops.find((d) => !d.landed && t > d.rel - 0.3 && Math.abs(d.x - (420 + 20)) < 80);
  const x = danger ? danger.x - 20 - 75 + 60 : 480;
  return { pointer: { x, y: 300, down: false }, press: !danger && Math.floor(t * 5) !== Math.floor((t - 1 / 60) * 5) };
}

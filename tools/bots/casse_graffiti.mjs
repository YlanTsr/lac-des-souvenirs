// Robot : dévisse à cadence variable et s'arrête (plus ou moins vite) quand Maman lève la main.
let rate = 5, react = 0.2, lastT = 99, alertSince = -1;
export default function bot(state, t) {
  if (t < lastT) { rate = 2.5 + Math.random() * 4.5; react = Math.random() * 1.2; alertSince = -1; }
  lastT = t;
  if (state.alert) { if (alertSince < 0) alertSince = t; } else alertSince = -1;
  const stopped = alertSince >= 0 && t - alertSince > react;
  return { press: !stopped && Math.floor(t * rate) !== Math.floor((t - 1 / 60) * rate) };
}

// Robot : déclenche ~0,28 s après le début d'une fenêtre où tout le monde regarde (temps de réaction humain).
export default function bot(s, t) {
  if (!s) return {};
  const w = s.windows.find((w) => t >= w.a && t < w.b);
  return { press: !!w && t - w.a > 0.28 && s.allLook() };
}

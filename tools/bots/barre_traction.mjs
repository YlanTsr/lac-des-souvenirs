// Robot : appuie quand l'aiguille d'élan entre dans le vert, à une profondeur un peu aléatoire
// (réflexes humains), et laisse passer un balancement après 3 tractions d'affilée
// ou quand la barre glisse trop — un joueur attentif mais pas parfait.
let target = 0.9;
export default function bot(s, t) {
  if (t < 0.02) target = 0.84 + Math.random() * 0.15;
  if (s.pullT >= 0 || s.wob > 0) return {};
  const chained = s.rest < 0.6;
  if (chained && (s.chain >= 2 || s.slip > 0.45)) return {};
  if (s.v >= target) {
    target = 0.83 + Math.random() * 0.16;
    return { press: true };
  }
  return {};
}

// Robot : fait grincer la porte quand Guillaume arrive dans la zone devant le placard (avec un peu d'avance pour la réaction).
export default function bot(s) {
  const lead = s.state === 'walk' ? s.dir * 18 : 0;
  return { press: (s.state === 'walk' || s.state === 'look') && Math.abs(s.cx + lead - 600) < 30 };
}

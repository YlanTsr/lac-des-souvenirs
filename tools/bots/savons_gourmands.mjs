// Robot : vise le bonbon le plus proche (se trompe parfois de 10 %), clique quand il est dessus.
export default function bot(state, t) {
  const PCX = 575, PCY = 300;
  const slotPos = (i) => { const outer = i < 8; const a = (outer ? (i / 8) * Math.PI * 2 : ((i - 8) / 4) * Math.PI * 2 + 0.4) + state.rot; const d = outer ? 150 : 66; return { x: PCX + Math.cos(a) * d, y: PCY + Math.sin(a) * d * 0.82 }; };
  const c = state._p ??= { x: 480, y: 270 };
  let tgt = state._tgt;
  if (!tgt || tgt.refill > 0 || state.cooldown > 0.25) {
    const pool = state.items.filter((it) => it.refill <= 0);
    const ok = pool.filter((it) => it.kind === 'bonbon' || Math.random() < 0.1);
    tgt = state._tgt = ok[Math.floor(Math.random() * ok.length)] || null;
  }
  if (!tgt) return { pointer: { ...c, down: false } };
  const p = slotPos(tgt.slot);
  const d = Math.hypot(p.x - c.x, p.y - c.y), step = 14;
  if (d > step) { c.x += ((p.x - c.x) / d) * step; c.y += ((p.y - c.y) / d) * step; } else { c.x = p.x; c.y = p.y; }
  const click = d < 12 && state.cooldown === 0 && !state._down;
  state._down = click;
  return { pointer: { x: c.x, y: c.y, down: click } };
}

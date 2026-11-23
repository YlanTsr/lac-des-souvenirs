/**
 * Chapitre I — « Le rôle aux oranges » (theatre_oranges)
 * Au lycée, en France, Papa a joué un rôle de femme dans la pièce de théâtre :
 * robe, perruque… et deux oranges pour la poitrine.
 * Mécanique d'équilibre : la danse fait rouler Papa et glisser les oranges ;
 * corriger avec ← → (ou la souris) pour garder le curseur au centre jusqu'au rideau.
 * Une orange tombe = fou rire du public ; deux = échec.
 */

const STAGE = 432;          // plancher de la scène (pieds de Papa)
const K = 2.0;              // force de la correction
const UNSTABLE = 1.0;       // plus on penche, plus ça penche…

let BG = null;
function background(W, H) {
  if (BG) return BG;
  const c = document.createElement('canvas');
  c.width = W * 2; c.height = H * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  // fond de scène + décor peint (un château de carton)
  g.fillStyle = '#2a1830'; g.fillRect(0, 0, W, STAGE);
  g.fillStyle = '#3d2a48';
  g.fillRect(330, 170, 300, 200);
  for (let x = 330; x < 630; x += 40) g.fillRect(x, 150, 24, 22);
  g.fillRect(300, 120, 60, 250); g.fillRect(600, 120, 60, 250);
  g.fillStyle = '#2a1830'; g.beginPath(); g.arc(480, 370, 50, Math.PI, 0); g.fill();
  g.fillStyle = '#f5e6a0'; g.beginPath(); g.arc(780, 110, 24, 0, Math.PI * 2); g.fill();
  // plancher
  g.fillStyle = '#8a5a34'; g.fillRect(0, STAGE - 30, W, 90);
  g.strokeStyle = 'rgba(40, 20, 10, 0.4)'; g.lineWidth = 2;
  for (let y = STAGE - 22; y < STAGE + 60; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#5a3a20'; g.fillRect(0, STAGE + 58, W, 14);
  // rampe de lumières
  for (let x = 60; x < W; x += 80) {
    g.fillStyle = '#3a3030'; g.fillRect(x - 14, STAGE + 50, 28, 10);
    g.fillStyle = '#fff2b0'; g.beginPath(); g.arc(x, STAGE + 50, 7, Math.PI, 0); g.fill();
  }
  // rideaux rouges
  for (const side of [0, 1]) {
    for (let k = 0; k < 6; k++) {
      const x = side ? W - 30 - k * 24 : 30 + k * 24;
      g.fillStyle = k % 2 ? '#a3162a' : '#c4243a';
      g.beginPath(); g.moveTo(x - 16, 0); g.lineTo(x + 16, 0);
      g.quadraticCurveTo(x + 10 + (side ? -1 : 1) * k * 6, 260, x + 16 + (side ? -1 : 1) * k * 8, STAGE + 20);
      g.lineTo(x - 16 + (side ? -1 : 1) * k * 8, STAGE + 20);
      g.quadraticCurveTo(x - 12 + (side ? -1 : 1) * k * 6, 260, x - 16, 0); g.fill();
    }
  }
  // lambrequin
  g.fillStyle = '#b01c30'; g.fillRect(0, 0, W, 34);
  for (let x = 0; x < W; x += 60) { g.beginPath(); g.arc(x + 30, 34, 30, 0, Math.PI); g.fill(); }
  g.fillStyle = '#e8b84a'; g.fillRect(0, 30, W, 4);
  // fosse / public
  g.fillStyle = '#140c14'; g.fillRect(0, STAGE + 72, W, H - STAGE - 72);
  BG = c;
  return c;
}

export default {
  id: 'theatre_oranges',
  title: 'Le rôle aux oranges',
  instructions: 'Ce soir, tu joues le premier rôle féminin : robe, perruque… et deux oranges pour la poitrine ! Garde l’équilibre pendant la danse pour qu’aucune ne tombe.',
  controls: '← → / souris : rééquilibrer',
  duration: 12,
  introExpression: 'worried',
  successTitle: 'Standing ovation !',
  failTitle: 'Rideau !',
  successText: 'Les deux oranges ont tenu jusqu’au rideau. Le public applaudit debout ; personne n’a rien remarqué… enfin, presque.',
  failText: 'Plop… plop ! Les deux oranges roulent jusqu’au premier rang. La salle pleure de rire : ta meilleure prestation, de loin.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const bg = background(W, H);
    const s = {
      t: 0, b: 0, ctrl: 0, oranges: { l: true, r: true }, falls: 0, grace: 0.8,
      kick: 0, nextKick: rand(1.8, 2.6), warn: 0, kickDir: 1,
      ph1: rand(0, 6), ph2: rand(0, 6), falling: [], laughT: 0, msg: '', msgT: 0,
      audience: Array.from({ length: 13 }, (_, i) => ({ x: 40 + i * 72 + rand(-12, 12), r: rand(20, 26), c: i % 3 })),
    };

    function drop() {
      const side = s.b > 0 ? 'r' : 'l';
      const key = s.oranges[side] ? side : side === 'r' ? 'l' : 'r';
      s.oranges[key] = false;
      s.falls++;
      const dir = s.b > 0 ? 1 : -1;
      s.falling.push({ x: s.papaX + dir * 30, y: STAGE - 150, vx: dir * rand(120, 190), vy: -120, bounces: 0 });
      s.b = 0; s.grace = 0.9; s.kick = 0;
      s.laughT = 2;
      api.sfx('boing');
      api.shake(8);
      if (s.falls >= 2) api.end(false);
      else { s.msg = 'Plop ! Le public est hilare…'; s.msgT = 1.4; }
    }

    s.papaX = 480;
    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.grace = Math.max(0, s.grace - dt);
        s.laughT = Math.max(0, s.laughT - dt);
        s.msgT = Math.max(0, s.msgT - dt);
        s.warn = Math.max(0, s.warn - dt);
        // pas de danse : Papa se balance d'un côté à l'autre
        s.papaX = 480 + Math.sin(s.t * 1.3) * 70;

        // commande : flèches, sinon position de la souris
        const ax = input.axis('x');
        const p = input.pointer;
        s.ctrl = ax || (p.active ? clamp((p.x - 480) / 180, -1, 1) : 0);

        if (!api.ended) {
          // pirouette annoncée
          s.nextKick -= dt;
          if (s.nextKick <= 0.45 && s.warn <= 0 && s.nextKick > 0) { s.warn = 0.45; s.kickDir = Math.random() < 0.5 ? -1 : 1; }
          if (s.nextKick <= 0) { s.kick = 1.4 * s.kickDir; s.nextKick = rand(2.0, 2.8); api.sfx('whoosh'); }
          s.kick *= Math.exp(-2.6 * dt);
          const drift = 0.55 * Math.sin(s.t * 1.5 + s.ph1) + 0.35 * Math.sin(s.t * 2.7 + s.ph2) + s.kick;
          if (s.grace <= 0) {
            s.b += (drift + UNSTABLE * s.b + s.ctrl * K) * dt;
            s.b = clamp(s.b, -1.2, 1.2);
            if (Math.abs(s.b) >= 1) drop();
          } else s.b *= Math.exp(-4 * dt);
        } else {
          s.b *= Math.exp(-3 * dt);
        }

        for (const f of s.falling) {
          f.vy += 1200 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
          if (f.y > STAGE + 4 && f.bounces < 2) { f.y = STAGE + 4; f.vy *= -0.45; f.bounces++; if (f.bounces === 1) api.sfx('splat'); }
        }
        s.falling = s.falling.filter((f) => f.y < H + 40);
      },
      timeout() {
        if (s.falls < 2) api.end(true, s.falls ? 'Une orange a roulé dans le public, mais l’autre a tenu bon jusqu’au rideau. Le spectacle doit continuer… et il a continué !' : undefined);
        return s.falls < 2;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);

        // projecteur
        g.save();
        g.globalCompositeOperation = 'lighter';
        const spot = g.createRadialGradient(s.papaX, STAGE - 120, 20, s.papaX, STAGE - 120, 240);
        spot.addColorStop(0, 'rgba(255, 240, 190, 0.32)'); spot.addColorStop(1, 'rgba(255, 240, 190, 0)');
        g.fillStyle = spot; g.fillRect(s.papaX - 250, STAGE - 370, 500, 420);
        g.restore();
        g.fillStyle = 'rgba(255, 240, 190, 0.18)';
        g.beginPath(); g.ellipse(s.papaX, STAGE + 4, 110, 18, 0, 0, Math.PI * 2); g.fill();

        // ── Papa en robe (tout le personnage penche avec l'équilibre)
        const size = 78, r = size / 2, x = s.papaX, y = STAGE;
        const lean = s.b * 0.3 + Math.sin(s.t * 1.3) * 0.05;
        const hipY = y - 1.9 * r, sy = hipY - 2.05 * r, hy = sy - r;
        const end = api.ended, won = end && s.falls < 2;
        g.save();
        g.translate(x, y); g.rotate(lean); g.translate(-x, -y);
        // perruque (arrière) : longues boucles blondes
        g.fillStyle = '#e8c05a';
        g.beginPath(); g.ellipse(x, hy + r * 0.35, r * 1.35, r * 1.45, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#d9a83e';
        for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + sx * r * 1.15, hy + r * (0.3 + k * 0.45), r * 0.3, 0, Math.PI * 2); g.fill(); }
        // bras écartés qui moulinent pour l'équilibre
        const flail = Math.sin(s.t * 10) * 0.12 * r;
        const arms = won ? undefined : {
          l: { x: x - 1.9 * r, y: sy + 0.6 * r - s.b * 0.9 * r + flail },
          r: { x: x + 1.9 * r, y: sy + 0.6 * r + s.b * 0.9 * r - flail },
        };
        const info = api.avatar(g, {
          x, y, size, t: s.t, pose: won ? 'cheer' : 'stand', hands: arms,
          expression: end ? (won ? 'happy' : 'laugh') : s.grace > 0.3 && s.falls ? 'surprised' : Math.abs(s.b) > 0.65 ? 'panic' : s.warn > 0 ? 'worried' : 'focus',
          sweat: Math.abs(s.b) > 0.5 && !end, blush: end && !won ? 1 : 0.5, lookX: s.b,
        });
        // la robe (par-dessus le polo) : rose à pois, manches bouffantes
        const dress = '#d9518c';
        g.fillStyle = dress;
        g.beginPath();
        g.moveTo(x - 0.8 * r, sy - 0.02 * r);
        g.quadraticCurveTo(x, sy + 0.4 * r, x + 0.8 * r, sy - 0.02 * r);
        g.quadraticCurveTo(x + 1.08 * r, sy + 0.1 * r, x + 1.0 * r, sy + 0.7 * r);
        g.lineTo(x + 0.75 * r, hipY - 0.35 * r);
        g.quadraticCurveTo(x + 1.5 * r, hipY + 0.4 * r, x + 1.55 * r, y - 0.75 * r);
        for (let k = 0; k <= 6; k++) g.quadraticCurveTo(x + 1.55 * r - (k + 0.5) * 0.443 * r, y - 0.55 * r + Math.sin(s.t * 6 + k) * 3, x + 1.55 * r - (k + 1) * 0.443 * r, y - 0.75 * r);
        g.quadraticCurveTo(x - 1.5 * r, hipY + 0.4 * r, x - 0.75 * r, hipY - 0.35 * r);
        g.lineTo(x - 1.0 * r, sy + 0.7 * r);
        g.quadraticCurveTo(x - 1.08 * r, sy + 0.1 * r, x - 0.8 * r, sy - 0.02 * r);
        g.closePath(); g.fill();
        g.fillStyle = 'rgba(255, 255, 255, 0.55)';
        for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(x + (((i * 37) % 23) / 23 - 0.5) * 2.2 * r, hipY - 0.2 * r + ((i * 13) % 11) / 11 * 1.1 * r, 0.07 * r, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#f2e2ea'; g.fillRect(x - 0.78 * r, hipY - 0.42 * r, 1.56 * r, 0.14 * r); // ceinture
        g.fillStyle = '#e872a6';
        for (const sx of [-1, 1]) { g.beginPath(); g.arc(x + sx * 0.95 * r, sy + 0.2 * r, 0.34 * r, 0, Math.PI * 2); g.fill(); }
        // les deux oranges (le gag !) qui glissent avec le déséquilibre
        const slide = s.b * 0.38 * r;
        for (const [side, sx] of [['l', -1], ['r', 1]]) {
          if (!s.oranges[side]) continue;
          const ox = x + sx * 0.42 * r + slide, oy = sy + 0.72 * r + Math.abs(s.b) * 0.15 * r * (sx === Math.sign(s.b) ? 1 : -0.5);
          g.fillStyle = '#f39324'; g.beginPath(); g.arc(ox, oy, 0.34 * r, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255, 220, 150, 0.6)'; g.beginPath(); g.arc(ox - 0.1 * r, oy - 0.1 * r, 0.1 * r, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#4f8a3a'; g.beginPath(); g.ellipse(ox + 0.05 * r, oy - 0.32 * r, 0.1 * r, 0.05 * r, -0.5, 0, Math.PI * 2); g.fill();
        }
        // frange de la perruque + fleur
        g.fillStyle = '#e8c05a';
        for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.33; g.beginPath(); g.arc(info.hx + Math.cos(a) * r * 0.88, info.hy + Math.sin(a) * r * 0.88, r * 0.26, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#ff5a7a';
        for (let k = 0; k < 5; k++) { const a = k * 1.256; g.beginPath(); g.arc(info.hx + 0.75 * r + Math.cos(a) * 6, info.hy - 0.7 * r + Math.sin(a) * 6, 5, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(info.hx + 0.75 * r, info.hy - 0.7 * r, 4, 0, Math.PI * 2); g.fill();
        g.restore();

        // oranges qui roulent vers le public
        for (const f of s.falling) {
          g.fillStyle = '#f39324'; g.beginPath(); g.arc(f.x, f.y - 12, 13, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#4f8a3a'; g.beginPath(); g.ellipse(f.x + 3, f.y - 25, 5, 3, -0.5, 0, Math.PI * 2); g.fill();
        }

        if (s.warn > 0 && !end) api.text(g, s.kickDir > 0 ? 'Pirouette ! ➜' : '⬅ Pirouette !', x, 128, { size: 30, color: '#ffe9a8', stroke: '#5a1030' });
        if (s.msgT > 0) api.text(g, s.msg, W / 2, 170, { size: 30, color: '#fff', stroke: '#5a1030' });

        // le public (silhouettes)
        const laugh = s.laughT > 0 || (end && !won);
        for (const a of s.audience) {
          const bob = laugh ? Math.abs(Math.sin(s.t * 12 + a.x)) * 7 : won ? Math.abs(Math.sin(s.t * 8 + a.x)) * 4 : 0;
          g.fillStyle = ['#2a1c2a', '#22161f', '#301f2c'][a.c];
          g.beginPath(); g.arc(a.x, H - 22 - bob, a.r, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.ellipse(a.x, H + 8 - bob, a.r * 1.6, a.r, 0, 0, Math.PI * 2); g.fill();
        }
        if (laugh) for (let i = 0; i < 4; i++) api.text(g, 'HA HA HA', 140 + i * 230, H - 72 - Math.abs(Math.sin(s.t * 7 + i)) * 10, { size: 22, color: '#ffe9a8', stroke: '#000a', strokeWidth: 4 });
        if (won) for (let i = 0; i < 3; i++) api.text(g, 'Bravo !', 220 + i * 260, H - 72 - Math.abs(Math.sin(s.t * 6 + i)) * 10, { size: 24, color: '#fff', stroke: '#000a', strokeWidth: 4 });

        // jauge d'équilibre
        const gx = 300, gw = 360, gy = 70;
        api.roundRect(g, gx - 6, gy - 12, gw + 12, 24, 12); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill();
        const grd = g.createLinearGradient(gx, 0, gx + gw, 0);
        grd.addColorStop(0, '#e0453a'); grd.addColorStop(0.25, '#f2c14a'); grd.addColorStop(0.5, '#7fd67a'); grd.addColorStop(0.75, '#f2c14a'); grd.addColorStop(1, '#e0453a');
        g.fillStyle = grd; g.fillRect(gx, gy - 6, gw, 12);
        const cxp = gx + gw / 2 + clamp(s.b, -1, 1) * gw / 2;
        g.fillStyle = '#f39324'; g.beginPath(); g.arc(cxp, gy, 11, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
        api.text(g, 'Équilibre', gx + gw / 2, gy - 26, { size: 18, color: '#fff', stroke: '#000a', strokeWidth: 4 });
        api.text(g, `Oranges : ${(s.oranges.l ? '●' : '○') + (s.oranges.r ? '●' : '○')}`, 40, 76, { size: 22, align: 'left', color: '#ffc36b', stroke: '#000a', strokeWidth: 5 });
      },
    };
  },
};

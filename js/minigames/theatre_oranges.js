/**
 * Chapitre I — « Le rôle aux oranges » (theatre_oranges)
 * Au lycée, Papa a joué Toinette, la servante du « Malade imaginaire » de Molière…
 * avec deux oranges glissées dans la robe en guise de poitrine.
 * Mécanique : le souffleur enchaîne les indications de mise en scène (← ↑ → ↓ ou boutons) ;
 * il faut les jouer vite et juste. Les gestes brusques (et les erreurs) font jaillir une orange :
 * on la rattrape avec Espace / clic quand elle retombe dans le cercle. Deux oranges perdues = fou rire.
 */
import { drawPerson, PEOPLE } from './people.js';

const FLOOR = 420;          // pieds de Papa sur la scène
const SIZE = 72, R = SIZE / 2;
const G = 820;              // gravité des oranges
const CATCH = 46;           // tolérance verticale du rattrapage (px)
const POSE_T = 0.42;        // durée d'un geste
const DIRS = ['left', 'up', 'right', 'down'];
const CUES = {
  left: ['Va voir Argan !', 'Côté jardin !'],
  right: ['Côté cour !', 'Tourne-toi !'],
  up: ['Bras au ciel !', 'Ouvre les bras !'],
  down: ['Révérence !', 'Courbette !'],
};
const JOLT = { left: 0.3, right: 0.3, up: 0.36, down: 0.42 };
const LINES = ['Ah ! Monsieur…', 'Le poumon !', 'Fort bien !', 'Ignorant !', 'Hé bien ?', 'Quelle santé !'];
const PAD = { x: 868, y: 466, d: 46, r: 23 };
const BTN = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const DRESS = '#7c2338', DRESS_D = '#5e1a2a', APRON = '#f3ece0', LACE = '#ffffff';

let BG = null;
function background(W, H) {
  if (BG) return BG;
  const c = document.createElement('canvas');
  c.width = W * 2; c.height = H * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  // mur de la chambre d'Argan : tapisserie + lambris
  g.fillStyle = '#6e3a30'; g.fillRect(0, 0, W, 400);
  g.fillStyle = 'rgba(255, 210, 150, 0.08)';
  for (let y = 60; y < 250; y += 34) for (let x = (y / 34) % 2 ? 140 : 157; x < 840; x += 34) {
    g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 6, y); g.lineTo(x, y + 7); g.lineTo(x - 6, y); g.fill();
  }
  g.fillStyle = '#4a2a1e'; g.fillRect(0, 262, W, 138);
  g.fillStyle = '#8a5a34'; g.fillRect(0, 256, W, 8);
  g.strokeStyle = '#6a4024'; g.lineWidth = 3;
  for (let x = 130; x < 840; x += 110) g.strokeRect(x, 278, 90, 104);
  // fenêtre à petits carreaux + tentures
  g.fillStyle = '#5a3a24'; g.fillRect(538, 90, 124, 168);
  const night = g.createLinearGradient(0, 98, 0, 250);
  night.addColorStop(0, '#1d2550'); night.addColorStop(1, '#3d4a80');
  g.fillStyle = night; g.fillRect(546, 98, 108, 152);
  g.fillStyle = '#f5e6a0'; g.beginPath(); g.arc(625, 126, 12, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#5a3a24'; g.lineWidth = 4;
  for (const x of [582, 618]) { g.beginPath(); g.moveTo(x, 98); g.lineTo(x, 250); g.stroke(); }
  for (const y of [148, 200]) { g.beginPath(); g.moveTo(546, y); g.lineTo(654, y); g.stroke(); }
  g.fillStyle = '#2f5a3a';
  g.beginPath(); g.moveTo(524, 84); g.lineTo(560, 84); g.quadraticCurveTo(548, 170, 562, 262); g.lineTo(520, 262); g.fill();
  g.beginPath(); g.moveTo(676, 84); g.lineTo(640, 84); g.quadraticCurveTo(652, 170, 638, 262); g.lineTo(680, 262); g.fill();
  g.fillStyle = '#e8b84a'; g.fillRect(516, 80, 168, 6);
  // portrait encadré
  g.fillStyle = '#c9963a'; g.fillRect(338, 112, 86, 104);
  g.fillStyle = '#3a2a2a'; g.fillRect(346, 120, 70, 88);
  g.fillStyle = '#d9b08a'; g.beginPath(); g.arc(381, 154, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2a1a14'; g.beginPath(); g.ellipse(381, 146, 22, 16, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#5a1a2a'; g.fillRect(363, 176, 36, 32);
  // plancher de scène
  g.fillStyle = '#7a4e2c'; g.fillRect(0, 398, W, 74);
  g.strokeStyle = 'rgba(40, 20, 10, 0.35)'; g.lineWidth = 2;
  for (let y = 408; y < 472; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = 'rgba(0, 0, 0, 0.25)'; g.fillRect(0, 398, W, 6);
  g.fillStyle = '#4a2c18'; g.fillRect(0, 472, W, 12);
  // petite table de chevet avec fioles (le malade imaginaire !)
  g.fillStyle = '#5a3418'; g.fillRect(262, 356, 64, 8); g.fillRect(268, 364, 6, 50); g.fillRect(314, 364, 6, 50);
  for (const [x, col, h] of [[274, '#6fb0d8', 20], [290, '#9a5ad0', 26], [306, '#7fd67a', 16], [318, '#e0b04a', 14]]) {
    g.fillStyle = col; g.fillRect(x - 5, 356 - h, 10, h); g.fillRect(x - 2, 352 - h, 4, 5);
  }
  // fauteuil d'Argan (velours rouge, bois doré)
  g.fillStyle = '#c9963a';
  g.beginPath(); g.moveTo(118, 392); g.lineTo(120, 262); g.quadraticCurveTo(160, 236, 200, 262); g.lineTo(202, 392); g.fill();
  g.fillStyle = '#a3182c';
  g.beginPath(); g.moveTo(128, 384); g.lineTo(130, 268); g.quadraticCurveTo(160, 248, 192, 268); g.lineTo(192, 384); g.fill();
  g.fillStyle = '#c9963a'; g.fillRect(118, 382, 112, 12);
  g.fillStyle = '#b82238'; g.fillRect(122, 372, 104, 12);
  g.fillStyle = '#8a6428'; g.fillRect(124, 394, 8, 26); g.fillRect(216, 394, 8, 26);
  // tabouret pour les pieds
  g.fillStyle = '#b82238'; g.fillRect(232, 388, 44, 12);
  g.fillStyle = '#8a6428'; g.fillRect(236, 400, 6, 20); g.fillRect(266, 400, 6, 20);
  // chevalet + pancarte du titre
  g.strokeStyle = '#5a3a20'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(740, 230); g.lineTo(716, 420); g.moveTo(760, 230); g.lineTo(784, 420); g.moveTo(750, 236); g.lineTo(752, 416); g.stroke();
  g.fillStyle = '#f2e2b8'; g.fillRect(690, 250, 122, 86);
  g.strokeStyle = '#8a5a2a'; g.lineWidth = 4; g.strokeRect(690, 250, 122, 86);
  g.fillStyle = '#5a1a20'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'italic 700 15px Georgia, serif'; g.fillText('Le Malade', 751, 276); g.fillText('imaginaire', 751, 296);
  g.font = '12px Georgia, serif'; g.fillText('— Molière —', 751, 318);
  // rampe : bougeoirs
  for (let i = 0; i < 12; i++) {
    const x = 70 + i * 74;
    g.fillStyle = '#b8892e'; g.fillRect(x - 9, 470, 18, 5);
    g.fillStyle = '#f6f0e0'; g.fillRect(x - 4, 452, 8, 18);
  }
  // fosse / salle
  g.fillStyle = '#170d12'; g.fillRect(0, 484, W, H - 484);
  // rideaux latéraux rouges
  for (const side of [0, 1]) {
    for (let k = 0; k < 5; k++) {
      const x = side ? W - 18 - k * 24 : 18 + k * 24;
      const d = side ? -1 : 1;
      g.fillStyle = k % 2 ? '#a3162a' : '#c4243a';
      g.beginPath(); g.moveTo(x - 16, 0); g.lineTo(x + 16, 0);
      g.quadraticCurveTo(x + 10 + d * k * 5, 260, x + 16 + d * k * 7, 476);
      g.lineTo(x - 16 + d * k * 7, 476);
      g.quadraticCurveTo(x - 12 + d * k * 5, 260, x - 16, 0); g.fill();
    }
  }
  g.fillStyle = '#e8b84a';
  g.beginPath(); g.arc(122, 300, 7, 0, Math.PI * 2); g.arc(W - 122, 300, 7, 0, Math.PI * 2); g.fill();
  // lambrequin
  g.fillStyle = '#b01c30'; g.fillRect(0, 0, W, 30);
  for (let x = 0; x < W; x += 60) { g.beginPath(); g.arc(x + 30, 30, 30, 0, Math.PI); g.fill(); }
  g.fillStyle = '#e8b84a'; g.fillRect(0, 27, W, 4);
  BG = c;
  return c;
}

/** Coude : point milieu décalé (bras de longueur 2a). */
function elbow(sx, sy, hx, hy, a, side) {
  let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
  if (d > 2 * a * 0.98) { hx = sx + dx / d * 2 * a * 0.98; hy = sy + dy / d * 2 * a * 0.98; dx = hx - sx; dy = hy - sy; d = 2 * a * 0.98; }
  const h = Math.sqrt(Math.max(0, a * a - (d / 2) * (d / 2)));
  const nx = -dy / d, ny = dx / d;
  const sgn = side < 0 ? 1 : -1;
  return { ex: sx + dx / 2 + nx * h * sgn, ey: sy + dy / 2 + ny * h * sgn, hx, hy };
}

function orangeShape(g, x, y, rad, rot = 0) {
  g.fillStyle = '#f39324'; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(190, 90, 10, 0.35)'; g.beginPath(); g.arc(x + rad * 0.25, y + rad * 0.25, rad * 0.7, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255, 225, 160, 0.7)'; g.beginPath(); g.arc(x - rad * 0.32, y - rad * 0.32, rad * 0.28, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4f8a3a';
  g.beginPath(); g.ellipse(x + Math.cos(rot - 1.4) * rad * 0.85, y + Math.sin(rot - 1.4) * rad * 0.85, rad * 0.36, rad * 0.17, rot - 0.6, 0, Math.PI * 2); g.fill();
}

export default {
  id: 'theatre_oranges',
  title: 'Le rôle aux oranges',
  instructions: 'Tu joues Toinette dans « Le Malade imaginaire », deux oranges en guise de poitrine : suis vite les indications du souffleur et rattrape chaque orange qui s’échappe de ta robe !',
  controls: '← ↑ → ↓ / boutons : jouer l’indication · Espace / clic quand l’orange est dans le cercle : la rattraper',
  duration: 13,
  introExpression: 'worried',
  successTitle: 'Bravo Toinette !',
  failTitle: 'Fou rire général !',
  successText: 'Révérences, courbettes, bras au ciel… et deux oranges toujours à leur place. Le rideau tombe sous les applaudissements : Molière aurait signé !',
  failText: 'Plop… plop ! Les deux oranges dévalent la scène et roulent jusqu’au premier rang. Même Argan en oublie d’être malade : la salle pleure de rire.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const bg = background(W, H);
    const s = {
      t: 0, x: 480, tx: 480, poseT: 0, poseDir: null, stumble: 0, catchT: 0, laughT: 0, clapT: 0,
      cue: null, gap: 0.9, lastDir: null, cues: 0, misses: 0, jolt: 0.15,
      or: ['in', 'in'], lost: 0, air: null, loose: [],
      msg: '', msgT: 0, line: '', lineT: 0, endT: 0,
      audience: Array.from({ length: 15 }, (_, i) => ({ x: 30 + i * 64 + rand(-10, 10), r: rand(18, 24), c: i % 3 })),
    };

    const chestY = () => FLOOR - 1.9 * R - 2.05 * R + 0.72 * R;
    const say = (m, d = 1.2) => { s.msg = m; s.msgT = d; };

    function newCue() {
      let dir;
      do dir = DIRS[Math.floor(Math.random() * 4)]; while (dir === s.lastDir);
      s.lastDir = dir;
      const list = CUES[dir];
      const win = Math.max(1.05, 1.75 - s.cues * 0.07);
      s.cue = { dir, text: list[Math.floor(Math.random() * list.length)], left: win, win, t0: s.t };
    }

    function escape() {
      if (s.air) { s.jolt = Math.max(s.jolt, 0.75); return; }
      const idx = [0, 1].filter((i) => s.or[i] === 'in');
      if (!idx.length) return;
      const i = idx[Math.floor(Math.random() * idx.length)];
      s.or[i] = 'air';
      s.jolt = 0;
      const x0 = s.x + (i ? 1 : -1) * 0.42 * R, y0 = chestY();
      let dir = i ? 1 : -1;
      if (x0 + dir * 150 > 800 || x0 + dir * 150 < 170) dir = -dir;
      const vx = dir * rand(70, 135), vy = -rand(400, 455);
      const ringY = y0 + 40;
      const tR = (-vy + Math.sqrt(vy * vy + 2 * G * 40)) / G;
      s.air = { i, x: x0, y: y0, vx, vy, ringX: x0 + vx * tR, ringY, rot: 0, res: null, k: 0 };
      api.sfx('boing');
      api.shake(5);
      say('Une orange s’échappe !', 0.9);
    }

    function good(dir) {
      s.cues++;
      s.poseDir = dir; s.poseT = POSE_T;
      if (dir === 'left') s.tx = clamp(s.tx - 85, 390, 600);
      if (dir === 'right') s.tx = clamp(s.tx + 85, 390, 600);
      s.clapT = 0.7;
      s.cue = null; s.gap = 0.45;
      api.sfx('pop');
      api.burst(s.x, FLOOR - 120, { n: 6, shape: 'star', color: ['#ffe9a8', '#ffffff'], speed: 160, gravity: 200, size: 6 });
      if (Math.random() < 0.45) { s.line = LINES[Math.floor(Math.random() * LINES.length)]; s.lineT = 0.9; }
      s.jolt += JOLT[dir] + rand(0, 0.1);
      if (s.jolt >= 1) escape();
    }

    function bad(late) {
      s.misses++;
      s.cue = null; s.gap = 0.6;
      s.stumble = 0.5;
      api.sfx('beep');
      say(late ? 'Trou de mémoire !' : 'Mauvais geste !', 1);
      escape();
    }

    function lose(o) {
      s.or[o.i] = 'lost';
      s.lost++;
      s.loose.push({ x: o.x, y: o.y, vx: o.vx, vy: o.vy, rot: o.rot, phase: 'fall', b: 0 });
      s.air = null;
      s.laughT = 1.6;
      if (s.lost >= 2) api.end(false);
    }

    function tryCatch() {
      const o = s.air;
      if (!o || o.res) return;
      if (o.vy > 0 && Math.abs(o.y - o.ringY) <= CATCH) {
        o.res = 'caught'; o.k = 0; o.cx = o.x; o.cy = o.y;
        s.catchT = 0.5;
        api.sfx('catch');
        api.burst(o.x, o.y, { n: 10, color: ['#f39324', '#ffd27a'], speed: 150, gravity: 300, size: 4 });
        say('Rattrapée ! Ooooh…', 0.9);
      } else {
        // trop tôt : Papa la frappe… et elle s'envole
        o.vx = (o.vx >= 0 ? 1 : -1) * rand(300, 380); o.vy = -rand(220, 300);
        api.sfx('clang');
        say('Trop tôt ! Elle s’envole…', 1.1);
        lose(o);
      }
    }

    function hitPad(p) {
      for (const [d, [ax, ay]] of Object.entries(BTN)) if (Math.hypot(p.x - (PAD.x + ax * PAD.d), p.y - (PAD.y + ay * PAD.d * 0.9)) <= PAD.r + 4) return d;
      return null;
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        for (const k of ['poseT', 'stumble', 'catchT', 'laughT', 'clapT', 'msgT', 'lineT']) s[k] = Math.max(0, s[k] - dt);
        s.x += (s.tx - s.x) * Math.min(1, dt * 9);

        // orange en vol
        const o = s.air;
        if (o) {
          if (o.res === 'caught') {
            o.k += dt / 0.28;
            const i = o.i, tx = s.x + (i ? 1 : -1) * 0.42 * R, ty = chestY();
            o.x = o.cx + (tx - o.cx) * Math.min(1, o.k); o.y = o.cy + (ty - o.cy) * Math.min(1, o.k);
            if (o.k >= 1) { s.or[i] = 'in'; s.air = null; }
          } else {
            o.vy += G * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += dt * 6;
            if (!api.ended && o.vy > 0 && o.y > o.ringY + CATCH) {
              say('Elle roule vers le public !', 1.1);
              lose(o);
            }
          }
        }
        // oranges perdues : rebond, roulade… jusqu'au premier rang
        for (const l of s.loose) {
          l.rot += dt * (l.phase === 'roll' ? 9 : 5);
          if (l.phase === 'fall') {
            l.vy += G * dt; l.x += l.vx * dt; l.y += l.vy * dt;
            if (l.x < 40 || l.x > W - 40) { l.vx = -l.vx * 0.6; l.x = clamp(l.x, 40, W - 40); }
            if (l.y >= FLOOR + 14 && l.vy > 0) {
              l.y = FLOOR + 14;
              if (l.b < 2) { l.vy = -Math.abs(l.vy) * 0.42; l.b++; if (l.b === 1) api.sfx('splat'); }
              else { l.phase = 'roll'; l.vx *= 0.35; }
            }
          } else if (l.phase === 'roll') {
            l.y += 120 * dt; l.x += l.vx * dt;
            if (l.y >= 476) { l.phase = 'pit'; l.vy = 120; s.laughT = 2.2; api.sfx('boing'); }
          } else {
            l.vy += G * dt; l.y += l.vy * dt; l.x += l.vx * dt;
          }
        }
        s.loose = s.loose.filter((l) => l.y < H + 40);

        if (api.ended) { s.endT += dt; return; }

        // entrées : flèches, boutons à la souris, action = rattraper
        let dir = null, act = false;
        for (const d of DIRS) if (input.pressed(d)) dir = d;
        const p = input.pointer;
        if (p.pressed) { const b = hitPad(p); if (b) dir = b; else act = true; }
        else if (input.pressed()) act = true;

        if (!s.cue) {
          s.gap -= dt;
          if (s.gap <= 0) newCue();
        } else {
          s.cue.left -= dt * (s.air && !s.air.res ? 0.55 : 1);
          if (dir) { if (dir === s.cue.dir) good(dir); else bad(false); }
          else if (s.cue.left <= 0) bad(true);
        }
        if (act) tryCatch();
      },

      timeout() {
        if (s.lost < 2 && s.cues < 6) {
          s.lost = 2; // rôle oublié : on affiche la fin « fou rire »
          api.end(false, 'Les oranges ont tenu, mais tu as oublié presque tout ton rôle ! Le souffleur s’égosille, Argan improvise… et la salle rit de bon cœur.');
          return false;
        }
        const ok = s.lost < 2;
        if (ok) api.end(true, s.lost ? 'Une orange a fini au premier rang, l’autre a tenu bon jusqu’au rideau. Une Toinette un peu asymétrique… mais quel triomphe !' : undefined);
        return ok;
      },

      draw(g) {
        const end = api.ended, won = end && s.lost < 2;
        g.drawImage(bg, 0, 0, W, H);

        // projecteur
        g.save();
        g.globalCompositeOperation = 'lighter';
        const spot = g.createRadialGradient(s.x, FLOOR - 120, 20, s.x, FLOOR - 120, 250);
        spot.addColorStop(0, 'rgba(255, 236, 180, 0.28)'); spot.addColorStop(1, 'rgba(255, 236, 180, 0)');
        g.fillStyle = spot; g.fillRect(s.x - 260, FLOOR - 380, 520, 440);
        g.restore();
        g.fillStyle = 'rgba(0, 0, 0, 0.25)';
        g.beginPath(); g.ellipse(s.x, FLOOR + 2, 78, 11, 0, 0, Math.PI * 2); g.fill();

        // Argan dans son fauteuil, bonnet de nuit
        const laughing = s.laughT > 0 || (end && !won);
        const ar = drawPerson(g, {
          ...PEOPLE.passant, hairColor: '#bdb5ac', shirt: '#6a4a7a', pants: '#5a4060', x: 152, y: 386, size: 48, pose: 'sit', t: s.t,
          expression: laughing ? 'laugh' : s.air && !s.air.res ? 'surprised' : 'worried',
        });
        g.fillStyle = '#f4f0e6';
        g.beginPath(); g.moveTo(ar.hx - ar.r * 0.95, ar.hy - ar.r * 0.35); g.quadraticCurveTo(ar.hx, ar.hy - ar.r * 1.35, ar.hx + ar.r * 0.95, ar.hy - ar.r * 0.35);
        g.quadraticCurveTo(ar.hx + ar.r * 1.5, ar.hy - ar.r * 1.6, ar.hx + ar.r * 1.7, ar.hy - ar.r * 0.6); g.closePath(); g.fill();
        g.fillStyle = '#e0473a'; g.beginPath(); g.arc(ar.hx + ar.r * 1.7, ar.hy - ar.r * 0.6, ar.r * 0.2, 0, Math.PI * 2); g.fill();

        // ── Papa en Toinette
        const r = R, x = s.x, y = FLOOR;
        const hipY = y - 1.9 * r, sy = hipY - 2.05 * r;
        const pp = s.poseT > 0 ? Math.sin((1 - s.poseT / POSE_T) * Math.PI) : 0;
        let dip = 0, lean = 0;
        let hl = { x: x - 0.55 * r, y: hipY - 0.2 * r }, hr = { x: x + 0.55 * r, y: hipY - 0.2 * r };
        const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
        if (end) {
          const k = Math.min(1, s.endT * 3);
          if (won) { dip = Math.abs(Math.sin(s.endT * 3)) * 0.8; hl = mix(hl, { x: x - 1.6 * r, y: hipY + 0.3 * r }, k); hr = mix(hr, { x: x + 1.6 * r, y: hipY + 0.3 * r }, k); }
          else { hl = mix(hl, { x: x - 0.5 * r, y: sy - 0.6 * r }, k); hr = mix(hr, { x: x + 0.5 * r, y: sy - 0.6 * r }, k); lean = Math.sin(s.t * 14) * 0.03; }
        } else if (s.poseDir && pp > 0) {
          const d = s.poseDir;
          if (d === 'up') { hl = mix(hl, { x: x - 1.5 * r, y: sy - 1.4 * r }, pp); hr = mix(hr, { x: x + 1.5 * r, y: sy - 1.4 * r }, pp); }
          else if (d === 'down') { dip = pp; hl = mix(hl, { x: x - 1.65 * r, y: hipY + 0.35 * r }, pp); hr = mix(hr, { x: x + 1.65 * r, y: hipY + 0.35 * r }, pp); }
          else { const sg = d === 'left' ? -1 : 1; lean = sg * pp * 0.12; const hand = { x: x + sg * 1.95 * r, y: sy + 0.1 * r }; if (sg < 0) hl = mix(hl, hand, pp); else hr = mix(hr, hand, pp); }
        }
        if (s.stumble > 0) lean += Math.sin(s.t * 30) * 0.1 * s.stumble;
        // une main se tend vers l'orange en vol
        if (s.air) {
          const target = { x: s.air.x, y: s.air.y };
          const k = s.air.res === 'caught' ? Math.max(0, 1 - s.air.k) : 0.75;
          if (s.air.x < x) hl = mix(hl, target, k); else hr = mix(hr, target, k);
        }

        g.save();
        g.translate(x, y); g.rotate(lean); g.scale(1 + 0.05 * dip, 1 - 0.16 * dip); g.translate(-x, -y);
        const expr = end ? (won ? 'happy' : 'laugh') : s.air && !s.air.res ? 'panic' : s.catchT > 0 ? 'happy' : s.stumble > 0 ? 'worried' : s.poseT > 0 ? 'smile' : 'focus';
        const info = api.avatar(g, {
          x, y, size: SIZE, t: s.t, pose: 'stand', expression: expr, tilt: dip * 0.25 - lean,
          hands: { l: { x: x - 0.35 * r, y: sy + 1.3 * r }, r: { x: x + 0.35 * r, y: sy + 1.3 * r } },
          sweat: !!(s.air && !s.air.res) && !end, blush: 0.7, lookX: s.air ? clamp((s.air.x - x) / 120, -1, 1) : 0,
        });
        // jupe longue
        g.fillStyle = DRESS;
        g.beginPath();
        g.moveTo(x - 1.15 * r, hipY - 0.5 * r);
        g.quadraticCurveTo(x - 1.6 * r, hipY + 0.6 * r, x - 1.85 * r, y - 0.2 * r);
        for (let k = 0; k < 6; k++) g.quadraticCurveTo(x - 1.85 * r + (k + 0.5) * 0.617 * r, y - 0.05 * r + Math.sin(s.t * 5 + k) * 2, x - 1.85 * r + (k + 1) * 0.617 * r, y - 0.2 * r);
        g.quadraticCurveTo(x + 1.6 * r, hipY + 0.6 * r, x + 1.15 * r, hipY - 0.5 * r);
        g.closePath(); g.fill();
        g.strokeStyle = DRESS_D; g.lineWidth = 2;
        for (const k of [-0.9, 0, 0.9]) { g.beginPath(); g.moveTo(x + k * 0.6 * r, hipY); g.lineTo(x + k * 1.2 * r, y - 0.3 * r); g.stroke(); }
        // chemise blanche dans le décolleté
        g.fillStyle = APRON;
        g.beginPath(); g.moveTo(x - 0.62 * r, sy - 0.1 * r); g.lineTo(x + 0.62 * r, sy - 0.1 * r); g.lineTo(x + 0.5 * r, sy + 0.7 * r); g.lineTo(x - 0.5 * r, sy + 0.7 * r); g.fill();
        // corsage
        g.fillStyle = DRESS;
        g.beginPath();
        g.moveTo(x - 1.12 * r, sy + 0.08 * r);
        g.lineTo(x - 0.58 * r, sy - 0.06 * r);
        g.quadraticCurveTo(x, sy + 0.6 * r, x + 0.58 * r, sy - 0.06 * r);
        g.lineTo(x + 1.12 * r, sy + 0.08 * r);
        g.quadraticCurveTo(x + 1.32 * r, sy + 1.0 * r, x + 1.2 * r, hipY - 0.25 * r);
        g.lineTo(x - 1.2 * r, hipY - 0.25 * r);
        g.quadraticCurveTo(x - 1.32 * r, sy + 1.0 * r, x - 1.12 * r, sy + 0.08 * r);
        g.closePath(); g.fill();
        // laçage
        g.strokeStyle = APRON; g.lineWidth = 1.5;
        g.beginPath();
        for (let k = 0; k < 4; k++) { const yy = sy + 1.1 * r + k * 0.22 * r; g.moveTo(x - 0.18 * r, yy); g.lineTo(x + 0.18 * r, yy + 0.22 * r); g.moveTo(x + 0.18 * r, yy); g.lineTo(x - 0.18 * r, yy + 0.22 * r); }
        g.stroke();
        // tablier de servante
        g.fillStyle = APRON;
        g.beginPath();
        g.moveTo(x - 0.85 * r, hipY - 0.35 * r); g.lineTo(x + 0.85 * r, hipY - 0.35 * r);
        g.lineTo(x + 1.1 * r, y - 0.42 * r); g.quadraticCurveTo(x, y - 0.25 * r, x - 1.1 * r, y - 0.42 * r);
        g.closePath(); g.fill();
        g.strokeStyle = '#d8ccb8'; g.lineWidth = 2; g.strokeRect(x - 0.35 * r, hipY + 0.35 * r, 0.7 * r, 0.5 * r);
        g.fillStyle = '#e6dccb'; g.fillRect(x - 1.22 * r, hipY - 0.42 * r, 2.44 * r, 0.16 * r);
        // dentelle du décolleté
        g.fillStyle = LACE;
        for (let k = 0; k <= 8; k++) {
          const u = k / 8, px = x - 0.58 * r + u * 1.16 * r, py = sy - 0.06 * r + (1 - (2 * u - 1) ** 2) * 0.33 * r;
          g.beginPath(); g.arc(px, py, 0.07 * r, 0, Math.PI * 2); g.fill();
        }
        // LES DEUX ORANGES (le gag)
        for (const i of [0, 1]) {
          if (s.or[i] !== 'in') continue;
          const wob = s.jolt * Math.sin(s.t * 18 + i * 2) * 0.06 * r;
          orangeShape(g, x + (i ? 1 : -1) * 0.42 * r + wob, chestY() - (s.poseT > 0 ? pp * 0.08 * r : 0), 0.33 * r, i ? 0.4 : -0.4);
        }
        // bras : manches bouffantes + avant-bras
        const a = 0.95 * r;
        for (const [side, h] of [[-1, hl], [1, hr]]) {
          const shx = x + side * 1.0 * r, shy = sy + 0.2 * r;
          const e = elbow(shx, shy, h.x, h.y, a, side);
          g.lineCap = 'round';
          g.strokeStyle = DRESS; g.lineWidth = 0.46 * r;
          g.beginPath(); g.moveTo(shx, shy); g.lineTo(e.ex, e.ey); g.stroke();
          g.fillStyle = DRESS; g.beginPath(); g.arc(shx, shy + 0.05 * r, 0.38 * r, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#efc29e'; g.lineWidth = 0.32 * r;
          g.beginPath(); g.moveTo(e.ex, e.ey); g.lineTo(e.hx, e.hy); g.stroke();
          g.fillStyle = LACE; g.beginPath(); g.arc(e.ex, e.ey, 0.24 * r, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#efc29e'; g.beginPath(); g.arc(e.hx, e.hy, 0.21 * r, 0, Math.PI * 2); g.fill();
        }
        // bonnet de servante (cornette à volants) + ruban
        const bx = info.hx, by = info.hy;
        g.fillStyle = LACE;
        for (let k = 0; k <= 10; k++) { const an = Math.PI + k * Math.PI / 10; g.beginPath(); g.arc(bx + Math.cos(an) * r * 0.98, by - 0.12 * r + Math.sin(an) * r * 0.9, r * 0.2, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#f6f2ea';
        g.beginPath(); g.ellipse(bx, by - 0.45 * r, r * 0.95, r * 0.62, 0, Math.PI, 0); g.fill();
        g.fillRect(bx - r * 0.95, by - 0.46 * r, r * 1.9, 0.18 * r);
        g.fillStyle = '#e872a6';
        g.beginPath(); g.ellipse(bx + 0.95 * r, by - 0.25 * r, 0.2 * r, 0.11 * r, 0.6, 0, Math.PI * 2); g.ellipse(bx + 1.0 * r, by - 0.02 * r, 0.2 * r, 0.11 * r, -0.6, 0, Math.PI * 2); g.fill();
        g.restore();

        // réplique de Toinette
        if (s.lineT > 0 && !end) {
          const lx = x + 70, ly = sy - 2.3 * r;
          api.roundRect(g, lx - 6, ly - 20, 150, 36, 14); g.fillStyle = 'rgba(255, 250, 238, 0.95)'; g.fill();
          g.beginPath(); g.moveTo(lx + 8, ly + 14); g.lineTo(lx - 12, ly + 32); g.lineTo(lx + 26, ly + 14); g.fill();
          api.text(g, s.line, lx + 69, ly - 2, { size: 17, color: '#5a1a20', font: 'Georgia, serif' });
        }

        // cercle de rattrapage + orange en vol
        const o = s.air;
        if (o && !o.res && !end) {
          const inWin = o.vy > 0 && Math.abs(o.y - o.ringY) <= CATCH;
          const near = o.vy > 0 && o.y > o.ringY - 140;
          g.save();
          g.setLineDash(inWin ? [] : [8, 6]);
          g.lineWidth = inWin ? 6 : 3;
          g.strokeStyle = inWin ? '#7dff8a' : near ? '#ffe9a8' : 'rgba(255,255,255,0.6)';
          g.beginPath(); g.arc(o.ringX, o.ringY, 34 + (inWin ? 4 : 0), 0, Math.PI * 2); g.stroke();
          g.restore();
          api.text(g, inWin ? 'MAINTENANT !' : 'Espace / clic', o.ringX, o.ringY + 56, { size: inWin ? 22 : 16, color: inWin ? '#7dff8a' : '#fff', stroke: '#000a', strokeWidth: 4 });
        }
        if (o) orangeShape(g, o.x, o.y, o.res ? 0.33 * R : 12, o.rot);
        for (const l of s.loose) orangeShape(g, l.x, l.y - 12, 12, l.rot);

        // flammes de la rampe
        for (let i = 0; i < 12; i++) {
          const fx = 70 + i * 74, fl = 1 + Math.sin(s.t * 13 + i * 1.7) * 0.15;
          g.fillStyle = 'rgba(255, 200, 90, 0.22)'; g.beginPath(); g.arc(fx, 444, 14 * fl, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffb53a'; g.beginPath(); g.ellipse(fx, 445, 4 * fl, 8 * fl, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(fx, 447, 2, 4, 0, 0, Math.PI * 2); g.fill();
        }

        // le public
        for (const p of s.audience) {
          const bob = laughing ? Math.abs(Math.sin(s.t * 12 + p.x)) * 7 : (won || s.clapT > 0) ? Math.abs(Math.sin(s.t * 9 + p.x)) * 4 : 0;
          g.fillStyle = ['#2a1c2a', '#22161f', '#301f2c'][p.c];
          g.beginPath(); g.arc(p.x, H - 24 - bob, p.r, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.ellipse(p.x, H + 8 - bob, p.r * 1.6, p.r, 0, 0, Math.PI * 2); g.fill();
        }
        if (laughing) for (let i = 0; i < 3; i++) api.text(g, 'HA HA HA', 150 + i * 250, H - 64 - Math.abs(Math.sin(s.t * 7 + i)) * 10, { size: 22, color: '#ffe9a8', stroke: '#000a', strokeWidth: 4 });
        else if (s.clapT > 0 && !end) api.text(g, 'clap clap !', 200 + (s.cues % 3) * 200, H - 66, { size: 18, color: '#fff', stroke: '#000a', strokeWidth: 4 });

        // fin : rideau qui tombe, ou fou rire
        if (end && won) {
          const k = clamp(s.endT / 0.9, 0, 1), cw = k * W / 2;
          for (const side of [0, 1]) {
            const x0 = side ? W - cw : 0;
            g.fillStyle = '#b01c30'; g.fillRect(x0, 0, cw, 484);
            g.fillStyle = 'rgba(0, 0, 0, 0.18)';
            for (let fx = 0; fx < cw; fx += 30) g.fillRect(x0 + fx + 18, 0, 8, 484);
            g.fillStyle = '#e8b84a'; g.fillRect(x0, 474, cw, 10);
          }
          if (k > 0.6) api.text(g, 'Bravo Toinette !', W / 2, 220, { size: 52, color: '#ffe9a8', stroke: '#5a1030', strokeWidth: 8 });
        } else if (end) {
          api.text(g, 'Fou rire général !', W / 2, 200, { size: 46, color: '#fff', stroke: '#5a1030', strokeWidth: 8 });
        }

        if (!end) {
          // carton du souffleur
          api.text(g, 'Le souffleur :', W / 2, 62, { size: 15, color: '#ffe9a8', stroke: '#000a', strokeWidth: 4 });
          if (s.cue) {
            const c = s.cue, k = clamp(c.left / c.win, 0, 1);
            api.roundRect(g, 290, 76, 380, 58, 14); g.fillStyle = '#f2e2b8'; g.fill();
            g.strokeStyle = '#8a5a2a'; g.lineWidth = 3; g.stroke();
            api.roundRect(g, 300, 84, 42, 42, 10); g.fillStyle = '#7c2338'; g.fill();
            const [ax, ay] = BTN[c.dir];
            g.fillStyle = '#fff'; g.beginPath();
            g.moveTo(321 + ax * 13, 105 + ay * 13); g.lineTo(321 - ax * 9 + ay * 11, 105 - ay * 9 + ax * 11); g.lineTo(321 - ax * 9 - ay * 11, 105 - ay * 9 - ax * 11); g.fill();
            api.text(g, c.text, 500, 105, { size: 30, color: '#5a1a20', font: 'Georgia, serif' });
            g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(300, 138, 360, 6);
            g.fillStyle = k > 0.35 ? '#7fd67a' : '#e0453a'; g.fillRect(300, 138, 360 * k, 6);
          }
          if (s.msgT > 0) api.text(g, s.msg, W / 2, 172, { size: 26, color: '#fff', stroke: '#5a1030' });

          // HUD
          api.text(g, 'Oranges', 34, 82, { size: 18, align: 'left', color: '#ffc36b', stroke: '#000a', strokeWidth: 4 });
          for (const i of [0, 1]) {
            if (s.or[i] === 'lost') { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.arc(48 + i * 30, 110, 11, 0, Math.PI * 2); g.stroke(); }
            else orangeShape(g, 48 + i * 30, 110, 11, 0);
          }
          api.text(g, `Répliques : ${s.cues}`, 34, 140, { size: 18, align: 'left', color: '#fff', stroke: '#000a', strokeWidth: 4 });

          // croix de boutons (souris / tactile)
          for (const [d, [ax, ay]] of Object.entries(BTN)) {
            const bx = PAD.x + ax * PAD.d, by = PAD.y + ay * PAD.d * 0.9, hot = s.cue && s.cue.dir === d;
            g.fillStyle = hot ? '#e8b84a' : 'rgba(40, 20, 30, 0.75)';
            g.beginPath(); g.arc(bx, by, PAD.r, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#e8b84a'; g.lineWidth = 2; g.stroke();
            g.fillStyle = hot ? '#5a1a20' : '#fff'; g.beginPath();
            g.moveTo(bx + ax * 11, by + ay * 11); g.lineTo(bx - ax * 7 + ay * 9, by - ay * 7 + ax * 9); g.lineTo(bx - ax * 7 - ay * 9, by - ay * 7 - ax * 9); g.fill();
          }
        }
      },
    };
  },
};

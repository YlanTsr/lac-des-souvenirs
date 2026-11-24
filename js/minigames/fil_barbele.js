/**
 * Anecdote #4 — « Le fil barbelé du verger » (fil_barbele)
 * Papa fonce à travers le verger… et les fils barbelés sont pile à hauteur de visage.
 * Vraie histoire : il crie à Maman « Je saigne, je saigne ! »… elle entend « Un cerf, un cerf ! »
 * et cherche le cerf du regard. Elle le cherche encore.
 * Mécanique : maintenir l'action pour baisser la tête au bon moment.
 * À 55 ans, on ne reste pas accroupi éternellement : au bout d'1,2 s le dos dit stop,
 * et il faut relâcher avant de pouvoir se baisser à nouveau.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'fil_barbele',
  title: 'Le fil barbelé du verger',
  instructions: 'Tu traverses le verger en courant, mais les fils barbelés sont pile à hauteur de visage : baisse la tête au bon moment, sinon c’est « Je saigne ! »… et Maman entend « Un cerf ! ».',
  controls: 'Maintenir Espace / ↓ / clic : baisser la tête',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Passé sous les barbelés !',
  failTitle: '« Un cerf ?! »',
  successText: 'Passé sous les barbelés presque sans une égratignure ! Maman, elle, cherche encore le cerf.',
  failText: 'Tu criais « Je saigne, je saigne ! », Maman entendait « Un cerf, un cerf ! ». Elle cherche encore le cerf.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const GROUND = 452;
    const PX = 250;        // position de Papa à l'écran
    const SPEED = 330;     // défilement (px/s)
    const SIZE = 54;       // diamètre de la tête
    const r = SIZE / 2;
    const WIRE_Y = 300;    // hauteur du fil = hauteur du visage debout
    const N_WIRES = 6;
    const MX = 790, MY = 334, MSIZE = 30; // Maman, au fond du verger
    const CERF_LINES = ['Un cerf ?! Où ça ?', 'Un cerf, un cerf ?!', 'Encore un cerf ?!', 'Je le vois pas, ton cerf !', 'Il est où, le cerf ?!', 'Toute une harde ?!'];
    const s = {
      dist: 0, ducking: false, duckT: 0, backPain: 0, needRelease: false, hits: 0, passed: 0, hitFlash: 0, slow: 0,
      wires: Array.from({ length: N_WIRES }, (_, i) => ({ x: 900 + i * 430 + rand(-60, 60), hit: false, passed: false })),
      trees: Array.from({ length: 9 }, (_, i) => ({ x: i * 150 + rand(0, 60), s: rand(0.8, 1.2), apples: Math.floor(rand(3, 7)) })),
      far: Array.from({ length: 7 }, (_, i) => ({ x: i * 170 + rand(0, 40), s: rand(0.5, 0.8) })),
      t: 0,
      pSay: '', pSayT: 0,                // bulle de Papa
      mSay: '', mSayT: 0, mDelay: 0,     // bulle de Maman (avec un temps de « réception »)
      searching: false, deers: [],       // Maman aux jumelles + cerfs imaginaires
    };

    const headY = () => (s.ducking ? GROUND - 3.4 * r : GROUND - 5.05 * r);
    function cerf(x) {
      s.deers.push({ x, y: MY + rand(-6, 8), t: 0, life: 2.2, flip: Math.random() < 0.5 });
      if (s.deers.length > 4) s.deers.shift();
    }

    return {
      state: s, // exposé pour les tests depuis la console
      update(dt, input) {
        s.t += dt;
        s.hitFlash = Math.max(0, s.hitFlash - dt * 2);
        s.slow = Math.max(0, s.slow - dt);
        s.backPain = Math.max(0, s.backPain - dt);
        s.pSayT = Math.max(0, s.pSayT - dt);
        s.mSayT = Math.max(0, s.mSayT - dt);
        const want = !api.ended && (input.held() || input.held('down'));
        if (!want) s.needRelease = false;
        if (want && s.backPain === 0 && !s.needRelease) {
          s.ducking = true;
          s.duckT += dt;
          if (s.duckT > 1.2) {
            s.ducking = false; s.backPain = 0.45; s.duckT = 0; s.needRelease = true;
            api.sfx('ouch');
            if (s.pSayT <= 0.3) { s.pSay = 'Aïe, le dos !'; s.pSayT = 1; }
          }
        } else {
          s.ducking = false;
          s.duckT = 0;
        }

        // Maman « reçoit » le cri avec un petit temps de retard… et comprend de travers
        if (s.mDelay > 0) {
          s.mDelay -= dt;
          if (s.mDelay <= 0) {
            s.mSay = CERF_LINES[Math.min(CERF_LINES.length - 1, s.hits - 1)];
            s.mSayT = 1.7; s.searching = true;
            api.sfx('boing');
            let dx = rand(470, 930);
            if (Math.abs(dx - MX) < 80) dx = MX + (dx < MX ? -100 : 100);
            cerf(clamp(dx, 460, 930));
          }
        }
        for (const d of s.deers) d.t += dt;
        s.deers = s.deers.filter((d) => d.t < d.life);

        const v = SPEED * (s.slow > 0 ? 0.45 : 1) * (api.ended ? 0.6 : 1);
        s.dist += v * dt;
        for (const w of s.wires) {
          w.x -= v * dt;
          const near = Math.abs(w.x - (PX + 14)) < r * 0.9;
          if (near && !w.hit && !w.passed && !s.ducking && !api.ended && Math.abs(headY() - WIRE_Y) < r) {
            w.hit = true;
            s.hits++;
            s.hitFlash = 1;
            s.slow = 0.6;
            s.pSay = 'Je saigne, je saigne !'; s.pSayT = 1.3;
            s.mDelay = 0.5;
            api.sfx('ouch');
            api.shake(12);
            api.burst(PX + 14, WIRE_Y, { n: 10, shape: 'star', color: ['#ffe14d', '#ffffff'], speed: 200, gravity: 200, size: 8 });
          }
          if (!w.passed && w.x < PX - 40) {
            w.passed = true;
            s.passed++;
            if (!w.hit) api.sfx('pop');
          }
        }
        for (const t of s.trees) { t.x -= v * dt * 0.8; if (t.x < -120) t.x += 9 * 150; }
        for (const t of s.far) { t.x -= v * dt * 0.3; if (t.x < -100) t.x += 7 * 170; }

        if (!api.ended && s.passed >= N_WIRES) {
          s.searching = true; s.mDelay = 0; s.mSay = 'Il est où, ce cerf ?'; s.mSayT = 1.6;
          cerf(MX - 160);
          if (s.hits === 0) api.end(true, 'Six fils, zéro égratignure, pas un seul « Je saigne ! »… et pourtant Maman cherche encore le cerf.');
          else if (s.hits === 1) api.end(true, 'Un seul « Je saigne ! », une petite égratignure de héros… Maman, aux jumelles, cherche encore le cerf.');
          else api.end(false, `${s.hits} fois « Je saigne, je saigne ! »… Maman a entendu « Un cerf, un cerf ! ». Elle cherche encore le cerf.`);
        }
      },
      timeout() {
        s.searching = true;
        return s.hits <= 1;
      },
      draw(g) {
        // ciel de fin d'après-midi + collines
        const sky = g.createLinearGradient(0, 0, 0, GROUND);
        sky.addColorStop(0, '#8fc6ef'); sky.addColorStop(1, '#fbe4b8');
        g.fillStyle = sky; g.fillRect(0, 0, W, GROUND);
        g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(800, 110, 46, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#9fcf8a';
        g.beginPath(); g.moveTo(0, 360); g.quadraticCurveTo(240, 290, 480, 350); g.quadraticCurveTo(720, 300, W, 350); g.lineTo(W, GROUND); g.lineTo(0, GROUND); g.fill();
        // arbres lointains
        for (const t of s.far) {
          g.fillStyle = '#7fb36f';
          g.beginPath(); g.arc(t.x, 330, 40 * t.s, 0, Math.PI * 2); g.fill();
        }
        // pommiers (premier plan)
        for (const t of s.trees) {
          const x = t.x, base = GROUND;
          g.fillStyle = '#7a5332'; g.fillRect(x - 9 * t.s, base - 150 * t.s, 18 * t.s, 150 * t.s);
          g.fillStyle = '#4f9a4a';
          g.beginPath(); g.arc(x, base - 175 * t.s, 62 * t.s, 0, Math.PI * 2); g.arc(x - 45 * t.s, base - 150 * t.s, 42 * t.s, 0, Math.PI * 2); g.arc(x + 45 * t.s, base - 150 * t.s, 42 * t.s, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#e0473a';
          for (let a = 0; a < t.apples; a++) { g.beginPath(); g.arc(x - 50 * t.s + ((a * 37) % 100) * t.s, base - 200 * t.s + ((a * 53) % 80) * t.s, 7 * t.s, 0, Math.PI * 2); g.fill(); }
        }

        // cerfs imaginaires (pointillés : ils n'existent que dans la tête de Maman)
        for (const d of s.deers) {
          const a = Math.min(1, d.t / 0.3, (d.life - d.t) / 0.5);
          deer(g, d.x, d.y, 0.9, a, d.flip);
        }

        // Maman, au fond du verger
        drawMaman(g);

        // sol
        g.fillStyle = '#6aa553'; g.fillRect(0, GROUND, W, H - GROUND);
        g.fillStyle = '#5a9446';
        for (let i = 0; i < 24; i++) { const gx = ((i * 61 - s.dist) % (W + 40) + W + 40) % (W + 40) - 20; g.fillRect(gx, GROUND + 10 + (i % 3) * 18, 18, 4); }

        // fils barbelés (poteau + fil à hauteur de visage)
        for (const w of s.wires) {
          if (w.x < -80 || w.x > W + 80) continue;
          g.fillStyle = '#c9b38d'; g.fillRect(w.x + 38, WIRE_Y - 40, 10, GROUND - WIRE_Y + 40);
          g.fillStyle = '#b39b7a'; g.fillRect(w.x - 48, WIRE_Y - 30, 8, GROUND - WIRE_Y + 30);
          g.strokeStyle = '#2f343c'; g.lineWidth = 4;
          for (const off of [0, 3]) {
            g.beginPath();
            for (let k = 0; k <= 12; k++) { const px = w.x - 44 + k * 7.5, py = WIRE_Y + off + Math.sin(k * 1.7) * 2; k ? g.lineTo(px, py) : g.moveTo(px, py); }
            g.stroke();
          }
          g.lineWidth = 2;
          for (let k = 0; k < 5; k++) {
            const bx = w.x - 34 + k * 18;
            g.beginPath(); g.moveTo(bx - 5, WIRE_Y - 5); g.lineTo(bx + 5, WIRE_Y + 7); g.moveTo(bx + 5, WIRE_Y - 5); g.lineTo(bx - 5, WIRE_Y + 7); g.stroke();
          }
        }

        // Papa qui court
        const info = api.avatar(g, {
          x: PX, y: GROUND, size: SIZE, pose: s.ducking ? 'duck' : 'run', t: s.t,
          expression: s.hitFlash > 0.3 ? 'panic' : api.ended ? (s.hits <= 1 ? 'happy' : 'laugh') : s.ducking ? 'focus' : s.backPain > 0 ? 'ouch' : 'happy',
          scratches: s.hits * 2, tears: s.hitFlash > 0.5, sweat: s.backPain > 0,
        });
        // pansements (un par fil pris dans la figure)
        if (info) {
          const spots = [[-0.45, -0.35, 0.5], [0.42, 0.12, -0.6], [-0.05, -0.68, 0.15], [0.5, -0.42, 0.9], [-0.52, 0.28, -0.3], [0.1, 0.42, 0.4]];
          for (let i = 0; i < Math.min(s.hits, spots.length); i++) {
            const [ox, oy, rot] = spots[i];
            plaster(g, info.hx + ox * info.r, info.hy + oy * info.r, info.r * 0.62, rot);
          }
        }

        // aide visuelle : flèche sur le prochain fil
        const next = s.wires.find((w) => !w.passed);
        if (next && next.x < 640 && next.x > PX + 30 && !api.ended) {
          const a = Math.max(0, Math.min(1, (640 - next.x) / 300));
          api.text(g, '⬇ Baisse la tête !', next.x, WIRE_Y - 66, { size: 22, color: `rgba(255,255,255,${a})`, stroke: `rgba(120,40,30,${a})` });
        }

        // bulles
        if (s.pSayT > 0 && info) bubble(g, s.pSay, info.hx - 22, info.hy - info.r - 2, PX - 60, { size: 20, border: s.pSay.startsWith('Je') ? '#b03a2e' : '#333', color: s.pSay.startsWith('Je') ? '#b03a2e' : '#2a2a2a' });
        if (s.mSayT > 0) bubble(g, s.mSay, MX, MY - 4.7 * MSIZE / 2 - MSIZE / 2 - 4, MX - 30, { size: 18, border: '#c8486b', color: '#8a2a4a' });

        api.text(g, `Fils passés : ${s.passed} / ${N_WIRES}   ·   « Je saigne ! » : ${s.hits}`, W / 2, 64, { size: 22, color: '#2b3a1a', weight: 700, stroke: 'rgba(255,255,255,0.6)', strokeWidth: 4 });

        // ── helpers de dessin ──
        function drawMaman(c) {
          const mr = MSIZE / 2;
          const hx = MX + 0.05 * mr, hy = MY - 4.7 * mr;
          c.fillStyle = 'rgba(40,70,30,0.25)'; c.beginPath(); c.ellipse(MX, MY, 18, 4, 0, 0, Math.PI * 2); c.fill();
          if (!s.searching) {
            drawPerson(c, { ...PEOPLE.maman, x: MX, y: MY, size: MSIZE, t: s.t, expression: 'smile', pose: 'stand' });
            return;
          }
          // aux jumelles, elle balaie le verger du regard
          const scan = Math.sin(s.t * 2.4);
          const bx = hx + scan * mr * 0.45, by = hy + mr * 0.05;
          drawPerson(c, {
            ...PEOPLE.maman, x: MX, y: MY, size: MSIZE, t: s.t, expression: 'surprised', pose: 'stand',
            hands: { l: { x: bx - mr * 0.55, y: by + mr * 0.35 }, r: { x: bx + mr * 0.55, y: by + mr * 0.35 } },
          });
          c.fillStyle = '#2b2b30';
          for (const sgn of [-1, 1]) { c.beginPath(); c.arc(bx + sgn * mr * 0.3, by, mr * 0.3, 0, Math.PI * 2); c.fill(); }
          c.fillRect(bx - mr * 0.12, by - mr * 0.12, mr * 0.24, mr * 0.24);
          c.fillStyle = '#9fd3ff';
          for (const sgn of [-1, 1]) { c.beginPath(); c.arc(bx + sgn * mr * 0.3 + scan * 1.5, by, mr * 0.14, 0, Math.PI * 2); c.fill(); }
          // petits « ? » qui flottent
          const q = (s.t * 0.8) % 1;
          api.text(c, '?', hx + mr * 1.3, hy - mr * 0.8 - q * 14, { size: 18, color: `rgba(140,40,80,${1 - q})`, weight: 800 });
        }
        function deer(c, x, y, sc, a, flip) {
          c.save(); c.translate(x, y); c.scale(flip ? -sc : sc, sc);
          c.fillStyle = `rgba(150,100,60,${0.35 * a})`;
          c.strokeStyle = `rgba(110,70,40,${0.9 * a})`; c.lineWidth = 2; c.lineCap = 'round';
          c.setLineDash([5, 4]);
          c.beginPath(); c.ellipse(0, -30, 24, 11, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.beginPath();
          for (const lx of [-16, -10, 12, 18]) { c.moveTo(lx, -22); c.lineTo(lx + (lx > 0 ? 2 : -2), 0); }
          c.moveTo(18, -36); c.lineTo(26, -56); c.stroke();
          c.beginPath(); c.ellipse(31, -60, 9, 6, 0.4, 0, Math.PI * 2); c.fill(); c.stroke();
          c.beginPath();
          c.moveTo(27, -65); c.lineTo(22, -82); c.moveTo(24, -74); c.lineTo(16, -80); c.moveTo(23, -78); c.lineTo(26, -88);
          c.moveTo(31, -66); c.lineTo(36, -82); c.moveTo(34, -76); c.lineTo(42, -80);
          c.stroke();
          c.setLineDash([]);
          c.restore();
          api.text(c, '?', x, y - 100 * sc, { size: 24, color: `rgba(255,255,255,${a})`, stroke: `rgba(110,70,40,${a})`, strokeWidth: 4, weight: 800 });
        }
        function plaster(c, x, y, len, rot) {
          c.save(); c.translate(x, y); c.rotate(rot);
          c.fillStyle = '#f2cf9e'; c.strokeStyle = '#c99a62'; c.lineWidth = 1;
          api.roundRect(c, -len / 2, -len * 0.17, len, len * 0.34, len * 0.15); c.fill(); c.stroke();
          c.fillStyle = '#fbe8cc'; c.fillRect(-len * 0.14, -len * 0.13, len * 0.28, len * 0.26);
          c.restore();
        }
        function bubble(c, str, tipX, tipY, cx, o = {}) {
          const size = o.size ?? 18;
          c.font = `800 ${size}px "Nunito Sans", system-ui, sans-serif`;
          const w = c.measureText(str).width + 22, h = size + 16;
          const bx = clamp(cx - w / 2, 8, W - w - 8), by = tipY - 12 - h;
          c.fillStyle = '#fff'; c.strokeStyle = o.border ?? '#333'; c.lineWidth = 2.5;
          api.roundRect(c, bx, by, w, h, 10); c.fill(); c.stroke();
          const ax = clamp(tipX, bx + 14, bx + w - 14);
          c.beginPath(); c.moveTo(ax - 7, by + h - 1); c.lineTo(tipX, tipY); c.lineTo(ax + 7, by + h - 1); c.closePath(); c.fill();
          c.beginPath(); c.moveTo(ax - 7, by + h); c.lineTo(tipX, tipY); c.lineTo(ax + 7, by + h); c.stroke();
          api.text(c, str, bx + w / 2, by + h / 2 + 1, { size, color: o.color ?? '#2a2a2a', weight: 800 });
        }
      },
    };
  },
};

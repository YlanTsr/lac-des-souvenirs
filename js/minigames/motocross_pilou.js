/**
 * « La motocross » (motocross_pilou)
 * Papa a eu sa première motocross… et a tellement encouragé Pilou à l'essayer
 * que Pilou a fini par terre (et la jambe ouverte).
 * Mécanique : chaque « Vas-y Pilou ! » (Espace / clic) fait accélérer la moto ;
 * la vitesse retombe toute seule (et varie avec les bosses). Il faut rester dans
 * la zone verte jusqu'à l'arrivée : trop d'encouragements = zone rouge = chute,
 * pas assez = la moto cale.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'motocross_pilou',
  title: 'La motocross',
  instructions: 'Encourage Pilou pour qu’il arrive au bout de la piste : garde la vitesse dans le vert, ni trop (chute !), ni pas assez (il cale).',
  controls: 'Espace / clic / tap : « Vas-y Pilou ! »',
  duration: 13,
  introExpression: 'laugh',
  successTitle: 'Pilou a passé la ligne !',
  failTitle: 'Gamelle !',
  successText: 'Ligne d’arrivée ! Pilou a fini en un seul morceau : tes encouragements étaient parfaitement dosés.',
  failText: 'Tu l’as tellement encouragé que Pilou a fini dans la terre… Un gros pansement plus tard, il en rigole encore.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const PX = 380;            // position de Pilou à l'écran
    const FINISH = 3150;       // longueur de la piste (px)
    const VMAX = 560;          // haut de la jauge
    const GREEN_LO = 250, GREEN_HI = 400, RED = 435, STALL = 85;
    const BOOST = 50;

    // bosses de la piste (positions fixes pour une piste lisible)
    const bumps = [];
    for (let x = 520; x < FINISH - 200; x += rand(330, 470)) bumps.push({ x, h: rand(26, 46), w: rand(55, 85) });
    const groundY = (wx) => {
      let y = 405 + 20 * Math.sin(wx * 0.0042) + 10 * Math.sin(wx * 0.013 + 1.3);
      for (const b of bumps) { const d = (wx - b.x) / b.w; if (d > -1 && d < 1) y -= b.h * (1 + Math.cos(d * Math.PI)) / 2; }
      return y;
    };
    const slopeAt = (wx) => (groundY(wx + 5) - groundY(wx - 5)) / 10;

    const s = {
      t: 0, dist: 0, v: 0, danger: 0, low: 0, cheer: 0, presses: 0,
      result: null,             // 'win' | 'crash' | 'stall'
      fx: 0, fy: 0, fvx: 0, fvy: 0, frot: 0, landed: false, motoRot: 0, motoSlide: 0,
      puffs: [],
      crowd: Array.from({ length: 6 }, (_, i) => ({ x: 300 + i * 560 + rand(-80, 80), c: ['#e07b39', '#4fa36b', '#c8486b', '#3a6fb0', '#f2b33d', '#8a8a9a'][i % 6] })),
    };

    // ── décor lointain pré-rendu (ciel, collines, sapins) ──
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const sky = b.createLinearGradient(0, 0, 0, 380);
      sky.addColorStop(0, '#7fb8e6'); sky.addColorStop(1, '#f6e2b5');
      b.fillStyle = sky; b.fillRect(0, 0, W, H);
      b.fillStyle = '#fff6d6'; b.beginPath(); b.arc(760, 120, 40, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [cx, cy, k] of [[150, 110, 1], [470, 80, 0.8], [640, 150, 0.7]]) {
        b.beginPath(); b.arc(cx, cy, 26 * k, 0, Math.PI * 2); b.arc(cx + 28 * k, cy - 10 * k, 32 * k, 0, Math.PI * 2); b.arc(cx + 60 * k, cy, 24 * k, 0, Math.PI * 2); b.fill();
      }
      b.fillStyle = '#a9c98e';
      b.beginPath(); b.moveTo(0, 330); b.quadraticCurveTo(200, 250, 420, 310); b.quadraticCurveTo(650, 260, W, 300); b.lineTo(W, H); b.lineTo(0, H); b.fill();
      b.fillStyle = '#8cb874';
      b.beginPath(); b.moveTo(0, 350); b.quadraticCurveTo(300, 300, 560, 340); b.quadraticCurveTo(800, 310, W, 345); b.lineTo(W, H); b.lineTo(0, H); b.fill();
      b.fillStyle = '#5f8f55';
      for (let i = 0; i < 16; i++) {
        const x = i * 64 + (i % 3) * 13, y = 335 + (i % 2) * 8, h = 34 + (i % 4) * 6;
        b.beginPath(); b.moveTo(x, y - h); b.lineTo(x - 13, y); b.lineTo(x + 13, y); b.fill();
      }
    }

    function crash() {
      s.result = 'crash';
      s.fx = PX + 5; s.fy = groundY(s.dist) - 50; s.fvx = 190; s.fvy = -330; s.frot = 0;
      api.sfx('ouch'); api.shake(16);
      api.burst(PX, groundY(s.dist) - 10, { n: 22, color: ['#a0703f', '#c79a62', '#7a5132'], speed: 320, gravity: 700, size: 7 });
      api.end(false, 'Trop encouragé, Pilou a décollé… et atterri jambe la première. Un gros pansement, et tu n’as plus jamais crié aussi fort !');
    }
    function stall() {
      s.result = 'stall';
      api.sfx('beep');
      api.end(false, 'Teuf… teuf… Pilou a calé au milieu de la piste. Il fallait l’encourager un peu plus fort !');
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.cheer = Math.max(0, s.cheer - dt);
        for (const p of s.puffs) { p.life -= dt; p.x -= (s.v * 0.4 + 30) * dt; p.y -= 25 * dt; p.r += 18 * dt; }
        s.puffs = s.puffs.filter((p) => p.life > 0);

        if (!api.ended) {
          if (input.pressed()) {
            s.v += BOOST;
            s.cheer = 0.45;
            s.presses++;
            api.sfx('whoosh');
            if (s.puffs.length < 30) s.puffs.push({ x: PX - 50, y: groundY(s.dist - 40) - 22, r: 7, life: 0.7 });
          }
          // freinage naturel + pente (ça accélère en descente)
          s.v += (slopeAt(s.dist) * 420 - 55 - s.v * 0.12) * dt;
          s.v = Math.max(0, s.v);
          s.dist += s.v * dt;
          if (s.v > 300 && Math.random() < dt * 8 && s.puffs.length < 30) s.puffs.push({ x: PX - 50, y: groundY(s.dist - 40) - 20, r: 5, life: 0.5 });

          // zone rouge : ça tient une demi-seconde, pas plus
          if (s.v > RED) s.danger += dt * (1 + (s.v - RED) / 60); else s.danger = Math.max(0, s.danger - dt * 1.5);
          if (s.danger > 0.4 || s.v > VMAX) { crash(); return; }
          // trop lent : la moto cale (après le démarrage)
          if (s.v < STALL && s.t > 1.6) s.low += dt; else s.low = Math.max(0, s.low - dt * 2);
          if (s.low > 0.9) { stall(); return; }

          if (s.dist >= FINISH) {
            s.result = 'win';
            api.sfx('catch');
            api.burst(PX, 200, { n: 30, color: ['#ffd34d', '#ffffff', '#e8453c', '#4fa36b'], speed: 360, gravity: 400, size: 7, shape: 'star' });
            api.end(true, s.v > GREEN_HI - 30
              ? 'Ligne franchie à fond (mais pas trop) ! Pilou est fier, toi aussi, et sa jambe est intacte.'
              : 'Ligne d’arrivée ! Pilou a fini en un seul morceau : tes encouragements étaient parfaitement dosés.');
          }
        } else if (s.result === 'win') {
          s.v = Math.max(0, s.v - 260 * dt);
          s.dist += s.v * dt;
        } else if (s.result === 'crash') {
          s.v = Math.max(0, s.v - 500 * dt);
          s.dist += s.v * dt;
          s.motoRot = Math.min(1.35, s.motoRot + dt * 4);
          if (!s.landed) {
            s.fvy += 900 * dt; s.fx += s.fvx * dt; s.fy += s.fvy * dt; s.frot += dt * 9;
            const gy = groundY(s.dist + (s.fx - PX));
            if (s.fvy > 0 && s.fy >= gy) {
              s.fy = gy; s.landed = true;
              api.sfx('splat');
              api.burst(s.fx, s.fy - 30, { n: 10, shape: 'star', color: ['#ffe14d', '#ffffff'], speed: 160, gravity: 100, size: 8 });
            }
          } else {
            s.fy = groundY(s.dist + (s.fx - PX));
          }
        } else {
          s.v = 0;
        }
      },
      timeout() {
        api.end(false, 'Pas encore arrivé ! Pilou se promène tranquillement… un peu trop. Encore quelques « Vas-y ! » et c’était gagné.');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        // spectateurs le long de la piste (défilement lent)
        for (const c of s.crowd) {
          const x = ((c.x - s.dist * 0.6) % 3400 + 3400) % 3400 - 120;
          if (x < -40 || x > W + 40) continue;
          g.fillStyle = c.c; api.roundRect(g, x - 9, 318, 18, 26, 6); g.fill();
          g.fillStyle = '#efc29e'; g.beginPath(); g.arc(x, 310, 8, 0, Math.PI * 2); g.fill();
        }

        // piste de terre
        g.fillStyle = '#9b6b3e';
        g.beginPath(); g.moveTo(0, H);
        for (let sx = 0; sx <= W; sx += 12) g.lineTo(sx, groundY(s.dist + sx - PX));
        g.lineTo(W, H); g.closePath(); g.fill();
        g.strokeStyle = '#7a5130'; g.lineWidth = 5;
        g.beginPath();
        for (let sx = 0; sx <= W; sx += 12) { const y = groundY(s.dist + sx - PX); sx ? g.lineTo(sx, y) : g.moveTo(sx, y); }
        g.stroke();
        g.fillStyle = '#86592f';
        for (let i = 0; i < 26; i++) {
          const sx = ((i * 83 - s.dist) % (W + 60) + W + 60) % (W + 60) - 30;
          g.beginPath(); g.ellipse(sx, groundY(s.dist + sx - PX) + 22 + (i % 4) * 16, 7, 3, 0, 0, Math.PI * 2); g.fill();
        }

        // ligne de départ et d'arrivée
        for (const [wx, label] of [[0, 'DÉPART'], [FINISH, 'ARRIVÉE']]) {
          const sx = wx - s.dist + PX;
          if (sx < -80 || sx > W + 80) continue;
          const gy = groundY(wx);
          g.fillStyle = '#5a4a3a'; g.fillRect(sx - 52, gy - 120, 6, 120); g.fillRect(sx + 46, gy - 120, 6, 120);
          g.fillStyle = label === 'ARRIVÉE' ? '#e8453c' : '#3a6fb0'; g.fillRect(sx - 56, gy - 142, 112, 26);
          api.text(g, label, sx, gy - 129, { size: 16, color: '#fff', weight: 800 });
          for (let k = 0; k < 6; k++) for (let m = 0; m < 2; m++) { g.fillStyle = (k + m) % 2 ? '#222' : '#fff'; g.fillRect(sx - 8 + m * 8, gy - 4 + k * 8, 8, 8); }
        }

        // pots d'échappement
        for (const p of s.puffs) { g.fillStyle = `rgba(230,225,215,${clamp(p.life * 1.3, 0, 0.8)})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); }

        // la moto
        const rx = s.dist - 34, fxw = s.dist + 34;
        const yr = groundY(rx), yf = groundY(fxw);
        const ang = Math.atan2(yf - yr, 68) - (s.result === 'crash' ? s.motoRot : 0);
        const vib = api.ended ? 0 : Math.sin(s.t * 45) * Math.min(1.5, s.v / 200);
        g.save();
        g.translate(PX, (yr + yf) / 2 - 17 + vib);
        g.rotate(ang);
        drawMoto(g, s.t * s.v / 17, s.danger);
        const riding = s.result !== 'crash';
        if (riding) {
          const expr = s.result === 'win' ? 'laugh' : s.result === 'stall' ? 'worried' : s.v > RED ? 'scared' : s.v > GREEN_LO ? 'smile' : 'surprised';
          drawPilou(g, -8, -9, expr, { l: { x: 25, y: -41 }, r: { x: 29, y: -39 } });
        }
        g.restore();

        // Pilou éjecté puis assis par terre avec son pansement
        if (!riding) {
          if (!s.landed) {
            g.save(); g.translate(s.fx, s.fy); g.rotate(s.frot);
            const fi = drawPerson(g, { ...PEOPLE.pilou, x: 0, y: 20, size: 38, expression: 'scared', pose: 'arms_up', t: s.t });
            drawHelmet(g, fi.hx, fi.hy, fi.r * 0.92);
            g.restore();
          } else {
            const info = drawPerson(g, { ...PEOPLE.pilou, x: s.fx, y: s.fy, size: 40, expression: 'worried', pose: 'sit', t: s.t });
            drawHelmet(g, info.hx, info.hy, info.r * 0.92);
            // gros pansement sur la jambe
            g.save(); g.translate(s.fx + 14, s.fy - 6); g.rotate(-0.05);
            g.fillStyle = '#fbfbf7'; api.roundRect(g, -13, -9, 26, 18, 5); g.fill();
            g.strokeStyle = '#d8d4c8'; g.lineWidth = 1.5;
            for (let k = -8; k <= 8; k += 5) { g.beginPath(); g.moveTo(k, -9); g.lineTo(k, 9); g.stroke(); }
            g.restore();
          }
        }

        // Papa au premier plan qui court à côté en criant
        const cheering = s.cheer > 0 && !api.ended;
        api.avatar(g, {
          x: 125, y: 535, size: 58, t: s.t,
          pose: api.ended ? (s.result === 'win' ? 'cheer' : 'stand') : cheering ? 'cheer' : 'run',
          expression: s.result === 'crash' ? 'panic' : s.result === 'stall' ? 'worried' : s.result === 'win' ? 'laugh' : cheering ? 'laugh' : s.v > RED ? 'surprised' : 'happy',
          sweat: s.result === 'crash', lookX: 1,
        });
        if (cheering) {
          g.fillStyle = '#fff'; api.roundRect(g, 168, 300, 170, 44, 14); g.fill();
          g.beginPath(); g.moveTo(180, 340); g.lineTo(165, 360); g.lineTo(200, 342); g.fill();
          api.text(g, 'Vas-y Pilou !', 253, 322, { size: 22, color: '#c8401f', weight: 800 });
        }

        // ── HUD : jauge de vitesse
        const gx = 28, gy = 40, gw = 300, gh = 24;
        api.text(g, 'Vitesse de Pilou', gx, 26, { size: 15, align: 'left', color: '#fff', stroke: '#000a', strokeWidth: 4 });
        g.fillStyle = '#0006'; api.roundRect(g, gx - 4, gy - 4, gw + 8, gh + 8, 10); g.fill();
        const zone = (a, b, c) => { g.fillStyle = c; g.fillRect(gx + (a / VMAX) * gw, gy, ((b - a) / VMAX) * gw, gh); };
        zone(0, STALL, '#6c6c74'); zone(STALL, GREEN_LO, '#e8c547'); zone(GREEN_LO, GREEN_HI, '#4cc265'); zone(GREEN_HI, RED, '#f0a040'); zone(RED, VMAX, '#e0473a');
        const nx = gx + clamp(s.v / VMAX, 0, 1) * gw;
        g.fillStyle = '#fff'; g.fillRect(nx - 3, gy - 7, 6, gh + 14);
        g.strokeStyle = '#000'; g.lineWidth = 1.5; g.strokeRect(nx - 3, gy - 7, 6, gh + 14);
        if (!api.ended && s.v > RED) api.text(g, 'Trop vite !!', gx + gw / 2, gy + gh + 22, { size: 22, color: '#ffdede', stroke: '#a01818' });
        else if (!api.ended && s.t > 1.6 && s.v < STALL) api.text(g, 'Il va caler !', gx + gw / 2, gy + gh + 22, { size: 22, color: '#fff', stroke: '#555' });

        // ── HUD : progression vers l'arrivée
        const px0 = 400, px1 = 740, py = 46;
        g.strokeStyle = '#0007'; g.lineWidth = 10; g.lineCap = 'round';
        g.beginPath(); g.moveTo(px0, py); g.lineTo(px1, py); g.stroke();
        g.strokeStyle = '#ffd98a'; g.lineWidth = 6;
        const pk = clamp(s.dist / FINISH, 0, 1);
        g.beginPath(); g.moveTo(px0, py); g.lineTo(px0 + (px1 - px0) * pk, py); g.stroke();
        g.fillStyle = '#e07b39'; g.beginPath(); g.arc(px0 + (px1 - px0) * pk, py, 9, 0, Math.PI * 2); g.fill();
        for (let k = 0; k < 3; k++) for (let m = 0; m < 2; m++) { g.fillStyle = (k + m) % 2 ? '#222' : '#fff'; g.fillRect(px1 + 6 + m * 7, py - 14 + k * 7, 7, 7); }
        g.fillStyle = '#5a4a3a'; g.fillRect(px1 + 4, py - 14, 2, 26);

        if (s.result === 'stall') api.text(g, 'Teuf… teuf… calé !', PX, 220, { size: 38, color: '#fff', stroke: '#555', strokeWidth: 8 });
        if (s.result === 'crash') api.text(g, 'BADABOUM !', W / 2 + 80, 200, { size: 60, color: '#ffe9c2', stroke: '#8a4a1a', strokeWidth: 10 });
        if (s.result === 'win') api.text(g, 'ARRIVÉE !', W / 2 + 80, 200, { size: 60, color: '#fff3a8', stroke: '#3a6a2a', strokeWidth: 10 });

        // ── sous-fonctions de dessin
        function drawMoto(c, spin, danger) {
          // roues
          for (const wx of [-34, 34]) {
            c.fillStyle = '#222'; c.beginPath(); c.arc(wx, 0, 17, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#9aa3ad'; c.beginPath(); c.arc(wx, 0, 8, 0, Math.PI * 2); c.fill();
            c.strokeStyle = '#555'; c.lineWidth = 2;
            for (let k = 0; k < 3; k++) { const a = spin + k * 2.09; c.beginPath(); c.moveTo(wx, 0); c.lineTo(wx + Math.cos(a) * 15, Math.sin(a) * 15); c.stroke(); }
          }
          // fourche + bras oscillant + pot
          c.strokeStyle = '#b8bec6'; c.lineWidth = 5; c.lineCap = 'round';
          c.beginPath(); c.moveTo(34, 0); c.lineTo(24, -36); c.stroke();
          c.beginPath(); c.moveTo(-34, 0); c.lineTo(-6, -12); c.stroke();
          c.strokeStyle = '#6a6a72'; c.lineWidth = 6;
          c.beginPath(); c.moveTo(-6, -10); c.lineTo(-40, -20); c.stroke();
          // cadre / réservoir / garde-boue (orange vif)
          c.fillStyle = danger > 0 ? '#ff5a3a' : '#f07a1a';
          c.beginPath(); c.moveTo(-30, -18); c.lineTo(-2, -12); c.lineTo(20, -20); c.lineTo(24, -32); c.lineTo(4, -34); c.lineTo(-30, -26); c.closePath(); c.fill();
          c.beginPath(); c.moveTo(22, -24); c.quadraticCurveTo(42, -30, 52, -14); c.lineTo(44, -14); c.quadraticCurveTo(38, -22, 22, -18); c.fill();
          c.fillStyle = '#fff'; api.roundRect(c, -2, -33, 18, 10, 4); c.fill();
          api.text(c, '55', 7, -28, { size: 9, color: '#222', weight: 800 });
          // selle
          c.fillStyle = '#222'; api.roundRect(c, -34, -32, 34, 8, 4); c.fill();
          // guidon
          c.strokeStyle = '#333'; c.lineWidth = 4;
          c.beginPath(); c.moveTo(24, -36); c.lineTo(28, -42); c.lineTo(34, -40); c.stroke();
        }
        function drawPilou(c, x, y, expr, hands) {
          // debout sur les repose-pieds, façon pilote de cross
          const info = drawPerson(c, { ...PEOPLE.pilou, x, y, size: 40, expression: expr, pose: 'stand', t: s.t, hands });
          drawHelmet(c, info.hx, info.hy, info.r * 0.92);
        }
        function drawHelmet(c, hx, hy, r) {
          c.fillStyle = '#d9362b';
          c.beginPath(); c.arc(hx, hy - 0.22 * r, r * 1.12, Math.PI, 0); c.closePath(); c.fill();
          c.beginPath(); c.ellipse(hx + 0.7 * r, hy - 0.24 * r, 0.6 * r, 0.14 * r, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#fff'; c.fillRect(hx - 0.15 * r, hy - 1.3 * r, 0.3 * r, 1.05 * r);
        }
      },
    };
  },
};

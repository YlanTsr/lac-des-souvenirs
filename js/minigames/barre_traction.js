/**
 * « La barre de traction » (barre_traction)
 * Vraie histoire : Papa s'était acheté une barre de traction pour se faire les muscles,
 * coincée entre les deux murs du couloir (barre à pression, sans vis). En pleine traction,
 * la barre a lâché… et Papa s'est étalé par terre.
 * Mécanique : Papa, suspendu, se balance ; la jauge « Élan » va et vient. Appuyer quand
 * l'aiguille est dans le vert = une traction (plus c'est près du bout, plus c'est propre).
 * Chaque traction fait un peu glisser les embouts contre les murs ; enchaîner sans pause
 * (« à la suite ») glisse de plus en plus, et un appui hors du vert est un gros à-coup.
 * Laisser passer un balancement = petite pause : la barre se recale (la jauge redescend vite).
 * 10 tractions = victoire ; jauge pleine (ou chrono écoulé) = la barre lâche.
 */
import { LOOK } from '../avatar.js';

export default {
  id: 'barre_traction',
  title: 'La barre de traction',
  instructions: 'Tire quand l’élan est dans le vert pour enchaîner 10 tractions — mais sans à-coups, et avec de petites pauses, sinon la barre glisse entre les murs !',
  controls: 'Espace / ↑ / clic : traction (quand l’élan est dans le vert)',
  duration: 13,
  introExpression: 'focus',
  successTitle: 'Monsieur Muscle !',
  failTitle: 'Patatras !',
  successText: 'Dix tractions et la barre a tenu ! Monsieur Muscle est prêt : Marseille n’a qu’à bien se tenir.',
  failText: 'La barre a lâché, et toi avec… Ce ne sera pas pour tout de suite, la vengeance sur les malfrats de Marseille !',

  create(api) {
    const { W, H, clamp, lerp } = api;
    const P = 0.8;               // période du balancement (s)
    const PULL = 0.5;            // durée d'une traction (montée + descente)
    const GOAL = 10;
    const GREEN = 0.8;           // début de la zone verte de la jauge d'élan
    const PERFECT = 0.96;        // tout au bout : traction parfaite
    const REST_CHAIN = 0.6;      // moins de ça entre deux tractions = « à la suite »
    const REST_FAST = 0.45;      // au-delà, la barre se recale vite
    const BAR_Y = 168, WL = 151, WR = 809, FLOOR = 459, PX = 480;
    const SIZE = 72, R = SIZE / 2, GRIP = 1.25 * R, ARM = 1.9 * R;
    const TANK = '#f3f0e8';

    const s = {
      t: 0, v: 0, reps: 0, slip: 0, maxSlip: 0, chain: 0, rest: 1, pullT: -1, counted: false, wob: 0,
      lastQ: 1, creak: 0, pops: [], endT: 0, broke: false, won: false,
      fall: { y0: 0, y: 0, vy: 0, landed: false }, bar: { yl: 0, yr: 0, vl: 0, vr: 0, landedL: false, landedR: false },
    };

    // ── fissures de plâtre (pré-calculées, révélées selon la glissade max) ──
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const cracks = [];
    for (const side of [-1, 1]) {
      const n = side < 0 ? 6 : 9;
      for (let i = 0; i < n; i++) {
        const x0 = side < 0 ? WL : WR, y0 = BAR_Y + (rnd() - 0.5) * 10;
        const pts = [[x0, y0]];
        const up = rnd() < 0.5 ? -1 : 1;
        let x = x0, y = y0;
        const len = 4 + Math.floor(rnd() * 4);
        for (let k = 0; k < len; k++) {
          x += side * (rnd() * 14 - 4); y += up * (6 + rnd() * 12);
          pts.push([x, y]);
        }
        cracks.push({ pts, th: 0.12 + (i / n) * 0.8, side });
      }
    }

    // ── décor pré-rendu : le couloir de la maison ──
    const xl = (d) => 260 * d, xr = (d) => W - 260 * d, top = (d) => 120 * d, bot = (d) => H - 140 * d;
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const poly = (pts, col) => { b.fillStyle = col; b.beginPath(); pts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.closePath(); b.fill(); };
      // plafond
      poly([[0, 0], [W, 0], [700, 120], [260, 120]], '#efe6d6');
      // sol : parquet
      poly([[0, H], [W, H], [700, 400], [260, 400]], '#a8743f');
      b.strokeStyle = 'rgba(70,40,15,0.35)'; b.lineWidth = 1.5;
      for (let i = 0; i <= 16; i++) {
        const xn = -200 + (i / 16) * (W + 400);
        const xf = 260 + ((xn + 0) / W) * 440;
        b.beginPath(); b.moveTo(xn, H); b.lineTo(xf, 400); b.stroke();
      }
      for (const d of [0.08, 0.2, 0.34, 0.5, 0.68, 0.86]) {
        b.beginPath(); b.moveTo(xl(d), bot(d)); b.lineTo(xr(d), bot(d)); b.stroke();
      }
      // murs latéraux : papier peint à rayures
      const stripes = (side) => {
        for (let i = 0; i < 16; i++) {
          const d1 = i / 16, d2 = (i + 1) / 16;
          const xa = side < 0 ? xl(d1) : xr(d1), xb = side < 0 ? xl(d2) : xr(d2);
          poly([[xa, top(d1)], [xb, top(d2)], [xb, bot(d2)], [xa, bot(d1)]], i % 2 ? '#e4c88e' : '#d7b57b');
          // petits motifs
          b.fillStyle = 'rgba(160,90,60,0.25)';
          for (let f = 0.15; f < 0.95; f += 0.16) {
            const dm = (d1 + d2) / 2, xm = side < 0 ? xl(dm) : xr(dm);
            b.beginPath(); b.arc(xm, lerp(top(dm), bot(dm), f), 2.2 * (1 - dm * 0.5), 0, Math.PI * 2); b.fill();
          }
        }
        // plinthe
        const xa = side < 0 ? 0 : W, xb = side < 0 ? 260 : 700;
        poly([[xa, H], [xb, 400], [xb, 392], [xa, H - 18]], '#f4efe4');
      };
      stripes(-1); stripes(1);
      // mur du fond
      b.fillStyle = '#e4c88e'; b.fillRect(260, 120, 440, 280);
      for (let x = 260; x < 700; x += 44) { b.fillStyle = '#d9ba80'; b.fillRect(x, 120, 22, 280); }
      b.fillStyle = '#f4efe4'; b.fillRect(260, 392, 440, 8);
      // arêtes
      b.strokeStyle = 'rgba(90,60,30,0.35)'; b.lineWidth = 2;
      b.beginPath(); b.moveTo(0, 0); b.lineTo(260, 120); b.lineTo(260, 400); b.lineTo(0, H);
      b.moveTo(W, 0); b.lineTo(700, 120); b.lineTo(700, 400); b.lineTo(W, H); b.stroke();
      // porte au fond
      b.fillStyle = '#f4efe4'; b.fillRect(569, 219, 102, 181);
      b.fillStyle = '#9a6a3e'; b.fillRect(577, 227, 86, 173);
      b.strokeStyle = 'rgba(60,30,10,0.4)'; b.lineWidth = 2;
      b.strokeRect(587, 240, 66, 60); b.strokeRect(587, 314, 66, 74);
      b.fillStyle = '#ffd34d'; b.beginPath(); b.arc(652, 316, 4, 0, Math.PI * 2); b.fill();
      // affiche « Marseille, j'arrive ! »
      b.fillStyle = 'rgba(0,0,0,0.18)'; b.fillRect(286, 144, 114, 158);
      b.fillStyle = '#fbf2de'; b.fillRect(282, 140, 114, 158);
      b.strokeStyle = '#c8301f'; b.lineWidth = 3; b.strokeRect(286, 144, 106, 150);
      b.textAlign = 'center'; b.textBaseline = 'middle';
      b.fillStyle = '#c8301f'; b.font = '900 16px sans-serif'; b.fillText('MARSEILLE,', 339, 162);
      b.fillStyle = '#2a2a40'; b.font = '900 15px sans-serif'; b.fillText('J’ARRIVE !', 339, 181);
      // trois malfrats à casquette, barrés
      for (const [mx, c] of [[310, '#3a3a4a'], [339, '#5a3a5a'], [368, '#3a4a3a']]) {
        b.fillStyle = '#d8a27a'; b.beginPath(); b.arc(mx, 232, 11, 0, Math.PI * 2); b.fill();
        b.fillStyle = c; b.beginPath(); b.arc(mx, 228, 11.5, Math.PI, 0); b.fill(); b.fillRect(mx, 224, 15, 4);
        b.fillStyle = '#222'; b.fillRect(mx - 6, 232, 4, 2); b.fillRect(mx + 2, 232, 4, 2);
        b.fillStyle = c; b.beginPath(); b.moveTo(mx - 13, 262); b.quadraticCurveTo(mx, 238, mx + 13, 262); b.fill();
      }
      b.strokeStyle = '#c8301f'; b.lineWidth = 4; b.lineCap = 'round';
      b.beginPath(); b.moveTo(296, 210); b.lineTo(382, 258); b.moveTo(382, 210); b.lineTo(296, 258); b.stroke();
      b.fillStyle = '#2a2a40'; b.font = '700 11px sans-serif'; b.fillText('Programme muscu', 339, 276);
      b.fillText('jour 1', 339, 288);
      // cadres sur les murs latéraux (en perspective)
      const frame = (side, dA, dB, fA, fB, paint) => {
        const X = (d) => (side < 0 ? xl(d) : xr(d)), Y = (d, f) => lerp(top(d), bot(d), f);
        const quad = (fa, fb, col) => poly([[X(dA), Y(dA, fa)], [X(dB), Y(dB, fa)], [X(dB), Y(dB, fb)], [X(dA), Y(dA, fb)]], col);
        quad(fA - 0.03, fB + 0.03, '#7a4a28');
        paint(quad, X, Y);
      };
      frame(-1, 0.18, 0.42, 0.26, 0.48, (quad, X, Y) => { // coucher de soleil sur le lac
        quad(0.28, 0.38, '#f6a65a'); quad(0.38, 0.46, '#3a6fa0');
        b.fillStyle = '#ffe08a'; b.beginPath(); b.arc(X(0.3), Y(0.3, 0.38), 9, Math.PI, 0); b.fill();
      });
      frame(1, 0.2, 0.4, 0.24, 0.44, (quad, X, Y) => { // dessin d'enfant : maison + soleil
        quad(0.26, 0.42, '#fbf6ea');
        b.fillStyle = '#ffcf3a'; b.beginPath(); b.arc(X(0.25), Y(0.25, 0.3), 7, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#e8453c'; b.fillRect(X(0.33) - 8, Y(0.33, 0.33), 16, 14);
        b.fillStyle = '#4f9a4a'; b.fillRect(X(0.36) - 3, Y(0.36, 0.38), 6, 8);
      });
      // plafonnier
      const glow = b.createRadialGradient(610, 34, 4, 610, 34, 140);
      glow.addColorStop(0, 'rgba(255,236,180,0.6)'); glow.addColorStop(1, 'rgba(255,236,180,0)');
      b.fillStyle = glow; b.fillRect(460, 0, 300, 180);
      b.fillStyle = '#fff4d0'; b.beginPath(); b.ellipse(610, 30, 34, 12, 0, 0, Math.PI * 2); b.fill();
      // haltère et carton « sans vis ! »
      b.fillStyle = 'rgba(0,0,0,0.2)'; b.beginPath(); b.ellipse(205, 512, 50, 8, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#8a8f98'; b.fillRect(172, 498, 66, 7);
      b.fillStyle = '#3a3d44';
      api.roundRect(b, 160, 484, 16, 34, 4); b.fill(); api.roundRect(b, 234, 484, 16, 34, 4); b.fill();
      b.fillStyle = '#c99a5c'; b.beginPath(); b.moveTo(716, 470); b.lineTo(830, 470); b.lineTo(848, 456); b.lineTo(734, 456); b.closePath(); b.fill();
      b.fillStyle = '#d9ac6c'; b.fillRect(716, 470, 114, 52);
      b.fillStyle = '#b5844a'; b.beginPath(); b.moveTo(830, 470); b.lineTo(848, 456); b.lineTo(848, 508); b.lineTo(830, 522); b.closePath(); b.fill();
      b.fillStyle = '#c8301f'; b.font = '900 13px sans-serif'; b.fillText('BARRE MUSCU', 773, 486);
      b.fillStyle = '#2a2a40'; b.font = '800 12px sans-serif'; b.fillText('SANS VIS !', 773, 504);
    }

    // ── utilitaires ──
    const pop = (text, color = '#fff', x = PX + 170, y = 150) => s.pops.push({ text, color, x, y, t: 0 });
    const dust = (x, y, n = 8) => api.burst(x, y, { n, color: ['#f4efe4', '#d8d0c0', '#bfb4a0'], speed: 90, gravity: 500, size: 4, life: 0.8 });
    const lift = (k) => {
      const e = (u) => u * u * (3 - 2 * u);
      return k < 0 ? 0 : k < 0.45 ? e(k / 0.45) : k < 0.55 ? 1 : k < 1 ? 1 - e((k - 0.55) / 0.45) : 0;
    };
    const ends = () => {
      if (s.broke) return { yl: BAR_Y + s.bar.yl, yr: BAR_Y + s.bar.yr };
      const j = s.slip > 0.7 ? Math.sin(s.t * 47) * 1.5 * (s.slip - 0.7) / 0.3 : 0;
      return { yl: BAR_Y + s.slip * 5 + j * 0.4, yr: BAR_Y + s.slip * 20 + j };
    };
    const barYAt = (x, e) => lerp(e.yl, e.yr, (x - WL) / (WR - WL));

    function breakBar() {
      s.broke = true;
      const e = ends();
      s.bar.yl = e.yl - BAR_Y; s.bar.yr = e.yr - BAR_Y;
      s.fall.y0 = papaFeet(); s.fall.y = 0; s.fall.vy = 0;
      api.sfx('clang'); api.shake(10);
      dust(WR - 4, e.yr, 18); dust(WL + 4, e.yl, 10);
    }
    function papaFeet() {
      const e = ends();
      const grip = barYAt(PX, e);
      const sy = grip + lerp(1.67 * R, -0.13 * R, lift(s.pullT < 0 ? -1 : s.pullT / PULL));
      return sy + 3.95 * R;
    }

    function tryPull() {
      if (s.pullT >= 0 || s.wob > 0) return;
      const chained = s.rest < REST_CHAIN;
      s.chain = chained ? s.chain + 1 : 0;
      if (s.v >= GREEN) {
        const q = clamp((s.v - GREEN) / (PERFECT - GREEN), 0, 1);
        const add = 0.05 + 0.15 * (1 - q) + 0.055 * s.chain;
        s.slip += add; s.lastQ = q;
        s.pullT = 0; s.counted = false;
        api.sfx('whoosh');
        if (add > 0.15) { api.sfx('grain'); dust(WR - 4, ends().yr, 6); }
        if (s.chain >= 2) pop('Doucement… fais une pause !', '#ffd0a0', PX + 195, 196);
      } else {
        s.slip += 0.26; s.rest = 0; s.wob = 0.3;
        api.sfx('clang'); api.shake(6);
        pop('À-coup !', '#ff8a6a');
        const e = ends(); dust(WR - 4, e.yr, 10); dust(WL + 4, e.yl, 5);
      }
      s.maxSlip = Math.max(s.maxSlip, s.slip);
      if (s.slip >= 1 && !api.ended) {
        s.slip = 1; s.maxSlip = 1;
        breakBar();
        api.end(false, 'La barre a lâché, et toi avec… Ce ne sera pas pour tout de suite, la vengeance sur les malfrats de Marseille !');
      }
    }

    function updateEnd(dt) {
      s.endT += dt;
      if (s.broke) {
        const B = s.bar, lim = FLOOR - 6 - BAR_Y;
        B.vr += 2200 * dt; B.yr = Math.min(lim, B.yr + B.vr * dt);
        if (B.yr >= lim && !B.landedR) { B.landedR = true; B.vr = -B.vr * 0.25; api.sfx('clang'); dust(WR - 30, FLOOR, 10); }
        if (s.endT > 0.12) { B.vl += 2200 * dt; B.yl = Math.min(lim, B.yl + B.vl * dt); }
        if (B.yl >= lim && !B.landedL) { B.landedL = true; B.vl = -B.vl * 0.25; dust(WL + 30, FLOOR, 8); }
        if (Math.random() < 0.15 && s.endT < 1) dust(Math.random() < 0.5 ? WL + 2 : WR - 2, BAR_Y + Math.random() * 30, 2);
      }
      if (s.broke || (s.won && s.endT > 0.3)) {
        const F = s.fall;
        if (!F.landed) {
          F.vy += 2000 * dt; F.y += F.vy * dt;
          if (F.y0 + F.y >= FLOOR) {
            F.y = FLOOR - F.y0; F.landed = true;
            if (s.broke) {
              api.sfx('ouch'); api.shake(14);
              api.burst(PX, FLOOR - 40, { n: 10, shape: 'star', color: ['#ffe14d', '#fff'], speed: 200, gravity: 300, size: 7 });
              dust(PX, FLOOR, 16);
            } else {
              api.sfx('boing');
              api.burst(PX, FLOOR - 160, { n: 14, shape: 'star', color: ['#ffe14d', '#ffffff', '#ff9a3c'], speed: 240, gravity: 200, size: 7 });
            }
          }
        }
      }
    }

    // ── dessin de Papa en débardeur (bras dessinés à la main pour plier les coudes vers le bas) ──
    function papa(g, o) {
      const { x, y, pose = 'stand', expression, hands, ang = 0, pivot, flex = false, sweat = false, lookY = 0 } = o;
      const hipY = pose === 'sit' ? y : y - 1.9 * R;
      const sy = hipY - 2.05 * R;
      const sh = { l: { x: x - 0.9 * R, y: sy + 0.18 * R }, r: { x: x + 0.9 * R, y: sy + 0.18 * R } };
      g.save();
      if (ang) { g.translate(pivot.x, pivot.y); g.rotate(ang); g.translate(-pivot.x, -pivot.y); }
      const saved = { shirt: LOOK.shirt, shirtDark: LOOK.shirtDark, collar: LOOK.collar };
      let info;
      try {
        LOOK.shirt = TANK; LOOK.shirtDark = TANK; LOOK.collar = TANK;
        info = api.avatar(g, { x, y, size: SIZE, pose, expression, t: s.t, hands: { l: sh.l, r: sh.r }, sweat, lookY, tilt: o.tilt || 0 });
      } finally { Object.assign(LOOK, saved); }
      // débardeur : épaules et encolure nues
      g.fillStyle = LOOK.skin;
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.moveTo(x + sd * 0.56 * R, sy - 0.12 * R); g.lineTo(x + sd * 1.14 * R, sy - 0.12 * R);
        g.lineTo(x + sd * 1.14 * R, sy + 0.78 * R);
        g.quadraticCurveTo(x + sd * 0.62 * R, sy + 0.72 * R, x + sd * 0.56 * R, sy - 0.12 * R);
        g.fill();
      }
      g.beginPath(); g.ellipse(x, sy - 0.1 * R, 0.34 * R, 0.4 * R, 0, 0, Math.PI); g.fill();
      g.strokeStyle = '#d6d0c2'; g.lineWidth = 1.5;
      for (const sd of [-1, 1]) {
        g.beginPath(); g.moveTo(x + sd * 0.56 * R, sy - 0.1 * R);
        g.quadraticCurveTo(x + sd * 0.62 * R, sy + 0.72 * R, x + sd * 1.1 * R, sy + 0.78 * R); g.stroke();
      }
      // bras
      for (const side of ['l', 'r']) {
        const S = sh[side], sd = side === 'l' ? -1 : 1;
        let hx = hands[side].x, hy = hands[side].y;
        if (ang && o.pinHands) { // les mains restent sur la barre malgré le balancement
          const c = Math.cos(-ang), sn = Math.sin(-ang), rx = hx - pivot.x, ry = hy - pivot.y;
          hx = pivot.x + rx * c - ry * sn; hy = pivot.y + rx * sn + ry * c;
        }
        const d0 = Math.hypot(hx - S.x, hy - S.y);
        if (d0 > ARM * 0.98) { hx = S.x + (hx - S.x) * ARM * 0.98 / d0; hy = S.y + (hy - S.y) * ARM * 0.98 / d0; }
        const dx = hx - S.x, dy = hy - S.y, d = Math.hypot(dx, dy) || 1;
        const h = Math.sqrt(Math.max(0, (ARM / 2) ** 2 - (d / 2) ** 2));
        const mx = (S.x + hx) / 2, my = (S.y + hy) / 2, px = -dy / d, py = dx / d;
        const c1 = [mx + px * h, my + py * h], c2 = [mx - px * h, my - py * h];
        const score = (c) => sd * (c[0] - S.x) + 0.6 * (c[1] - S.y);
        const [ex, ey] = score(c1) >= score(c2) ? c1 : c2;
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = LOOK.skin; g.lineWidth = 0.46 * R;
        g.beginPath(); g.moveTo(S.x, S.y); g.lineTo(ex, ey); g.stroke();
        g.lineWidth = 0.38 * R;
        g.beginPath(); g.moveTo(ex, ey); g.lineTo(hx, hy); g.stroke();
        if (flex) { // le biceps qui gonfle
          g.fillStyle = LOOK.skin;
          g.beginPath(); g.ellipse((S.x + ex) / 2, (S.y + ey) / 2 - 0.2 * R, 0.34 * R, 0.26 * R, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = LOOK.skinShade; g.lineWidth = 1.5;
          g.beginPath(); g.arc((S.x + ex) / 2, (S.y + ey) / 2 - 0.15 * R, 0.3 * R, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        }
        g.fillStyle = LOOK.skin;
        g.beginPath(); g.arc(hx, hy, 0.23 * R, 0, Math.PI * 2); g.fill();
        g.strokeStyle = LOOK.skinLine; g.lineWidth = 1.2;
        g.beginPath(); g.arc(hx, hy, 0.23 * R, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      }
      // la tête par-dessus les bras
      api.avatar(g, { x: info.hx, y: info.hy, size: SIZE, body: false, expression, sweat, lookY, tilt: o.tilt || 0 });
      g.restore();
      return info;
    }

    const drawStar = (c, x, y, r, col) => {
      c.fillStyle = col; c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill();
    };

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.v = 0.5 - 0.5 * Math.cos((2 * Math.PI * s.t) / P);
        for (const p of s.pops) p.t += dt;
        s.pops = s.pops.filter((p) => p.t < 0.9);
        if (api.ended) { updateEnd(dt); return; }

        s.wob = Math.max(0, s.wob - dt);
        if (s.pullT >= 0) {
          s.pullT += dt;
          if (!s.counted && s.pullT >= PULL * 0.45) {
            s.counted = true; s.reps++;
            api.sfx(s.lastQ > 0.85 ? 'catch' : 'pop');
            pop(s.lastQ > 0.85 ? 'Parfait !' : s.lastQ > 0.4 ? 'Propre !' : 'Un peu sec…', s.lastQ > 0.4 ? '#b8ff9a' : '#ffe08a');
            if (s.reps >= GOAL) {
              s.won = true; s.fall.y0 = papaFeet();
              api.end(true, 'Dix tractions et la barre a tenu ! Monsieur Muscle est prêt : Marseille n’a qu’à bien se tenir.');
              return;
            }
          }
          if (s.pullT >= PULL) { s.pullT = -1; s.rest = 0; }
        } else {
          s.rest += dt;
          s.slip = Math.max(0, s.slip - (s.rest > REST_FAST ? 0.3 : 0.03) * dt);
        }

        if (input.pressed() || input.pressed('up')) tryPull();

        if (!api.ended && s.slip > 0.7 && s.t - s.creak > 0.6) {
          s.creak = s.t; api.sfx('grain'); dust(WR - 4, ends().yr, 3);
        }
      },
      timeout() {
        if (!api.ended) {
          breakBar();
          api.end(false, 'Plus de jus dans les bras… et la barre a fini par lâcher quand même. La vengeance sur les malfrats de Marseille attendra !');
        }
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        const e = ends();

        // fissures + traces des embouts
        g.strokeStyle = '#6b5a4a'; g.lineWidth = 1.6; g.lineCap = 'round';
        for (const c of cracks) {
          if (c.th > s.maxSlip) continue;
          g.beginPath(); c.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        }
        if (s.maxSlip > 0.05) {
          g.fillStyle = 'rgba(60,50,40,0.35)';
          g.fillRect(WR - 4, BAR_Y - 7, 4, Math.min(30, s.maxSlip * 20 + 8));
          g.fillRect(WL, BAR_Y - 7, 4, Math.min(14, s.maxSlip * 5 + 8));
        }

        // ombre de Papa
        const won = s.won, broke = s.broke;
        let feet = papaFeet();
        if ((broke || (won && s.endT > 0.3)) && s.fall.y0) feet = Math.min(FLOOR, s.fall.y0 + s.fall.y);
        const hgt = clamp((FLOOR - feet) / 120, 0, 1);
        g.fillStyle = `rgba(40,20,10,${0.28 - 0.12 * hgt})`;
        g.beginPath(); g.ellipse(PX, FLOOR + 4, 54 - 18 * hgt, 9 - 3 * hgt, 0, 0, Math.PI * 2); g.fill();

        // la barre (dessinée avant Papa : ses mains la serrent)
        const drawBar = () => {
          g.lineCap = 'butt';
          g.strokeStyle = '#7d8894'; g.lineWidth = 11;
          g.beginPath(); g.moveTo(WL + 10, e.yl); g.lineTo(WR - 10, e.yr); g.stroke();
          g.strokeStyle = '#e6edf2'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(WL + 10, e.yl - 3); g.lineTo(WR - 10, e.yr - 3); g.stroke();
          // poignées en mousse
          g.strokeStyle = '#2b2b30'; g.lineWidth = 14;
          for (const [a, b2] of [[PX - 90, PX - 20], [PX + 20, PX + 90]]) {
            g.beginPath(); g.moveTo(a, barYAt(a, e)); g.lineTo(b2, barYAt(b2, e)); g.stroke();
          }
          // embouts en caoutchouc contre les murs
          g.fillStyle = '#1e1e22';
          api.roundRect(g, WL, e.yl - 12, 14, 24, 4); g.fill();
          api.roundRect(g, WR - 14, e.yr - 12, 14, 24, 4); g.fill();
        };
        drawBar();

        const grip = barYAt(PX, e);
        if (!api.ended || (won && s.endT <= 0.3)) {
          // suspendu à la barre
          const k = s.pullT < 0 ? (won ? 1 : 0) : s.pullT / PULL;
          const L = won ? 1 : lift(k);
          const sy = grip + lerp(1.67 * R, -0.13 * R, L);
          const sway = -(s.v - 0.5) * 0.24 * (1 - L) + (s.wob > 0 ? Math.sin(s.t * 34) * 0.08 * (s.wob / 0.3) : 0);
          papa(g, {
            x: PX, y: sy + 3.95 * R, ang: sway, pivot: { x: PX, y: grip }, pinHands: true,
            hands: { l: { x: PX - GRIP, y: barYAt(PX - GRIP, e) }, r: { x: PX + GRIP, y: barYAt(PX + GRIP, e) } },
            expression: won ? 'laugh' : s.wob > 0 ? 'ouch' : s.slip > 0.7 ? 'worried' : L > 0.3 ? 'blow' : 'focus',
            sweat: s.slip > 0.55 || s.reps >= 6, lookY: L > 0.3 ? -0.5 : 0,
          });
          if (!api.ended && s.wob <= 0 && s.pullT >= 0 && L > 0.6) { // petits traits d'effort
            g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3;
            for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(PX + sd * 62, sy - 40); g.lineTo(PX + sd * 80, sy - 52); g.stroke(); }
          }
        } else if (won) {
          if (!s.fall.landed) {
            papa(g, { x: PX, y: feet, expression: 'happy', hands: { l: { x: PX - 1.5 * R, y: feet - 6.2 * R }, r: { x: PX + 1.5 * R, y: feet - 6.2 * R } } });
          } else {
            const sy = FLOOR - 3.95 * R;
            const pump = Math.sin(s.endT * 10) * 0.12 * R;
            papa(g, {
              x: PX, y: FLOOR, expression: 'laugh', flex: true,
              hands: { l: { x: PX - 1.25 * R, y: sy - 0.75 * R + pump }, r: { x: PX + 1.25 * R, y: sy - 0.75 * R - pump } },
            });
            api.text(g, 'Monsieur Muscle !', PX, 70, { size: 34, color: '#ffe14d', stroke: '#7a3a10', weight: 900 });
          }
        } else if (broke) {
          if (!s.fall.landed) {
            papa(g, { x: PX, y: feet, expression: 'panic', ang: Math.min(0.25, s.endT * 0.8), pivot: { x: PX, y: feet - 2 * R },
              hands: { l: { x: PX - 1.6 * R, y: feet - 6 * R }, r: { x: PX + 1.4 * R, y: feet - 6.3 * R } } });
          } else {
            // étalé par terre, assis sur les fesses, la tête qui tourne
            const sy = FLOOR - 2.05 * R;
            const info = papa(g, {
              x: PX - 20, y: FLOOR, pose: 'sit', expression: 'ouch', tilt: -0.15, ang: -0.18, pivot: { x: PX - 20, y: FLOOR },
              hands: { l: { x: PX - 20 - 1.5 * R, y: FLOOR - 0.2 * R }, r: { x: PX - 20 + 1.6 * R, y: sy + 0.6 * R } },
            });
            for (let i = 0; i < 3; i++) {
              const a = s.endT * 7 + i * 2.1;
              drawStar(g, info.hx - 8 + Math.cos(a) * 40, info.hy - R * 1.15 + Math.sin(a) * 9, 9, '#ffe14d');
            }
            api.text(g, 'Patatras !', PX, 80, { size: 36, color: '#fff', stroke: '#a0302a', weight: 900 });
          }
          drawBar(); // la barre tombée passe devant lui
        }

        // bulles de texte
        for (const p of s.pops) {
          g.save(); g.globalAlpha = p.t > 0.6 ? (0.9 - p.t) / 0.3 : 1;
          api.text(g, p.text, p.x, p.y - p.t * 40, { size: p.text.length > 12 ? 20 : 28, color: p.color, stroke: '#000a', weight: 900 });
          g.restore();
        }

        // ── HUD ──
        api.text(g, `Tractions : ${s.reps} / ${GOAL}`, 24, 36, { size: 28, align: 'left', color: '#fff', stroke: '#000a' });
        const danger = s.slip > 0.7;
        api.text(g, s.broke ? 'La barre lâche !' : 'La barre glisse…', 24, 68, { size: 17, align: 'left', color: danger ? '#ffb0a0' : '#ffe6a0', stroke: '#000a', strokeWidth: 4 });
        g.fillStyle = '#0008'; api.roundRect(g, 22, 80, 244, 16, 6); g.fill();
        const sl = clamp(s.slip, 0, 1);
        const blink = danger && Math.sin(s.t * 18) > 0;
        g.fillStyle = blink ? '#ffffff' : sl > 0.7 ? '#e8453c' : sl > 0.4 ? '#ff9a3c' : '#ffd34d';
        if (sl > 0.01) { api.roundRect(g, 24, 82, 240 * sl, 12, 5); g.fill(); }

        // jauge d'élan
        if (!api.ended) {
          const GX = 330, GW = 300, GY = 506;
          api.text(g, 'Élan', GX - 14, GY + 7, { size: 20, align: 'right', color: '#fff', stroke: '#000a', strokeWidth: 4 });
          g.fillStyle = '#000a'; api.roundRect(g, GX - 4, GY - 4, GW + 8, 22, 8); g.fill();
          g.fillStyle = '#8a5a4a'; g.fillRect(GX, GY, GW * GREEN, 14);
          g.fillStyle = '#4fc04a'; g.fillRect(GX + GW * GREEN, GY, GW * (1 - GREEN), 14);
          g.fillStyle = '#c8ff7a'; g.fillRect(GX + GW * PERFECT, GY, GW * (1 - PERFECT), 14);
          const ready = s.pullT < 0 && s.wob <= 0;
          const nx = GX + GW * s.v;
          g.fillStyle = ready ? '#fff' : '#bbb';
          g.beginPath(); g.moveTo(nx, GY - 2); g.lineTo(nx - 8, GY - 14); g.lineTo(nx + 8, GY - 14); g.closePath(); g.fill();
          g.fillRect(nx - 2, GY - 2, 4, 18);
          // la pause : tant qu'on enchaîne, la barre ne se recale pas
          if (s.pullT < 0 && s.rest > REST_FAST && s.slip > 0.02) api.text(g, 'la barre se recale…', GX + GW / 2, GY - 28, { size: 15, color: '#d8ffd0', stroke: '#000a', strokeWidth: 3 });
        }
      },
    };
  },
};

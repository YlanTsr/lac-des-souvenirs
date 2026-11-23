/**
 * Chapitre I — « Bouaké, novembre 1971 » (naissance_bouake)
 * Papa naît à Bouaké, en Côte d'Ivoire, le 24 novembre 1971.
 * Mécanique : sous un ciel nocturne chaud, déplacer le berceau (← → ou souris) pour
 * attraper 7 étoiles filantes / petites lanternes. Les moustiques piquent : le bébé
 * pleure, le berceau est sonné un instant et une étoile s'envole.
 */
export default {
  id: 'naissance_bouake',
  title: 'Bouaké, novembre 1971',
  instructions: 'Tu viens de naître sous le ciel de Bouaké : déplace ton berceau pour attraper 7 étoiles filantes et lanternes, et évite les moustiques !',
  controls: '← → / souris : bouger le berceau',
  duration: 12,
  introExpression: 'happy',
  successTitle: 'Bienvenue au monde !',
  failTitle: 'Le ciel a filé trop vite !',
  successText: 'Sept étoiles dans ton berceau : le ciel de Bouaké a fêté ton arrivée. Bienvenue au monde, Papa !',
  failText: 'Quelques étoiles ont filé… mais la plus belle est arrivée quand même cette nuit-là : toi.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const GOAL = 7;
    const RIM = 448;       // haut du berceau
    const HALF = 62;       // demi-largeur du berceau
    const s = {
      t: 0, x: W / 2, caught: 0, items: [], nextGood: 0.35, nextBug: 1.7,
      stun: 0, cry: 0, joy: 0, pulse: 0, msg: '', msgT: 0, lost: [],
    };

    /* ───── décor pré-rendu (ciel, étoiles, silhouette de Bouaké) ───── */
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const sky = b.createLinearGradient(0, 0, 0, 470);
      sky.addColorStop(0, '#120f33'); sky.addColorStop(0.5, '#2c2058'); sky.addColorStop(0.82, '#7a3b5a'); sky.addColorStop(1, '#d9774a');
      b.fillStyle = sky; b.fillRect(0, 0, W, 470);
      // voie lactée douce
      b.fillStyle = 'rgba(255, 230, 200, 0.05)';
      for (let i = 0; i < 26; i++) { b.beginPath(); b.ellipse(120 + i * 30, 230 - i * 7 + Math.sin(i) * 12, 70, 26, -0.25, 0, Math.PI * 2); b.fill(); }
      // étoiles fixes
      for (let i = 0; i < 110; i++) {
        const x = (i * 97.3) % W, y = (i * 53.7) % 340, r = 0.6 + ((i * 7) % 10) / 10 * 1.3;
        b.fillStyle = `rgba(255, ${235 - (i % 4) * 10}, ${200 + (i % 3) * 18}, ${0.35 + (i % 5) * 0.12})`;
        b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill();
      }
      // lune
      b.fillStyle = 'rgba(255, 236, 190, 0.18)'; b.beginPath(); b.arc(690, 112, 58, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#fff0c8'; b.beginPath(); b.arc(690, 112, 38, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(220, 200, 160, 0.5)';
      for (const [dx, dy, rr] of [[-12, -8, 7], [10, 6, 5], [-4, 14, 4]]) { b.beginPath(); b.arc(690 + dx, 112 + dy, rr, 0, Math.PI * 2); b.fill(); }
      // collines lointaines
      b.fillStyle = '#3a2447';
      b.beginPath(); b.moveTo(0, 420); b.quadraticCurveTo(200, 370, 420, 410); b.quadraticCurveTo(650, 380, W, 405); b.lineTo(W, 470); b.lineTo(0, 470); b.fill();
      // silhouette de la ville
      const sil = '#1c1430';
      b.fillStyle = sil;
      const houses = [[20, 70, 50], [95, 60, 38], [160, 90, 46], [520, 80, 42], [610, 64, 56], [690, 96, 40], [800, 70, 52], [880, 80, 44]];
      for (const [x, w, h] of houses) {
        b.fillRect(x, 470 - h, w, h);
        b.beginPath(); b.moveTo(x - 6, 470 - h); b.lineTo(x + w / 2, 470 - h - 16); b.lineTo(x + w + 6, 470 - h); b.fill(); // toit de tôle
      }
      // château d'eau
      b.fillRect(282, 360, 8, 110); b.fillRect(318, 360, 8, 110);
      b.beginPath(); b.ellipse(304, 352, 40, 22, 0, 0, Math.PI * 2); b.fill();
      // mosquée (dôme + minaret)
      b.fillRect(400, 420, 90, 50);
      b.beginPath(); b.arc(445, 420, 30, Math.PI, 0); b.fill();
      b.fillRect(492, 360, 14, 110);
      b.beginPath(); b.moveTo(488, 362); b.lineTo(499, 340); b.lineTo(510, 362); b.fill();
      // manguiers et palmiers
      for (const [x, r] of [[240, 34], [370, 28], [760, 36], [590, 26]]) {
        b.fillRect(x - 4, 470 - r * 1.3, 8, r * 1.3);
        b.beginPath(); b.arc(x, 470 - r * 1.5, r, 0, Math.PI * 2); b.arc(x - r * 0.7, 470 - r * 1.2, r * 0.7, 0, Math.PI * 2); b.arc(x + r * 0.7, 470 - r * 1.2, r * 0.7, 0, Math.PI * 2); b.fill();
      }
      b.strokeStyle = sil; b.lineCap = 'round';
      for (const [x, h] of [[140, 120], [930, 140], [470, 90]]) {
        b.lineWidth = 7;
        b.beginPath(); b.moveTo(x, 470); b.quadraticCurveTo(x + 14, 470 - h / 2, x + 6, 470 - h); b.stroke();
        b.lineWidth = 5;
        for (let k = 0; k < 6; k++) {
          const a = -Math.PI + (k / 5) * Math.PI;
          b.beginPath(); b.moveTo(x + 6, 470 - h); b.quadraticCurveTo(x + 6 + Math.cos(a) * 30, 470 - h - 18, x + 6 + Math.cos(a) * 50, 470 - h + 14); b.stroke();
        }
      }
      // fenêtres allumées
      b.fillStyle = '#ffc861';
      for (const [x, y] of [[32, 438], [52, 438], [178, 440], [624, 432], [650, 432], [700, 446], [818, 440], [895, 436]]) b.fillRect(x, y, 9, 11);
      // sol de latérite
      const gr = b.createLinearGradient(0, 470, 0, H);
      gr.addColorStop(0, '#4a2420'); gr.addColorStop(1, '#2a1416');
      b.fillStyle = gr; b.fillRect(0, 470, W, H - 470);
      b.fillStyle = 'rgba(255, 170, 110, 0.08)';
      for (let i = 0; i < 30; i++) { b.beginPath(); b.ellipse((i * 131) % W, 490 + (i * 17) % 40, 22, 3, 0, 0, Math.PI * 2); b.fill(); }
    }
    const twinkles = Array.from({ length: 14 }, (_, i) => ({ x: 40 + ((i * 263) % 880), y: 80 + ((i * 97) % 250), p: i * 1.7 }));

    function spawnGood() {
      const lantern = Math.random() < 0.4;
      s.items.push({
        kind: lantern ? 'lantern' : 'star', x: rand(90, W - 90), y: -30,
        vx: lantern ? 0 : rand(-70, 70), vy: (lantern ? rand(125, 155) : rand(165, 205)) + s.t * 5, ph: rand(0, 6),
      });
    }
    function spawnBug() {
      const bx = clamp(s.x + rand(-220, 220), 80, W - 80);
      s.items.push({ kind: 'bug', x: bx, bx, y: -20, vx: 0, vy: rand(105, 130), ph: rand(0, 6), amp: rand(40, 80), out: false });
    }
    function starPath(g, x, y, r, rot = 0) {
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? r * 0.45 : r, a = rot - Math.PI / 2 + (k / 10) * Math.PI * 2;
        k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.stun = Math.max(0, s.stun - dt);
        s.cry = Math.max(0, s.cry - dt);
        s.joy = Math.max(0, s.joy - dt);
        s.pulse = Math.max(0, s.pulse - dt * 3);
        s.msgT = Math.max(0, s.msgT - dt);

        if (!api.ended) {
          // le berceau suit le curseur (souris, doigt ou flèches)
          if (s.stun === 0) {
            const target = clamp(input.cursor.x, 70, W - 70);
            const step = 640 * dt;
            s.x += clamp(target - s.x, -step, step);
          }
          s.nextGood -= dt;
          if (s.nextGood <= 0) { spawnGood(); s.nextGood = rand(0.72, 0.95); }
          s.nextBug -= dt;
          if (s.nextBug <= 0) { spawnBug(); s.nextBug = rand(1.3, 1.9); }
        }

        for (const it of s.items) {
          if (it.kind === 'bug') {
            if (it.out) { it.y -= 260 * dt; it.x += 200 * dt * Math.sign(it.vx || 1); continue; }
            it.y += it.vy * dt;
            it.x = it.bx + Math.sin(s.t * 3.2 + it.ph) * it.amp;
            if (!api.ended && Math.abs(it.x - (s.x - 14)) < 48 && it.y > 395 && it.y < 462) {
              it.out = true; it.vx = it.x < s.x ? -1 : 1;
              s.stun = 0.65; s.cry = 1.1;
              api.sfx('ouch'); api.shake(8);
              s.msg = 'Bzzz… Ouin !'; s.msgT = 1;
              if (s.caught > 0) {
                s.caught--;
                s.lost.push({ x: s.x, y: RIM - 10, vx: rand(-120, 120), vy: -420, life: 1.2 });
              }
            }
          } else {
            it.y += it.vy * dt;
            it.x += it.vx * dt + (it.kind === 'lantern' ? Math.sin(s.t * 2 + it.ph) * 18 * dt : 0);
            if (it.x < 30 || it.x > W - 30) it.vx = -it.vx;
            if (!api.ended && !it.got && Math.abs(it.x - s.x) < HALF - 2 && it.y > RIM - 22 && it.y < RIM + 18) {
              it.got = true;
              s.caught++; s.joy = 0.8; s.pulse = 1;
              api.sfx('catch');
              api.burst(it.x, RIM - 6, { n: 12, shape: 'star', color: ['#ffe27a', '#fff7d0', '#ffb347'], speed: 220, gravity: 260, size: 6 });
              if (s.caught >= GOAL) {
                api.end(true, s.t < 9
                  ? 'Sept étoiles en un clin d’œil : le ciel de Bouaké a fêté ton arrivée. Bienvenue au monde, Papa !'
                  : 'Sept étoiles dans ton berceau, juste avant l’aube. Bienvenue au monde, Papa !');
              }
            }
          }
        }
        s.items = s.items.filter((it) => !it.got && it.y < H + 30 && it.y > -60 && it.x > -60 && it.x < W + 60);
        for (const p of s.lost) { p.life -= dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        s.lost = s.lost.filter((p) => p.life > 0);
        if (api.ended && Math.random() < 0.25 && s.caught >= GOAL) {
          api.burst(rand(100, W - 100), rand(60, 260), { n: 4, shape: 'star', color: ['#ffe27a', '#fff'], speed: 90, gravity: 60, size: 5 });
        }
      },
      timeout() { return s.caught >= GOAL; },
      draw(g) {
        g.drawImage(bg, 0, 0);
        // étoiles qui scintillent
        for (const tw of twinkles) {
          const a = 0.35 + 0.65 * Math.abs(Math.sin(s.t * 1.6 + tw.p));
          g.fillStyle = `rgba(255, 246, 214, ${a})`;
          starPath(g, tw.x, tw.y, 3.2, 0); g.fill();
        }

        // objets qui tombent
        for (const it of s.items) {
          if (it.kind === 'star') {
            const len = 70, sp = Math.hypot(it.vx, it.vy) || 1;
            const dx = -it.vx / sp, dy = -it.vy / sp;
            g.lineCap = 'round';
            for (let k = 0; k < 3; k++) {
              g.strokeStyle = `rgba(255, 226, 140, ${0.45 - k * 0.13})`;
              g.lineWidth = 7 - k * 2;
              g.beginPath(); g.moveTo(it.x + dx * k * 20, it.y + dy * k * 20); g.lineTo(it.x + dx * (k + 1) * len / 3, it.y + dy * (k + 1) * len / 3); g.stroke();
            }
            g.fillStyle = 'rgba(255, 240, 170, 0.25)'; g.beginPath(); g.arc(it.x, it.y, 22, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#ffe27a'; starPath(g, it.x, it.y, 14, s.t * 2 + it.ph); g.fill();
          } else if (it.kind === 'lantern') {
            const a = Math.sin(s.t * 2 + it.ph) * 0.15;
            g.save(); g.translate(it.x, it.y); g.rotate(a);
            g.fillStyle = 'rgba(255, 170, 80, 0.22)'; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#3a2a20'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -18); g.lineTo(0, -30); g.stroke();
            g.fillStyle = '#ff9a3c'; g.beginPath(); g.ellipse(0, 0, 14, 17, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#ffd27a'; g.beginPath(); g.ellipse(0, 1, 7, 11, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = 'rgba(160, 70, 20, 0.5)'; g.lineWidth = 1.2;
            for (const k of [-7, 7]) { g.beginPath(); g.ellipse(0, 0, Math.abs(k), 17, 0, 0, Math.PI * 2); g.stroke(); }
            g.fillStyle = '#5a3a28'; g.fillRect(-7, -19, 14, 4); g.fillRect(-7, 15, 14, 4);
            g.restore();
          } else {
            // moustique
            const fl = Math.abs(Math.sin(s.t * 40 + it.ph));
            g.save(); g.translate(it.x, it.y);
            g.fillStyle = 'rgba(230, 240, 255, 0.55)';
            g.beginPath(); g.ellipse(-5, -7, 9, 4 + fl * 3, -0.5, 0, Math.PI * 2); g.ellipse(5, -7, 9, 4 + fl * 3, 0.5, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#2a2230'; g.lineWidth = 1.2;
            for (const k of [-1, 1]) for (const j of [-4, 0, 4]) { g.beginPath(); g.moveTo(j, 2); g.lineTo(j + k * 8, 12); g.stroke(); }
            g.fillStyle = '#4a3f52'; g.beginPath(); g.ellipse(0, 0, 10, 4.5, 0.15, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#2a2230'; g.beginPath(); g.arc(-10, 1, 4, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.moveTo(-13, 2); g.lineTo(-22, 7); g.stroke();
            g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(-11, 0, 1.3, 0, Math.PI * 2); g.fill();
            g.restore();
            if (!it.out) api.text(g, 'bzz', it.x + 18, it.y - 14, { size: 12, color: 'rgba(255,255,255,0.6)', weight: 700 });
          }
        }

        // étoiles perdues (piqûre)
        for (const p of s.lost) { g.globalAlpha = Math.min(1, p.life); g.fillStyle = '#ffe27a'; starPath(g, p.x, p.y, 11, p.life * 8); g.fill(); }
        g.globalAlpha = 1;

        // ── le berceau et bébé Papa
        const x = s.x + (s.stun > 0 ? Math.sin(s.t * 50) * 3 : 0);
        // halo doux
        g.fillStyle = 'rgba(255, 210, 140, 0.12)'; g.beginPath(); g.ellipse(x, RIM + 10, 110, 46, 0, 0, Math.PI * 2); g.fill();
        // ombre
        g.fillStyle = 'rgba(0, 0, 0, 0.35)'; g.beginPath(); g.ellipse(x, 500, 70, 9, 0, 0, Math.PI * 2); g.fill();
        // dos du berceau
        g.fillStyle = '#8a5a2e'; g.beginPath(); g.ellipse(x, RIM, HALF, 12, 0, 0, Math.PI * 2); g.fill();
        // bébé (tête de Papa, bonnet tricoté)
        const hx = x - 16, hy = RIM - 14 + Math.sin(s.t * 3) * 1.5;
        const tilt = Math.sin(s.t * 2.2) * 0.08;
        const expr = s.cry > 0 ? 'ouch' : api.ended ? (s.caught >= GOAL ? 'laugh' : 'smile') : s.joy > 0 ? 'laugh' : 'happy';
        api.avatar(g, { x: hx, y: hy, size: 42, body: false, expression: expr, tilt, tears: s.cry > 0, blush: 0.6, lookY: -0.6 });
        g.save(); g.translate(hx, hy); g.rotate(tilt);
        const r = 21;
        g.fillStyle = '#f5d76e';
        g.beginPath(); g.ellipse(0, -0.35 * r, 1.1 * r, 0.8 * r, 0, Math.PI, 0); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(200, 150, 50, 0.6)'; g.lineWidth = 1.5;
        for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * 0.28 * r, -0.4 * r); g.quadraticCurveTo(k * 0.3 * r, -0.9 * r, k * 0.12 * r, -1.1 * r); g.stroke(); }
        g.fillStyle = '#e8b84a'; api.roundRect(g, -1.12 * r, -0.5 * r, 2.24 * r, 0.26 * r, 4); g.fill();
        g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(0, -1.18 * r, 0.26 * r, 0, Math.PI * 2); g.fill();
        g.restore();
        // couverture
        g.fillStyle = '#9fd0f0';
        g.beginPath(); g.ellipse(x + 6, RIM + 2, HALF - 6, 13, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#ffffff';
        for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x - 40 + k * 17, RIM - 4 + (k % 2) * 4, 2.2, 0, Math.PI * 2); g.fill(); }
        // petite main qui dépasse
        g.fillStyle = '#efc29e'; g.beginPath(); g.arc(x + 14, RIM - 8 + (s.joy > 0 ? -6 : 0), 6, 0, Math.PI * 2); g.fill();
        // panier en osier (devant)
        g.fillStyle = '#c8914f';
        g.beginPath(); g.moveTo(x - HALF - 4, RIM); g.quadraticCurveTo(x - HALF + 4, RIM + 48, x, RIM + 48); g.quadraticCurveTo(x + HALF - 4, RIM + 48, x + HALF + 4, RIM); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(120, 70, 30, 0.55)'; g.lineWidth = 2;
        for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x - HALF + k * 3, RIM + k * 11); g.quadraticCurveTo(x, RIM + k * 13, x + HALF - k * 3, RIM + k * 11); g.stroke(); }
        for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(x + k * 14, RIM + 2); g.lineTo(x + k * 11, RIM + 44); g.stroke(); }
        g.fillStyle = '#a8713a'; api.roundRect(g, x - HALF - 6, RIM - 5, 2 * HALF + 12, 10, 5); g.fill();

        if (s.msgT > 0) api.text(g, s.msg, x, RIM - 70, { size: 22, color: '#fff', stroke: '#000a', strokeWidth: 5 });

        // HUD
        api.text(g, `Étoiles : ${s.caught} / ${GOAL}`, 28, 42, { align: 'left', size: 24 + s.pulse * 4, color: '#ffe9a8', stroke: '#000a' });
        for (let i = 0; i < GOAL; i++) {
          g.fillStyle = i < s.caught ? '#ffe27a' : 'rgba(255,255,255,0.18)';
          starPath(g, 236 + i * 28, 42, 10, 0); g.fill();
        }
        api.text(g, 'Bouaké · 24 novembre 1971', W / 2, 520, { size: 16, color: 'rgba(255, 220, 180, 0.75)', weight: 600 });
        if (api.ended) {
          const ok = s.caught >= GOAL;
          api.text(g, ok ? 'Bienvenue, Papa !' : 'Bonne nuit, petit Papa…', W / 2, 200, { size: 46, color: ok ? '#ffe27a' : '#ffd9b0', stroke: '#000a', strokeWidth: 8 });
        }
      },
    };
  },
};

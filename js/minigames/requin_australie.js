/**
 * Anecdote — « Le requin d'Australie » (requin_australie)
 * Voyage de noces en Australie : un aileron derrière Papa… et le crawl le plus rapide de sa vie !
 * Mécanique : alterner ← et → (ou taper à gauche / à droite de l'écran) pour nager.
 * Taper deux fois du même côté = « plouf », on ralentit. Atteindre la plage avant le requin.
 * Raté : le requin croque le maillot (cartoon) et Papa s'échappe en slip troué.
 */
export default {
  id: 'requin_australie',
  title: "Le requin d'Australie",
  instructions: 'Un aileron fonce sur toi ! Alterne gauche et droite le plus vite possible pour nager jusqu’à la plage.',
  controls: '← → en alternance · ou tap à gauche / à droite de l’écran',
  duration: 12,
  introExpression: 'panic',
  successTitle: 'Sauvé sur la plage !',
  failTitle: 'CROC ! (le maillot)',
  successText: 'Record du monde du crawl en voyage de noces ! Le requin repart bredouille, et toi tu repars avec une histoire à raconter pendant 25 ans.',
  failText: 'Le requin a gardé ton maillot en souvenir. Toi, tu as gardé tout le reste : c’est l’essentiel !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const DIST = 600, X0 = 150, LANE = 340;
    const s = {
      t: 0, p: 0, v: 0, last: null, strokes: 0, bad: 0, sp: -240,
      arm: { left: 1, right: 1 }, msg: '', msgT: 0, won: false, caught: false, endT: 0,
      look: 0, waves: Array.from({ length: 26 }, (_, i) => ({ x: (i * 137) % 760, y: 210 + ((i * 71) % 320), w: 20 + (i % 4) * 10 })),
    };
    const X = () => X0 + s.p;
    const SX = () => X0 + s.sp;
    const sharkSpeed = (t) => 60 + 4 * t;

    /* ───── décor pré-rendu ───── */
    const SC = 2;
    const bg = document.createElement('canvas');
    bg.width = W * SC; bg.height = H * SC;
    const shoreX = (y) => 800 - (y - 190) * 0.29;
    {
      const b = bg.getContext('2d');
      b.scale(SC, SC);
      const sky = b.createLinearGradient(0, 0, 0, 190);
      sky.addColorStop(0, '#4fb4ea'); sky.addColorStop(1, '#c9efff');
      b.fillStyle = sky; b.fillRect(0, 0, W, 192);
      b.fillStyle = '#fff3b0'; b.beginPath(); b.arc(660, 70, 36, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [x, y] of [[180, 70], [420, 50], [560, 110]]) { b.beginPath(); b.arc(x, y, 18, 0, Math.PI * 2); b.arc(x + 22, y - 8, 22, 0, Math.PI * 2); b.arc(x + 46, y, 17, 0, Math.PI * 2); b.fill(); }
      // l'Opéra de Sydney au loin
      b.fillStyle = '#f4f1ea';
      for (const [x, w, h] of [[70, 34, 30], [96, 28, 24], [118, 22, 18]]) { b.beginPath(); b.moveTo(x, 190); b.quadraticCurveTo(x + w * 0.2, 190 - h, x + w, 190 - h * 0.9); b.lineTo(x + w * 0.7, 190); b.fill(); }
      b.fillStyle = '#b9b3a8'; b.fillRect(60, 186, 90, 5);
      // mer
      const sea = b.createLinearGradient(0, 190, 0, H);
      sea.addColorStop(0, '#1c8fb8'); sea.addColorStop(0.5, '#27b3c9'); sea.addColorStop(1, '#5fd6d0');
      b.fillStyle = sea; b.fillRect(0, 190, W, H - 190);
      // plage (à droite)
      b.fillStyle = '#f3dca2';
      b.beginPath(); b.moveTo(shoreX(190), 190); b.lineTo(W, 190); b.lineTo(W, H); b.lineTo(shoreX(H), H); b.closePath(); b.fill();
      b.strokeStyle = 'rgba(255,255,255,0.9)'; b.lineWidth = 7;
      b.beginPath(); b.moveTo(shoreX(190) - 6, 190); b.lineTo(shoreX(H) - 6, H); b.stroke();
      b.fillStyle = 'rgba(200, 160, 100, 0.35)';
      for (let i = 0; i < 40; i++) { const y = 200 + (i * 53) % 330; b.fillRect(shoreX(y) + 20 + (i * 37) % 160, y, 3, 3); }
      // drapeaux de sauveteurs rouge et jaune
      for (const [x, y] of [[850, 260], [900, 430]]) {
        b.fillStyle = '#6a5a4a'; b.fillRect(x, y - 70, 4, 70);
        b.fillStyle = '#e0302a'; b.fillRect(x + 4, y - 70, 30, 11);
        b.fillStyle = '#ffd21f'; b.fillRect(x + 4, y - 59, 30, 11);
      }
      // panneau « requins »
      b.fillStyle = '#6a5a4a'; b.fillRect(906, 300, 5, 70);
      b.fillStyle = '#ffd21f'; b.beginPath(); b.moveTo(908, 262); b.lineTo(940, 312); b.lineTo(876, 312); b.closePath(); b.fill();
      b.strokeStyle = '#222'; b.lineWidth = 3; b.stroke();
      b.fillStyle = '#222'; b.beginPath(); b.moveTo(898, 304); b.lineTo(910, 280); b.lineTo(918, 304); b.closePath(); b.fill();
      // serviette et planche de surf
      b.save(); b.translate(860, 500); b.rotate(-0.25);
      b.fillStyle = '#e8574a'; b.fillRect(-40, -18, 80, 36);
      b.fillStyle = '#fff'; for (let k = -30; k < 40; k += 16) b.fillRect(k, -18, 6, 36);
      b.restore();
      b.save(); b.translate(930, 420); b.rotate(1.2);
      b.fillStyle = '#ffb347'; b.beginPath(); b.ellipse(0, 0, 50, 11, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#3aa0c8'; b.fillRect(-44, -2, 88, 4);
      b.restore();
    }

    function stroke(side) {
      if (s.last === side) {
        s.v *= 0.7; s.bad++;
        s.msg = 'Plouf ! Alterne !'; s.msgT = 0.7;
        api.sfx('boing');
        api.burst(X() - 30, LANE - 6, { n: 6, color: '#ffffff', speed: 120, gravity: 400, size: 4 });
        return;
      }
      s.last = side;
      s.v += 56;
      s.strokes++;
      s.arm[side] = 0;
      api.sfx('whoosh');
      api.burst(X() + (side === 'left' ? -10 : 18), LANE - 8, { n: 5, color: ['#ffffff', '#c9f3ff'], speed: 160, gravity: 500, size: 4, angle: -Math.PI / 2, spread: 1.6 });
    }

    // Papa hors de l'eau (corps maison : maillot de bain !)
    function beachPapa(g, x, y, o) {
      const tt = o.t || 0;
      const run = o.run ? Math.sin(tt * 14) : 0;
      g.lineCap = 'round';
      g.strokeStyle = '#efc29e'; g.lineWidth = 15;
      g.beginPath(); g.moveTo(x - 10, y - 46); g.lineTo(x - 12 + run * 12, y - 4); g.stroke();
      g.beginPath(); g.moveTo(x + 10, y - 46); g.lineTo(x + 12 - run * 12, y - 4); g.stroke();
      g.fillStyle = '#d49a76';
      for (const fx of [x - 12 + run * 12, x + 12 - run * 12]) { g.beginPath(); g.ellipse(fx + 4, y - 2, 11, 5, 0, 0, Math.PI * 2); g.fill(); }
      // torse (petit ventre assumé)
      g.fillStyle = '#efc29e';
      g.beginPath(); g.ellipse(x, y - 78, 29, 38, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(212, 154, 118, 0.5)';
      g.beginPath(); g.arc(x, y - 66, 2.5, 0, Math.PI * 2); g.fill();
      // maillot
      if (o.slip) {
        g.fillStyle = '#ffffff';
        g.beginPath(); g.moveTo(x - 27, y - 56); g.lineTo(x + 27, y - 56); g.lineTo(x + 20, y - 40); g.lineTo(x + 6, y - 36); g.lineTo(x - 6, y - 36); g.lineTo(x - 20, y - 40); g.closePath(); g.fill();
        g.fillStyle = '#5a8ad8';
        for (const [dx, dy] of [[-16, -51], [-2, -47], [13, -51], [-8, -42]]) { g.beginPath(); g.arc(x + dx, y + dy, 2.4, 0, Math.PI * 2); g.fill(); }
        // le trou (en forme de morsure de requin)
        g.fillStyle = '#efc29e';
        g.beginPath(); g.moveTo(x + 8, y - 56); g.lineTo(x + 12, y - 50); g.lineTo(x + 16, y - 55); g.lineTo(x + 20, y - 49); g.lineTo(x + 24, y - 56); g.closePath(); g.fill();
      } else {
        g.fillStyle = '#e0533a';
        g.beginPath(); g.moveTo(x - 28, y - 58); g.lineTo(x + 28, y - 58); g.lineTo(x + 26, y - 30); g.lineTo(x + 3, y - 30); g.lineTo(x, y - 40); g.lineTo(x - 3, y - 30); g.lineTo(x - 26, y - 30); g.closePath(); g.fill();
        g.fillStyle = '#ffd34d';
        for (const [dx, dy] of [[-16, -50], [10, -48], [-6, -38], [18, -36], [-20, -36]]) { g.beginPath(); g.arc(x + dx, y + dy, 3, 0, Math.PI * 2); g.fill(); }
      }
      // bras
      g.strokeStyle = '#efc29e'; g.lineWidth = 12;
      const hands = o.cheer
        ? [[x - 44, y - 140 + Math.sin(tt * 9) * 6], [x + 44, y - 140 - Math.sin(tt * 9) * 6]]
        : o.cover ? [[x - 8, y - 52], [x + 12, y - 54]]
          : [[x - 34 - run * 10, y - 60], [x + 34 + run * 10, y - 62]];
      for (const [i, [hx, hy]] of hands.entries()) {
        const sx = x + (i ? 24 : -24), sy = y - 104;
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy); g.stroke();
        g.fillStyle = '#efc29e'; g.beginPath(); g.arc(hx, hy, 7, 0, Math.PI * 2); g.fill();
      }
      api.avatar(g, { body: false, x, y: y - 136, size: 52, expression: o.expression, sweat: o.sweat, t: tt });
    }

    function drawShark(g, x, y, open, piece) {
      g.save(); g.translate(x, y); g.rotate(-0.35);
      g.fillStyle = '#7d8ea0';
      g.beginPath(); g.ellipse(0, 0, 80, 32, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(-70, 0); g.lineTo(-120, -32); g.lineTo(-106, 0); g.lineTo(-120, 30); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-10, -28); g.lineTo(12, -66); g.lineTo(30, -26); g.closePath(); g.fill();
      g.fillStyle = '#e9eef2';
      g.beginPath(); g.ellipse(10, 14, 62, 16, 0, 0, Math.PI); g.fill();
      // gueule
      g.fillStyle = '#7a2a3a';
      g.beginPath(); g.moveTo(80, 0); g.lineTo(34, 6 - open * 4); g.lineTo(80, 6 + open * 22); g.closePath(); g.fill();
      g.fillStyle = '#fff';
      for (let k = 0; k < 4; k++) {
        g.beginPath(); g.moveTo(44 + k * 9, 6 - open * 2); g.lineTo(48 + k * 9, 12); g.lineTo(52 + k * 9, 6 - open * 2); g.fill();
      }
      if (piece) {
        g.fillStyle = '#e0533a'; g.fillRect(56, 2, 26, 14);
        g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(64, 9, 3, 0, Math.PI * 2); g.arc(75, 8, 3, 0, Math.PI * 2); g.fill();
      }
      // œil cartoon
      g.fillStyle = '#fff'; g.beginPath(); g.arc(46, -12, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1c1c28'; g.beginPath(); g.arc(49, -12, 4.5, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    function lose(text) {
      s.caught = true;
      api.sfx('splat');
      api.shake(16);
      api.end(false, text);
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        for (const k of ['left', 'right']) s.arm[k] = Math.min(1, s.arm[k] + dt * 3.2);
        for (const w of s.waves) { w.x -= dt * 20; if (w.x < -40) w.x += 800; }
        if (api.ended) {
          s.endT += dt;
          if (s.caught && s.endT > 0.3 && s.endT - dt <= 0.3) {
            api.sfx('clang');
            api.burst(X() - 30, LANE - 10, { n: 14, shape: 'star', color: ['#ffffff', '#ffe14d'], speed: 260, gravity: 300, size: 7 });
          }
          if (s.won) s.sp -= 80 * dt;
          return;
        }
        let side = null;
        if (input.pressed('left')) side = 'left';
        else if (input.pressed('right')) side = 'right';
        else if (input.pointer.pressed) side = input.pointer.x < W / 2 ? 'left' : 'right';
        if (side) stroke(side);
        s.v -= s.v * 3 * dt;
        s.p += s.v * dt;
        s.sp += sharkSpeed(s.t) * dt;
        s.look = Math.max(0, s.look - dt);
        if (Math.random() < dt * 0.6) s.look = 0.5;
        if (s.p >= DIST) {
          s.p = DIST; s.won = true;
          api.sfx('catch');
          api.burst(X() + 30, LANE - 20, { n: 20, color: ['#ffffff', '#ffe27a'], speed: 260, gravity: 400, size: 5 });
          api.end(true, s.sp > s.p - 120
            ? 'Sauvé d’une nageoire ! Tu as touché le sable avec le requin dans le rétroviseur. Ton plus beau sprint !'
            : 'Une nage olympique ! Le requin n’a vu que tes pieds et repart chercher un autre touriste.');
        } else if (s.sp >= s.p - 30) {
          lose('CROC ! Le requin a croqué… le maillot. Tu as fini le sprint jusqu’à la plage en slip troué, mais entier !');
        }
      },
      timeout() {
        lose('Le requin te rattrape au ras du sable… et repart avec ton maillot. Tu sors de l’eau en slip troué, mais entier !');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
        for (const w of s.waves) { if (w.x > shoreX(w.y) - 30) continue; g.beginPath(); g.moveTo(w.x, w.y); g.quadraticCurveTo(w.x + w.w / 2, w.y - 5, w.x + w.w, w.y); g.stroke(); }

        const px = X();
        const e = s.endT;
        const fly = s.caught ? clamp((e - 0.3) / 0.6, 0, 1) : 0;
        const inWater = !api.ended || (s.caught && e < 0.3);

        // aileron (ou requin qui bondit à la fin)
        const sx = SX();
        if (s.caught && e < 1.2) {
          const jump = Math.sin(clamp(e / 1.2, 0, 1) * Math.PI);
          drawShark(g, Math.min(sx, px - 60), LANE + 30 - jump * 60, e < 0.3 ? 1 : 0.2, e >= 0.3);
          g.fillStyle = 'rgba(255,255,255,0.8)';
          g.beginPath(); g.ellipse(Math.min(sx, px - 60), LANE + 34, 90, 10, 0, 0, Math.PI * 2); g.fill();
        } else if (sx > -60) {
          const fx = s.caught ? sx - (e - 1.2) * 300 : sx;
          g.fillStyle = 'rgba(255,255,255,0.6)';
          g.beginPath(); g.ellipse(fx - 30, LANE + 6, 46, 6, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#6d7e90';
          g.beginPath(); g.moveTo(fx - 34, LANE + 4); g.quadraticCurveTo(fx - 20, LANE - 30, fx + 2, LANE - 56); g.quadraticCurveTo(fx, LANE - 20, fx + 8, LANE + 4); g.closePath(); g.fill();
          if (s.caught && e > 1.2) { g.fillStyle = '#e0533a'; g.fillRect(fx - 4, LANE - 46, 16, 10); }
        }

        if (inWater) {
          // Papa en crawl : corps sous l'eau, bras qui moulinent
          const kick = Math.sin(s.t * 18) * 6;
          g.globalAlpha = 0.6;
          g.fillStyle = '#efc29e';
          g.beginPath(); g.ellipse(px - 46, LANE + 10, 38, 13, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#efc29e'; g.lineWidth = 11; g.lineCap = 'round';
          g.beginPath(); g.moveTo(px - 92, LANE + 8); g.lineTo(px - 128, LANE + 4 + kick); g.stroke();
          g.beginPath(); g.moveTo(px - 92, LANE + 14); g.lineTo(px - 128, LANE + 16 - kick); g.stroke();
          g.fillStyle = '#e0533a'; g.fillRect(px - 100, LANE, 22, 22);
          g.globalAlpha = 1;
          g.fillStyle = 'rgba(255,255,255,0.7)';
          g.beginPath(); g.ellipse(px - 132, LANE + 8, 12 + Math.abs(kick), 5, 0, 0, Math.PI * 2); g.fill();
          for (const side of ['left', 'right']) {
            const u = s.arm[side];
            const shx = px - 14 + (side === 'right' ? 10 : 0), shy = LANE + 2;
            if (u < 1) {
              const a = Math.PI * (1 - u);
              const hx = shx + Math.cos(a) * 46, hy = shy - Math.sin(a) * 44;
              g.strokeStyle = '#efc29e'; g.lineWidth = 11;
              g.beginPath(); g.moveTo(shx, shy); g.lineTo(hx, hy); g.stroke();
              g.fillStyle = '#efc29e'; g.beginPath(); g.arc(hx, hy, 7, 0, Math.PI * 2); g.fill();
            }
          }
          g.fillStyle = 'rgba(255,255,255,0.75)';
          g.beginPath(); g.ellipse(px + 4, LANE + 6, 34, 7, 0, 0, Math.PI * 2); g.fill();
          const close = (s.p - s.sp) < 150;
          api.avatar(g, {
            body: false, x: px, y: LANE - 18, size: 50, t: s.t, tilt: 0.12,
            expression: s.caught ? 'surprised' : close ? 'panic' : 'focus', sweat: close, lookX: s.look > 0 || close ? -1 : 1,
          });
        } else if (s.caught) {
          // éjecté vers la plage, en slip troué
          const bx = api.lerp(px, 850, fly), by = api.lerp(LANE + 10, 300, fly) - Math.sin(fly * Math.PI) * 120;
          beachPapa(g, bx, by, { slip: true, run: fly >= 1, t: s.t, expression: fly >= 1 ? 'laugh' : 'panic', sweat: true, cover: fly >= 1 });
          if (fly >= 1) api.text(g, 'Ouf… entier !', 850, 120, { size: 26, color: '#fff', stroke: '#1c6a8a', weight: 800 });
        } else {
          const wx = Math.min(840, px + 20 + e * 90);
          beachPapa(g, wx, 310, { cheer: true, t: s.t, expression: 'happy' });
        }

        if (s.caught && e > 0.25 && e < 1.0) api.text(g, 'CROC !', 420, 200, { size: 70, color: '#fff', stroke: '#1c4a6a', strokeWidth: 10, weight: 900 });

        // HUD : distance jusqu'à la plage
        const x0 = 200, x1 = 700, y0 = 40;
        api.roundRect(g, x0 - 14, y0 - 16, x1 - x0 + 28, 32, 16); g.fillStyle = 'rgba(0, 40, 60, 0.45)'; g.fill();
        g.fillStyle = '#f3dca2'; g.fillRect(x1 - 6, y0 - 10, 16, 20);
        const mapX = (p) => x0 + clamp(p / DIST, 0, 1) * (x1 - x0);
        g.fillStyle = '#6d7e90'; const fxh = mapX(s.sp);
        if (s.sp > -240) { g.beginPath(); g.moveTo(fxh - 8, y0 + 8); g.lineTo(fxh + 2, y0 - 12); g.lineTo(fxh + 6, y0 + 8); g.fill(); }
        g.fillStyle = '#efc29e'; g.beginPath(); g.arc(mapX(s.p), y0, 9, 0, Math.PI * 2); g.fill();
        api.text(g, 'Plage', x1 + 40, y0, { size: 18, color: '#fff', stroke: '#000a', weight: 800 });

        if (!api.ended) {
          const want = s.last === 'left' ? 'right' : s.last === 'right' ? 'left' : null;
          for (const side of ['left', 'right']) {
            const on = want === side || want === null;
            const cx = side === 'left' ? 90 : 640, cy = 480;
            api.roundRect(g, cx - 34, cy - 26, 68, 52, 12);
            g.fillStyle = on ? 'rgba(255, 230, 120, 0.9)' : 'rgba(255,255,255,0.3)'; g.fill();
            api.text(g, side === 'left' ? '←' : '→', cx, cy + 1, { size: 34, color: on ? '#5a3a10' : '#ffffff', weight: 900 });
          }
          if (s.msgT > 0) api.text(g, s.msg, px, LANE - 90, { size: 26, color: '#fff', stroke: '#1c4a6a', weight: 800 });
        }
      },
    };
  },
};

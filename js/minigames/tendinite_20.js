/**
 * Anecdote — « La 20e tendinite » (tendinite_20)
 * Sa 20e tendinite au pied : traverser le salon jusqu'au canapé (et sa poche de glace).
 * Mécanique : alterner ← et → (pied gauche / pied droit) en rythme.
 * Même pied deux fois, ou trop vite = « AÏE ! » et la douleur monte. Douleur max = cloche-pied.
 */
export default {
  id: 'tendinite_20',
  title: 'La 20e tendinite',
  instructions: 'Ta 20e tendinite au pied ! Rejoins le canapé et sa poche de glace en alternant pied gauche et pied droit, calmement, sans te presser.',
  controls: '← → : pied gauche / pied droit (en alternance) · clic gauche / droite de l’écran',
  duration: 11,
  introExpression: 'ouch',
  successTitle: 'Glace sur le pied !',
  failTitle: 'À cloche-pied !',
  successText: 'Arrivé au canapé, la poche de glace sur le pied : la 20e tendinite est sous contrôle. Vivement la 21e… ou pas.',
  failText: 'AÏE AÏE AÏE ! Tu finis à cloche-pied jusqu’au canapé. Vingt tendinites, et toujours aussi pressé !',

  create(api) {
    const { W, H, clamp, lerp } = api;
    const FLOOR = 468;
    const X0 = 120, X1 = 690;     // départ → devant le canapé
    const STEPS = 18;
    const MIN_GAP = 0.3;          // plus rapide que ça : AÏE
    const SOFA_X = 700, SOFA_W = 240, SEAT_Y = 392;
    const s = {
      t: 0, steps: 0, lastFoot: null, lastStepT: -9, pain: 0, x: X0, ph: 0,
      painFlash: 0, msg: '', msgT: 0, mistakes: 0, outcome: null, endT: 0,
      footFlash: { L: 0, R: 0 },
    };

    /* ── décor pré-rendu : le salon ── */
    const SC = 1.5;
    const bg = document.createElement('canvas');
    bg.width = W * SC; bg.height = H * SC;
    (function paint(b) {
      b.scale(SC, SC);
      // mur + papier peint à rayures douces
      b.fillStyle = '#f3dcc0'; b.fillRect(0, 0, W, FLOOR - 70);
      b.fillStyle = 'rgba(214, 170, 130, 0.22)';
      for (let x = 0; x < W; x += 48) b.fillRect(x, 0, 20, FLOOR - 70);
      // plinthe
      b.fillStyle = '#fff6ea'; b.fillRect(0, FLOOR - 82, W, 14);
      // parquet
      b.fillStyle = '#c48a58'; b.fillRect(0, FLOOR - 70, W, H);
      b.strokeStyle = 'rgba(110, 66, 34, 0.35)'; b.lineWidth = 2;
      for (let y = FLOOR - 70; y < H; y += 22) {
        b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke();
        const off = ((y / 22) % 2) * 60;
        for (let x = off; x < W; x += 120) { b.beginPath(); b.moveTo(x, y); b.lineTo(x, y + 22); b.stroke(); }
      }
      // tapis
      b.fillStyle = '#b5523f';
      b.beginPath(); b.ellipse(400, FLOOR + 20, 260, 34, 0, 0, Math.PI * 2); b.fill();
      b.strokeStyle = '#f2c06b'; b.lineWidth = 4;
      b.beginPath(); b.ellipse(400, FLOOR + 20, 230, 24, 0, 0, Math.PI * 2); b.stroke();
      // fenêtre + rideaux
      b.fillStyle = '#a9d8f2'; b.fillRect(250, 70, 190, 170);
      b.fillStyle = '#d7f0ff'; b.beginPath(); b.arc(300, 120, 22, 0, Math.PI * 2); b.fill();
      b.strokeStyle = '#fff'; b.lineWidth = 8; b.strokeRect(250, 70, 190, 170);
      b.beginPath(); b.moveTo(345, 70); b.lineTo(345, 240); b.moveTo(250, 155); b.lineTo(440, 155); b.stroke();
      b.fillStyle = '#d9694f';
      b.beginPath(); b.moveTo(232, 58); b.lineTo(272, 58); b.quadraticCurveTo(258, 160, 270, 262); b.lineTo(226, 262); b.closePath(); b.fill();
      b.beginPath(); b.moveTo(418, 58); b.lineTo(458, 58); b.lineTo(464, 262); b.quadraticCurveTo(432, 160, 418, 58); b.fill();
      b.fillStyle = '#8a5a3a'; b.fillRect(220, 52, 250, 8);
      // cadres
      const frame = (x, y, w, h, c) => { b.fillStyle = '#7a5130'; b.fillRect(x - 6, y - 6, w + 12, h + 12); b.fillStyle = c; b.fillRect(x, y, w, h); };
      frame(70, 100, 90, 70, '#f6c66b');
      b.fillStyle = '#e07b39'; b.beginPath(); b.arc(115, 135, 18, 0, Math.PI * 2); b.fill();
      frame(540, 90, 70, 90, '#9fd0f0');
      b.fillStyle = '#5a9446'; b.beginPath(); b.moveTo(540, 180); b.lineTo(575, 120); b.lineTo(610, 180); b.fill();
      // lampe sur pied
      b.fillStyle = '#5b4a3a'; b.fillRect(646, 170, 6, FLOOR - 250); b.fillRect(630, FLOOR - 84, 38, 8);
      b.fillStyle = '#ffd98a'; b.beginPath(); b.moveTo(624, 172); b.lineTo(674, 172); b.lineTo(662, 128); b.lineTo(636, 128); b.closePath(); b.fill();
      // canapé
      b.fillStyle = '#4f7a8a';
      api.roundRect(b, SOFA_X, SEAT_Y - 110, SOFA_W, 110, 26); b.fill();           // dossier
      b.fillStyle = '#5d8c9c';
      api.roundRect(b, SOFA_X + 10, SEAT_Y - 20, SOFA_W - 20, 52, 14); b.fill();   // assise
      b.fillStyle = '#466e7c';
      api.roundRect(b, SOFA_X - 16, SEAT_Y - 58, 40, 96, 16); b.fill();            // accoudoirs
      api.roundRect(b, SOFA_X + SOFA_W - 24, SEAT_Y - 58, 40, 96, 16); b.fill();
      b.fillStyle = '#3a2a20'; b.fillRect(SOFA_X + 8, SEAT_Y + 30, 10, 18); b.fillRect(SOFA_X + SOFA_W - 18, SEAT_Y + 30, 10, 18);
      b.fillStyle = '#f2b33d'; api.roundRect(b, SOFA_X + 150, SEAT_Y - 70, 54, 48, 12); b.fill(); // coussin
    })(bg.getContext('2d'));

    function say(m, d = 0.8) { s.msg = m; s.msgT = d; }

    function hurt(why) {
      s.pain = Math.min(100, s.pain + (why === 'same' ? 27 : 23));
      s.mistakes++;
      s.painFlash = 1;
      api.sfx('ouch');
      api.shake(10);
      api.burst(s.x + 10, FLOOR - 6, { n: 8, shape: 'star', color: ['#ffe14d', '#fff'], speed: 200, gravity: 260, size: 8 });
      say(why === 'same' ? 'AÏE ! Même pied !' : 'AÏE ! Doucement !');
      if (s.pain >= 100) {
        s.outcome = 'fail';
        api.end(false);
      }
    }

    function step(foot) {
      const now = s.t;
      s.footFlash[foot] = 1;
      if (foot === s.lastFoot) { hurt('same'); s.lastStepT = now; return; }
      if (now - s.lastStepT < MIN_GAP) { hurt('fast'); s.lastStepT = now; return; }
      s.lastFoot = foot;
      s.lastStepT = now;
      s.steps++;
      api.sfx('pop');
      api.burst(s.x + (foot === 'L' ? -8 : 14), FLOOR - 2, { n: 4, color: '#e9c9a0', speed: 80, gravity: 200, size: 4, life: 0.5 });
      if (s.steps >= STEPS) {
        s.outcome = 'win';
        api.sfx('catch');
        api.burst(SOFA_X + 90, SEAT_Y - 10, { n: 18, shape: 'star', color: ['#bfe8ff', '#ffffff'], speed: 220, gravity: 150, size: 7 });
        api.end(true, s.mistakes === 0
          ? 'Gauche, droite, gauche, droite… Arrivée en douceur, la glace sur le pied. Le kiné serait fier de toi !'
          : 'Quelques « aïe » en route, mais te voilà au canapé, la glace sur le pied. 20 tendinites, 20 victoires !');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.painFlash = Math.max(0, s.painFlash - dt * 2.5);
        s.footFlash.L = Math.max(0, s.footFlash.L - dt * 4);
        s.footFlash.R = Math.max(0, s.footFlash.R - dt * 4);
        if (api.ended) {
          s.endT += dt;
          if (s.outcome === 'fail') s.x = Math.min(X1, s.x + 70 * dt); // il continue à cloche-pied
          return;
        }
        s.pain = Math.max(0, s.pain - 5 * dt);
        if (input.pointer.pressed) step(input.pointer.x < W / 2 ? 'L' : 'R');
        else if (input.pressed('left')) step('L');
        else if (input.pressed('right')) step('R');
        // avance en douceur vers la position du pas
        const target = X0 + (X1 - X0) * (s.steps / STEPS);
        s.x = lerp(s.x, target, Math.min(1, dt * 12));
        const phT = s.lastFoot === 'L' ? 0.6 : s.lastFoot === 'R' ? -0.6 : 0;
        s.ph = lerp(s.ph, phT, Math.min(1, dt * 14));
      },
      timeout() {
        s.outcome = 'late';
        api.end(false, 'Le canapé était à trois mètres… mais avec une tendinite, trois mètres, c’est un marathon. La glace a fondu en t’attendant !');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);

        // poche de glace sur le canapé (ou sur le pied à la fin)
        const won = s.outcome === 'win';
        if (!won) {
          const bob = Math.sin(s.t * 3) * 3;
          g.fillStyle = '#7cc6ef'; api.roundRect(g, SOFA_X + 70, SEAT_Y - 44 + bob, 64, 34, 10); g.fill();
          g.fillStyle = '#dff4ff'; api.roundRect(g, SOFA_X + 78, SEAT_Y - 38 + bob, 22, 10, 5); g.fill();
          api.text(g, 'GLACE', SOFA_X + 102, SEAT_Y - 22 + bob, { size: 12, color: '#1f5f86', weight: 900 });
          g.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(s.t * 6)})`;
          g.beginPath(); g.arc(SOFA_X + 128, SEAT_Y - 48 + bob, 4, 0, Math.PI * 2); g.fill();
        }

        // Papa
        if (won) {
          const sx = SOFA_X + 70;
          api.avatar(g, { x: sx, y: SEAT_Y + 8, size: 70, pose: 'sit', expression: 'happy', t: s.t, blush: 0.3 });
          // la poche de glace sur le pied
          g.fillStyle = '#7cc6ef'; api.roundRect(g, sx + 80, SEAT_Y - 8, 46, 24, 8); g.fill();
          g.fillStyle = '#dff4ff'; api.roundRect(g, sx + 86, SEAT_Y - 4, 16, 7, 3); g.fill();
          api.text(g, 'Aaaah…', sx, SEAT_Y - 190, { size: 30, color: '#fff', stroke: '#2a6a8a' });
        } else {
          const failing = s.outcome === 'fail';
          const hop = failing ? -Math.abs(Math.sin(s.endT * 9)) * 34 : 0;
          const expr = failing ? 'ouch' : s.outcome === 'late' ? 'worried'
            : s.painFlash > 0.3 ? 'ouch' : s.pain > 55 ? 'worried' : 'focus';
          const R = 36;
          const info = api.avatar(g, {
            x: s.x, y: FLOOR + hop, size: R * 2, pose: failing ? 'stand' : 'run',
            t: Math.asin(clamp(s.ph, -1, 1)) / 13, expression: expr,
            tilt: failing ? Math.sin(s.endT * 9) * 0.15 : -s.pain / 600,
            sweat: s.pain > 40, tears: failing || s.painFlash > 0.6, lookX: 1,
          });
          // le pied douloureux (bandé) = le pied gauche de l'avatar
          const fx = failing ? s.x - 0.42 * R : s.x + s.ph * 0.9 * R;
          const fy = FLOOR + hop - (failing ? 0 : Math.max(0, -s.ph) * 0.5 * R);
          g.fillStyle = '#fff8ee';
          api.roundRect(g, fx - 10, fy - 15, 30, 13, 6); g.fill();
          g.strokeStyle = '#d9c2a2'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(fx - 2, fy - 15); g.lineTo(fx + 4, fy - 2); g.moveTo(fx + 6, fy - 15); g.lineTo(fx + 12, fy - 2); g.stroke();
          if (s.msgT > 0) api.text(g, s.msg, info.hx, info.hy - 70, { size: 30, color: '#fff', stroke: '#b0302a', strokeWidth: 7 });
          if (s.outcome === 'fail') api.text(g, 'Cloche-pied !', info.hx, info.hy - 70, { size: 30, color: '#fff', stroke: '#b0302a', strokeWidth: 7 });
        }

        // ── HUD : jauge de douleur
        api.text(g, 'Tendinite n°20', 30, 40, { size: 22, color: '#fff', align: 'left', stroke: '#000a' });
        api.text(g, 'Douleur', 30, 74, { size: 18, color: '#fff', align: 'left', stroke: '#000a', strokeWidth: 5 });
        api.roundRect(g, 108, 62, 220, 24, 12); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
        const pw = 216 * (s.pain / 100);
        if (pw > 1) {
          api.roundRect(g, 110, 64, Math.max(20, pw), 20, 10);
          g.fillStyle = s.pain > 70 ? '#e8453c' : s.pain > 40 ? '#f29a38' : '#f2d04a'; g.fill();
        }
        if (s.painFlash > 0) { g.strokeStyle = `rgba(255,80,60,${s.painFlash})`; g.lineWidth = 4; api.roundRect(g, 106, 60, 224, 28, 14); g.stroke(); }
        // progression vers le canapé
        api.text(g, `Pas : ${s.steps} / ${STEPS}`, 360, 74, { size: 20, color: '#fff', align: 'left', stroke: '#000a', strokeWidth: 5 });

        // ── deux grosses touches-pieds : laquelle est la prochaine ?
        if (!api.ended) {
          const ready = s.t - s.lastStepT >= MIN_GAP;
          const next = s.lastFoot === 'L' ? 'R' : s.lastFoot === 'R' ? 'L' : null;
          for (const [foot, x, label] of [['L', 170, '← Gauche'], ['R', 790, 'Droite →']]) {
            const isNext = next === null || next === foot;
            const glow = isNext && ready;
            const fl = s.footFlash[foot];
            api.roundRect(g, x - 80, 486, 160, 42, 21);
            g.fillStyle = glow ? `rgba(96, 196, 120, ${0.85 + fl * 0.15})` : `rgba(40, 30, 30, ${0.55 + fl * 0.2})`;
            g.fill();
            api.text(g, label, x, 507, { size: 22, color: glow ? '#fff' : 'rgba(255,255,255,0.55)' });
          }
          // métronome : se remplit jusqu'au prochain pas autorisé
          const k = clamp((s.t - s.lastStepT) / MIN_GAP, 0, 1);
          g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 8;
          g.beginPath(); g.arc(W / 2 - 20, 507, 16, 0, Math.PI * 2); g.stroke();
          g.strokeStyle = k >= 1 ? '#60c478' : '#f29a38';
          g.beginPath(); g.arc(W / 2 - 20, 507, 16, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
          api.text(g, k >= 1 ? 'Vas-y' : 'Doucement…', W / 2 + 6, 507, { size: 18, color: '#fff', align: 'left', stroke: '#000a', strokeWidth: 5 });
        }
      },
    };
  },
};

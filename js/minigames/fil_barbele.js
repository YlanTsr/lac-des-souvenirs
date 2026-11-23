/**
 * Anecdote #4 — « Le fil barbelé du verger » (fil_barbele)
 * Papa fonce à travers le verger… et les fils barbelés sont pile à hauteur de visage.
 * Mécanique : maintenir l'action pour baisser la tête au bon moment.
 * À 55 ans, on ne reste pas accroupi éternellement : au bout d'1,2 s le dos dit stop !
 */
export default {
  id: 'fil_barbele',
  title: 'Le fil barbelé du verger',
  instructions: 'Papa traverse le verger en courant… mais des fils barbelés sont tendus pile à hauteur de visage ! Baisse la tête au bon moment pour passer dessous.',
  controls: 'Maintenir Espace / ↓ / clic : baisser la tête',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Passé sous les barbelés !',
  failTitle: 'Griffé, mais vivant !',

  create(api) {
    const { W, H, rand } = api;
    const GROUND = 452;
    const PX = 250;        // position de Papa à l'écran
    const SPEED = 330;     // défilement (px/s)
    const SIZE = 54;       // diamètre de la tête
    const r = SIZE / 2;
    const WIRE_Y = 300;    // hauteur du fil = hauteur du visage debout
    const N_WIRES = 6;
    const s = {
      dist: 0, ducking: false, duckT: 0, backPain: 0, hits: 0, passed: 0, hitFlash: 0, slow: 0,
      wires: Array.from({ length: N_WIRES }, (_, i) => ({ x: 900 + i * 430 + rand(-60, 60), hit: false, passed: false })),
      trees: Array.from({ length: 9 }, (_, i) => ({ x: i * 150 + rand(0, 60), s: rand(0.8, 1.2), apples: Math.floor(rand(3, 7)) })),
      far: Array.from({ length: 7 }, (_, i) => ({ x: i * 170 + rand(0, 40), s: rand(0.5, 0.8) })),
      t: 0,
    };

    const headY = () => (s.ducking ? GROUND - 3.4 * r : GROUND - 5.05 * r);

    return {
      state: s, // exposé pour les tests depuis la console
      update(dt, input) {
        s.t += dt;
        s.hitFlash = Math.max(0, s.hitFlash - dt * 2);
        s.slow = Math.max(0, s.slow - dt);
        s.backPain = Math.max(0, s.backPain - dt);
        const want = !api.ended && (input.held() || input.held('down'));
        if (want && s.backPain === 0) {
          s.ducking = true;
          s.duckT += dt;
          if (s.duckT > 1.2) { s.ducking = false; s.backPain = 0.45; s.duckT = 0; api.sfx('ouch'); this._msg = 'Aïe, le dos !'; this._msgT = 1; }
        } else {
          s.ducking = false;
          s.duckT = 0;
        }
        this._msgT = Math.max(0, (this._msgT || 0) - dt);

        const v = SPEED * (s.slow > 0 ? 0.45 : 1) * (api.ended ? 0.6 : 1);
        s.dist += v * dt;
        for (const w of s.wires) {
          w.x -= v * dt;
          const near = Math.abs(w.x - (PX + 14)) < r * 0.9;
          if (near && !w.hit && !w.passed && !s.ducking && Math.abs(headY() - WIRE_Y) < r) {
            w.hit = true;
            s.hits++;
            s.hitFlash = 1;
            s.slow = 0.6;
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
          if (s.hits === 0) api.end(true, 'Six fils, zéro égratignure : la tête baissée au millimètre. Le verger n’a jamais vu ça !');
          else if (s.hits === 1) api.end(true, 'Une seule petite griffure, presque une cicatrice de héros. Bien mieux que le vrai jour !');
          else api.end(false, `${s.hits} rencontres avec le barbelé… Le visage s’en souvient, et nous on en rit encore (gentiment).`);
        }
      },
      timeout() { return s.hits <= 1; },
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
        api.avatar(g, {
          x: PX, y: GROUND, size: SIZE, pose: s.ducking ? 'duck' : 'run', t: s.t,
          expression: s.hitFlash > 0.3 ? 'ouch' : api.ended ? (s.hits <= 1 ? 'happy' : 'laugh') : s.ducking ? 'focus' : s.backPain > 0 ? 'ouch' : 'happy',
          scratches: s.hits * 2, tears: s.hitFlash > 0.5, sweat: s.backPain > 0,
        });

        // aide visuelle : flèche sur le prochain fil
        const next = s.wires.find((w) => !w.passed);
        if (next && next.x < 640 && next.x > PX + 30 && !api.ended) {
          const a = Math.max(0, Math.min(1, (640 - next.x) / 300));
          api.text(g, '⬇ Baisse la tête !', next.x, WIRE_Y - 66, { size: 22, color: `rgba(255,255,255,${a})`, stroke: `rgba(120,40,30,${a})` });
        }
        if (this._msgT > 0) api.text(g, this._msg, PX + 60, 200, { size: 30, color: '#fff', stroke: '#a0522d' });
        api.text(g, `Fils passés : ${s.passed} / ${N_WIRES}   ·   Griffures : ${s.hits}`, W / 2, 64, { size: 22, color: '#2b3a1a', weight: 700, stroke: 'rgba(255,255,255,0.6)', strokeWidth: 4 });
      },
    };
  },
};

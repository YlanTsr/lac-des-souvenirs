/**
 * Anecdote — « La star de Lévis-Saint-Nom » (tennis_levis)
 * Papa a failli gagner le tournoi de tennis de Lévis-Saint-Nom… et il est devenu la star locale.
 * Mécanique : la balle arrive du fond du court ; se placer (← → / souris) et frapper
 * (Espace / clic) quand elle passe dans la zone de frappe. Trop tôt, trop tard ou trop loin = faute.
 * 8 coups = star locale ; 3 fautes = presque champion.
 */
import { drawPerson, PEOPLE } from './people.js';

const GOAL = 8, MAX_FAULTS = 3;

export default {
  id: 'tennis_levis',
  title: 'La star de Lévis-Saint-Nom',
  instructions: 'Place-toi sous la balle et frappe quand elle traverse la zone jaune : tiens 8 coups pour devenir la star du tournoi !',
  controls: '← → / souris : se placer · Espace / clic : frapper',
  duration: 13,
  introExpression: 'focus',
  successTitle: 'Star locale !',
  failTitle: 'Presque champion…',
  successText: 'Huit coups gagnants, le public de Lévis-Saint-Nom en délire : on te salue encore à la boulangerie.',
  failText: 'Presque champion… À Lévis-Saint-Nom, on en parle encore comme de la finale qui a failli être la tienne.',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;
    const FAR_Y = 150, NEAR_Y = 490;
    const HIT_LO = 0.86, HIT_HI = 1.14, EARLY = 0.45;
    const REACH = 78, RACKET_DX = 40;
    const halfW = (y) => 150 + 240 * ((y - FAR_Y) / (NEAR_Y - FAR_Y));
    const persp = (y) => 0.45 + 0.55 * ((y - FAR_Y) / (NEAR_Y - FAR_Y));
    const s = {
      px: W / 2, ox: W / 2, hits: 0, faults: 0, swing: 0, msg: '', msgT: 0, msgCol: '#fff',
      ball: { mode: 'wait', u: 0, x0: W / 2, x1: W / 2, T: 0.88, wait: 0.4, id: 0 },
      tx: null, lastPtr: W / 2,
      t: 0, endT: 0, won: false, lost: false, lastX1: W / 2, flash: 0,
    };

    /* ── court + tribunes, pré-rendus ── */
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    (function paint(c) {
      const sky = c.createLinearGradient(0, 0, 0, 160);
      sky.addColorStop(0, '#8fc6ef'); sky.addColorStop(1, '#d9eefa');
      c.fillStyle = sky; c.fillRect(0, 0, W, 160);
      // arbres au loin
      c.fillStyle = '#6fae5f';
      for (let x = 0; x < W; x += 55) { c.beginPath(); c.arc(x, 128, 34, 0, Math.PI * 2); c.fill(); }
      // terrain (terre battue autour)
      c.fillStyle = '#c96a3f'; c.fillRect(0, 120, W, H - 120);
      // tribunes gauche et droite (en perspective)
      const crowdCols = ['#e8453c', '#f2b33d', '#3a6fb0', '#4fa36b', '#e88fb4', '#ffffff', '#8a5a9a'];
      const skins = ['#f3cfb3', '#e4b896', '#c99a74', '#8a5a3a', '#efc6a6'];
      for (const side of [-1, 1]) {
        c.fillStyle = '#8a7a6a';
        c.beginPath();
        if (side < 0) { c.moveTo(0, 150); c.lineTo(250, 150); c.lineTo(40, H); c.lineTo(0, H); }
        else { c.moveTo(W, 150); c.lineTo(W - 250, 150); c.lineTo(W - 40, H); c.lineTo(W, H); }
        c.closePath(); c.fill();
        let n = 0;
        for (let row = 0; row < 7; row++) {
          const y = 170 + row * 52;
          const edge = 250 - ((y - 150) / (H - 150)) * 210;
          for (let k = 0; k < 4; k++) {
            const x = side < 0 ? 14 + k * ((edge - 30) / 4) : W - 14 - k * ((edge - 30) / 4);
            const sc = 0.6 + row * 0.08;
            c.fillStyle = crowdCols[(n * 3 + row) % crowdCols.length];
            c.fillRect(x - 10 * sc, y, 20 * sc, 22 * sc);
            c.fillStyle = skins[(n + row) % skins.length];
            c.beginPath(); c.arc(x, y - 6 * sc, 9 * sc, 0, Math.PI * 2); c.fill();
            n++;
          }
        }
      }
      // court
      const corner = (lx, y) => [480 + lx * halfW(y), y];
      c.fillStyle = '#3f8fc4';
      c.beginPath();
      c.moveTo(...corner(-1.12, FAR_Y - 8)); c.lineTo(...corner(1.12, FAR_Y - 8)); c.lineTo(...corner(1.12, 540)); c.lineTo(...corner(-1.12, 540)); c.closePath(); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3;
      const line = (a, b) => { c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); };
      line(corner(-1, FAR_Y), corner(1, FAR_Y));
      line(corner(-1, NEAR_Y), corner(1, NEAR_Y));
      line(corner(-1, FAR_Y), corner(-1, 540)); line(corner(1, FAR_Y), corner(1, 540));
      line(corner(-0.75, FAR_Y), corner(-0.75, 540)); line(corner(0.75, FAR_Y), corner(0.75, 540));
      line(corner(-0.75, 215), corner(0.75, 215)); line(corner(-0.75, 400), corner(0.75, 400));
      line(corner(0, 215), corner(0, 400));
      // filet
      const ny = 290;
      c.fillStyle = 'rgba(30,30,40,0.55)';
      c.fillRect(480 - halfW(ny) * 1.1, ny - 34, halfW(ny) * 2.2, 34);
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1;
      for (let x = 480 - halfW(ny) * 1.1; x < 480 + halfW(ny) * 1.1; x += 10) line([x, ny - 34], [x, ny]);
      c.fillStyle = '#fff'; c.fillRect(480 - halfW(ny) * 1.1, ny - 38, halfW(ny) * 2.2, 5);
      c.fillStyle = '#444'; c.fillRect(480 - halfW(ny) * 1.1 - 6, ny - 42, 6, 44); c.fillRect(480 + halfW(ny) * 1.1, ny - 42, 6, 44);
      // banderole
      c.fillStyle = '#fff6da'; c.fillRect(180, 22, 470, 40);
      c.strokeStyle = '#c9a77a'; c.lineWidth = 3; c.strokeRect(180, 22, 470, 40);
      c.fillStyle = '#2b5a8a'; c.font = '900 20px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('TOURNOI DE LÉVIS-SAINT-NOM', 415, 43);
    })(bg.getContext('2d'));

    function serve() {
      const b = s.ball;
      b.mode = 'in'; b.u = 0; b.id++;
      b.x0 = s.ox;
      let x1 = s.lastX1 + rand(-240, 240);
      if (Math.abs(x1 - s.lastX1) < 70) x1 += x1 < s.lastX1 ? -90 : 90;
      x1 = clamp(x1, 190, 770);
      b.x1 = x1; s.lastX1 = x1;
      b.T = Math.max(0.76, 0.88 - 0.02 * s.hits);
    }
    function fault(text) {
      s.faults++;
      s.msg = text; s.msgT = 1; s.msgCol = '#ffb3a0';
      s.ball.mode = 'dead';
      s.ball.wait = 0.4;
      api.sfx('ouch');
      api.shake(6);
      if (s.faults >= MAX_FAULTS) {
        s.lost = true;
        api.end(false, s.hits >= 5
          ? `${s.hits} coups, puis la balle de trop… Presque champion ! À Lévis-Saint-Nom, on en parle encore.`
          : 'Presque champion… À Lévis-Saint-Nom, on en parle encore comme de la finale qui a failli être la tienne.');
      }
    }
    const ballPos = () => {
      const b = s.ball;
      if (b.mode === 'in' || b.mode === 'dead') {
        const u = b.u;
        const gy = FAR_Y + (NEAR_Y - FAR_Y) * u;
        const gx = lerp(b.x0, b.x1, u);
        const h = u < 0.6 ? lerp(55, 0, u / 0.6) + 130 * Math.sin((Math.PI * u) / 0.6) : 105 * Math.sin(Math.PI * 0.55 * ((u - 0.6) / 0.4));
        return { gx, gy, h: Math.max(0, h) };
      }
      if (b.mode === 'out') {
        const v = b.u;
        return { gx: lerp(b.x1, b.xr, v), gy: lerp(NEAR_Y, FAR_Y, v), h: 80 + 110 * Math.sin(Math.PI * v) - 40 * v };
      }
      return { gx: s.ox, gy: FAR_Y, h: 60 };
    };

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.swing = Math.max(0, s.swing - dt * 4);
        s.msgT = Math.max(0, s.msgT - dt);
        s.flash = Math.max(0, s.flash - dt * 3);
        const b = s.ball;
        if (api.ended) {
          s.endT += dt;
          if (b.mode === 'in' || b.mode === 'out' || b.mode === 'dead') b.u = Math.min(1.3, b.u + dt / (b.T || 0.8));
          return;
        }
        // déplacement de Papa (suit le curseur : souris ou flèches)
        const ax = input.axis('x');
        if (ax) { s.px = clamp(s.px + ax * 720 * dt, 110, 850); s.tx = null; }
        else if (input.pointer.x !== s.lastPtr) s.tx = input.pointer.x;
        s.lastPtr = input.pointer.x;
        if (s.tx != null) s.px += clamp(clamp(s.tx - RACKET_DX, 110, 850) - s.px, -900 * dt, 900 * dt);

        if (b.mode === 'wait' || b.mode === 'dead') {
          if (b.mode === 'dead') b.u += dt / b.T;
          b.wait -= dt;
          if (b.wait <= 0) serve();
        } else if (b.mode === 'in') {
          b.u += dt / b.T;
          if (input.pressed()) {
            s.swing = 1;
            api.sfx('whoosh');
            const pos = ballPos();
            if (b.u >= HIT_LO && b.u <= HIT_HI) {
              if (Math.abs(pos.gx - (s.px + RACKET_DX)) < REACH) {
                // coup réussi !
                s.hits++;
                s.flash = 1;
                s.msg = ['Joli !', 'Bien joué !', 'Quel revers !', 'Superbe !', 'Ace… presque !'][s.hits % 5];
                s.msgT = 0.8; s.msgCol = '#fff3a0';
                api.sfx('clang');
                api.burst(pos.gx, pos.gy - pos.h * persp(pos.gy), { n: 12, shape: 'star', color: ['#fff3a0', '#ffffff'], speed: 220, gravity: 200, size: 6 });
                b.mode = 'out'; b.u = 0; b.xr = clamp(480 + rand(-140, 140), 360, 600);
                if (s.hits >= GOAL) {
                  s.won = true;
                  api.end(true, 'Huit coups gagnants, le public de Lévis-Saint-Nom en délire : on te salue encore à la boulangerie.');
                }
              } else fault('Trop loin !');
            } else if (b.u >= EARLY && b.u < HIT_LO) fault('Trop tôt !');
          }
          if (!api.ended && b.mode === 'in' && b.u > HIT_HI) fault('Trop tard !');
        } else if (b.mode === 'out') {
          b.u += dt / 0.32;
          if (b.u >= 1) { b.mode = 'wait'; b.wait = 0.02; s.ox = b.xr; api.sfx('pop'); }
        }
        // l'adversaire suit la balle
        const target = b.mode === 'out' ? b.xr : s.ox;
        s.ox += clamp(target - s.ox, -300 * dt, 300 * dt);
      },
      timeout() {
        api.end(false, `${s.hits} coups sur ${GOAL} au coup de sifflet… Presque champion ! À Lévis-Saint-Nom, on en parle encore.`);
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        const b = s.ball;

        // public qui s'agite (plus fort à la victoire)
        const hype = s.won ? 1 : s.flash;
        if (hype > 0.05) {
          for (let i = 0; i < 24; i++) {
            const side = i % 2 ? 1 : -1;
            const row = Math.floor(i / 2) % 6;
            const x = side < 0 ? 30 + (i % 3) * 40 + row * 6 : W - 30 - (i % 3) * 40 - row * 6;
            const y = 190 + row * 52 - Math.abs(Math.sin(s.t * 10 + i)) * 10 * hype;
            g.strokeStyle = '#f3cfb3'; g.lineWidth = 4;
            g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x - 13, y - 16); g.moveTo(x + 8, y); g.lineTo(x + 13, y - 16); g.stroke();
          }
        }

        // adversaire au fond
        drawPerson(g, { ...PEOPLE.passant, shirt: '#f4f1ea', pants: '#e4e1dc', x: s.ox, y: FAR_Y + 4, size: 34, t: s.t, expression: s.won ? 'surprised' : 'smile', pose: b.mode === 'wait' ? 'point' : 'stand' });

        // zone de frappe
        const zy0 = FAR_Y + (NEAR_Y - FAR_Y) * HIT_LO, zy1 = Math.min(536, FAR_Y + (NEAR_Y - FAR_Y) * HIT_HI);
        const inZone = b.mode === 'in' && b.u >= HIT_LO && b.u <= HIT_HI;
        g.fillStyle = inZone ? 'rgba(255,230,80,0.45)' : 'rgba(255,230,80,0.18)';
        g.fillRect(s.px + RACKET_DX - REACH, zy0, REACH * 2, zy1 - zy0);
        g.strokeStyle = 'rgba(255,230,80,0.8)'; g.lineWidth = 2;
        g.strokeRect(s.px + RACKET_DX - REACH, zy0, REACH * 2, zy1 - zy0);

        const pos = ballPos();
        const k = persp(Math.min(NEAR_Y + 40, pos.gy));
        const ballY = pos.gy - pos.h * k;
        const ballBehind = pos.gy < NEAR_Y - 10;
        const drawBall = () => {
          if (b.mode === 'wait') return;
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.beginPath(); g.ellipse(pos.gx, pos.gy, 9 * k, 4 * k, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#e6f53a';
          g.beginPath(); g.arc(pos.gx, ballY, 4 + 7 * k, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 1.5;
          g.beginPath(); g.arc(pos.gx - 3 * k, ballY, (4 + 7 * k) * 0.8, -0.9, 0.9); g.stroke();
        };
        if (ballBehind) drawBall();

        // Papa, raquette à la main
        const sw = s.swing;
        const hx = s.px + RACKET_DX - 8 + sw * 20, hy = 430 - sw * 30;
        api.avatar(g, {
          x: s.px, y: NEAR_Y + 30, size: 60, t: s.t,
          pose: s.won ? 'cheer' : 'stand',
          expression: s.won ? 'laugh' : s.lost ? 'ouch' : s.msgT > 0 && s.msgCol === '#ffb3a0' ? 'worried' : s.flash > 0 ? 'happy' : 'focus',
          hands: s.won ? undefined : { l: { x: s.px - 34, y: 440 }, r: { x: hx, y: hy } },
          lookY: -0.6,
        });
        if (!s.won) {
          g.save(); g.translate(hx, hy); g.rotate(-0.5 + sw * 1.6);
          g.strokeStyle = '#3a3a48'; g.lineWidth = 5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -28); g.stroke();
          g.strokeStyle = '#e8453c'; g.lineWidth = 4;
          g.beginPath(); g.ellipse(0, -46, 15, 19, 0, 0, Math.PI * 2); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1;
          for (let q = -10; q <= 10; q += 5) { g.beginPath(); g.moveTo(q, -60); g.lineTo(q, -32); g.stroke(); g.beginPath(); g.moveTo(-13, -46 + q); g.lineTo(13, -46 + q); g.stroke(); }
          g.restore();
        }
        if (!ballBehind) drawBall();

        // HUD
        api.text(g, `Coups : ${s.hits} / ${GOAL}`, 40, 92, { size: 26, color: '#fff', stroke: '#000a', align: 'left' });
        let f = 'Fautes : ';
        for (let i = 0; i < MAX_FAULTS; i++) f += i < s.faults ? '✖ ' : '○ ';
        api.text(g, f, 40, 126, { size: 22, color: s.faults ? '#ffb3a0' : '#fff', stroke: '#000a', align: 'left' });
        if (s.msgT > 0 && !s.won) api.text(g, s.msg, W / 2, 210, { size: 36, color: s.msgCol, stroke: '#000a', strokeWidth: 8 });
        if (s.won) {
          api.text(g, 'Star locale !', W / 2, 200, { size: 60 + Math.sin(s.endT * 10) * 4, color: '#fff3a0', stroke: '#c2306a', strokeWidth: 10 });
        } else if (s.lost && s.endT > 0.3) {
          api.text(g, 'Presque champion…', W / 2, 200, { size: 44, color: '#fff', stroke: '#000a' });
        }
      },
    };
  },
};

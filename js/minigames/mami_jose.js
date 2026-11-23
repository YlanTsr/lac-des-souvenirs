/**
 * Anecdote — « Mais Mami, c'est José ! » (mami_jose)
 * Mami entend bricoler dans le bureau et lance « mon chéri, mon chéri »… sauf que ce n'est
 * pas Papa, c'est José le bricoleur ! Et les enfants : « Mais Mami, c'est José ! »
 * Mécanique : la porte du bureau s'entrouvre sur une silhouette, puis la lumière révèle qui c'est.
 * Appuyer seulement quand c'est José ; ne rien faire quand c'est Papa. 6 manches, 5 justes = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'mami_jose',
  title: '« Mais Mami, c’est José ! »',
  instructions: 'Mami appelle « mon chéri » celui qui bricole dans le bureau : crie « C’est José ! » quand c’est José, et laisse faire quand c’est bien toi.',
  controls: 'Espace / clic / tap : « C’est José ! » · ne rien faire si c’est Papa',
  duration: 13,
  introExpression: 'laugh',
  successTitle: 'Mami a reconnu José !',
  failTitle: '« Mon chéri… José ? »',
  successText: 'Grâce aux enfants, Mami n’a plus confondu son chéri avec José le bricoleur. José, lui, est un peu déçu.',
  failText: '« Mon chéri, mon chéri ! »… et c’était José, perché sur son escabeau. Mami a ri, José a rougi, et la famille en rit encore !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const FLOOR = 470;
    const DX = 470, DY = 168, DW = 190, DH = FLOOR - DY; // ouverture de la porte du bureau
    const PX = DX + DW / 2 + 12;                          // où se tient le bricoleur
    const OPEN_AT = 0.22, OPENED = 0.55, REVEAL = 0.85, DEADLINE = 1.6, AFTER = 0.5;
    const order = ['jose', 'jose', 'jose', 'papa', 'papa', 'papa'];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const s = {
      t: 0, round: 0, rt: 0, who: order[0], order, results: [], right: 0, wrong: 0,
      decided: null, decT: 0, revealed: false, lightT: 0, pressedThisRound: false,
    };

    /* ── décor pré-rendu : le couloir de la maison ── */
    const SC = 1.5;
    const bg = document.createElement('canvas');
    bg.width = W * SC; bg.height = H * SC;
    (function paint(b) {
      b.scale(SC, SC);
      b.fillStyle = '#e9d3b4'; b.fillRect(0, 0, W, FLOOR);
      b.fillStyle = 'rgba(190, 140, 100, 0.16)';
      for (let y = 20; y < FLOOR; y += 46) for (let x = (y / 46) % 2 ? 0 : 23; x < W; x += 46) { b.beginPath(); b.arc(x, y, 5, 0, Math.PI * 2); b.fill(); }
      b.fillStyle = '#b9865a'; b.fillRect(0, FLOOR - 12, W, 12);
      b.fillStyle = '#9b6b44'; b.fillRect(0, FLOOR, W, H - FLOOR);
      b.fillStyle = 'rgba(70, 40, 20, 0.25)';
      for (let x = 0; x < W; x += 64) b.fillRect(x, FLOOR, 3, H - FLOOR);
      // chambranle de la porte du bureau
      b.fillStyle = '#7a4e2e'; b.fillRect(DX - 16, DY - 18, DW + 32, DH + 18);
      b.fillStyle = '#5e3a22'; b.fillRect(DX - 6, DY - 8, DW + 12, DH + 8);
      // petit panneau « BUREAU »
      api.roundRect(b, DX + DW / 2 - 50, DY - 52, 100, 28, 6); b.fillStyle = '#fff6e6'; b.fill();
      api.text(b, 'BUREAU', DX + DW / 2, DY - 38, { size: 16, color: '#7a4e2e', weight: 900 });
      // portemanteau + tableau
      b.fillStyle = '#7a4e2e'; b.fillRect(70, 120, 120, 8);
      b.fillStyle = '#c8486b'; b.beginPath(); b.moveTo(90, 128); b.lineTo(120, 128); b.lineTo(128, 230); b.lineTo(84, 230); b.fill();
      b.fillStyle = '#4f7cac'; b.beginPath(); b.moveTo(140, 128); b.lineTo(168, 128); b.lineTo(176, 210); b.lineTo(134, 210); b.fill();
      b.fillStyle = '#7a5130'; b.fillRect(740, 110, 130, 96);
      b.fillStyle = '#9fd0f0'; b.fillRect(748, 118, 114, 80);
      b.fillStyle = '#f6c66b'; b.beginPath(); b.arc(830, 140, 12, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#6aa553'; b.beginPath(); b.moveTo(748, 198); b.lineTo(790, 150); b.lineTo(830, 198); b.fill();
    })(bg.getContext('2d'));

    // calque pour la silhouette (zone de la porte)
    const LX = DX - 40, LY = DY - 40, LW = DW + 80, LH = DH + 40;
    const sil = document.createElement('canvas');
    sil.width = LW; sil.height = LH;
    const sg = sil.getContext('2d');

    function drawWorker(g, x, y, t, expr) {
      if (s.who === 'jose') {
        const info = drawPerson(g, { ...PEOPLE.jose, x, y, size: 62, expression: expr, pose: 'stand', t, hands: { r: { x: x + 46, y: y - 150 + Math.sin(t * 20) * 3 } } });
        // perceuse
        g.fillStyle = '#e8453c'; api.roundRect(g, info.handR.x - 6, info.handR.y - 20, 40, 18, 6); g.fill();
        g.fillStyle = '#333'; g.fillRect(info.handR.x - 2, info.handR.y - 4, 10, 18);
        g.fillStyle = '#c0c6cf'; g.fillRect(info.handR.x + 34, info.handR.y - 13, 16, 4);
      } else {
        const papaExpr = { smile: 'smile', laugh: 'laugh', surprised: 'surprised', love: 'happy', worried: 'worried' }[expr] || 'smile';
        const info = api.avatar(g, { x, y, size: 62, expression: papaExpr, pose: 'stand', t, hands: { l: { x: x - 46, y: y - 110 }, r: { x: x + 44, y: y - 150 + Math.sin(t * 16) * 4 } } });
        // tournevis
        const h = info.hands.r;
        g.fillStyle = '#f2b33d'; api.roundRect(g, h.x - 5, h.y - 22, 10, 22, 4); g.fill();
        g.fillStyle = '#c0c6cf'; g.fillRect(h.x - 1.5, h.y - 42, 3, 22);
      }
    }

    function decide(pressed) {
      const ok = s.who === 'jose' ? pressed : !pressed;
      s.decided = { pressed, ok };
      s.decT = 0;
      s.results.push(ok);
      if (!s.revealed) { s.revealed = true; s.lightT = 0; }
      if (ok) { s.right++; api.sfx('catch'); api.burst(PX, 260, { n: 12, shape: 'star', color: ['#ffd34d', '#fff'], speed: 220, gravity: 300, size: 7 }); }
      else { s.wrong++; api.sfx(pressed ? 'boing' : 'splat'); api.shake(8); }
      if (s.wrong >= 2) {
        api.end(false, s.who === 'jose'
          ? '« Mon chéri, mon chéri ! »… et c’était José, perceuse à la main. Mami a ri, José a rougi, et toute la famille en rit encore !'
          : '« Mais Mami, c’est José ! »… sauf que cette fois, c’était vraiment toi. Plus personne ne sait qui bricole dans ce bureau !');
      } else if (s.right >= 5) {
        api.end(true, s.wrong === 0
          ? 'Six sur six : José n’a plus jamais été appelé « mon chéri ». Les enfants, champions de la reconnaissance faciale !'
          : 'Cinq sur six : Mami sait enfin faire la différence entre son chéri et José le bricoleur. Presque toujours.');
      }
    }

    function nextRound() {
      s.round++;
      s.rt = 0; s.decided = null; s.revealed = false; s.lightT = 0; s.pressedThisRound = false;
      if (s.round < order.length) s.who = order[s.round];
    }

    const openness = () => (s.round >= order.length ? 0 : clamp((s.rt - OPEN_AT) / (OPENED - OPEN_AT), 0, 1));

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.lightT += dt;
        if (s.decided) s.decT += dt;
        if (api.ended) return;
        if (s.round >= order.length) return;
        s.rt += dt;
        if (!s.revealed && s.rt >= REVEAL) { s.revealed = true; s.lightT = 0; api.sfx('beep'); }
        if (!s.decided) {
          if (input.pressed() && s.rt >= OPEN_AT) decide(true);
          else if (s.rt >= DEADLINE) decide(false);
        } else if (s.decT >= AFTER) {
          nextRound();
        }
      },
      timeout() { return s.right >= 5; },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        const open = openness();
        const lit = s.revealed ? clamp(s.lightT / 0.12, 0, 1) : 0;

        // ── l'intérieur du bureau (vu par l'ouverture)
        g.save();
        g.beginPath(); g.rect(DX, DY, DW, DH); g.clip();
        const dark = '#262338', warm = '#f2dbae';
        g.fillStyle = lit ? warm : dark; g.fillRect(DX, DY, DW, DH);
        // fenêtre du fond (contre-jour)
        g.fillStyle = lit ? '#bfe3f7' : '#8fb3cf'; g.fillRect(PX - 60, DY + 36, 120, 120);
        g.strokeStyle = lit ? '#fff' : '#3a3650'; g.lineWidth = 5; g.strokeRect(PX - 60, DY + 36, 120, 120);
        g.beginPath(); g.moveTo(PX, DY + 36); g.lineTo(PX, DY + 156); g.stroke();
        if (lit) {
          // étagère à outils + escabeau
          g.fillStyle = '#9b6b44'; g.fillRect(DX + 4, DY + 190, 60, 8);
          g.fillStyle = '#e8453c'; g.fillRect(DX + 10, DY + 172, 18, 18);
          g.fillStyle = '#4f7cac'; g.fillRect(DX + 34, DY + 166, 22, 24);
          g.strokeStyle = '#b8bec8'; g.lineWidth = 6;
          g.beginPath(); g.moveTo(DX + DW - 30, FLOOR); g.lineTo(DX + DW - 10, DY + 170); g.lineTo(DX + DW + 10, FLOOR); g.stroke();
        }
        if (open > 0.05 && s.round < order.length) {
          const decided = s.decided;
          const expr = !decided ? 'smile' : s.who === 'jose' ? (decided.ok ? 'laugh' : 'love') : (decided.ok ? 'laugh' : 'surprised');
          if (lit >= 1) {
            drawWorker(g, PX, FLOOR, s.t, expr);
          } else {
            // silhouette en contre-jour
            sg.setTransform(1, 0, 0, 1, 0, 0);
            sg.clearRect(0, 0, LW, LH);
            sg.globalCompositeOperation = 'source-over';
            sg.translate(-LX, -LY);
            drawWorker(sg, PX, FLOOR, s.t, 'smile');
            sg.setTransform(1, 0, 0, 1, 0, 0);
            sg.globalCompositeOperation = 'source-in';
            sg.fillStyle = '#100d18'; sg.fillRect(0, 0, LW, LH);
            sg.globalCompositeOperation = 'source-over';
            g.drawImage(sil, LX, LY);
            if (lit > 0) { g.globalAlpha = lit; drawWorker(g, PX, FLOOR, s.t, expr); g.globalAlpha = 1; }
          }
        }
        if (!lit && open > 0.05) {
          api.text(g, '?', PX + 64, DY + 60 + Math.sin(s.t * 6) * 4, { size: 44, color: '#ffd34d', stroke: '#000a' });
        }
        // la porte (pivote sur la charnière de gauche)
        const pw = DW * (1 - open * 0.82);
        g.fillStyle = '#c08a5a';
        g.beginPath(); g.moveTo(DX, DY); g.lineTo(DX + pw, DY + open * 12); g.lineTo(DX + pw, FLOOR - open * 6); g.lineTo(DX, FLOOR); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(90, 55, 30, 0.5)'; g.lineWidth = 3;
        g.strokeRect(DX + pw * 0.15, DY + 30, pw * 0.7, 100); g.strokeRect(DX + pw * 0.15, DY + 160, pw * 0.7, 110);
        g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(DX + pw - 16, DY + DH / 2 + 10, 7, 0, Math.PI * 2); g.fill();
        g.restore();

        // ── Mami (à gauche)
        const d = s.decided;
        const mamiExpr = d ? (s.who === 'jose' && !d.pressed ? 'love' : d.pressed && s.who === 'jose' ? 'surprised' : d.pressed ? 'worried' : 'love') : 'smile';
        const mi = drawPerson(g, { ...PEOPLE.mami, x: 230, y: FLOOR, size: 70, expression: mamiExpr, pose: d && !d.pressed ? 'arms_up' : 'stand', t: s.t, flipX: false });
        // la bulle de Mami se remplit jusqu'au « mon chéri ! »
        if (s.round < order.length && s.rt > 0.1) {
          const full = 'Mon chéri, mon chéri !';
          const k = d ? (d.pressed ? null : 1) : clamp(s.rt / DEADLINE, 0, 1);
          let txt = k == null ? 'Ah bon ?!' : full.slice(0, Math.max(3, Math.round(full.length * k))) + (k < 1 ? '…' : '');
          if (d && !d.pressed && s.who === 'papa') txt = 'Mon chéri !';
          const bx = 90, by = 190, bw = 300, bh = 58;
          g.fillStyle = '#fff';
          api.roundRect(g, bx, by, bw, bh, 22); g.fill();
          g.beginPath(); g.moveTo(mi.hx - 10, by + bh - 2); g.lineTo(mi.hx + 4, mi.hy - 46); g.lineTo(mi.hx + 22, by + bh - 2); g.fill();
          api.text(g, txt, bx + bw / 2, by + bh / 2 + 1, { size: 24, color: '#b5577a', weight: 800 });
        }

        // ── les enfants (à droite) qui crient
        const shout = d && d.pressed;
        drawPerson(g, { ...PEOPLE.selena, x: 790, y: FLOOR, size: 58, expression: shout ? (d.ok ? 'laugh' : 'surprised') : 'smile', pose: shout ? 'point' : 'stand', t: s.t, flipX: true });
        drawPerson(g, { ...PEOPLE.ylan, x: 880, y: FLOOR, size: 54, expression: shout ? (d.ok ? 'laugh' : 'surprised') : (d && !d.ok ? 'laugh' : 'smile'), pose: shout ? 'arms_up' : 'stand', t: s.t, flipX: true });
        if (shout) {
          const bx = 640, by = 214, bw = 300, bh = 62;
          g.fillStyle = '#fff8d6';
          api.roundRect(g, bx, by, bw, bh, 20); g.fill();
          g.beginPath(); g.moveTo(790, by + bh - 2); g.lineTo(800, 300); g.lineTo(820, by + bh - 2); g.fill();
          api.text(g, 'Mais Mami, c’est José !', bx + bw / 2, by + bh / 2, { size: 24, color: '#c2410c', weight: 900 });
        }
        // verdict de la manche
        if (d) {
          const msg = d.ok ? (s.who === 'jose' ? 'Bien vu !' : 'C’était bien toi !') : (s.who === 'jose' ? 'C’était José !' : 'C’était toi !');
          api.text(g, msg, PX, DY - 84, { size: 34, color: d.ok ? '#bff5c8' : '#ffd0c8', stroke: d.ok ? '#24603a' : '#8a2b2b', strokeWidth: 8 });
        }

        // ── HUD : 6 manches
        api.text(g, `Manche ${Math.min(s.round + 1, order.length)} / ${order.length}`, 30, 40, { size: 22, color: '#fff', align: 'left', stroke: '#000a' });
        for (let i = 0; i < order.length; i++) {
          const x = 44 + i * 34, y = 78, r = s.results[i];
          g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2);
          g.fillStyle = r === undefined ? 'rgba(0,0,0,0.3)' : r ? '#5bbf73' : '#e8453c'; g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
          if (r !== undefined) api.text(g, r ? '✓' : '✗', x, y + 1, { size: 16, color: '#fff', weight: 900 });
        }
        api.text(g, '5 justes pour gagner', 30, 108, { size: 15, color: '#fff', align: 'left', stroke: '#000a', strokeWidth: 4 });

        // ── gros bouton
        const active = !api.ended && !d && s.rt >= OPEN_AT && s.round < order.length;
        api.roundRect(g, W / 2 - 150, 484, 300, 46, 23);
        g.fillStyle = active ? '#f29a38' : 'rgba(60, 40, 30, 0.55)'; g.fill();
        api.text(g, '« C’est José ! »', W / 2, 507, { size: 24, color: active ? '#fff' : 'rgba(255,255,255,0.6)', weight: 900 });
      },
    };
  },
};

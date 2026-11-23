/**
 * Anecdote — « Le casse du graffiti » (casse_graffiti)
 * Une nuit, Papa et Maman « décrochent » un panneau graffiti dans la rue :
 * il est aujourd'hui encadré dans le salon.
 * Mécanique : appuis répétés pour dévisser les 4 vis (ou clic sur une vis précise).
 * Maman fait le guet et lève la main quand un passant arrive : il faut s'arrêter
 * (Papa sifflote, l'air innocent). Vu en train de dévisser 2 fois = raté.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'casse_graffiti',
  title: 'Le casse du graffiti',
  instructions: 'Dévisse les 4 vis du panneau… mais quand Maman lève la main, arrête-toi et sifflote, l’air innocent !',
  controls: 'Espace / clic / tap : dévisser (clic sur une vis pour la choisir)',
  duration: 13,
  introExpression: 'focus',
  successTitle: 'Casse réussi !',
  failTitle: 'Repérés !',
  successText: 'Quatre vis, zéro témoin : le graffiti trône maintenant dans le salon, encadré comme une œuvre de musée.',
  failText: 'Démasqués par les passants… Vous êtes rentrés en sifflotant. Mais le graffiti a quand même fini au salon !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const PANEL = { x: 360, y: 110, w: 260, h: 160 };
    const SCREWS = [
      { x: PANEL.x + 18, y: PANEL.y + 18 }, { x: PANEL.x + PANEL.w - 18, y: PANEL.y + 18 },
      { x: PANEL.x + PANEL.w - 18, y: PANEL.y + PANEL.h - 18 }, { x: PANEL.x + 18, y: PANEL.y + PANEL.h - 18 },
    ].map((p) => ({ ...p, turns: 0, out: false, rot: 0 }));
    const TURNS = 7;
    const SIDEWALK = 470;
    const ZONE = [200, 760];         // le passant voit le panneau dans cette zone
    const WALK = 400;
    const s = {
      t: 0, done: 0, seen: 0, seenT: -9, current: 0, work: 0, lastPress: -9, msg: '', msgT: 0, endT: 0, won: false, alert: false, papaX: 330,
      passers: [0.6 + rand(0, 0.15), 4.3 + rand(0, 0.4), 8.0 + rand(0, 0.5)].map((t0, i) => ({ t0, x: 980, active: false, gone: false, spotted: false, stop: 0, shirt: ['#8a8a9a', '#a0605a', '#5a7a9a'][i] })),
      falling: [], panelDrop: 0, notes: [],
    };

    /* ───── décor pré-rendu ───── */
    const SC = 2;
    const mk = () => { const c = document.createElement('canvas'); c.width = W * SC; c.height = H * SC; const b = c.getContext('2d'); b.scale(SC, SC); return [c, b]; };
    const [bg, b] = mk();
    {
      b.fillStyle = '#141a33'; b.fillRect(0, 0, W, H);
      // mur de briques
      b.fillStyle = '#5a3a36'; b.fillRect(0, 0, 820, SIDEWALK);
      for (let y = 0, r = 0; y < SIDEWALK; y += 22, r++) {
        for (let x = (r % 2) * -24; x < 820; x += 48) {
          b.fillStyle = ['#6e4640', '#734a43', '#674139'][(x * 7 + y * 3) % 3 === 0 ? 0 : (x + y) % 2 ? 1 : 2];
          b.fillRect(x + 2, y + 2, 44, 18);
        }
      }
      // ruelle et ciel à droite
      const sky = b.createLinearGradient(0, 0, 0, SIDEWALK);
      sky.addColorStop(0, '#0d1230'); sky.addColorStop(1, '#2a2a55');
      b.fillStyle = sky; b.fillRect(820, 0, W - 820, SIDEWALK);
      b.fillStyle = '#fff6d8'; b.beginPath(); b.arc(890, 120, 22, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 14; i++) b.fillRect(830 + (i * 47) % 120, 20 + (i * 71) % 300, 2, 2);
      b.fillStyle = '#3e2a28'; b.fillRect(812, 0, 12, SIDEWALK);
      // trottoir + rue
      b.fillStyle = '#4a4a58'; b.fillRect(0, SIDEWALK, W, 24);
      b.fillStyle = '#2c2c36'; b.fillRect(0, SIDEWALK + 24, W, H);
      b.fillStyle = '#d8c060'; for (let x = 20; x < W; x += 90) b.fillRect(x, 520, 46, 5);
      // fenêtre éteinte + gouttière
      b.fillStyle = '#2a2230'; b.fillRect(80, 60, 90, 120); b.fillRect(680, 60, 90, 120);
      b.strokeStyle = '#4a3a3a'; b.lineWidth = 6; b.strokeRect(80, 60, 90, 120); b.strokeRect(680, 60, 90, 120);
      b.fillStyle = '#4a4a58'; b.fillRect(296, 0, 10, SIDEWALK);
      // réverbère et son halo
      b.fillStyle = '#2a2a33'; b.fillRect(230, 120, 8, SIDEWALK - 120);
      b.fillRect(230, 120, 46, 6);
      const halo = b.createRadialGradient(272, 140, 10, 300, 260, 300);
      halo.addColorStop(0, 'rgba(255, 220, 140, 0.45)'); halo.addColorStop(1, 'rgba(255, 220, 140, 0)');
      b.fillStyle = halo; b.fillRect(0, 0, 820, H);
      b.fillStyle = '#ffe9a8'; b.beginPath(); b.ellipse(272, 132, 14, 8, 0, 0, Math.PI * 2); b.fill();
    }
    // le graffiti, coloré
    const [art, a] = mk();
    {
      const { w, h } = PANEL;
      a.fillStyle = '#1e2a3a'; a.fillRect(0, 0, w, h);
      const blob = (x, y, r, c) => { a.fillStyle = c; a.beginPath(); a.arc(x, y, r, 0, Math.PI * 2); a.fill(); };
      blob(70, 80, 56, '#ff4fa0'); blob(150, 70, 50, '#ffd21f'); blob(205, 105, 44, '#38d0ff');
      blob(110, 120, 34, '#7cff6a'); blob(40, 40, 18, '#38d0ff'); blob(230, 40, 16, '#ff4fa0');
      a.strokeStyle = '#111'; a.lineWidth = 6;
      for (const [x, y, r] of [[70, 80, 56], [150, 70, 50], [205, 105, 44]]) { a.beginPath(); a.arc(x, y, r, 0, Math.PI * 2); a.stroke(); }
      // visage souriant façon street-art
      a.fillStyle = '#111';
      a.beginPath(); a.arc(135, 60, 7, 0, Math.PI * 2); a.arc(168, 60, 7, 0, Math.PI * 2); a.fill();
      a.lineWidth = 6; a.beginPath(); a.arc(152, 74, 20, 0.2, Math.PI - 0.2); a.stroke();
      // coulures
      a.fillStyle = '#ff4fa0'; a.fillRect(52, 130, 7, 26); a.fillRect(80, 134, 6, 18);
      a.fillStyle = '#38d0ff'; a.fillRect(210, 145, 6, 20);
      a.fillStyle = '#fff';
      for (const [x, y] of [[30, 140], [245, 150], [120, 20]]) { a.beginPath(); for (let k = 0; k < 8; k++) { const rr = k % 2 ? 3 : 9, an = (k / 8) * Math.PI * 2; a.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } a.fill(); }
      a.strokeStyle = '#d0d4da'; a.lineWidth = 4; a.strokeRect(2, 2, w - 4, h - 4);
    }
    // le salon (fin réussie)
    const [salon, sl] = mk();
    {
      sl.fillStyle = '#f0dcc0'; sl.fillRect(0, 0, W, H);
      sl.fillStyle = '#b5824f'; sl.fillRect(0, 430, W, H - 430);
      sl.fillStyle = '#d8b48a'; sl.fillRect(0, 420, W, 12);
      sl.fillStyle = '#8a4a4a'; api.roundRect(sl, 300, 330, 360, 110, 30); sl.fill();
      sl.fillStyle = '#a65a5a'; api.roundRect(sl, 320, 300, 320, 70, 24); sl.fill();
      sl.fillStyle = '#e0b04a'; sl.fillRect(120, 230, 8, 200);
      sl.beginPath(); sl.moveTo(96, 236); sl.lineTo(152, 236); sl.lineTo(140, 190); sl.lineTo(108, 190); sl.fill();
      sl.fillStyle = '#5a8a4a'; sl.beginPath(); sl.arc(820, 360, 46, 0, Math.PI * 2); sl.fill();
      sl.fillStyle = '#9a5a3a'; sl.fillRect(800, 390, 40, 40);
      // cadre doré
      sl.fillStyle = '#c99a3a'; sl.fillRect(330, 60, 300, 210);
      sl.fillStyle = '#e8c060'; sl.fillRect(340, 70, 280, 190);
      sl.drawImage(art, 350, 80, PANEL.w, PANEL.h);
    }

    const activePasser = () => s.passers.find((p) => p.active && !p.gone);
    const danger = () => s.passers.some((p) => p.active && !p.gone && p.x > ZONE[0] && p.x < ZONE[1]);
    const warning = () => s.passers.some((p) => !p.gone && s.t > p.t0 - 0.4 && p.x > ZONE[0]);

    function turnScrew(i) {
      const sc = SCREWS[i];
      if (sc.out) return;
      sc.turns++;
      sc.rot += Math.PI / 2;
      s.work = 1;
      api.sfx('grain');
      api.burst(sc.x, sc.y, { n: 3, color: '#d8dde4', speed: 80, gravity: 300, size: 2 });
      if (sc.turns >= TURNS) {
        sc.out = true;
        s.done++;
        s.falling.push({ x: sc.x, y: sc.y, vy: -80, rot: 0 });
        api.sfx('clang');
        if (s.done >= 4) {
          s.won = true;
          api.end(true, s.seen === 0
            ? 'Quatre vis, aucun témoin, un sifflotement parfait : le casse du siècle ! Le graffiti trône maintenant au salon.'
            : 'Un passant a bien froncé les sourcils… mais le panneau est à vous ! Direction le salon, et son beau cadre doré.');
        }
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.work = Math.max(0, s.work - dt * 4);
        s.msgT = Math.max(0, s.msgT - dt);
        for (let i = s.falling.length - 1; i >= 0; i--) { const f = s.falling[i]; f.vy += 900 * dt; f.y += f.vy * dt; f.rot += dt * 8; if (f.y > SIDEWALK + 10) { s.falling.splice(i, 1); } }
        for (let i = s.notes.length - 1; i >= 0; i--) { const n = s.notes[i]; n.y -= 40 * dt; n.x += Math.sin(n.y * 0.1) * 0.6; n.life -= dt; if (n.life <= 0) s.notes.splice(i, 1); }
        // passants
        for (const p of s.passers) {
          if (!p.active && !p.gone && s.t >= p.t0) p.active = true;
          if (p.active && !p.gone) {
            if (p.stop > 0) p.stop -= dt;
            else p.x -= WALK * dt;
            if (p.x < -80) p.gone = true;
          }
        }
        s.alert = warning() || danger();
        {
          const tg = SCREWS[s.current] && !SCREWS[s.current].out ? SCREWS[s.current] : SCREWS.find((sc) => !sc.out);
          const want = s.won ? 490 : tg && tg.x > PANEL.x + PANEL.w / 2 ? PANEL.x + PANEL.w + 32 : PANEL.x - 32;
          s.papaX += (want - s.papaX) * Math.min(1, dt * 8);
        }
        if (api.ended) {
          s.endT += dt;
          if (s.won) s.panelDrop = Math.min(1, s.panelDrop + dt * 3);
          return;
        }
        const whistle = warning() && s.t - s.lastPress > 0.35;
        if (whistle && Math.random() < dt * 4) s.notes.push({ x: 440, y: 250, life: 1, c: ['♪', '♫'][Math.floor(Math.random() * 2)] });

        if (input.pressed()) {
          s.lastPress = s.t;
          // clic sur une vis précise ?
          if (input.pointer.pressed) {
            const hit = SCREWS.findIndex((sc) => !sc.out && Math.hypot(input.pointer.x - sc.x, input.pointer.y - sc.y) < 34);
            if (hit >= 0) s.current = hit;
          }
          if (SCREWS[s.current].out) s.current = SCREWS.findIndex((sc) => !sc.out);
          if (s.current >= 0) turnScrew(s.current);
          if (s.current >= 0 && SCREWS[s.current].out) s.current = Math.max(0, SCREWS.findIndex((sc) => !sc.out));
          const p = activePasser();
          if (!api.ended && p && danger() && s.t - s.seenT > 0.6) {
            s.seenT = s.t;
            p.spotted = true;
            p.stop = 0.6;
            s.seen++;
            api.sfx('ouch');
            api.shake(8);
            s.msg = s.seen >= 2 ? 'Encore vus !!' : 'Repérés ! Sifflote !'; s.msgT = 1.2;
            if (s.seen >= 2) api.end(false, 'Deux passants vous ont vus dévisser… Retraite en sifflotant ! (Vous reviendrez plus tard : le graffiti est bien au salon aujourd’hui.)');
          }
        }
      },
      timeout() {
        api.end(false, `Encore ${4 - s.done} vis à dévisser quand le jour se lève… Le casse est reporté à la nuit suivante !`);
        return false;
      },
      draw(g) {
        if (s.won && s.endT > 0.6) {
          // fondu vers le salon
          g.drawImage(salon, 0, 0, W, H);
          api.text(g, 'Aujourd’hui, dans le salon…', W / 2, 330, { size: 30, color: '#fff', stroke: '#6a3a2a', weight: 800 });
          g.fillStyle = `rgba(10, 12, 30, ${clamp(1 - (s.endT - 0.6) * 3, 0, 1)})`; g.fillRect(0, 0, W, H);
          return;
        }
        g.drawImage(bg, 0, 0, W, H);

        // le panneau (il penche quand il manque des vis, puis tombe dans les bras de Papa)
        const outL = SCREWS[0].out && SCREWS[3].out, outR = SCREWS[1].out && SCREWS[2].out;
        const tilt = s.done >= 2 ? (outL ? 0.08 : outR ? -0.08 : 0.04) : 0;
        g.save();
        const drop = s.panelDrop * 150;
        g.translate(PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h / 2 + drop);
        g.rotate(tilt * (1 - s.panelDrop));
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-PANEL.w / 2 + 6, -PANEL.h / 2 + 6, PANEL.w, PANEL.h);
        g.drawImage(art, -PANEL.w / 2, -PANEL.h / 2, PANEL.w, PANEL.h);
        g.restore();
        // vis
        for (const [i, sc] of SCREWS.entries()) {
          if (sc.out) continue;
          const k = sc.turns / TURNS;
          g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(sc.x + 2 + k * 4, sc.y + 2 + k * 4, 10, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#c9ced6'; g.beginPath(); g.arc(sc.x, sc.y, 9 + k * 2, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#555c66'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(sc.x - Math.cos(sc.rot) * 7, sc.y - Math.sin(sc.rot) * 7); g.lineTo(sc.x + Math.cos(sc.rot) * 7, sc.y + Math.sin(sc.rot) * 7); g.stroke();
          if (i === s.current && !api.ended) {
            g.strokeStyle = `rgba(255, 230, 120, ${0.6 + 0.4 * Math.sin(s.t * 8)})`; g.lineWidth = 3; g.setLineDash([5, 4]);
            g.beginPath(); g.arc(sc.x, sc.y, 18, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
          }
        }
        for (const f of s.falling) {
          g.save(); g.translate(f.x, f.y); g.rotate(f.rot);
          g.fillStyle = '#c9ced6'; g.fillRect(-3, -9, 6, 18); g.fillRect(-7, -11, 14, 4);
          g.restore();
        }

        // Papa sur son cageot, tournevis en main (ou les mains dans le dos à siffloter)
        const danger0 = warning();
        const whistle = danger0 && s.t - s.lastPress > 0.35 && !api.ended;
        const target = SCREWS[s.current] && !SCREWS[s.current].out ? SCREWS[s.current] : SCREWS.find((sc) => !sc.out) || SCREWS[0];
        const facingRight = target.x > s.papaX;
        const px = s.papaX, py = 412;
        // cageot sous les pieds
        g.fillStyle = '#9a7040'; g.fillRect(px - 45, 412, 90, 58);
        g.fillStyle = '#7a5530'; for (let k = 0; k < 3; k++) g.fillRect(px - 45, 418 + k * 18, 90, 6);
        const reach = { x: target.x + (facingRight ? -40 : 40), y: target.y + 60 + s.work * 6 };
        const handsBehind = { l: { x: px - 22, y: 362 }, r: { x: px + 22, y: 362 } };
        const holding = s.won ? { l: { x: px - 60, y: 250 + s.panelDrop * 40 }, r: { x: px + 60, y: 250 + s.panelDrop * 40 } } : null;
        const info = api.avatar(g, {
          x: px, y: py, size: 68, t: s.t,
          expression: s.won ? 'happy' : s.msgT > 0 && s.seen ? 'surprised' : whistle ? 'smile' : 'focus',
          lookX: whistle ? 0.6 : facingRight ? 0.8 : -0.8, lookY: whistle ? -0.8 : -1,
          sweat: danger0 && !whistle, blush: s.seen ? 0.5 : 0,
          hands: holding || (whistle ? handsBehind : facingRight ? { l: { x: px - 30, y: 330 }, r: reach } : { l: reach, r: { x: px + 30, y: 330 } }),
        });
        if (!whistle && !s.won && !api.ended) {
          // tournevis de la main vers la vis visée
          const h = facingRight ? info.hands.r : info.hands.l;
          g.strokeStyle = '#e0453a'; g.lineWidth = 9; g.lineCap = 'round';
          const mx = api.lerp(h.x, target.x, 0.35), my = api.lerp(h.y, target.y, 0.35);
          g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(mx, my); g.stroke();
          g.strokeStyle = '#c9ced6'; g.lineWidth = 4;
          g.beginPath(); g.moveTo(mx, my); g.lineTo(target.x, target.y); g.stroke();
          g.fillStyle = '#efc29e'; g.beginPath(); g.arc(h.x, h.y, 7, 0, Math.PI * 2); g.fill();
        }
        if (whistle) {
          g.fillStyle = '#7a3a30'; g.beginPath(); g.arc(info.hx + 4, info.hy + info.r * 0.5, 3.5, 0, Math.PI * 2); g.fill();
        }
        for (const n of s.notes) {
          g.globalAlpha = Math.min(1, n.life * 2);
          api.text(g, n.c, info.hx + 34 + (n.x - 440), n.y - (250 - info.hy) + 10, { size: 24, color: '#ffe9a8' });
        }
        g.globalAlpha = 1;

        // Maman fait le guet au coin de la rue
        const alert = danger0 || danger();
        drawPerson(g, {
          ...PEOPLE.maman, x: 860, y: 486, size: 60, t: s.t,
          pose: alert ? 'arms_up' : 'stand', expression: s.won ? 'laugh' : alert ? 'scared' : 'smile', flipX: true,
        });
        if (alert && !api.ended) api.text(g, '✋ Stop !', 860, 280, { size: 24, color: '#ffe9a8', stroke: '#000a', weight: 900 });

        // passants
        for (const p of s.passers) {
          if (!p.active || p.gone || p.x > W + 60) continue;
          const looking = p.x > ZONE[0] && p.x < ZONE[1];
          const st = drawPerson(g, {
            ...PEOPLE.passant, shirt: p.shirt, x: p.x, y: 528, size: 62, t: s.t,
            pose: p.stop > 0 ? 'stand' : 'run', expression: p.spotted ? 'surprised' : 'smile', flipX: true,
          });
          if (p.spotted) api.text(g, '?!', st.hx, st.hy - 56, { size: 34, color: '#ffde59', stroke: '#000a', weight: 900 });
          else if (looking) api.text(g, '👀', st.hx, st.hy - 54, { size: 22 });
        }

        // HUD
        api.roundRect(g, 24, 20, 330, 44, 14); g.fillStyle = 'rgba(10, 12, 30, 0.6)'; g.fill();
        api.text(g, `Vis : ${s.done} / 4`, 100, 43, { size: 22, color: '#ffe9a8', weight: 800 });
        api.text(g, 'Repérés :', 230, 43, { size: 20, color: '#fff', weight: 700 });
        for (let k = 0; k < 2; k++) {
          g.fillStyle = k < s.seen ? '#ff5a5a' : 'rgba(255,255,255,0.25)';
          g.beginPath(); g.arc(300 + k * 26, 43, 9, 0, Math.PI * 2); g.fill();
        }
        if (s.msgT > 0) api.text(g, s.msg, 480, 310, { size: 34, color: '#fff', stroke: '#8a1a1a', strokeWidth: 8, weight: 900 });
        else if (whistle) api.text(g, 'Sifflote… l’air innocent', 480, 310, { size: 22, color: '#ffe9a8', stroke: '#000a', weight: 700 });
      },
    };
  },
};

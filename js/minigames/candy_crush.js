/**
 * Anecdote — « Candy Crush en douce » (candy_crush)
 * Papa jouait à Candy Crush sur l'iPad toute la journée… alors que les enfants
 * n'avaient pas le droit de jouer au téléphone.
 * Mécanique : écraser les bonbons de la couleur demandée (les voisins identiques partent avec) ;
 * quand une tête d'enfant surgit derrière le canapé, cacher l'iPad. Pris 2 fois = échec. 12 bonbons = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'candy_crush',
  title: 'Candy Crush en douce',
  instructions: 'Écrase 12 bonbons de la couleur demandée… mais cache vite l’iPad quand un enfant surgit derrière le canapé : eux n’ont pas le droit !',
  controls: 'Clic : écraser un bonbon · maintenir ↓ / le bouton « Cacher » : cacher l’iPad · ← → + Espace au clavier',
  duration: 13,
  introExpression: 'focus',
  successTitle: 'Niveau réussi… en douce !',
  failTitle: '« Papa ! T’as pas le droit ! »',
  successText: 'Quinze bonbons écrasés, et aucun enfant n’a rien vu. Le parfait crime… jusqu’à ce que la batterie soit vide.',
  failText: 'Pris la main dans le sac (de bonbons) ! « Papa, t’as pas le droit ! » Les enfants ont gagné le droit de jouer, eux aussi.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const NEED = 12, N = 7;
    const COLORS = [
      { c: '#e8453c', name: 'rouges' }, { c: '#f2b33d', name: 'jaunes' }, { c: '#4f9de0', name: 'bleus' },
      { c: '#5bbf73', name: 'verts' }, { c: '#b46be0', name: 'violets' },
    ];
    const PAD = { x: 250, y: 92, w: 470, h: 262 };
    const CELL = 60, ROW_Y = 250, ROW_X = PAD.x + PAD.w / 2 - (N * CELL) / 2 + CELL / 2;
    const BTN = { x: 570, y: 478, w: 220, h: 48 };
    const BACK_Y = 372, KID_X = 850, SEAT_Y = 446;
    const KIDS = [PEOPLE.selena, PEOPLE.ylan, PEOPLE.iordan];

    const s = {
      t: 0, score: 0, target: 0, sincePick: 0, sel: 3, lock: 0, hidden: false, caught: 0,
      cells: [], events: [], kid: null, msg: '', msgT: 0, msgOk: true, outcome: null, shout: 0,
    };
    const randomColor = () => (Math.random() < 0.35 ? s.target : Math.floor(rand(0, COLORS.length)));
    for (let i = 0; i < N; i++) s.cells.push({ c: randomColor(), drop: 0, pop: 0 });
    const ensureTarget = () => {
      if (!s.cells.some((c) => c.c === s.target)) s.cells[Math.floor(rand(0, N))].c = s.target;
    };
    s.target = Math.floor(rand(0, COLORS.length));
    for (const c of s.cells) c.c = randomColor();
    ensureTarget();
    // trois apparitions d'enfants : signal (0,8 s) puis tête levée (1,3 s)
    {
      const order = [0, 1, 2].sort(() => Math.random() - 0.5);
      [2.3, 5.8, 9.3].forEach((at, i) => s.events.push({ at: at + rand(-0.4, 0.4), who: order[i], caught: false }));
    }
    const WARN = 0.8, UP = 1.3, GRACE = 0.15;

    /* ── décor pré-rendu : salon (mur) + canapé (calque devant les enfants) ── */
    const SC = 1.5;
    const mk = () => { const c = document.createElement('canvas'); c.width = W * SC; c.height = H * SC; const g = c.getContext('2d'); g.scale(SC, SC); return [c, g]; };
    const [wall, wg] = mk();
    wg.fillStyle = '#f4e1c6'; wg.fillRect(0, 0, W, H);
    wg.fillStyle = 'rgba(200, 150, 110, 0.18)';
    for (let x = 0; x < W; x += 54) wg.fillRect(x, 0, 24, H);
    wg.fillStyle = '#7a5130'; wg.fillRect(30, 70, 150, 110);
    wg.fillStyle = '#9fd0f0'; wg.fillRect(38, 78, 134, 94);
    wg.fillStyle = '#5bbf73'; wg.beginPath(); wg.moveTo(38, 172); wg.lineTo(100, 110); wg.lineTo(172, 172); wg.fill();
    wg.fillStyle = '#5b4a3a'; wg.fillRect(808, 120, 6, 250);
    wg.fillStyle = '#ffd98a'; wg.beginPath(); wg.moveTo(786, 122); wg.lineTo(836, 122); wg.lineTo(824, 80); wg.lineTo(798, 80); wg.closePath(); wg.fill();
    const [sofa, sg] = mk();
    sg.fillStyle = '#8a4f3a'; api.roundRect(sg, 20, BACK_Y, 920, 120, 30); sg.fill();
    sg.fillStyle = '#9c5c45'; api.roundRect(sg, 50, SEAT_Y - 6, 860, 70, 18); sg.fill();
    sg.fillStyle = '#7a4532'; api.roundRect(sg, 0, BACK_Y + 50, 70, 130, 22); sg.fill(); api.roundRect(sg, 890, BACK_Y + 50, 70, 130, 22); sg.fill();
    sg.strokeStyle = 'rgba(60, 30, 20, 0.3)'; sg.lineWidth = 3;
    for (const x of [330, 630]) { sg.beginPath(); sg.moveTo(x, BACK_Y + 12); sg.lineTo(x, SEAT_Y - 10); sg.stroke(); }
    sg.fillStyle = '#c98a3a'; sg.fillRect(0, 520, W, 20);

    const cellX = (i) => ROW_X + i * CELL;

    function crush(i) {
      if (s.lock > 0 || s.hidden || api.ended) return;
      const cell = s.cells[i];
      if (cell.drop > 0.35) return; // bonbon encore en train de tomber
      if (cell.c !== s.target) {
        s.score = Math.max(0, s.score - 1);
        s.lock = 0.4;
        api.sfx('boing');
        api.shake(5);
        s.msg = 'Pas celui-là ! −1'; s.msgT = 0.8; s.msgOk = false;
        return;
      }
      // la case + ses voisins identiques (comme dans le vrai jeu)
      let a = i, b = i;
      while (a > 0 && s.cells[a - 1].c === s.target && s.cells[a - 1].drop <= 0.35) a--;
      while (b < N - 1 && s.cells[b + 1].c === s.target && s.cells[b + 1].drop <= 0.35) b++;
      const n = b - a + 1;
      s.score += n;
      s.sincePick += n;
      api.sfx(n > 1 ? 'catch' : 'pop');
      for (let k = a; k <= b; k++) {
        api.burst(cellX(k), ROW_Y, { n: 8, color: [COLORS[s.target].c, '#fff'], speed: 220, gravity: 400, size: 5, life: 0.6 });
        s.cells[k].drop = 1;
      }
      if (n > 1) { s.msg = n >= 3 ? `Délicieux ! +${n}` : `Sucré ! +${n}`; s.msgT = 0.8; s.msgOk = true; }
      if (s.sincePick >= 5) { s.sincePick = 0; s.target = (s.target + 1 + Math.floor(rand(0, COLORS.length - 1))) % COLORS.length; }
      for (let k = a; k <= b; k++) s.cells[k].c = randomColor();
      ensureTarget();
      if (s.score >= NEED) {
        s.outcome = 'win';
        api.end(true, s.caught === 0
          ? 'Quinze bonbons, niveau réussi, et aucun enfant n’a rien vu. Le crime parfait (jusqu’à la prochaine panne de batterie).'
          : 'Niveau réussi ! Bon, un enfant t’a vu… mais tu as nié avec beaucoup d’aplomb.');
      }
    }

    function kidState() {
      for (const e of s.events) {
        const dt = s.t - e.at;
        if (dt >= 0 && dt < WARN) return { e, phase: 'warn', k: dt / WARN };
        if (dt >= WARN && dt < WARN + UP) return { e, phase: 'up', k: (dt - WARN) / UP, upT: dt - WARN };
        if (dt >= WARN + UP && dt < WARN + UP + 0.35) return { e, phase: 'down', k: (dt - WARN - UP) / 0.35 };
      }
      return null;
    }

    const inBtn = (p) => p.x >= BTN.x && p.x <= BTN.x + BTN.w && p.y >= BTN.y && p.y <= BTN.y + BTN.h;

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.lock = Math.max(0, s.lock - dt);
        s.msgT = Math.max(0, s.msgT - dt);
        s.shout = Math.max(0, s.shout - dt);
        for (const c of s.cells) c.drop = Math.max(0, c.drop - dt * 2.6);
        const ks = kidState();
        if (ks && ks.phase === 'warn' && !ks.e.warned) { ks.e.warned = true; api.sfx('whoosh'); }
        s.kid = ks;
        if (api.ended) return;

        const p = input.pointer;
        s.hidden = input.held('down') || (p.down && inBtn(p));
        if (input.pressed('left')) s.sel = Math.max(0, s.sel - 1);
        if (input.pressed('right')) s.sel = Math.min(N - 1, s.sel + 1);
        if (p.pressed && !inBtn(p)) {
          const i = Math.round((p.x - ROW_X) / CELL);
          if (i >= 0 && i < N && Math.abs(p.y - ROW_Y) < CELL * 0.6 && Math.abs(p.x - cellX(i)) < CELL * 0.5) { s.sel = i; crush(i); }
        } else if (input.pressed() && !p.pressed) {
          crush(s.sel);
        }

        // un enfant regarde : l'iPad est-il visible ?
        if (ks && ks.phase === 'up' && ks.upT > GRACE && !s.hidden && !ks.e.caught) {
          ks.e.caught = true;
          s.caught++;
          s.shout = 1.4;
          api.sfx('ouch');
          api.shake(12);
          if (s.caught >= 2) { s.outcome = 'fail'; api.end(false); }
        }
      },
      timeout() {
        s.outcome = 'late';
        api.end(false, `${s.score} bonbons sur 15… Le niveau n’est pas fini, mais tu y retourneras dès que les enfants seront couchés.`);
        return false;
      },
      draw(g) {
        g.drawImage(wall, 0, 0, W, H);
        const ks = s.kid;

        // l'enfant derrière le canapé
        if (ks) {
          const look = ks.phase === 'up';
          const hy = ks.phase === 'warn' ? BACK_Y + 30 - ks.k * 12 : ks.phase === 'up' ? BACK_Y - 44 : BACK_Y - 44 + ks.k * 90;
          const kid = KIDS[ks.e.who];
          const angry = ks.e.caught;
          drawPerson(g, { ...kid, x: KID_X + (ks.phase === 'warn' ? Math.sin(s.t * 30) * 2 : 0), y: hy + 116, size: 60, t: s.t,
            expression: angry ? 'angry' : look ? 'surprised' : 'smile', pose: angry ? 'point' : 'stand', flipX: true });
        }
        g.drawImage(sofa, 0, 0, W, H);
        if (ks && ks.phase === 'warn') {
          api.text(g, '!', KID_X, BACK_Y - 30 - Math.abs(Math.sin(s.t * 10)) * 8, { size: 46, color: '#ffd34d', stroke: '#8a2b2b', strokeWidth: 7 });
          g.strokeStyle = 'rgba(80, 40, 20, 0.6)'; g.lineWidth = 3;
          for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(KID_X, BACK_Y + 6, 30 + k * 12, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
        }
        if (ks && ks.e.caught && s.shout > 0) {
          const bx = 590, by = 200, bw = 340, bh = 58;
          g.fillStyle = '#fff8d6'; api.roundRect(g, bx, by, bw, bh, 20); g.fill();
          g.beginPath(); g.moveTo(820, by + bh - 2); g.lineTo(KID_X - 6, BACK_Y - 80); g.lineTo(850, by + bh - 2); g.fill();
          api.text(g, 'Papa ! T’as pas le droit !', bx + bw / 2, by + bh / 2, { size: 23, color: '#c2410c', weight: 900 });
        }

        // Papa affalé sur le canapé, iPad sur les genoux
        const caughtNow = s.shout > 0;
        api.avatar(g, {
          x: 120, y: SEAT_Y + 4, size: 66, pose: 'sit', t: s.t, lookX: 0.6, lookY: 0.6,
          expression: s.outcome === 'win' ? 'happy' : caughtNow || s.outcome === 'fail' ? 'surprised' : s.hidden ? 'smile' : 'focus',
          sweat: !!(ks && ks.phase !== 'down') && !s.hidden, blush: caughtNow ? 0.8 : 0,
          hands: { l: { x: 168, y: SEAT_Y - 52 }, r: { x: 218, y: SEAT_Y - 50 } },
        });
        g.save(); g.translate(194, SEAT_Y - 60); g.rotate(s.hidden ? 0.5 : -0.25);
        g.fillStyle = '#2f343c'; api.roundRect(g, -30, -20, 60, 42, 6); g.fill();
        g.fillStyle = s.hidden ? '#8a929c' : '#ffd6e8'; api.roundRect(g, -26, -16, 52, 34, 4); g.fill();
        g.restore();
        if (s.hidden && !api.ended) api.text(g, '♪ ♫', 150, SEAT_Y - 150 + Math.sin(s.t * 5) * 4, { size: 24, color: '#fff', stroke: '#000a', strokeWidth: 5 });

        // ── l'écran de l'iPad, en gros
        g.fillStyle = 'rgba(0,0,0,0.25)'; api.roundRect(g, PAD.x - 14, PAD.y - 10, PAD.w + 36, PAD.h + 36, 30); g.fill();
        g.fillStyle = '#20242b'; api.roundRect(g, PAD.x - 18, PAD.y - 18, PAD.w + 36, PAD.h + 36, 28); g.fill();
        if (s.hidden) {
          g.fillStyle = '#9aa3ad'; api.roundRect(g, PAD.x - 18, PAD.y - 18, PAD.w + 36, PAD.h + 36, 28); g.fill();
          g.fillStyle = '#c3cad2'; g.beginPath(); g.arc(PAD.x + PAD.w / 2, PAD.y + PAD.h / 2, 26, 0, Math.PI * 2); g.fill();
          api.text(g, 'iPad retourné… Je ne fais rien, moi !', PAD.x + PAD.w / 2, PAD.y + PAD.h - 30, { size: 20, color: '#fff', stroke: '#000a', strokeWidth: 5 });
        } else {
          const sky = g.createLinearGradient(0, PAD.y, 0, PAD.y + PAD.h);
          sky.addColorStop(0, '#ffb8d9'); sky.addColorStop(1, '#a88be8');
          g.fillStyle = sky; api.roundRect(g, PAD.x, PAD.y, PAD.w, PAD.h, 12); g.fill();
          api.text(g, 'Niveau 2 847', PAD.x + 20, PAD.y + 26, { size: 16, color: '#fff', align: 'left', stroke: '#7a3a8a', strokeWidth: 4 });
          // consigne : la couleur demandée
          api.text(g, `Écrase les ${COLORS[s.target].name} !`, PAD.x + PAD.w / 2 - 20, PAD.y + 70, { size: 26, color: '#fff', stroke: '#7a3a8a', strokeWidth: 6 });
          g.fillStyle = COLORS[s.target].c;
          g.beginPath(); g.arc(PAD.x + PAD.w / 2 + 150, PAD.y + 70, 15, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
          // plateau
          g.fillStyle = 'rgba(60, 30, 90, 0.35)'; api.roundRect(g, ROW_X - CELL / 2 - 8, ROW_Y - CELL / 2 - 8, N * CELL + 16, CELL + 16, 14); g.fill();
          s.cells.forEach((cell, i) => {
            const x = cellX(i), y = ROW_Y - cell.drop * 90;
            const col = COLORS[cell.c].c;
            g.globalAlpha = 1 - cell.drop * 0.6;
            g.fillStyle = col;
            g.beginPath(); g.ellipse(x, y, 22, 18, 0, 0, Math.PI * 2); g.fill();
            // papillotes
            g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x - 30, y - 9); g.lineTo(x - 30, y + 9); g.closePath(); g.fill();
            g.beginPath(); g.moveTo(x + 20, y); g.lineTo(x + 30, y - 9); g.lineTo(x + 30, y + 9); g.closePath(); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x - 7, y - 7, 7, 4, -0.5, 0, Math.PI * 2); g.fill();
            g.globalAlpha = 1;
          });
          // curseur clavier
          if (!api.ended) {
            g.strokeStyle = s.lock > 0 ? '#e8453c' : '#fff'; g.lineWidth = 4;
            api.roundRect(g, cellX(s.sel) - CELL / 2 + 2, ROW_Y - CELL / 2 + 2, CELL - 4, CELL - 4, 12); g.stroke();
          }
          if (s.msgT > 0) api.text(g, s.msg, PAD.x + PAD.w / 2, ROW_Y + 64, { size: 24, color: s.msgOk ? '#fff6a8' : '#ffd0c8', stroke: '#5a2a6a', strokeWidth: 6 });
        }

        // bouton « Cacher »
        api.roundRect(g, BTN.x, BTN.y, BTN.w, BTN.h, 24);
        g.fillStyle = s.hidden ? '#5bbf73' : ks && ks.phase !== 'down' ? '#e8453c' : '#3a4a5a'; g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
        api.text(g, s.hidden ? 'Caché !' : 'Cacher l’iPad (↓)', BTN.x + BTN.w / 2, BTN.y + BTN.h / 2, { size: 20, color: '#fff', weight: 900 });

        // HUD
        api.text(g, `Bonbons : ${s.score} / ${NEED}`, 30, 40, { size: 22, color: '#fff', align: 'left', stroke: '#000a' });
        api.text(g, 'Pris :', 30, 74, { size: 18, color: '#fff', align: 'left', stroke: '#000a', strokeWidth: 5 });
        for (let i = 0; i < 2; i++) {
          g.beginPath(); g.arc(96 + i * 26, 74, 9, 0, Math.PI * 2);
          g.fillStyle = i < s.caught ? '#e8453c' : 'rgba(0,0,0,0.3)'; g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
        }
        void clamp;
      },
    };
  },
};

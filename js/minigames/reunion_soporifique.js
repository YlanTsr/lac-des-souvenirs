/**
 * « Le coup de foudre soporifique » (reunion_soporifique)
 * Papa a rencontré Maman en réunion… et elle s'est endormie pendant sa présentation.
 * Mécanique : Maman est assise, une tasse devant elle. À des moments imprévisibles, ses
 * paupières s'alourdissent et sa tête pique du nez. Maintenir Espace / clic (ou ↓) verse du
 * café depuis la cafetière de Papa : pendant que sa tête tombe, elle boit et se redresse ;
 * quand elle est bien réveillée, la tasse déborde (café renversé, la cafetière se vide).
 * Cafetière limitée : verser en continu la vide, et la prochaine chute de tête est fatale.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'reunion_soporifique',
  title: 'Le coup de foudre soporifique',
  instructions: 'Ta présentation endort Maman : verse-lui du café uniquement quand sa tête commence à tomber, sinon la tasse déborde !',
  controls: 'Maintenir Espace / clic (ou ↓) : verser le café',
  duration: 12,
  introExpression: 'smile',
  successTitle: 'Réunion passionnante !',
  failTitle: 'Elle s’est endormie…',
  successText: 'Un café pile au bon moment, à chaque fois : Maman a tenu jusqu’au bout, et elle t’a même souri. Le début d’une grande histoire !',
  failText: 'Zzz… Maman s’est endormie en pleine présentation. Soporifique, mais inoubliable : c’était le début d’une grande histoire.',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;
    const FLOOR = 480;
    const SCR = { x: 50, y: 70, w: 400, h: 230 };
    const MX = 810, MY = 432, MSIZE = 84, MR = MSIZE / 2;
    const NECK_X = MX + 0.05 * MR, NECK_Y = MY - 2.15 * MR;
    const TABLE_Y = 400;
    const CUP = { x: 740, w: 28, h: 32 };            // tasse posée sur la table (x = centre)
    const HAND = { x: 690, y: 328 };                 // main de Papa qui tient la cafetière
    const CUP_BASE = 0.7;                            // niveau de la tasse quand Maman est servie
    const REVIVE = 0.22;                             // s de versement pour la réveiller
    const s = {
      phase: 'awake', calm: rand(0.9, 1.5), head: 0, hv: 0, revive: 0,
      cup: CUP_BASE, pot: 1, pouring: false, tilt: 0.1, buf: 0,
      drinkT: 0, wokeT: 0, annoyT: 0, spilling: false, spills: 0, puddle: 0, saves: 0,
      msg: '', msgT: 0, msgBad: false, result: null, endT: 0, emptyMsg: false,
    };

    // ── salle de réunion pré-rendue
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      g.fillStyle = '#efe4d2'; g.fillRect(0, 0, W, FLOOR);
      g.fillStyle = '#7a6a5a'; g.fillRect(0, FLOOR, W, H - FLOOR);
      g.fillStyle = '#d8c8b0'; g.fillRect(0, FLOOR - 18, W, 18);
      // fenêtre sur la ville
      g.fillStyle = '#a9cfe8'; g.fillRect(520, 90, 220, 150);
      g.fillStyle = '#8aa3b8';
      for (let i = 0; i < 6; i++) g.fillRect(530 + i * 36, 160 - (i % 3) * 22, 28, 80 + (i % 3) * 22);
      g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(520, 90, 220, 150);
      g.beginPath(); g.moveTo(630, 90); g.lineTo(630, 240); g.stroke();
      // horloge
      g.fillStyle = '#fff'; g.beginPath(); g.arc(870, 140, 30, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3a3a44'; g.lineWidth = 4; g.stroke();
      g.beginPath(); g.moveTo(870, 140); g.lineTo(870, 120); g.moveTo(870, 140); g.lineTo(884, 148); g.stroke();
      // plante
      g.fillStyle = '#b8643a'; g.fillRect(470, 420, 40, 50);
      g.fillStyle = '#4f9a4a';
      for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(490 + Math.cos(i) * 16, 402 - i * 7, 11, 26, i - 2.5, 0, Math.PI * 2); g.fill(); }
      // écran de projection (cadre + pied)
      g.fillStyle = '#3a3a44'; g.fillRect(SCR.x - 8, SCR.y - 14, SCR.w + 16, 10);
      g.fillRect(SCR.x + SCR.w / 2 - 3, SCR.y + SCR.h, 6, FLOOR - 18 - SCR.y - SCR.h);
      g.fillRect(SCR.x + SCR.w / 2 - 50, FLOOR - 22, 100, 6);
      // dossier de la chaise de Maman
      g.fillStyle = '#4a4a58'; api.roundRect(g, MX - 52, 300, 104, 110, 14); g.fill();
    }

    function say(txt, bad, dur = 1) { s.msg = txt; s.msgBad = bad; s.msgT = dur; }

    return {
      state: s,
      update(dt, input) {
        s.msgT = Math.max(0, s.msgT - dt);
        s.annoyT = Math.max(0, s.annoyT - dt);
        s.wokeT = Math.max(0, s.wokeT - dt);
        s.hv = lerp(s.hv, s.head, Math.min(1, dt * (s.head < s.hv ? 9 : 14)));
        if (api.ended) {
          s.endT += dt; s.pouring = false;
          s.tilt = lerp(s.tilt, 0.1, Math.min(1, dt * 8));
          if (s.result === 'fail') s.head = Math.min(1.25, s.head + dt);
          return;
        }

        // ── verser (maintenir), un tap verse une petite goutte
        if (input.pressed()) s.buf = 0.12;
        s.buf = Math.max(0, s.buf - dt);
        const want = input.held() || input.held('down') || s.buf > 0;
        s.pouring = want && s.pot > 0;
        s.tilt = lerp(s.tilt, s.pouring ? 0.7 : 0.1, Math.min(1, dt * 14));
        s.drinkT = Math.max(0, s.drinkT - dt);
        if (s.drinkT > 0) s.cup = Math.max(CUP_BASE, s.cup - 1.8 * dt);

        let spill = false;
        if (s.pouring) {
          s.pot = Math.max(0, s.pot - 0.2 * dt);
          if (s.phase === 'nod') {
            // elle sent le café : elle boit et se redresse
            s.cup = Math.min(1, s.cup + 1.2 * dt);
            s.revive += dt;
            if (s.revive >= REVIVE) {
              s.phase = 'awake'; s.head = 0; s.revive = 0; s.saves++;
              s.calm = rand(0.6, 2.0) * (s.saves > 3 ? 0.85 : 1);
              s.drinkT = 0.45; s.wokeT = 0.5;
              api.sfx('catch');
              api.burst(NECK_X, NECK_Y - 1.2 * MR, { n: 8, shape: 'star', color: ['#ffd34d', '#fff'], speed: 160, gravity: 120, size: 6 });
              say(['Slurp ! Hein ? Oui oui, j’écoute !', 'Mmh, du café !', 'Je suis réveillée !', 'Passionnant…'][(s.saves - 1) % 4], false);
            }
          } else if (s.drinkT <= 0) {
            // elle est bien réveillée : la tasse se remplit… et déborde
            s.cup += 1.2 * dt;
            if (s.cup >= 1) {
              s.cup = 1; spill = true;
              s.pot = Math.max(0, s.pot - 0.55 * dt);
              s.puddle = Math.min(1, s.puddle + dt * 0.8);
            }
          }
        }
        if (spill && !s.spilling) {
          s.spills++; s.annoyT = 1.1;
          api.sfx('splat'); api.shake(4);
          api.burst(CUP.x, TABLE_Y - CUP.h, { n: 10, color: ['#6a4a32', '#4a3020'], speed: 140, gravity: 500, size: 5 });
          say(['Hé ! Ça déborde !', 'Mon dossier ! Tout trempé !', 'Mais arrête de verser !'][Math.min(2, s.spills - 1)], true);
        }
        s.spilling = spill;
        if (s.pot <= 0 && !s.emptyMsg) { s.emptyMsg = true; api.sfx('clang'); say('Cafetière vide !', true, 1.4); }

        // ── Maman : réveillée → la tête commence à tomber → endormie
        if (s.phase === 'awake') {
          s.calm -= dt;
          if (s.calm <= 0) { s.phase = 'nod'; s.head = 0; s.revive = 0; }
        } else {
          const fall = Math.max(0.65, 0.95 - 0.025 * api.t);
          s.head += dt * (0.5 + s.head) / fall * (s.pouring ? 0.4 : 1);   // elle boit : la chute ralentit
          if (s.head >= 1) {
            s.head = 1; s.result = 'fail';
            api.sfx('boing');
            say('Zzz…', true, 2);
            api.end(false);
          }
        }
      },
      timeout() { s.result = 'win'; return true; },
      draw(g) {
        const t = api.t;
        g.drawImage(bg, 0, 0);
        // diapo ennuyeuse
        g.fillStyle = '#fbfbf7'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
        g.strokeStyle = '#c9c9c0'; g.lineWidth = 2; g.strokeRect(SCR.x, SCR.y, SCR.w, SCR.h);
        const n = 47 + Math.floor(t * 1.5);
        api.text(g, `Diapo ${n} / 212 : stocks trimestriels`, SCR.x + SCR.w / 2, SCR.y + 24, { size: 15, color: '#6a6a70' });
        g.fillStyle = '#9a9aa2';
        for (let i = 0; i < 8; i++) {
          const bh = 40 + (((i + n) * 37) % 50);
          g.fillRect(SCR.x + 40 + i * 42, SCR.y + SCR.h - 30 - bh, 26, bh);
        }
        g.fillStyle = '#c9c9c0'; g.fillRect(SCR.x + 30, SCR.y + SCR.h - 30, SCR.w - 60, 2);

        // jauge de café (en bas à gauche, bien lisible)
        api.text(g, 'Cafetière', 60, 352, { size: 20, color: '#fff', stroke: '#000a', align: 'left' });
        api.roundRect(g, 60, 366, 300, 20, 10); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
        if (s.pot > 0) {
          api.roundRect(g, 62, 368, 296 * s.pot, 16, 8);
          g.fillStyle = s.pot < 0.25 ? '#e8453c' : s.pot < 0.5 ? '#c88a3d' : '#7a4a2a'; g.fill();
        }
        if (!api.ended) api.text(g, 'Verse seulement quand sa tête tombe !', 60, 412, { size: 17, color: '#fff3d6', stroke: '#000a', align: 'left' });

        // Papa (debout, la cafetière à la main)
        api.avatar(g, {
          x: 600, y: FLOOR, size: 70, pose: 'stand', lookX: 1,
          expression: s.result === 'fail' ? 'laugh' : s.result === 'win' ? 'happy' : s.annoyT > 0 ? 'worried'
            : s.phase === 'nod' && s.head > 0.45 ? 'panic' : s.pouring ? 'focus' : 'smile',
          sweat: !api.ended && (s.phase === 'nod' && s.head > 0.4 || s.pot < 0.25), blush: s.result === 'win' ? 1 : 0,
          hands: { l: { x: 562, y: 404 }, r: HAND },
        });

        // Maman, assise : corps (sans la tête), puis tête qui pique du nez
        const h = s.hv;
        const asleep = s.result === 'fail';
        const expr = asleep ? 'sleep' : s.result === 'win' ? 'love' : s.annoyT > 0 ? 'angry' : s.wokeT > 0 ? 'surprised' : 'smile';
        g.save();
        g.beginPath(); g.rect(0, NECK_Y - 0.08 * MR, W, H); g.clip();
        drawPerson(g, { ...PEOPLE.maman, x: MX, y: MY, size: MSIZE, pose: 'sit', t, expression: expr });
        g.restore();
        const sway = !api.ended ? Math.sin(t * 1.7) * 0.04 : 0;
        const ang = sway - Math.pow(clamp(h, 0, 1.25), 1.3) * 0.75;
        const drop = clamp(h, 0, 1.25) * 0.4 * MR;
        const hyRel = -0.85 * MR + drop;
        g.save(); g.translate(NECK_X, NECK_Y); g.rotate(ang);
        drawPerson(g, { ...PEOPLE.maman, x: 0, y: hyRel, size: MSIZE, body: false, t, expression: expr });
        // paupières lourdes
        const blink = (t % 3.1) < 0.12 ? 0.9 : 0.1;
        const lid = clamp(s.phase === 'nod' && !api.ended ? 0.25 + h * 1.4 : blink, 0, 0.95);
        if (expr === 'smile' && lid > 0.12) {
          const ey = hyRel - 0.05 * MR, rx = 0.17 * MR, ry = 0.14 * MR;
          for (const sd of [-1, 1]) {
            const ex = sd * 0.36 * MR;
            g.fillStyle = PEOPLE.maman.skin; g.beginPath(); g.arc(ex, ey, 0.22 * MR, 0, Math.PI * 2); g.fill();
            g.save(); g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); g.clip();
            g.fillStyle = '#fff'; g.fillRect(ex - rx, ey - ry, rx * 2, ry * 2);
            g.fillStyle = '#3b2a22'; g.beginPath(); g.arc(ex, ey + 1, ry * 0.8, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#e8b898'; g.fillRect(ex - rx, ey - ry, rx * 2, ry * 2 * lid);
            g.restore();
            g.strokeStyle = '#2a201b'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(ex - rx, ey - ry + ry * 2 * lid); g.lineTo(ex + rx, ey - ry + ry * 2 * lid); g.stroke();
          }
        }
        g.restore();

        // table (cache les jambes) + dossier
        g.fillStyle = '#8a5a34'; g.fillRect(640, TABLE_Y, 320, 16);
        g.fillStyle = '#6f4527'; g.fillRect(650, TABLE_Y + 16, 300, H - TABLE_Y - 16);
        g.fillStyle = '#fff'; g.fillRect(845, TABLE_Y - 6, 70, 6);
        g.fillStyle = '#d8d8e0'; g.fillRect(850, TABLE_Y - 9, 60, 3);
        // flaque de café renversé
        if (s.puddle > 0) {
          g.fillStyle = 'rgba(90, 58, 36, 0.85)';
          g.beginPath(); g.ellipse(CUP.x + 6, TABLE_Y + 2, 18 + 50 * s.puddle, 4 + 3 * s.puddle, 0, 0, Math.PI * 2); g.fill();
          g.fillRect(CUP.x + 40 * s.puddle, TABLE_Y + 4, 5, 10 + 40 * s.puddle);
        }
        // tasse
        const cx0 = CUP.x - CUP.w / 2, cy0 = TABLE_Y - CUP.h;
        g.strokeStyle = '#fff'; g.lineWidth = 5;
        g.beginPath(); g.arc(cx0 - 2, cy0 + 14, 8, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
        g.fillStyle = '#fff'; g.fillRect(cx0, cy0, CUP.w, CUP.h);
        const lvl = clamp(s.cup, 0, 1) * (CUP.h - 4);
        g.fillStyle = '#6a4a32'; g.fillRect(cx0 + 3, TABLE_Y - 2 - lvl, CUP.w - 6, lvl);
        g.fillStyle = '#e8d8c8'; g.fillRect(cx0 - 4, TABLE_Y - 3, CUP.w + 8, 3);
        if (s.spilling) {
          g.fillStyle = '#6a4a32';
          for (const dx of [-1, 1]) g.fillRect(CUP.x + dx * (CUP.w / 2 + 1) - 2, cy0, 4, CUP.h - 2 + Math.sin(t * 20) * 2);
        }
        if (!api.ended || s.result === 'win') {
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
          for (let i = 0; i < 2; i++) {
            const k = (t * 0.8 + i * 0.5) % 1;
            g.beginPath(); g.moveTo(CUP.x - 5 + i * 10, cy0 - 4 - k * 26);
            g.quadraticCurveTo(CUP.x + 2 + i * 10 + Math.sin(t * 4 + i) * 5, cy0 - 12 - k * 26, CUP.x - 5 + i * 10, cy0 - 20 - k * 26); g.stroke();
          }
        }

        // cafetière (verre) dans la main de Papa
        g.save(); g.translate(HAND.x, HAND.y); g.rotate(s.tilt);
        g.strokeStyle = '#2a2a30'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(4, -14); g.quadraticCurveTo(-4, 6, 6, 22); g.stroke(); // anse
        g.fillStyle = 'rgba(220, 235, 245, 0.8)';
        g.beginPath(); g.moveTo(12, -18); g.lineTo(42, -18); g.lineTo(46, 28); g.lineTo(8, 28); g.closePath(); g.fill();
        const pl = 44 * s.pot;
        if (pl > 0) { g.fillStyle = '#5a3a22'; g.fillRect(9, 28 - Math.min(44, pl), 36, Math.min(44, pl)); }
        g.strokeStyle = '#2a2a30'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(12, -18); g.lineTo(42, -18); g.lineTo(46, 28); g.lineTo(8, 28); g.closePath(); g.stroke();
        g.fillStyle = '#2a2a30'; g.fillRect(10, -24, 34, 7);
        g.beginPath(); g.moveTo(42, -18); g.lineTo(50, -18); g.lineTo(42, -10); g.closePath(); g.fill(); // bec
        g.restore();
        // filet de café
        if (s.pouring) {
          const c = Math.cos(s.tilt), sn = Math.sin(s.tilt);
          const sx = HAND.x + 48 * c + 16 * sn, sy = HAND.y + 48 * sn - 16 * c;
          g.strokeStyle = '#6a4a32'; g.lineWidth = 5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + 4, sy + 10, CUP.x + Math.sin(t * 30), TABLE_Y - 2 - lvl); g.stroke();
        }

        // z, cœur et bulles
        if (asleep || (s.phase === 'nod' && h > 0.5 && !api.ended)) {
          const a = asleep ? 1 : (h - 0.5) * 2;
          for (let i = 0; i < 3; i++) {
            const k = (t * 0.6 + i / 3) % 1;
            api.text(g, 'z', MX + 40 + k * 40, NECK_Y - 1.6 * MR - k * 70, { size: 18 + k * 22, color: `rgba(255,255,255,${a * (1 - k)})`, stroke: `rgba(60,60,90,${a * (1 - k)})`, strokeWidth: 4 });
          }
        }
        if (s.result === 'win') api.text(g, '♥', MX + 50, NECK_Y - 1.9 * MR - s.endT * 30, { size: 40, color: '#e0405f', stroke: '#fff' });
        if (s.msgT > 0) api.text(g, s.msg, 760, 236, { size: 20, color: '#fff', stroke: s.msgBad ? '#7a1e1e' : '#2c4a48' });
        if (asleep && s.endT > 0.2) api.text(g, '… le début d’une grande histoire', W / 2, 270, { size: 26, color: '#fff3d6', stroke: '#3a2a50', strokeWidth: 8 });
      },
    };
  },
};

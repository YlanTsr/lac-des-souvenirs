/**
 * « Le coup de foudre soporifique » (reunion_soporifique)
 * Papa a rencontré Maman en réunion… et elle s'est endormie pendant sa présentation.
 * Mécanique : les paupières de Maman tombent peu à peu ; une idée s'allume (blague,
 * graphique en couleurs, café, chaton) : appuie la bonne flèche (ou clique l'icône)
 * pour la réveiller. Mauvaise touche ou Espace (« diapo suivante ») = encore plus ennuyeux.
 */
import { drawPerson, PEOPLE } from './people.js';

const IDEAS = {
  up: { arrow: '↑', label: 'Blague' },
  left: { arrow: '←', label: 'Camembert' },
  right: { arrow: '→', label: 'Café' },
  down: { arrow: '↓', label: 'Chaton' },
};
const DIRS = ['up', 'left', 'right', 'down'];

export default {
  id: 'reunion_soporifique',
  title: 'Le coup de foudre soporifique',
  instructions: 'Ta présentation endort Maman : dès qu’une idée s’allume, appuie sur la bonne flèche pour la garder éveillée jusqu’à la fin de la réunion.',
  controls: '← ↑ → ↓ ou clic sur l’icône : la réveiller',
  duration: 12,
  introExpression: 'smile',
  successTitle: 'Réunion passionnante !',
  failTitle: 'Elle s’est endormie…',
  successText: 'Blagues, camemberts et café : Maman a tenu jusqu’au bout, et elle t’a même souri. Le début d’une grande histoire !',
  failText: 'Zzz… Maman s’est endormie en pleine présentation. Soporifique, mais inoubliable : c’était le début d’une grande histoire.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const FLOOR = 480;
    const SCR = { x: 50, y: 70, w: 400, h: 230 };
    const MX = 760, MY = 432, MSIZE = 84, MR = MSIZE / 2;
    const BTN = {
      up: { x: 215, y: 330 }, left: { x: 110, y: 400 }, right: { x: 320, y: 400 }, down: { x: 215, y: 470 },
    };
    const BW = 96, BH = 58;
    const s = {
      drowsy: 0.15, want: null, wantT: 0, gap: 0.6, slide: 'bars', slideT: 0, flash: 0, wrongT: 0,
      msg: '', msgT: 0, result: null, endT: 0, coffee: 0, answered: 0,
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
      g.fillStyle = '#b8643a'; g.fillRect(890, 400, 44, 60);
      g.fillStyle = '#4f9a4a';
      for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(912 + Math.cos(i) * 18, 380 - i * 8, 12, 30, i - 2.5, 0, Math.PI * 2); g.fill(); }
      // écran de projection (cadre)
      g.fillStyle = '#3a3a44'; g.fillRect(SCR.x - 8, SCR.y - 14, SCR.w + 16, 10);
    }

    function nextIdea() {
      let d;
      do d = DIRS[Math.floor(rand(0, 4))]; while (d === s.want && rand(0, 1) < 0.7);
      s.want = d;
      s.wantT = Math.max(1.05, 1.6 - api.t * 0.04);
    }

    function answer(d) {
      if (!s.want) { bore(0.05, 'Euh…'); return; }
      if (d === s.want) {
        s.drowsy = Math.max(0, s.drowsy - 0.2);
        s.slide = d; s.slideT = 1.2; s.flash = 0.4; s.answered++;
        if (d === 'right') s.coffee = 1;
        api.sfx('pop');
        api.burst(MX, MY - 3.3 * MR, { n: 10, shape: 'star', color: ['#ffd34d', '#fff'], speed: 180, gravity: 150, size: 6 });
        s.msg = { up: '« Et là, le comptable me dit… »', left: 'Ooh, des couleurs !', right: 'Un petit café ?', down: 'Un chaton ! Trop mignon.' }[d]; s.msgT = 1;
        s.want = null; s.gap = 0.35;
      } else {
        bore(0.12, '… et donc, le tableau croisé dynamique…');
        s.want = null; s.gap = 0.5;
      }
    }
    function bore(k, txt) {
      s.drowsy += k; s.wrongT = 0.6; s.slide = 'bars'; s.msg = txt; s.msgT = 1;
      api.sfx('boing');
    }

    return {
      state: s,
      update(dt, input) {
        s.slideT = Math.max(0, s.slideT - dt);
        s.flash = Math.max(0, s.flash - dt);
        s.wrongT = Math.max(0, s.wrongT - dt);
        s.msgT = Math.max(0, s.msgT - dt);
        s.coffee = Math.max(0, s.coffee - dt);
        if (api.ended) { s.endT += dt; return; }

        s.drowsy += (0.1 + 0.016 * api.t) * dt;
        if (s.want) {
          s.wantT -= dt;
          if (s.wantT <= 0) { s.want = null; s.gap = 0.25; s.drowsy += 0.04; s.msg = 'Trop tard…'; s.msgT = 0.6; }
        } else {
          s.gap -= dt;
          if (s.gap <= 0) nextIdea();
        }
        for (const d of DIRS) if (input.pressed(d)) answer(d);
        const p = input.pointer;
        if (p.pressed) {
          const d = DIRS.find((k) => Math.abs(p.x - BTN[k].x) < BW / 2 && Math.abs(p.y - BTN[k].y) < BH / 2);
          if (d) answer(d);
        } else if (input.pressed()) {
          bore(0.06, 'Diapo suivante : encore un tableau Excel !');
        }
        if (s.drowsy >= 1) {
          s.drowsy = 1; s.result = 'fail';
          api.end(false);
        }
      },
      timeout() { s.result = 'win'; return true; },
      draw(g) {
        g.drawImage(bg, 0, 0);
        // diapo
        g.fillStyle = '#fbfbf7'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
        g.strokeStyle = '#c9c9c0'; g.lineWidth = 2; g.strokeRect(SCR.x, SCR.y, SCR.w, SCR.h);
        const cx = SCR.x + SCR.w / 2, cy = SCR.y + SCR.h / 2 + 10;
        const sl = s.slideT > 0 ? s.slide : 'bars';
        if (sl === 'bars') {
          api.text(g, 'Évolution trimestrielle des stocks (suite)', cx, SCR.y + 24, { size: 15, color: '#6a6a70' });
          g.fillStyle = '#9a9aa2';
          for (let i = 0; i < 8; i++) g.fillRect(SCR.x + 40 + i * 42, SCR.y + SCR.h - 30 - (40 + ((i * 37) % 50)), 26, 40 + ((i * 37) % 50));
          g.fillStyle = '#c9c9c0'; g.fillRect(SCR.x + 30, SCR.y + SCR.h - 30, SCR.w - 60, 2);
        } else if (sl === 'left') {
          const cols = ['#e8453c', '#f2b33d', '#4fa36b', '#3a6fb0', '#c8486b'];
          let a = -Math.PI / 2;
          for (let i = 0; i < 5; i++) { const b = a + [1.6, 1.2, 1.4, 1.0, 1.08][i]; g.fillStyle = cols[i]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 80, a, b); g.closePath(); g.fill(); a = b; }
        } else if (sl === 'up') {
          api.text(g, 'HA HA HA !', cx, cy - 20, { size: 46, color: '#e8453c', weight: 900 });
          api.text(g, '(la blague du comptable)', cx, cy + 34, { size: 18, color: '#6a6a70' });
        } else if (sl === 'right') {
          g.fillStyle = '#fff'; g.strokeStyle = '#6a4a32'; g.lineWidth = 6;
          g.beginPath(); g.moveTo(cx - 50, cy - 40); g.lineTo(cx + 40, cy - 40); g.lineTo(cx + 30, cy + 50); g.lineTo(cx - 40, cy + 50); g.closePath(); g.fill(); g.stroke();
          g.beginPath(); g.arc(cx + 50, cy, 20, -1.2, 1.2); g.stroke();
          g.fillStyle = '#6a4a32'; g.fillRect(cx - 44, cy - 34, 78, 12);
          api.text(g, 'PAUSE CAFÉ', cx, SCR.y + 28, { size: 20, color: '#6a4a32', weight: 900 });
        } else if (sl === 'down') {
          g.fillStyle = '#f2b33d';
          g.beginPath(); g.arc(cx, cy, 60, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.moveTo(cx - 55, cy - 20); g.lineTo(cx - 45, cy - 80); g.lineTo(cx - 15, cy - 55); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(cx + 55, cy - 20); g.lineTo(cx + 45, cy - 80); g.lineTo(cx + 15, cy - 55); g.closePath(); g.fill();
          g.fillStyle = '#2a201b'; g.beginPath(); g.arc(cx - 22, cy - 6, 7, 0, Math.PI * 2); g.arc(cx + 22, cy - 6, 7, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#e88fb4'; g.beginPath(); g.arc(cx, cy + 12, 6, 0, Math.PI * 2); g.fill();
        }

        // Papa et sa baguette
        api.avatar(g, {
          x: 540, y: FLOOR, size: 66, pose: 'stand', lookX: -1,
          expression: s.result === 'fail' ? 'laugh' : s.result === 'win' ? 'happy' : s.wrongT > 0 ? 'worried' : s.drowsy > 0.75 ? 'panic' : 'smile',
          sweat: s.drowsy > 0.65 && !api.ended, blush: s.result === 'win' ? 1 : 0,
          hands: { l: { x: 470, y: 300 }, r: { x: 580, y: 420 } },
        });
        g.strokeStyle = '#6a4a32'; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(492, 318); g.lineTo(420, 230); g.stroke();

        // Maman, assise (la tête dodeline quand elle s'endort)
        const d = s.drowsy;
        const asleep = s.result === 'fail';
        const nod = d > 0.55 ? Math.sin(api.t * 2.2) * 0.06 * (d - 0.55) * 4 : 0;
        g.save(); g.translate(MX, MY); g.rotate(nod + (asleep ? 0.12 : 0)); g.translate(-MX, -MY);
        const info = drawPerson(g, { ...PEOPLE.maman, x: MX, y: MY, size: MSIZE, pose: 'sit', t: api.t, expression: asleep ? 'sleep' : s.result === 'win' ? 'love' : 'smile' });
        if (!asleep && s.result !== 'win') {
          // paupières qui tombent (yeux redessinés par-dessus)
          const ey = info.hy - 0.05 * MR, rx = 0.17 * MR, ry = 0.14 * MR;
          for (const sd of [-1, 1]) {
            const ex = info.hx + sd * 0.36 * MR;
            g.fillStyle = PEOPLE.maman.skin; g.beginPath(); g.arc(ex, ey, 0.22 * MR, 0, Math.PI * 2); g.fill();
            g.save(); g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); g.clip();
            g.fillStyle = '#fff'; g.fillRect(ex - rx, ey - ry, rx * 2, ry * 2);
            g.fillStyle = '#3b2a22'; g.beginPath(); g.arc(ex, ey + 1, ry * 0.8, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#e8b898'; g.fillRect(ex - rx, ey - ry, rx * 2, ry * 2 * clamp(d, 0, 0.95));
            g.restore();
            g.strokeStyle = '#2a201b'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(ex - rx, ey - ry + ry * 2 * clamp(d, 0, 0.95)); g.lineTo(ex + rx, ey - ry + ry * 2 * clamp(d, 0, 0.95)); g.stroke();
          }
        }
        g.restore();
        if (asleep || d > 0.7) {
          const a = asleep ? 1 : (d - 0.7) / 0.3;
          for (let i = 0; i < 3; i++) {
            const k = (api.t * 0.6 + i / 3) % 1;
            api.text(g, 'z', MX + 50 + k * 40, MY - 3.5 * MR - k * 70, { size: 18 + k * 22, color: `rgba(255,255,255,${a * (1 - k)})`, stroke: `rgba(60,60,90,${a * (1 - k)})`, strokeWidth: 4 });
          }
        }
        if (s.result === 'win') api.text(g, '♥', MX + 50, MY - 3.6 * MR - s.endT * 30, { size: 40, color: '#e0405f', stroke: '#fff' });
        // table (cache les jambes)
        g.fillStyle = '#8a5a34'; g.fillRect(620, 400, 340, 16);
        g.fillStyle = '#6f4527'; g.fillRect(630, 416, 320, H - 416);
        g.fillStyle = '#fff'; g.fillRect(690, 392, 60, 8);
        if (s.coffee > 0 || s.answered) {
          g.fillStyle = '#fff'; g.fillRect(810, 372, 24, 28); g.fillStyle = '#6a4a32'; g.fillRect(812, 375, 20, 6);
        }

        // HUD : jauge d'éveil
        api.text(g, 'Éveil de Maman', 520, 40, { size: 20, color: '#fff', stroke: '#000a', align: 'left' });
        api.roundRect(g, 520, 54, 240, 18, 9); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
        const aw = clamp(1 - d, 0, 1);
        if (aw > 0) { api.roundRect(g, 522, 56, 236 * aw, 14, 7); g.fillStyle = aw < 0.3 ? '#e8453c' : aw < 0.55 ? '#f2b33d' : '#4fa36b'; g.fill(); }

        // idées (boutons)
        if (!api.ended) {
          for (const k of DIRS) {
            const b = BTN[k], on = s.want === k;
            const pulse = on ? 1 + Math.sin(api.t * 12) * 0.05 : 1;
            g.save(); g.translate(b.x, b.y); g.scale(pulse, pulse);
            api.roundRect(g, -BW / 2, -BH / 2, BW, BH, 12);
            g.fillStyle = on ? '#ffd34d' : 'rgba(60, 50, 45, 0.55)'; g.fill();
            if (on) { g.strokeStyle = '#c0392b'; g.lineWidth = 3; g.stroke(); }
            api.text(g, IDEAS[k].arrow, 0, -10, { size: 24, color: on ? '#2a2a30' : '#eee', weight: 900 });
            api.text(g, IDEAS[k].label, 0, 15, { size: 14, color: on ? '#2a2a30' : '#eee' });
            g.restore();
          }
          if (s.want) {
            const b = BTN[s.want];
            g.strokeStyle = '#c0392b'; g.lineWidth = 4;
            g.beginPath(); g.arc(b.x, b.y, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(s.wantT / 1.6, 0, 1)); g.stroke();
          }
        }
        if (s.msgT > 0) api.text(g, s.msg, 700, 104, { size: 20, color: '#fff', stroke: s.wrongT > 0 ? '#7a1e1e' : '#2c4a48' });
        if (asleep && s.endT > 0.2) api.text(g, '… le début d’une grande histoire', W / 2, 40 + 230, { size: 26, color: '#fff3d6', stroke: '#3a2a50', strokeWidth: 8 });
      },
    };
  },
};

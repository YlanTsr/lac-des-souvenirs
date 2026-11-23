/**
 * Anecdote — « La princesse de Papa » (princesse_de_papa)
 * Chez le médecin, on demande son nom à Séléna. Réponse : « la princesse de Papa ».
 * Mécanique : des lettres tombent dans le cabinet ; déplacer Séléna et son panier
 * pour attraper, dans l'ordre, les lettres de PRINCESSE. Mauvaise lettre = elle s'embrouille un instant.
 */
import { drawPerson, PEOPLE } from './people.js';

const WORD = 'PRINCESSE';
const DECOYS = 'ABDGLMOTUZ';
const TILE_COLORS = ['#ffb3c7', '#ffd27a', '#b8e3ff', '#c9f2b0', '#e2c6ff', '#ffc9a3'];
const OOPS = ['Prin… quoi ?', 'Euh…', 'Pas celle-là !', 'Princes… Z ?', 'Oups !'];

export default {
  id: 'princesse_de_papa',
  title: 'La princesse de Papa',
  instructions: 'Le médecin demande son nom à Séléna : aide-la à attraper dans l’ordre les lettres de PRINCESSE avec son petit panier !',
  controls: '← → / souris : déplacer Séléna',
  duration: 12,
  introExpression: 'happy',
  successTitle: 'Nom : la princesse de Papa',
  failTitle: 'Le formulaire attendra…',
  successText: '« Et comment tu t’appelles ? — La princesse de Papa ! » Le médecin l’a noté sans discuter. Toi, tu as fondu sur ta chaise.',
  failText: 'Les lettres se sont un peu mélangées… Mais Séléna, elle, sait très bien comment elle s’appelle : la princesse de Papa.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const MIN_X = 80, MAX_X = 600;
    const FEET = 512;
    const RIM_Y = 330;            // bord du panier
    const s = {
      x: (MIN_X + MAX_X) / 2, progress: 0, tiles: [], wrong: 0, stun: 0,
      wordT: 0.2, decoyT: 0.9, ws: 0, lastWordX: 340,
      bubble: '', bubbleT: 0, t: 0, endT: 0, won: false, hop: 0,
    };

    /* ── décor du cabinet, pré-rendu une fois ── */
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    (function paint(c) {
      const w = c.createLinearGradient(0, 0, 0, 400);
      w.addColorStop(0, '#e6f3ee'); w.addColorStop(1, '#d3ebe3');
      c.fillStyle = w; c.fillRect(0, 0, W, 410);
      // lambris + plinthe
      c.fillStyle = '#bfe0d4'; c.fillRect(0, 330, W, 80);
      c.fillStyle = '#9fcbbb'; c.fillRect(0, 326, W, 6);
      // sol
      c.fillStyle = '#e8d7bd'; c.fillRect(0, 410, W, H - 410);
      c.strokeStyle = 'rgba(160,130,95,0.35)'; c.lineWidth = 2;
      for (let x = -200; x < W + 200; x += 70) { c.beginPath(); c.moveTo(x, 410); c.lineTo(x + (x - W / 2) * 0.5, H); c.stroke(); }
      // fenêtre
      c.fillStyle = '#fff'; c.fillRect(640, 110, 150, 130);
      c.fillStyle = '#a9dcf7'; c.fillRect(648, 118, 134, 114);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(690, 160, 16, 0, Math.PI * 2); c.arc(708, 156, 20, 0, Math.PI * 2); c.arc(726, 162, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7cc27a'; c.fillRect(648, 205, 134, 27);
      c.fillStyle = '#fff'; c.fillRect(712, 118, 6, 114); c.fillRect(648, 172, 134, 6);
      // tableau d'acuité visuelle
      c.fillStyle = '#fffdf6'; c.fillRect(40, 120, 96, 150);
      c.strokeStyle = '#c9c2b0'; c.lineWidth = 3; c.strokeRect(40, 120, 96, 150);
      c.fillStyle = '#333'; c.textAlign = 'center'; c.textBaseline = 'middle';
      [['E', 34, 150], ['F P', 22, 186], ['T O Z', 16, 214], ['L P E D', 12, 236], ['P E C F D', 9, 254]].forEach(([str, sz, y]) => {
        c.font = `800 ${sz}px sans-serif`; c.fillText(str, 88, y);
      });
      // toise pour mesurer les enfants
      c.fillStyle = '#fff3c4'; c.fillRect(160, 150, 26, 260);
      c.fillStyle = '#d9a441';
      for (let y = 160; y < 410; y += 20) c.fillRect(160, y, y % 40 === 0 ? 14 : 8, 2);
      c.fillStyle = '#e88fb4'; c.font = '700 11px sans-serif'; c.fillText('1 m', 173, 222);
      // table d'examen (fond)
      c.fillStyle = '#b8c3cc'; c.fillRect(470, 360, 10, 60); c.fillRect(620, 360, 10, 60);
      c.fillStyle = '#6fa8c9';
      c.beginPath(); c.moveTo(450, 340); c.lineTo(650, 340); c.lineTo(650, 365); c.lineTo(450, 365); c.closePath(); c.fill();
      c.fillStyle = '#f4f8fb'; c.fillRect(470, 334, 150, 8);
      // chaise de la salle d'attente (Papa)
      c.fillStyle = '#c47c45'; c.fillRect(838, 420, 90, 12); c.fillRect(842, 432, 8, 60); c.fillRect(916, 432, 8, 60);
      c.fillRect(920, 330, 10, 100);
      // affiche
      c.fillStyle = '#ffe6ef'; c.fillRect(250, 120, 120, 90);
      c.fillStyle = '#e0607e'; c.font = '800 15px sans-serif'; c.fillText('Lave-toi', 310, 150); c.fillText('les mains !', 310, 170);
      c.fillStyle = '#8fd1ff'; c.beginPath(); c.arc(310, 192, 9, 0, Math.PI * 2); c.fill();
    })(bg.getContext('2d'));

    const need = () => WORD[s.progress];

    function spawn(ch, isWord) {
      let x;
      if (isWord) {
        x = clamp(s.lastWordX + rand(-280, 280), MIN_X, MAX_X);
        s.lastWordX = x;
      } else {
        // un intrus ne tombe pas pile sur la lettre attendue
        x = rand(MIN_X, MAX_X);
        if (Math.abs(x - s.lastWordX) < 70) x = clamp(x + (x < s.lastWordX ? -90 : 90), MIN_X, MAX_X);
      }
      s.tiles.push({
        ch, x, y: 58, vy: rand(175, 205), sway: rand(0, 6), rot: rand(-0.3, 0.3),
        color: TILE_COLORS[Math.floor(rand(0, TILE_COLORS.length))], dead: false,
      });
    }

    function win() {
      s.won = true;
      api.sfx('win');
      api.burst(s.x, RIM_Y - 30, { n: 30, shape: 'star', color: ['#ffd34d', '#ff8fb8', '#fff'], speed: 380, gravity: 300, size: 9, life: 1.2 });
      api.end(true, '« Et comment tu t’appelles ? — La princesse de Papa ! » Le médecin l’a noté sans discuter. Toi, tu as fondu sur ta chaise.');
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.bubbleT = Math.max(0, s.bubbleT - dt);
        s.hop = Math.max(0, s.hop - dt * 4);
        if (api.ended) {
          s.endT += dt;
          for (const tl of s.tiles) tl.y += tl.vy * dt * 1.5;
          return;
        }
        // déplacement : suit le curseur (souris, ou flèches qui le déplacent)
        s.stun = Math.max(0, s.stun - dt);
        const target = clamp(input.cursor.x, MIN_X, MAX_X);
        const sp = s.stun > 0 ? 120 : 640;
        s.x += clamp(target - s.x, -sp * dt, sp * dt);

        // apparition des lettres : on « fait pleuvoir » la lettre attendue et les deux suivantes, en boucle
        s.wordT -= dt;
        if (s.wordT <= 0) {
          if (s.ws < s.progress || s.ws >= Math.min(WORD.length, s.progress + 3)) s.ws = s.progress;
          spawn(WORD[s.ws], true);
          s.ws++;
          s.wordT = 0.92;
        }
        s.decoyT -= dt;
        if (s.decoyT <= 0) {
          spawn(DECOYS[Math.floor(rand(0, DECOYS.length))], false);
          s.decoyT = rand(0.75, 1.1);
        }

        for (const tl of s.tiles) {
          const py = tl.y;
          tl.y += tl.vy * dt;
          // passage au niveau du bord du panier
          if (!tl.dead && py < RIM_Y && tl.y >= RIM_Y && Math.abs(tl.x - s.x) < 46) {
            tl.dead = true;
            if (tl.ch === need()) {
              s.progress++;
              s.hop = 1;
              api.sfx('catch');
              api.burst(s.x, RIM_Y, { n: 10, color: ['#ffd34d', '#ff8fb8'], speed: 200, gravity: 400, size: 5 });
              if (s.progress >= WORD.length) { win(); return; }
            } else {
              s.wrong++;
              s.stun = 0.45;
              s.bubble = OOPS[s.wrong % OOPS.length];
              s.bubbleT = 0.9;
              api.sfx('boing');
              api.shake(5);
              api.burst(s.x, RIM_Y, { n: 8, shape: 'star', color: '#ffffff', speed: 160, gravity: 200, size: 6 });
            }
          }
        }
        s.tiles = s.tiles.filter((tl) => !tl.dead && tl.y < H + 40);
      },
      timeout() {
        api.end(false, s.progress >= 6
          ? `« PRINCES… » : presque ! Le médecin a compris l’idée. Et Séléna l’a dit à voix haute : la princesse de Papa.`
          : 'Les lettres se sont un peu mélangées… Mais Séléna, elle, sait très bien comment elle s’appelle : la princesse de Papa.');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);

        // le médecin, blouse blanche, stéthoscope
        const doc = drawPerson(g, { ...PEOPLE.passant, shirt: '#f7f7f4', pants: '#5b6b7a', x: 735, y: 500, size: 66, expression: s.won ? 'laugh' : 'smile', pose: 'stand', t: s.t, hands: { l: { x: 712, y: 400 }, r: { x: 760, y: 404 } } });
        g.strokeStyle = '#3a4a5a'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(doc.hx - 16, doc.hy + 44); g.quadraticCurveTo(doc.hx, doc.hy + 92, doc.hx + 16, doc.hy + 44); g.stroke();
        g.fillStyle = '#9aa8b5'; g.beginPath(); g.arc(doc.hx, doc.hy + 76, 6, 0, Math.PI * 2); g.fill();
        // son porte-bloc
        g.fillStyle = '#b07a48'; g.fillRect(700, 372, 64, 80);
        g.fillStyle = '#fff'; g.fillRect(705, 380, 54, 66);
        g.fillStyle = '#cfd6dd'; for (let k = 0; k < 4; k++) g.fillRect(710, 392 + k * 12, 44, 3);
        g.fillStyle = '#8a8f96'; g.fillRect(722, 368, 20, 8);

        // Papa dans la salle d'attente, qui fond de fierté à la fin
        api.avatar(g, {
          x: 868, y: 424, size: 60, pose: 'sit', flipX: true,
          expression: s.won ? 'happy' : s.progress >= 5 ? 'smile' : 'smile', blush: s.won ? 1 : s.progress / 18,
          lookX: 1, tilt: s.won ? Math.sin(s.endT * 6) * 0.08 : 0,
        });
        if (s.won) {
          g.fillStyle = '#ff5b7f';
          for (let k = 0; k < 3; k++) {
            const a = s.endT * 1.2 + k;
            api.text(g, '♥', 860 + Math.sin(a * 3) * 20 + k * 12, 300 - ((s.endT * 60 + k * 30) % 90), { size: 22, color: '#ff5b7f' });
          }
        }

        // lettres qui tombent
        for (const tl of s.tiles) {
          g.save();
          g.translate(tl.x + Math.sin(s.t * 3 + tl.sway) * 4, tl.y);
          g.rotate(tl.rot + Math.sin(s.t * 2 + tl.sway) * 0.1);
          api.roundRect(g, -23, -23, 46, 46, 10);
          g.fillStyle = tl.color; g.fill();
          g.lineWidth = 3; g.strokeStyle = 'rgba(90,60,80,0.35)'; g.stroke();
          api.text(g, tl.ch, 0, 2, { size: 30, color: '#5a2d4a', weight: 900 });
          g.restore();
        }

        // Séléna et son petit panier tenu au-dessus de la tête
        const dizzy = s.stun > 0;
        const hopY = -Math.sin(s.hop * Math.PI) * 12;
        const bx = s.x, by = RIM_Y + hopY;
        drawPerson(g, {
          ...PEOPLE.selena, dress: true, x: bx, y: FEET + hopY, size: 58, t: s.t,
          expression: s.won ? 'love' : dizzy ? 'surprised' : 'smile',
          hands: { l: { x: bx - 32, y: by + 18 }, r: { x: bx + 32, y: by + 18 } },
        });
        // panier en osier
        g.fillStyle = '#c98b4a';
        g.beginPath(); g.moveTo(bx - 44, by); g.lineTo(bx + 44, by); g.lineTo(bx + 32, by + 30); g.lineTo(bx - 32, by + 30); g.closePath(); g.fill();
        g.strokeStyle = '#a06a33'; g.lineWidth = 2;
        for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(bx - 44 + k * 4, by + k * 10); g.lineTo(bx + 44 - k * 4, by + k * 10); g.stroke(); }
        g.fillStyle = '#e8a965'; g.fillRect(bx - 46, by - 4, 92, 7);
        g.strokeStyle = '#a06a33'; g.lineWidth = 4;
        g.beginPath(); g.arc(bx, by, 30, Math.PI, 0); g.stroke();
        // petites lettres déjà ramassées dans le panier
        for (let k = 0; k < Math.min(s.progress, 5); k++) {
          g.fillStyle = TILE_COLORS[k % TILE_COLORS.length];
          g.fillRect(bx - 30 + k * 12, by - 8 - (k % 2) * 4, 11, 11);
        }
        if (dizzy) {
          for (let k = 0; k < 3; k++) {
            const a = s.t * 8 + (k * Math.PI * 2) / 3;
            api.text(g, '★', bx + Math.cos(a) * 26, by - 74 + Math.sin(a) * 6, { size: 14, color: '#ffd34d' });
          }
        }
        if (s.bubbleT > 0) {
          const bxx = clamp(bx + 70, 120, 640);
          api.roundRect(g, bxx - 10, 230, 170, 40, 14); g.fillStyle = '#fff'; g.fill();
          api.text(g, s.bubble, bxx + 75, 250, { size: 18, color: '#7a3a5a' });
        }

        // le formulaire du médecin (HUD)
        api.roundRect(g, 140, 22, 540, 64, 12);
        g.fillStyle = '#fffdf6'; g.fill();
        g.lineWidth = 3; g.strokeStyle = '#c9b48a'; g.stroke();
        if (s.won && s.endT > 0.25) {
          api.text(g, 'Nom : la princesse de Papa', 410, 55, { size: 30, color: '#c2306a', weight: 900, font: 'cursive, "Nunito Sans", sans-serif' });
        } else {
          api.text(g, 'Nom :', 196, 55, { size: 24, color: '#4a4a4a', weight: 800 });
          for (let k = 0; k < WORD.length; k++) {
            const x = 262 + k * 45;
            const done = k < s.progress;
            const cur = k === s.progress && !api.ended;
            g.fillStyle = done ? '#ffe3ec' : cur ? (Math.sin(s.t * 8) > 0 ? '#fff1b8' : '#fff8dc') : '#f2efe6';
            api.roundRect(g, x - 19, 33, 38, 44, 8); g.fill();
            if (cur) { g.lineWidth = 3; g.strokeStyle = '#e8a33d'; g.stroke(); }
            api.text(g, done || cur ? WORD[k] : '_', x, 56, { size: 26, color: done ? '#c2306a' : cur ? '#b0782a' : '#aaa', weight: 900 });
          }
        }
        if (!api.ended && s.t < 2.2) api.text(g, 'Attrape la lettre qui clignote !', 380, 112, { size: 22, color: '#fff', stroke: '#000a' });
      },
    };
  },
};

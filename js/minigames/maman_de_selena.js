/**
 * « Je suis la maman de Séléna » (maman_de_selena)
 * Réunion des parents pour l'échange de lycéens au Canada : Papa se présente…
 * « Bonjour, je suis la maman de Séléna. »
 * Mécanique : pour chacun des 3 parents, un curseur file sur une réglette
 * « la maman / LE PAPA / la maman » (de plus en plus vite) ; appuyer quand il est sur « le papa ».
 * Une seule tentative par parent ; 2 bonnes présentations sur 3 = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

// feuille d'érable (contour normalisé, centrée, hauteur ≈ 2)
const LEAF = [
  [0, -1], [0.13, -0.74], [0.3, -0.82], [0.24, -0.42], [0.52, -0.6], [0.48, -0.44], [0.84, -0.32], [0.72, -0.18],
  [0.9, 0.0], [0.56, 0.1], [0.62, 0.3], [0.1, 0.2], [0.05, 0.22], [0.05, 0.78], [-0.05, 0.78], [-0.05, 0.22],
  [-0.1, 0.2], [-0.62, 0.3], [-0.56, 0.1], [-0.9, 0.0], [-0.72, -0.18], [-0.84, -0.32], [-0.48, -0.44], [-0.52, -0.6],
  [-0.24, -0.42], [-0.3, -0.82], [-0.13, -0.74],
];
function mapleLeaf(g, x, y, s, color, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = color;
  g.beginPath();
  LEAF.forEach(([px, py], i) => (i ? g.lineTo(px * s, py * s) : g.moveTo(px * s, py * s)));
  g.closePath(); g.fill();
  g.restore();
}

// les trois parents (passants « déguisés » : aucun nom affiché)
const PARENTS = [
  { ...PEOPLE.passant, shirt: '#6a8fb5', pants: '#3a4050', glasses: true },
  { ...PEOPLE.passant, hair: 'long', hairColor: '#a0703a', skin: '#f3d0b6', shirt: '#5a9a7b', pants: '#3a3550' },
  { ...PEOPLE.passant, hair: 'bald', hairColor: '#7a6a5e', shirt: '#b5774a', pants: '#40404c', mustache: true },
];
const SPEEDS = [0.5, 0.7, 0.9];  // allers-retours par seconde (le curseur accélère)
const ZONE_W = 0.2;                  // largeur de la zone « le papa » (fraction de la réglette)
const TX0 = 232, TX1 = 728, TY = 196; // réglette

export default {
  id: 'maman_de_selena',
  title: '« Je suis la maman de Séléna »',
  instructions: 'Réunion des parents pour l’échange au Canada : appuie quand le curseur est sur « le papa » pour te présenter correctement aux trois parents !',
  controls: 'Espace / clic / tap : se présenter',
  duration: 12,
  introExpression: 'smile',
  successTitle: 'Présentations impeccables !',
  failTitle: 'Enchanté, Madame !',
  successText: 'Trois poignées de main, zéro confusion : tout le monde sait que tu es le papa de Séléna. Le Canada peut dormir tranquille.',
  failText: '« Bonjour, je suis la maman de Séléna. » Trois parents perplexes… et une légende familiale de plus !',

  create(api) {
    const { W, H, rand } = api;
    const PAPA_X = 372, PARENT_X = 560, FLOOR = 474;
    const s = {
      t: 0, round: 0, phase: 'walk', phaseT: 0,
      cur: 0.5, ph: 0, zone: 0.5, speed: SPEEDS[0],
      results: [], ok: 0, ko: 0,
      parentX: W + 80, leaveX: null, leaveIdx: -1,
      word: 'la maman', last: null, flash: 0,
    };

    // ── décor pré-rendu : salle de réunion du lycée
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const wall = b.createLinearGradient(0, 0, 0, 400);
      wall.addColorStop(0, '#f6e7cf'); wall.addColorStop(1, '#ecd5b3');
      b.fillStyle = wall; b.fillRect(0, 0, W, 400);
      // plinthe + parquet
      b.fillStyle = '#c99a6a'; b.fillRect(0, 392, W, 12);
      b.fillStyle = '#b5824f'; b.fillRect(0, 404, W, H - 404);
      b.strokeStyle = 'rgba(90, 50, 20, 0.25)'; b.lineWidth = 2;
      for (let y = 420; y < H; y += 24) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
      for (let y = 404, k = 0; y < H; y += 24, k++) for (let x = (k % 2) * 60; x < W; x += 120) { b.beginPath(); b.moveTo(x, y); b.lineTo(x, y + 24); b.stroke(); }
      // drapeau canadien (en haut à gauche)
      b.fillStyle = '#7a5a3a'; b.fillRect(36, 30, 6, 130);
      b.fillStyle = '#fff'; b.fillRect(42, 34, 132, 70);
      b.fillStyle = '#d52b1e'; b.fillRect(42, 34, 33, 70); b.fillRect(141, 34, 33, 70);
      mapleLeaf(b, 108, 69, 25, '#d52b1e');
      // banderole
      b.fillStyle = '#fffaf0'; b.strokeStyle = '#d52b1e'; b.lineWidth = 4;
      b.beginPath(); b.rect(224, 26, 500, 56); b.fill(); b.stroke();
      b.font = '800 24px "Nunito Sans", system-ui, sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle';
      b.fillStyle = '#9a2a20'; b.fillText('Réunion des parents · Échange Canada', 474, 55);
      mapleLeaf(b, 250, 54, 11, '#d52b1e', -0.3); mapleLeaf(b, 698, 54, 11, '#d52b1e', 0.3);
      // fenêtre avec vue d'automne (sous la zone du bouton « Passer »)
      b.fillStyle = '#fff'; b.fillRect(790, 96, 140, 190);
      const sky = b.createLinearGradient(0, 104, 0, 278);
      sky.addColorStop(0, '#9fd0f0'); sky.addColorStop(1, '#e8f4fb');
      b.fillStyle = sky; b.fillRect(798, 104, 124, 174);
      b.fillStyle = '#e07a2e'; b.beginPath(); b.arc(830, 250, 34, 0, Math.PI * 2); b.arc(890, 240, 30, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#c94a2a'; b.beginPath(); b.arc(860, 262, 28, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#fff'; b.fillRect(856, 104, 6, 174); b.fillRect(798, 188, 124, 6);
      // affiche « Bienvenue / Welcome »
      b.fillStyle = '#fff'; b.fillRect(40, 196, 120, 150);
      b.fillStyle = '#d52b1e'; b.fillRect(40, 196, 120, 30);
      b.font = '800 15px "Nunito Sans", system-ui, sans-serif';
      b.fillStyle = '#fff'; b.fillText('BIENVENUE', 100, 212);
      b.fillStyle = '#9a2a20'; b.fillText('WELCOME', 100, 330);
      mapleLeaf(b, 100, 272, 30, '#d52b1e');
      // rangée de chaises au fond
      for (const cx of [210, 700, 770]) {
        b.fillStyle = '#8a5a3a'; b.fillRect(cx - 22, 330, 44, 40); b.fillRect(cx - 22, 380, 44, 8);
        b.fillStyle = '#6e4428'; b.fillRect(cx - 20, 388, 5, 26); b.fillRect(cx + 15, 388, 5, 26);
      }
      // petite table « café »
      b.fillStyle = '#9b6b45'; b.fillRect(640, 396, 120, 10);
      b.fillStyle = '#7e5233'; b.fillRect(650, 406, 8, 50); b.fillRect(742, 406, 8, 50);
      b.fillStyle = '#e8e2d6'; b.fillRect(660, 372, 26, 24); b.fillRect(700, 376, 18, 20);
      b.fillStyle = '#c33'; b.fillRect(726, 368, 22, 28);
      // feuilles d'érable décoratives éparpillées sur le mur
      for (const [lx, ly, r] of [[200, 150, 0.4], [760, 120, -0.5], [180, 300, 0.9], [620, 140, 0.2]]) mapleLeaf(b, lx, ly, 9, 'rgba(213, 43, 30, 0.35)', r);
    }

    const tri = (p) => { const k = ((p % 1) + 1) % 1; return k < 0.5 ? k * 2 : 2 - k * 2; };
    const inZone = (c) => Math.abs(c - s.zone) <= ZONE_W / 2;

    function startRound() {
      s.phase = 'walk'; s.phaseT = 0;
      s.parentX = W + 80;
      s.ph = rand(0, 1);
      s.zone = rand(0.28, 0.72);
      s.speed = SPEEDS[s.round];
      s.cur = tri(s.ph);
      s.last = null;
    }

    function resolve(good, auto = false) {
      s.phase = 'react'; s.phaseT = 0;
      s.last = good ? 'ok' : 'ko';
      s.results.push(good);
      s.word = good ? 'le papa' : 'la maman';
      s.flash = 1;
      if (good) {
        s.ok++;
        api.sfx('catch');
        api.burst(466, 380, { n: 14, shape: 'star', color: ['#ffd34d', '#ffffff', '#d52b1e'], speed: 240, gravity: 300, size: 7 });
      } else {
        s.ko++;
        api.sfx(auto ? 'beep' : 'boing');
        api.shake(6);
      }
      if (s.ok >= 2) {
        api.end(true, s.ko ? 'Deux « papa » sur trois : il y a bien eu un petit « maman » qui a traîné, mais le Canada t’a pardonné.' : null);
      } else if (s.ko >= 2) {
        api.end(false, '« Bonjour, je suis la maman de Séléna. » Regards perplexes, sourires polis… Et Séléna a eu une maman de plus pour son échange !');
      }
    }

    startRound();

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.phaseT += dt;
        s.flash = Math.max(0, s.flash - dt * 2);
        if (s.leaveX !== null) { s.leaveX += 700 * dt; if (s.leaveX > W + 120) s.leaveX = null; }

        if (s.phase === 'walk') {
          s.parentX = Math.max(PARENT_X, s.parentX - 760 * dt);
          s.ph += s.speed * dt;
          s.cur = tri(s.ph);
          s.word = inZone(s.cur) ? 'le papa' : 'la maman';
          if (s.parentX <= PARENT_X && s.phaseT > 0.45) { s.phase = 'aim'; s.phaseT = 0; }
        } else if (s.phase === 'aim') {
          // de plus en plus vite pendant la présentation
          s.ph += s.speed * (1 + 0.22 * s.phaseT) * dt;
          s.cur = tri(s.ph);
          s.word = inZone(s.cur) ? 'le papa' : 'la maman';
          if (!api.ended && input.pressed()) resolve(inZone(s.cur));
          else if (!api.ended && s.phaseT > 2.6) resolve(false, true); // trop long : le pilote automatique dit « maman »
        } else if (s.phase === 'react') {
          if (!api.ended && s.phaseT > 0.95) {
            s.leaveX = s.parentX; s.leaveIdx = s.round;
            s.round++;
            if (s.round < 3) startRound();
          }
        }
      },
      timeout() { return s.ok >= 2; },
      draw(g) {
        g.drawImage(bg, 0, 0);

        // parent précédent qui s'éloigne
        if (s.leaveX !== null && s.leaveIdx >= 0) {
          drawPerson(g, { ...PARENTS[s.leaveIdx], x: s.leaveX, y: FLOOR, size: 64, pose: 'run', t: s.t, expression: s.results[s.leaveIdx] ? 'smile' : 'worried' });
        }

        // le parent actuel
        const idx = Math.min(s.round, 2);
        const react = s.phase === 'react';
        const shakeY = react && s.last === 'ok' ? Math.sin(s.phaseT * 22) * 5 : 0;
        const handshake = react && s.last === 'ok';
        const pExpr = react ? (s.last === 'ok' ? 'laugh' : s.phaseT < 0.4 ? 'surprised' : 'worried') : 'smile';
        if (s.round < 3 || api.ended) {
          const meet = { x: 2 * s.parentX - 470, y: 388 + shakeY };
          drawPerson(g, {
            ...PARENTS[idx], x: s.parentX, y: FLOOR, size: 64, flipX: true, t: s.t,
            pose: s.phase === 'walk' && s.parentX > PARENT_X ? 'run' : 'stand',
            expression: pExpr,
            hands: handshake ? { r: meet } : undefined,
          });
        }

        // Papa
        const pInfo = api.avatar(g, {
          x: PAPA_X, y: FLOOR, size: 66, t: s.t,
          pose: api.ended && s.ok >= 2 ? 'cheer' : 'stand',
          expression: react ? (s.last === 'ok' ? 'happy' : 'surprised') : api.ended ? (s.ok >= 2 ? 'happy' : 'laugh') : 'focus',
          blush: s.last === 'ko' ? 1 : 0, lookX: 1,
          hands: handshake && !api.ended ? { l: { x: 334, y: 405 }, r: { x: 470, y: 388 + shakeY } } : undefined,
        });

        // bulle de Papa : « Bonjour, je suis … de Séléna ! »
        g.fillStyle = '#fffdf7'; g.strokeStyle = '#3a2a20'; g.lineWidth = 3;
        api.roundRect(g, 196, 112, 568, 116, 20); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(330, 226); g.lineTo(pInfo.hx + 4, pInfo.hy - 36); g.lineTo(372, 226); g.closePath();
        g.fillStyle = '#fffdf7'; g.fill(); g.stroke();
        g.fillStyle = '#fffdf7'; g.fillRect(332, 222, 38, 8);
        const wPapa = s.word === 'le papa';
        const F = '"Nunito Sans", system-ui, sans-serif';
        g.font = `700 26px ${F}`;
        const wa = g.measureText('Bonjour, je suis ').width, wc = g.measureText(' de Séléna !').width;
        g.font = `900 30px ${F}`;
        const wb = g.measureText(s.word).width;
        const lx = W / 2 - (wa + wb + wc) / 2;
        api.text(g, 'Bonjour, je suis ', lx, 150, { size: 26, color: '#3a2a20', align: 'left' });
        api.text(g, s.word, lx + wa, 150, { size: 30, color: wPapa ? '#2a6fc0' : '#c8486b', weight: 900, align: 'left' });
        api.text(g, ' de Séléna !', lx + wa + wb, 150, { size: 26, color: '#3a2a20', align: 'left' });

        // réglette : la maman | LE PAPA | la maman
        const zx0 = TX0 + (s.zone - ZONE_W / 2) * (TX1 - TX0), zx1 = TX0 + (s.zone + ZONE_W / 2) * (TX1 - TX0);
        g.fillStyle = '#f7c6d4'; api.roundRect(g, TX0, TY - 13, TX1 - TX0, 26, 13); g.fill();
        g.fillStyle = '#8fc0f0'; g.fillRect(zx0, TY - 13, zx1 - zx0, 26);
        api.text(g, 'LE PAPA', (zx0 + zx1) / 2, TY + 1, { size: 15, color: '#14406e', weight: 900 });
        if (zx0 - TX0 > 70) api.text(g, 'la maman', (TX0 + zx0) / 2, TY + 1, { size: 14, color: '#9a3050' });
        if (TX1 - zx1 > 70) api.text(g, 'la maman', (zx1 + TX1) / 2, TY + 1, { size: 14, color: '#9a3050' });
        const cx = TX0 + s.cur * (TX1 - TX0);
        g.fillStyle = s.flash > 0 ? (s.last === 'ok' ? '#2fa84f' : '#d8333a') : '#3a2a20';
        g.beginPath(); g.moveTo(cx, TY + 4); g.lineTo(cx - 10, TY - 22); g.lineTo(cx + 10, TY - 22); g.closePath(); g.fill();
        g.fillRect(cx - 2, TY - 12, 4, 26);

        // réactions
        if (react && s.last === 'ok') api.text(g, 'Enchanté !', s.parentX + 10, 262, { size: 24, color: '#2f7a3f', stroke: '#fff', strokeWidth: 5 });
        if (react && s.last === 'ko') {
          api.text(g, '… la maman ?', s.parentX + 20, 262, { size: 24, color: '#9a3050', stroke: '#fff', strokeWidth: 5 });
          api.text(g, '?', s.parentX + 60, 300 - s.phaseT * 30, { size: 40, color: '#d8333a', stroke: '#fff', strokeWidth: 5 });
        }
        if (api.ended && s.ko >= 2) {
          for (let i = 0; i < 3; i++) api.text(g, '?', 620 + i * 70, 330 - ((s.t * 40 + i * 25) % 60), { size: 38, color: '#d8333a', stroke: '#fff', strokeWidth: 5 });
        }

        // HUD
        const marks = [0, 1, 2].map((i) => (i < s.results.length ? (s.results[i] ? '✔' : '✘') : '·')).join('  ');
        api.text(g, `Parent ${Math.min(s.round + 1, 3)} / 3     ${marks}`, W / 2, 516, { size: 24, color: '#fff', stroke: '#000a' });
        if (s.phase === 'aim' && s.phaseT > 1.6 && !api.ended) api.text(g, 'Vite, il attend !', 580, 262, { size: 22, color: '#fff', stroke: '#a0522d' });
      },
    };
  },
};

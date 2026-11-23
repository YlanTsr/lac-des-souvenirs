/**
 * Anecdote — « Goûteur de gâteaux » (gouteur_gateaux)
 * Au travail, Papa était goûteur de gâteaux : chaque trimestre, il rapportait toutes
 * les nouveautés des marques pour que les enfants les goûtent.
 * Mécanique : des biscuits tombent du tapis roulant ; attraper dans la boîte les « NOUVEAU »
 * et éviter les ratés (brûlés, cassés). 10 bons = retour triomphal à la maison.
 */
import { drawPerson, PEOPLE } from './people.js';

const GOOD = [
  { base: '#f4a7c0', top: '#fff0f5', shape: 'round' },
  { base: '#9fd98a', top: '#f5fff0', shape: 'square' },
  { base: '#f7c95a', top: '#7a3f1e', shape: 'round' },
  { base: '#a8c8ff', top: '#ffffff', shape: 'heart' },
  { base: '#e0a96a', top: '#e8453c', shape: 'square' },
];
const GOAL = 10;

export default {
  id: 'gouteur_gateaux',
  title: 'Goûteur de gâteaux',
  instructions: 'Attrape dans ta boîte les nouveaux biscuits « NOUVEAU » pour les enfants, et évite les biscuits ratés !',
  controls: '← → / souris : déplacer la boîte',
  duration: 12,
  introExpression: 'happy',
  successTitle: 'Le héros du goûter !',
  failTitle: 'Boîte à moitié vide…',
  successText: 'Boîte pleine de nouveautés ! À la maison, Séléna, Ylan et Iordan t’attendent comme le Père Noël du goûter.',
  failText: 'Pas tout à fait dix… Mais les enfants ont goûté chaque miette avec le plus grand sérieux. Verdict : « Encore ! »',

  create(api) {
    const { W, H, rand, clamp } = api;
    const BELT_Y = 128, RIM_Y = 402, FEET = 516, MIN_X = 70, MAX_X = W - 70;
    const s = {
      x: W / 2, score: 0, bad: 0, cookies: [], goodT: 0.3, badT: 1.1, stun: 0, beurk: 0,
      lastX: W / 2, t: 0, endT: 0, won: false, belt: 0, pop: 0,
    };

    /* ── usine, pré-rendue ── */
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    (function paint(c) {
      const w = c.createLinearGradient(0, 0, 0, 440);
      w.addColorStop(0, '#f6e6cf'); w.addColorStop(1, '#ecd2ad');
      c.fillStyle = w; c.fillRect(0, 0, W, 440);
      c.fillStyle = '#d8b98e'; for (let x = 0; x < W; x += 120) c.fillRect(x, 0, 4, 440);
      // fenêtres hautes d'usine
      c.fillStyle = '#bfe3f5';
      for (let x = 60; x < W - 60; x += 220) { c.fillRect(x, 180, 120, 80); }
      c.fillStyle = '#d8b98e';
      for (let x = 60; x < W - 60; x += 220) { c.fillRect(x + 58, 180, 4, 80); c.fillRect(x, 218, 120, 4); }
      // panneau
      c.fillStyle = '#e8453c'; c.fillRect(330, 290, 300, 50);
      c.fillStyle = '#fff'; c.font = '900 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('SERVICE DÉGUSTATION', 480, 316);
      // sol
      c.fillStyle = '#b9a184'; c.fillRect(0, 440, W, H - 440);
      c.fillStyle = '#a58d70'; for (let x = 0; x < W; x += 80) c.fillRect(x, 440, 2, H - 440);
      // structure du tapis
      c.fillStyle = '#6b7380'; c.fillRect(0, BELT_Y - 6, W, 30);
      c.fillStyle = '#4a515c'; for (let x = 40; x < W; x += 160) c.fillRect(x, BELT_Y + 24, 12, 36);
    })(bg.getContext('2d'));

    function spawn(good) {
      let drop = clamp(s.lastX + rand(-320, 320), MIN_X, MAX_X);
      if (good) s.lastX = drop;
      else if (Math.abs(drop - s.lastX) < 90) drop = clamp(drop + (drop < s.lastX ? -110 : 110), MIN_X, MAX_X);
      s.cookies.push({
        good, kind: good ? GOOD[Math.floor(rand(0, GOOD.length))] : (rand() < 0.5 ? 'burnt' : 'broken'),
        x: drop - 70, drop, y: BELT_Y - 8, vy: 0, phase: 'belt', wob: 0, rot: 0, dead: false,
      });
    }

    function drawCookie(g, c) {
      g.save();
      g.translate(c.x, c.y);
      g.rotate(c.rot + (c.phase === 'wobble' ? Math.sin(c.wob * 40) * 0.25 : 0));
      if (c.good) {
        const k = c.kind;
        g.fillStyle = k.base;
        g.beginPath();
        if (k.shape === 'square') { api.roundRect(g, -20, -20, 40, 40, 8); }
        else if (k.shape === 'heart') { g.moveTo(0, 18); g.bezierCurveTo(-30, -2, -14, -26, 0, -10); g.bezierCurveTo(14, -26, 30, -2, 0, 18); }
        else g.arc(0, 0, 21, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = k.top;
        g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill();
        const sprink = ['#e8453c', '#4fa36b', '#3a6fb0', '#f2b33d'];
        for (let i = 0; i < 4; i++) { g.fillStyle = sprink[i]; g.fillRect(-13 + i * 7, -14 + (i % 2) * 22, 5, 3); }
        // étiquette NOUVEAU
        g.rotate(-(c.rot));
        api.roundRect(g, -27, -36, 54, 14, 5); g.fillStyle = '#e8453c'; g.fill();
        api.text(g, 'NOUVEAU', 0, -29, { size: 10, color: '#fff', weight: 900 });
      } else if (c.kind === 'burnt') {
        g.fillStyle = '#3a2418';
        g.beginPath(); g.arc(0, 0, 21, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1e120b';
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-9 + i * 6, -4 + (i % 2) * 9, 4, 0, Math.PI * 2); g.fill(); }
        g.strokeStyle = 'rgba(120,120,120,0.6)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-6, -24); g.quadraticCurveTo(-14, -34, -4, -44); g.moveTo(6, -24); g.quadraticCurveTo(14, -36, 4, -46); g.stroke();
      } else {
        g.fillStyle = '#9a9a7a';
        g.beginPath(); g.moveTo(-21, 2); g.lineTo(-4, -20); g.lineTo(-2, 0); g.lineTo(-6, 18); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(4, -19); g.lineTo(21, -2); g.lineTo(8, 19); g.lineTo(3, 2); g.closePath(); g.fill();
        g.fillStyle = '#6f7a4a';
        g.beginPath(); g.arc(-10, -2, 3, 0, Math.PI * 2); g.arc(12, 4, 3, 0, Math.PI * 2); g.fill();
        api.text(g, '?', 0, -30, { size: 18, color: '#6f7a4a', weight: 900 });
      }
      g.restore();
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.belt += dt * 140;
        s.beurk = Math.max(0, s.beurk - dt);
        s.pop = Math.max(0, s.pop - dt * 4);
        if (api.ended) { s.endT += dt; return; }

        s.stun = Math.max(0, s.stun - dt);
        const sp = s.stun > 0 ? 150 : 720;
        s.x += clamp(clamp(input.cursor.x, MIN_X, MAX_X) - s.x, -sp * dt, sp * dt);

        s.goodT -= dt;
        if (s.goodT <= 0) { spawn(true); s.goodT = rand(0.58, 0.72); }
        s.badT -= dt;
        if (s.badT <= 0) { spawn(false); s.badT = rand(0.85, 1.15); }

        for (const c of s.cookies) {
          if (c.phase === 'belt') {
            c.x += 140 * dt;
            if (c.x >= c.drop) { c.x = c.drop; c.phase = 'wobble'; }
          } else if (c.phase === 'wobble') {
            c.wob += dt;
            if (c.wob > 0.28) { c.phase = 'fall'; c.vy = 60; }
          } else {
            const py = c.y;
            c.vy += 900 * dt;
            c.y += c.vy * dt;
            c.rot += dt * (c.good ? 2 : -3);
            if (py < RIM_Y && c.y >= RIM_Y && Math.abs(c.x - s.x) < 64) {
              c.dead = true;
              if (c.good) {
                s.score++;
                s.pop = 1;
                api.sfx('catch');
                api.burst(s.x, RIM_Y, { n: 8, color: [c.kind.base, '#fff'], speed: 180, gravity: 400, size: 5 });
                if (s.score >= GOAL) {
                  s.won = true;
                  api.end(true, 'Boîte pleine de nouveautés ! À la maison, Séléna, Ylan et Iordan t’attendent comme le Père Noël du goûter.');
                  return;
                }
              } else {
                s.bad++;
                s.score = Math.max(0, s.score - 1);
                s.stun = 0.4;
                s.beurk = 0.8;
                api.sfx('splat');
                api.shake(7);
                api.burst(s.x, RIM_Y, { n: 10, color: ['#3a2418', '#9a9a7a'], speed: 200, gravity: 500, size: 5 });
              }
            }
          }
        }
        s.cookies = s.cookies.filter((c) => !c.dead && c.y < H + 40);
      },
      timeout() {
        api.end(false, `${s.score} nouveautés sur ${GOAL}… Les enfants ont goûté chaque miette avec le plus grand sérieux. Verdict : « Encore ! »`);
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        // bande du tapis (qui défile)
        g.fillStyle = '#2f343c'; g.fillRect(0, BELT_Y + 10, W, 12);
        g.fillStyle = '#4a515c';
        for (let x = -(s.belt % 40) + 40; x < W + 40; x += 40) g.fillRect(x - 40, BELT_Y + 12, 20, 8);

        for (const c of s.cookies) drawCookie(g, c);

        // Papa en blouse de goûteur, la boîte à bout de bras
        const bx = s.x;
        const info = api.avatar(g, {
          x: bx, y: FEET, size: 66, t: s.t,
          expression: s.beurk > 0 ? 'ouch' : s.pop > 0 ? 'happy' : s.score >= 7 ? 'happy' : 'focus',
          lookY: -1, hands: { l: { x: bx - 54, y: RIM_Y + 14 }, r: { x: bx + 54, y: RIM_Y + 14 } },
        });
        // la boîte
        g.fillStyle = '#d99a4a';
        g.beginPath(); g.moveTo(bx - 64, RIM_Y); g.lineTo(bx + 64, RIM_Y); g.lineTo(bx + 56, RIM_Y + 46); g.lineTo(bx - 56, RIM_Y + 46); g.closePath(); g.fill();
        g.fillStyle = '#f2c27a'; g.fillRect(bx - 66, RIM_Y - 5, 132, 9);
        // biscuits déjà dans la boîte
        for (let k = 0; k < Math.min(s.score, 10); k++) {
          g.fillStyle = GOOD[k % GOOD.length].base;
          g.beginPath(); g.arc(bx - 48 + (k % 5) * 24, RIM_Y - 4 - Math.floor(k / 5) * 8, 9, Math.PI, 0); g.fill();
        }
        api.text(g, 'POUR LES ENFANTS', bx, RIM_Y + 26, { size: 11, color: '#7a4a1e', weight: 900 });
        g.fillStyle = '#efc29e';
        for (const h of [info.hands.l, info.hands.r]) { g.beginPath(); g.arc(h.x, h.y, 8, 0, Math.PI * 2); g.fill(); }
        if (s.beurk > 0) api.text(g, 'Beurk !', bx, RIM_Y - 150, { size: 30, color: '#fff', stroke: '#5a3a1a' });

        // HUD
        api.roundRect(g, 30, 30, 290, 48, 14); g.fillStyle = 'rgba(255,248,232,0.9)'; g.fill();
        api.text(g, `Nouveautés : ${s.score} / ${GOAL}`, 175, 55, { size: 24, color: '#7a3a1e', weight: 900 });

        // conclusion : retour à la maison
        if (api.ended) {
          const a = clamp(s.endT / 0.45, 0, 1);
          g.globalAlpha = a;
          g.fillStyle = '#ffe9c4'; g.fillRect(0, 0, W, H);
          g.fillStyle = '#e8b98a'; g.fillRect(0, 430, W, H - 430);
          g.fillStyle = '#c96a4a'; g.fillRect(380, 150, 200, 280); g.fillStyle = '#fff3d6'; g.fillRect(396, 166, 168, 264);
          api.text(g, s.won ? 'Papa, notre héros !' : 'Papa est rentré !', W / 2, 100, { size: 40, color: '#c2306a', stroke: '#fff', weight: 900 });
          api.avatar(g, { x: W / 2, y: 470, size: 70, pose: 'cheer', t: s.endT, expression: s.won ? 'laugh' : 'happy' });
          const kids = [[PEOPLE.selena, 300], [PEOPLE.ylan, 660], [PEOPLE.iordan, 780]];
          kids.forEach(([p, x], i) => drawPerson(g, {
            ...p, x, y: 480 - Math.abs(Math.sin(s.endT * 9 + i)) * (s.won ? 18 : 6), size: 56, t: s.endT,
            pose: 'arms_up', expression: s.won ? (i === 1 ? 'laugh' : 'love') : 'laugh', flipX: x > W / 2,
          }));
          g.globalAlpha = 1;
        }
      },
    };
  },
};

/**
 * Anecdote #53 — « Les câlins de Mami » (calins_mami)
 * La spécialité de Mami : le câlin surprise par derrière… avec pincement en prime.
 * Mécanique : Mami arrive en douce à gauche ou à droite (parquet qui grince, petit rire,
 * parfois une feinte !) ; se retourner du bon côté à temps (← / → ou clic du côté)
 * transforme l'attaque en vrai câlin. 6 manches, 4 câlins = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

let BG = null;

function buildBg(api) {
  const { W, H } = api;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // mur à papier peint
  g.fillStyle = '#f3e1c7'; g.fillRect(0, 0, W, 400);
  g.fillStyle = 'rgba(200, 120, 110, 0.18)';
  for (let x = 20; x < W; x += 60) for (let y = 30; y < 400; y += 60) { g.beginPath(); g.arc(x + ((y / 60) % 2) * 30, y, 6, 0, Math.PI * 2); g.fill(); }
  // plinthe + parquet
  g.fillStyle = '#c99a6a'; g.fillRect(0, 392, W, 12);
  g.fillStyle = '#b07a4a'; g.fillRect(0, 404, W, H - 404);
  g.strokeStyle = 'rgba(80, 45, 20, 0.3)'; g.lineWidth = 2;
  for (let y = 420; y < H; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let i = 0; i < 40; i++) { const x = (i * 173) % W, y = 404 + (i % 5) * 26; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 26); g.stroke(); }
  // deux portes (Mami peut surgir des deux côtés)
  for (const x of [150, 810]) {
    g.fillStyle = '#8a5a35'; g.fillRect(x - 62, 150, 124, 250);
    g.fillStyle = '#5a3a22'; g.fillRect(x - 52, 160, 104, 240);
    g.fillStyle = '#3a2515'; g.fillRect(x - 52, 160, 104, 240);
  }
  // cadres photo, lampe, tapis
  for (const [x, y, w, h, col] of [[330, 110, 70, 56, '#7fb3d5'], [560, 96, 90, 70, '#e8a87c'], [440, 190, 50, 40, '#9fd09a']]) {
    g.fillStyle = '#6b4a2f'; g.fillRect(x - 5, y - 5, w + 10, h + 10);
    g.fillStyle = col; g.fillRect(x, y, w, h);
  }
  api.text(g, '♥', 605, 131, { size: 34, color: '#fff' });
  g.fillStyle = '#b5577a'; g.beginPath(); g.ellipse(480, 478, 230, 38, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d27a98'; g.beginPath(); g.ellipse(480, 478, 200, 28, 0, 0, Math.PI * 2); g.fill();
  return c;
}

export default {
  id: 'calins_mami',
  title: 'Les câlins de Mami',
  instructions: 'Mami arrive en douce par derrière pour son câlin… « spécial » ! Retourne-toi du bon côté à temps pour en faire un vrai câlin face à face.',
  controls: '← / → ou clic à gauche / à droite : se retourner',
  duration: 13,
  introExpression: 'worried',
  successTitle: 'Câlins réussis !',
  failTitle: 'PINCÉ !',
  successText: 'Mami n’a pas réussi son coup : que des vrais câlins, face à face. Un amour de grand-mère !',
  failText: 'Mami a encore gagné : câlin par derrière, pincement en prime. Un amour de grand-mère, très tactile !',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;
    if (!BG) BG = buildBg(api);
    const PX = 480, PY = 470, SIZE = 76;
    const ROUNDS = 6, GOAL = 4;
    const s = {
      t: 0, round: 0, phase: 'calm', phaseT: 0, calm: 0.6, win: 1, side: -1, startSide: -1,
      feint: false, feinted: false, mx: 150, hugs: 0, pinches: 0, result: null, dizzy: 0,
      results: [], msg: '', msgT: 0, giggle: false,
    };
    // 2 feintes parmi les manches 3 à 6
    const feintRounds = new Set();
    while (feintRounds.size < 2) feintRounds.add(2 + Math.floor(rand(0, 4)));

    function startCalm() {
      s.phase = 'calm'; s.phaseT = 0; s.calm = rand(0.3, 0.7);
    }
    function startSneak() {
      s.phase = 'sneak'; s.phaseT = 0;
      s.side = s.startSide = rand() < 0.5 ? -1 : 1;
      s.feint = feintRounds.has(s.round); s.feinted = false; s.giggle = false;
      s.win = 1.05 - s.round * 0.05 + (s.feint ? 0.3 : 0);
      s.mx = s.side < 0 ? 150 : 810;
      api.sfx('grain');
    }
    function resolve(hug) {
      s.phase = 'result'; s.phaseT = 0; s.result = hug ? 'hug' : 'pinch';
      s.results.push(hug);
      if (hug) {
        s.hugs++;
        api.sfx('catch');
        api.burst(PX + s.side * 50, 300, { n: 14, color: ['#ff6f9c', '#ffb3c9', '#fff'], speed: 200, gravity: -60, size: 7, life: 1.1 });
        s.msg = ['Câlin !', 'Gros câlin !', 'Je t’ai vue, Mami !'][Math.floor(rand(0, 3))];
      } else {
        s.pinches++;
        api.sfx('boing'); api.shake(12);
        s.msg = 'PINCE !';
      }
      s.msgT = 0.7;
    }
    function next() {
      s.round++;
      s.result = null;
      if (s.round >= ROUNDS) {
        if (s.hugs >= GOAL) api.end(true, s.hugs === ROUNDS
          ? 'Six câlins face à face, zéro pincement : Mami est démasquée… et ravie quand même !'
          : `${s.hugs} vrais câlins sur 6 : Mami a dû se contenter de câlins honnêtes. Elle rit encore de ses tentatives !`);
        else api.end(false, `Pincé ${s.pinches} fois ! Mami et ses câlins surprise par derrière : imparable. Un amour de grand-mère, très tactile !`);
      } else startCalm();
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.phaseT += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.dizzy = Math.max(0, s.dizzy - dt);
        if (api.ended) return;

        let turn = 0;
        if (input.pressed('left')) turn = -1;
        else if (input.pressed('right')) turn = 1;
        else if (input.pointer.pressed) turn = input.pointer.x < W / 2 ? -1 : 1;
        if (s.dizzy > 0) turn = 0;

        if (s.phase === 'calm') {
          if (turn) {
            // se retourner pour rien : un peu tourneboulé
            s.dizzy = 0.8; s.turnSide = turn; s.msg = 'Personne…'; s.msgT = 0.6; api.sfx('whoosh');
          }
          if (s.phaseT >= s.calm) startSneak();
        } else if (s.phase === 'sneak') {
          const p = s.phaseT / s.win;
          const endX = PX + s.side * 62;
          if (s.feint && !s.feinted && p > 0.45) { s.feinted = true; s.side = -s.side; api.sfx('whoosh'); }
          if (!s.giggle && p > 0.5) { s.giggle = true; api.sfx('pop'); }
          const tx = s.feinted ? PX + s.side * 62 : endX;
          s.mx = s.feinted ? lerp(s.mx, tx, Math.min(1, dt * 9)) : lerp(s.startSide < 0 ? 150 : 810, tx, Math.min(1, p * 1.15));
          // trop tôt (avant tout indice) = au hasard : Mami en profite
          if (turn) { s.turnSide = turn; resolve(turn === s.side && s.phaseT > 0.22); if (s.phaseT <= 0.22) s.msg = 'Trop tôt… PINCE !'; }
          else if (p >= 1) resolve(false);
        } else if (s.phase === 'result') {
          if (s.phaseT > 0.65) next();
        }
      },
      timeout() { return s.hugs >= GOAL; },
      draw(g) {
        g.drawImage(BG, 0, 0);
        const sneaking = s.phase === 'sneak';
        const p = sneaking ? s.phaseT / s.win : 0;

        // ombre de Mami sur le parquet (indice)
        if (sneaking || (s.result === 'pinch' && s.phase === 'result')) {
          g.fillStyle = 'rgba(40, 20, 10, 0.28)';
          g.beginPath(); g.ellipse(s.mx + s.side * 20, 462, 46, 11, 0, 0, Math.PI * 2); g.fill();
        }

        // Mami derrière Papa (dessinée avant lui)
        if (sneaking || s.result === 'pinch') {
          const x = s.result === 'pinch' ? PX + s.side * 55 : s.mx;
          drawPerson(g, { ...PEOPLE.mami, x, y: 452, size: 60, expression: s.result === 'pinch' ? 'laugh' : 'smile', pose: sneaking ? 'run' : 'stand', t: s.t * 0.6, flipX: (s.startSide > 0) !== s.feinted });
        }

        // Papa
        const hug = s.result === 'hug';
        const pinch = s.result === 'pinch';
        const jump = pinch ? Math.sin(Math.min(1, s.phaseT / 0.35) * Math.PI) * 26 : 0;
        const win = api.ended && s.hugs >= GOAL;
        const info = api.avatar(g, {
          x: PX, y: PY - jump, size: SIZE,
          pose: win ? 'cheer' : 'stand', t: s.t,
          expression: win ? 'happy' : api.ended ? 'laugh' : pinch ? 'surprised' : hug ? 'happy' : s.dizzy > 0 ? 'worried' : sneaking && p > 0.5 ? 'worried' : 'smile',
          lookX: hug || s.dizzy > 0 ? (s.turnSide || 0) : sneaking ? Math.sin(s.t * 3) * 0.4 : 0,
          tilt: s.dizzy > 0 ? Math.sin(s.t * 20) * 0.1 : 0,
          blush: pinch || hug ? 1 : 0, sweat: sneaking && p > 0.6,
          hands: hug ? { l: { x: PX + s.side * 70 - 20, y: 340 }, r: { x: PX + s.side * 70 + 20, y: 345 } } : undefined,
        });

        // les mains de Mami qui surgissent de derrière (sur le polo : rien à voir, juste le gag)
        if (pinch && s.phase === 'result') {
          const r = info.r, cy = info.hy + 2.05 * r;
          g.strokeStyle = '#a04a6a'; g.lineWidth = 11; g.lineCap = 'round';
          for (const k of [-1, 1]) {
            g.beginPath(); g.moveTo(PX + k * 1.05 * r, cy - 0.2 * r - jump * 0); g.quadraticCurveTo(PX + k * 0.95 * r, cy + 0.3 * r, PX + k * 0.42 * r, cy); g.stroke();
          }
          g.fillStyle = '#f1c8a8';
          for (const k of [-1, 1]) { g.beginPath(); g.arc(PX + k * 0.4 * r, cy, 8, 0, Math.PI * 2); g.fill(); }
          g.strokeStyle = '#fff'; g.lineWidth = 3;
          for (const k of [-1, 1]) for (let a = 0; a < 3; a++) {
            const an = -Math.PI / 2 + (a - 1) * 0.6, x0 = PX + k * 0.4 * r, y0 = cy - 12;
            g.beginPath(); g.moveTo(x0 + Math.cos(an) * 6, y0 + Math.sin(an) * 6); g.lineTo(x0 + Math.cos(an) * 16, y0 + Math.sin(an) * 16); g.stroke();
          }
        }

        // câlin face à face : Mami devant, bras ouverts
        if (hug && s.phase === 'result') {
          drawPerson(g, { ...PEOPLE.mami, x: PX + s.side * 92, y: 474, size: 62, expression: 'love', pose: 'hug', t: s.t, flipX: s.side > 0 });
          for (let i = 0; i < 3; i++) {
            const k = (s.phaseT * 1.4 + i / 3) % 1;
            api.text(g, '♥', PX + s.side * 46 + Math.sin(i * 2 + s.t * 4) * 20, 260 - k * 90, { size: 26 + i * 6, color: `rgba(255, 90, 140, ${1 - k})` });
          }
        }

        // indices sonores écrits
        if (sneaking) {
          const fx = s.mx;
          if (p < 0.6) api.text(g, 'criii…', fx, 505, { size: 20, color: '#fff3d6', stroke: '#5a3a22', strokeWidth: 5 });
          if (p > 0.5) api.text(g, 'hihi !', fx + s.side * 10, 268, { size: 24, color: '#ffd1e0', stroke: '#7a2140', strokeWidth: 5 });
          if (s.feinted && p < 0.75) api.text(g, 'feinte !', PX, 210, { size: 26, color: '#fff', stroke: '#7a2140', strokeWidth: 6 });
        }
        if (s.msgT > 0) {
          const big = s.msg.endsWith('PINCE !');
          api.text(g, s.msg, PX + (big ? s.side * 150 : 0), big ? 250 : 190, { size: big ? 54 : 34, color: big ? '#ffe14d' : '#fff', stroke: big ? '#b8325f' : '#7a2140', strokeWidth: big ? 10 : 7 });
        }

        // HUD
        api.text(g, `Câlins : ${s.hugs} / ${GOAL}`, 30, 40, { size: 24, color: '#ffd1e0', align: 'left', stroke: '#000a' });
        const marks = s.results.map((r) => (r ? '♥' : '✘')).join(' ');
        api.text(g, `Manche ${Math.min(ROUNDS, s.round + 1)} / ${ROUNDS}   ${marks}`, 30, 74, { size: 18, color: '#fff', align: 'left', stroke: '#000a' });
        if (s.t < 2 && !api.ended) {
          api.text(g, '←', 60, 300, { size: 54, color: 'rgba(255,255,255,0.7)', stroke: '#0006' });
          api.text(g, '→', 900, 300, { size: 54, color: 'rgba(255,255,255,0.7)', stroke: '#0006' });
        }
      },
    };
  },
};

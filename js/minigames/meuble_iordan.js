/**
 * Anecdote #52 — « Le meuble de Iordan (×3) » (meuble_iordan)
 * En montant le meuble de Iordan, Papa a découpé une planche dans le mauvais sens… trois fois.
 * Mécanique : la planche (flèche « HAUT ») se retourne sans arrêt sur l'établi ; scier
 * (Espace / clic) quand sa flèche pointe comme sur le plan. 3 planches, 2 bonnes = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

let BG = null;

function buildBg(api) {
  const { W, H } = api;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // mur de l'atelier (lambris)
  g.fillStyle = '#e9d7b9'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(150, 110, 70, 0.25)'; g.lineWidth = 2;
  for (let x = 0; x < W; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 430); g.stroke(); }
  // panneau à outils
  api.roundRect(g, 300, 40, 440, 150, 10); g.fillStyle = '#c99c66'; g.fill();
  g.fillStyle = 'rgba(90, 60, 30, 0.35)';
  for (let y = 56; y < 180; y += 18) for (let x = 316; x < 730; x += 18) { g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill(); }
  // outils accrochés
  g.fillStyle = '#56606b'; g.fillRect(340, 70, 10, 70); g.fillStyle = '#b8453a'; g.fillRect(332, 130, 26, 40);   // tournevis
  g.fillStyle = '#7a5130'; g.fillRect(400, 80, 10, 80); g.fillStyle = '#56606b'; g.fillRect(384, 70, 42, 18);  // marteau
  g.strokeStyle = '#56606b'; g.lineWidth = 8; g.beginPath(); g.arc(480, 110, 26, 0.3, Math.PI * 2 - 0.3); g.stroke(); // ruban
  g.fillStyle = '#e8c33a'; g.beginPath(); g.arc(480, 110, 20, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a7bd5'; g.fillRect(540, 70, 16, 90); g.fillStyle = '#56606b'; g.fillRect(536, 60, 24, 14); // pince
  g.fillStyle = '#2f9e5b'; api.roundRect(g, 600, 72, 110, 32, 6); g.fill(); // niveau à bulle
  g.fillStyle = '#c9f2d8'; g.fillRect(640, 80, 30, 16);
  // sol
  g.fillStyle = '#8a6a4a'; g.fillRect(0, 430, W, H - 430);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 0; x < W; x += 120) g.fillRect(x, 430, 3, H - 430);
  // carton du meuble (à monter)
  g.fillStyle = '#c8a06a'; g.fillRect(830, 300, 110, 140);
  g.fillStyle = '#a88350'; g.fillRect(830, 300, 110, 18);
  api.text(g, 'MEUBLE', 885, 350, { size: 16, color: '#5a3d1e', weight: 900 });
  api.text(g, 'IORDAN', 885, 372, { size: 16, color: '#5a3d1e', weight: 900 });
  api.text(g, '↑ ↑', 885, 405, { size: 22, color: '#5a3d1e', weight: 900 });
  // établi (plateau vu un peu de dessus + pieds)
  g.fillStyle = '#6b4a2f'; g.fillRect(215, 420, 22, 110); g.fillRect(645, 420, 22, 110);
  g.fillStyle = '#5a3d25'; g.fillRect(215, 480, 452, 12);
  g.fillStyle = '#b88a58'; g.beginPath(); g.moveTo(195, 240); g.lineTo(685, 240); g.lineTo(705, 420); g.lineTo(175, 420); g.closePath(); g.fill();
  g.fillStyle = '#9a6f43'; g.fillRect(175, 420, 530, 18);
  g.strokeStyle = 'rgba(110, 70, 35, 0.25)'; g.lineWidth = 2;
  for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(190 - k * 3, 268 + k * 28); g.lineTo(690 + k * 3, 268 + k * 28); g.stroke(); }
  return c;
}

export default {
  id: 'meuble_iordan',
  title: 'Le meuble de Iordan (×3)',
  instructions: 'La planche n’arrête pas de se retourner sur l’établi : scie au moment où sa flèche « HAUT » pointe comme sur le plan. Trois planches, au moins deux bonnes !',
  controls: 'Espace / clic / tap : scier',
  duration: 13,
  introExpression: 'focus',
  successTitle: 'Meuble monté !',
  failTitle: 'Jamais deux sans trois !',
  successText: 'Les planches sont dans le bon sens : le meuble de Iordan tient debout, et l’histoire ne se répète pas !',
  failText: 'Découpée dans le mauvais sens… encore. La même bêtise, avec la même conviction. Jamais deux sans trois !',

  create(api) {
    const { W, H, rand, clamp } = api;
    if (!BG) BG = buildBg(api);
    const PX = 440, PY = 330, PW = 230, PH = 78; // planche
    const STEPS = [0.72, 0.6, 0.52];              // durée d'une position, par planche
    const s = {
      t: 0, plank: 0, phase: 'in', phaseT: 0, o: 0, ang: 0, target: 0, stepT: 0, since: 0,
      good: 0, bad: 0, results: [], lastGood: null, split: 0,
      pile: [], // planches finies { good, ang, x, y }
      say: 'Papa, regarde bien le plan !', sayT: 2.2, iordanExpr: 'smile',
      sawT: 0, papaExpr: 'focus', shownSince: 0,
    };
    const COLORS = ['#e9c48c', '#e2b878', '#efcf9c'];

    function newPlank() {
      s.phase = 'in'; s.phaseT = 0; s.split = 0;
      s.target = Math.floor(rand(0, 4));
      s.o = (s.target + 1 + Math.floor(rand(0, 3))) % 4; // jamais dans le bon sens au départ
      s.ang = s.o; s.shown = s.o; s.stepT = 0; s.since = 0; s.shownSince = 0;
    }
    newPlank();

    function flip() {
      let n;
      if (s.since >= 2 && s.o !== s.target) n = s.target;
      else { do { n = Math.floor(rand(0, 4)); } while (n === s.o); }
      // tourne par le chemin le plus court (ou un demi-tour)
      let d = ((n - s.o) % 4 + 4) % 4; if (d === 3) d = -1;
      s.ang += d;
      s.o = n;
      s.since = n === s.target ? 0 : s.since + 1;
      s.shownSince = 0;
      api.sfx('whoosh');
    }

    function judge() {
      const nearest = ((Math.round(s.ang) % 4) + 4) % 4;
      const ok = nearest === s.target && Math.abs(s.ang - Math.round(s.ang)) < 0.28;
      s.lastGood = ok;
      s.results.push(ok);
      if (ok) {
        s.good++;
        api.sfx('catch');
        api.burst(PX, PY, { n: 18, color: ['#ffe08a', '#fff', '#7fdc8a'], speed: 260, gravity: 400, size: 6, shape: 'star' });
        s.say = ['Bravo Papa !', 'Parfait, Papa !', 'Comme sur le plan !'][Math.floor(rand(0, 3))];
        s.iordanExpr = 'laugh'; s.papaExpr = 'happy';
      } else {
        s.bad++;
        api.sfx('splat'); api.shake(10);
        s.say = s.bad === 1 ? 'Papa… c’est à l’envers !' : s.bad === 2 ? 'Encore ?! Pareil ?!' : 'Jamais deux sans trois !';
        s.iordanExpr = s.bad === 1 ? 'surprised' : 'laugh'; s.papaExpr = 'surprised';
      }
      s.sayT = 1.6;
    }

    function finish() {
      if (s.good >= 2) {
        api.end(true, s.good === 3
          ? 'Trois planches, trois fois dans le bon sens : le meuble de Iordan est parfait. Cette fois, l’histoire ne se répète pas !'
          : 'Deux planches sur trois dans le bon sens : le meuble tient debout. La troisième ? Disons qu’elle a du caractère.');
      } else {
        api.end(false, s.bad === 3
          ? 'Trois planches, trois fois dans le mauvais sens, avec la même conviction. Jamais deux sans trois !'
          : 'Deux planches à l’envers sur trois : le meuble de Iordan aura un petit côté… artistique.');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.phaseT += dt;
        s.sayT = Math.max(0, s.sayT - dt);
        // rotation animée : s.ang = orientation visée (en quarts de tour), s.shown = orientation affichée
        s.shown += (s.ang - s.shown) * Math.min(1, dt * 16);
        if (Math.abs(s.ang - s.shown) < 0.002) s.shown = s.ang;
        s.shownSince += dt;
        if (api.ended) return;
        if (s.phase === 'in') {
          if (s.phaseT > 0.4) { s.phase = 'turn'; s.phaseT = 0; s.stepT = 0; }
        } else if (s.phase === 'turn') {
          s.stepT += dt;
          if (s.stepT >= STEPS[s.plank]) { s.stepT = 0; flip(); }
          if (input.pressed()) {
            // on juge sur l'orientation affichée (pendant un demi-tour, c'est de travers)
            const saved = s.ang; s.ang = s.shown; judge(); s.ang = saved;
            s.phase = 'saw'; s.phaseT = 0;
            api.sfx('grain');
          }
        } else if (s.phase === 'saw') {
          if (Math.floor(s.phaseT * 12) !== Math.floor((s.phaseT - dt) * 12)) api.burst(PX + rand(-10, 10), PY + rand(-20, 20), { n: 4, color: ['#f1d6a6', '#d9b47c'], speed: 140, gravity: 500, size: 3 });
          s.split = clamp((s.phaseT - 0.35) / 0.25, 0, 1);
          if (s.phaseT > 0.65) { s.phase = 'out'; s.phaseT = 0; }
        } else if (s.phase === 'out') {
          if (s.phaseT > 0.45) {
            const n = s.pile.length;
            s.pile.push(s.lastGood
              ? { good: true, x: 330, y: 515 - s.pile.filter((p) => p.good).length * 14, a: rand(-0.03, 0.03) }
              : { good: false, x: 560 + rand(-20, 20), y: 505 - s.pile.filter((p) => !p.good).length * 16, a: rand(-0.5, 0.5) * (n % 2 ? 1 : -1) });
            s.plank++;
            s.papaExpr = 'focus';
            if (s.plank >= 3) finish();
            else newPlank();
          }
        }
      },
      timeout() {
        // planches non sciées = ratées
        return s.good >= 2;
      },
      draw(g) {
        g.drawImage(BG, 0, 0);

        // ── le plan affiché au mur
        api.roundRect(g, 30, 60, 230, 190, 10); g.fillStyle = '#2f5d9a'; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1;
        for (let x = 40; x < 260; x += 16) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x, 246); g.stroke(); }
        for (let y = 70; y < 250; y += 16) { g.beginPath(); g.moveTo(34, y); g.lineTo(256, y); g.stroke(); }
        api.text(g, `PLAN · planche ${Math.min(3, s.plank + 1)} / 3`, 145, 84, { size: 16, color: '#fff', weight: 800 });
        g.save(); g.translate(145, 165); g.rotate((s.target * Math.PI) / 2);
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash([6, 4]);
        g.strokeRect(-70, -24, 140, 48); g.setLineDash([]);
        drawArrow(g, 0, 0, 0.62, '#fff');
        g.restore();

        // ── piles de planches finies (au sol, devant l'établi)
        for (const p of s.pile) {
          g.save(); g.translate(p.x, p.y); g.rotate(p.a);
          g.fillStyle = p.good ? '#e9c48c' : '#d9ad70';
          g.fillRect(-80, -7, 160, 14);
          g.strokeStyle = 'rgba(110,70,35,0.5)'; g.lineWidth = 2; g.strokeRect(-80, -7, 160, 14);
          g.restore();
        }
        const nb = s.pile.filter((p) => !p.good).length;
        if (nb) api.text(g, nb >= 2 ? 'jamais deux sans trois…' : 'à l’envers', 560, 470 - nb * 16, { size: 15, color: '#fff', stroke: '#000a', strokeWidth: 4 });

        // ── la planche sur l'établi
        if (s.plank < 3 && !(s.phase === 'out' && s.phaseT > 0.3)) {
          let x = PX, y = PY, alpha = 1;
          if (s.phase === 'in') x = PX - (1 - Math.min(1, s.phaseT / 0.4)) * 380;
          if (s.phase === 'out') { alpha = 1 - s.phaseT / 0.3; y += s.phaseT * 160; }
          g.globalAlpha = Math.max(0, alpha);
          drawPlank(g, x, y, s.shown, s.split, COLORS[s.plank % 3]);
          g.globalAlpha = 1;
        }

        // ── Papa et sa scie
        const sawing = s.phase === 'saw' && !api.ended;
        const jig = sawing ? Math.sin(s.phaseT * 40) * 18 : 0;
        const info = api.avatar(g, {
          x: 805, y: 512, size: 64, pose: api.ended && s.good >= 2 ? 'cheer' : 'stand', t: s.t,
          expression: api.ended ? (s.good >= 2 ? 'happy' : 'laugh') : sawing ? 'focus' : s.papaExpr,
          lookX: -1, lookY: 0.3, sweat: s.phase === 'turn' && s.stepT > 0.4,
          hands: api.ended && s.good >= 2 ? undefined : { l: { x: 712 + jig, y: 338 }, r: { x: 730 + jig, y: 352 } },
        });
        if (!(api.ended && s.good >= 2)) {
          const hand = info.hands.l;
          // en sciant, la lame passe par le centre de la planche (le long du trait de coupe)
          const tipX = sawing ? PX - 150 + jig : PX + 10;
          const tipY = sawing ? hand.y + (PY - hand.y) * (hand.x - tipX) / Math.max(1, hand.x - PX) : PY - 120;
          drawSaw(g, hand.x, hand.y, tipX, tipY);
          g.fillStyle = '#efc29e';
          for (const h of [info.hands.l, info.hands.r]) { g.beginPath(); g.arc(h.x, h.y, 7, 0, Math.PI * 2); g.fill(); }
        }

        // ── Iordan qui commente
        drawPerson(g, { ...PEOPLE.iordan, x: 95, y: 515, size: 56, expression: s.iordanExpr, pose: s.sayT > 0 && s.lastGood === false ? 'point' : 'stand', t: s.t });
        if (s.sayT > 0 || s.t < 2.2) bubble(g, 120, 300, s.say);

        // ── HUD
        const marks = s.results.map((r) => (r ? '✔' : '✘')).join(' ');
        api.text(g, `Planches : ${marks || '–'}`, 290, 222, { size: 22, color: '#fff', align: 'left', stroke: '#000a' });
        if (s.phase === 'turn' && !api.ended) api.text(g, 'Scie quand la flèche est comme sur le plan !', PX, 470, { size: 18, color: '#fff', stroke: '#000a' });
      },
    };

    function drawArrow(g, x, y, k, color) {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(x, y - 38 * k); g.lineTo(x + 26 * k, y - 6 * k); g.lineTo(x + 10 * k, y - 6 * k); g.lineTo(x + 10 * k, y + 34 * k);
      g.lineTo(x - 10 * k, y + 34 * k); g.lineTo(x - 10 * k, y - 6 * k); g.lineTo(x - 26 * k, y - 6 * k); g.closePath(); g.fill();
    }

    function drawPlank(g, x, y, ang, split, color) {
      g.save(); g.translate(x, y);
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.save(); g.rotate((ang * Math.PI) / 2); g.fillRect(-PW / 2 + 6, -PH / 2 + 8, PW, PH); g.restore();
      // deux moitiés qui s'écartent après la coupe (trait de coupe horizontal à l'écran, le long de la scie)
      for (const side of [-1, 1]) {
        g.save();
        g.translate(0, side * split * 16);
        g.beginPath(); side < 0 ? g.rect(-400, -400, 800, 400) : g.rect(-400, 0, 800, 400); g.clip();
        g.rotate((ang * Math.PI) / 2);
        g.fillStyle = color; g.fillRect(-PW / 2, -PH / 2, PW, PH);
        g.strokeStyle = 'rgba(140, 90, 45, 0.35)'; g.lineWidth = 2;
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(-PW / 2 + 6, k * 13); g.bezierCurveTo(-30, k * 13 + 6, 30, k * 13 - 6, PW / 2 - 6, k * 13); g.stroke(); }
        g.strokeStyle = '#8a5a2e'; g.lineWidth = 3; g.strokeRect(-PW / 2, -PH / 2, PW, PH);
        drawArrow(g, -50, 0, 0.85, '#c0392b');
        g.save(); g.translate(30, 0);
        api.text(g, 'HAUT', 0, 0, { size: 22, color: '#c0392b', weight: 900 });
        g.restore();
        g.restore();
        g.restore();
      }
      if (split === 0) {
        const half = PH / 2 + (PW / 2 - PH / 2) * Math.abs(Math.cos((ang * Math.PI) / 2)) + 8;
        g.strokeStyle = 'rgba(60, 40, 30, 0.6)'; g.lineWidth = 2; g.setLineDash([5, 5]);
        g.beginPath(); g.moveTo(-half, 0); g.lineTo(half, 0); g.stroke(); g.setLineDash([]);
      }
      g.restore();
    }

    function drawSaw(g, hx, hy, tx, ty) {
      const a = Math.atan2(ty - hy, tx - hx), L = Math.hypot(tx - hx, ty - hy);
      g.save(); g.translate(hx, hy); g.rotate(a);
      // lame
      g.fillStyle = '#c9d0d8';
      g.beginPath(); g.moveTo(10, -14); g.lineTo(L, -5); g.lineTo(L, 6); g.lineTo(10, 16); g.closePath(); g.fill();
      g.fillStyle = '#9aa3ad';
      g.beginPath();
      for (let k = 12; k < L; k += 9) { const w = 16 - ((k - 10) / L) * 10; g.moveTo(k, w); g.lineTo(k + 4.5, w + 6); g.lineTo(k + 9, w); }
      g.fill();
      // poignée
      g.fillStyle = '#b8453a';
      api.roundRect(g, -16, -18, 30, 36, 9); g.fill();
      g.fillStyle = '#efe3d0'; api.roundRect(g, -8, -8, 14, 16, 5); g.fill();
      g.restore();
    }

    function bubble(g, x, y, str) {
      g.font = '700 18px "Nunito Sans", system-ui, sans-serif';
      const w = Math.max(120, (g.measureText ? g.measureText(str).width : str.length * 9) + 28);
      const bx = clamp(x - 30, 10, W - w - 10);
      api.roundRect(g, bx, y - 22, w, 44, 14); g.fillStyle = '#fff'; g.fill();
      g.beginPath(); g.moveTo(x - 10, y + 20); g.lineTo(x - 22, y + 44); g.lineTo(x + 6, y + 20); g.closePath(); g.fill();
      api.text(g, str, bx + w / 2, y, { size: 18, color: '#3a2a1a' });
    }
  },
};

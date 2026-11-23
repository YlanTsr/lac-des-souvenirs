/**
 * Anecdote #55 — « Les pâtisseries cachées » (patisseries_cachees)
 * Papa vient d'acheter de superbes pâtisseries… et voit Michel arriver. Réflexe : les cacher,
 * et lui offrir de vieux biscuits. (Les pâtisseries ? Mangées après.)
 * Mécanique : trier 8 objets avant que Michel entre : ← pâtisserie au placard, → vieux biscuits
 * sur l'assiette de Michel (ou clic à gauche / à droite). Une pâtisserie sur l'assiette = démasqué !
 */
import { drawPerson, PEOPLE } from './people.js';

let BG = null;

function buildBg(api) {
  const { W, H } = api;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // carrelage de cuisine
  g.fillStyle = '#f6efe2'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(170, 150, 120, 0.3)'; g.lineWidth = 2;
  for (let y = 0; y < 400; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = 0; x < W; x += 36) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 400); g.stroke(); }
  // fenêtre (cadre) : le paysage est dessiné à part, Michel y marche
  g.fillStyle = '#8a5a35'; g.fillRect(292, 52, 376, 162);
  // sol
  g.fillStyle = '#c98f5a'; g.fillRect(0, 470, W, H - 470);
  // placard (à gauche, porte ouverte)
  g.fillStyle = '#a5714a'; g.fillRect(30, 190, 200, 280);
  g.fillStyle = '#3d2a1c'; g.fillRect(44, 204, 172, 252);
  g.fillStyle = '#7a5130'; g.fillRect(44, 326, 172, 8);
  g.fillStyle = '#b98258';
  g.beginPath(); g.moveTo(230, 190); g.lineTo(268, 176); g.lineTo(268, 486); g.lineTo(230, 470); g.closePath(); g.fill();
  g.fillStyle = '#e8c33a'; g.beginPath(); g.arc(258, 330, 5, 0, Math.PI * 2); g.fill();
  api.text(g, 'PLACARD SECRET', 130, 176, { size: 15, color: '#6b4a2f', weight: 900 });
  // table
  g.fillStyle = '#6b4a2f'; g.fillRect(300, 420, 18, 80); g.fillRect(642, 420, 18, 80);
  g.fillStyle = '#d9a86a'; g.fillRect(280, 392, 400, 30);
  g.fillStyle = '#c4935a'; g.fillRect(280, 418, 400, 8);
  // nappe à carreaux
  g.fillStyle = 'rgba(205, 60, 60, 0.35)';
  for (let x = 284; x < 676; x += 24) g.fillRect(x, 392, 12, 26);
  // petit meuble + assiette de Michel (à droite)
  g.fillStyle = '#9a6f43'; g.fillRect(730, 400, 200, 70);
  g.fillStyle = '#b88a58'; g.fillRect(722, 390, 216, 14);
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(830, 384, 82, 18, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c9d2dc'; g.lineWidth = 3; g.beginPath(); g.ellipse(830, 384, 60, 12, 0, 0, Math.PI * 2); g.stroke();
  api.text(g, 'POUR MICHEL', 830, 436, { size: 15, color: '#fff3d6', weight: 900 });
  return c;
}

const PASTRIES = ['eclair', 'tarte', 'millefeuille', 'religieuse'];

export default {
  id: 'patisseries_cachees',
  title: 'Les pâtisseries cachées',
  instructions: 'Michel arrive ! Cache vite les belles pâtisseries au placard et pose les vieux biscuits sur son assiette : 8 objets triés avant qu’il entre.',
  controls: '← / clic à gauche : cacher au placard · → / clic à droite : assiette de Michel',
  duration: 12,
  introExpression: 'surprised',
  successTitle: 'Opération pâtisseries réussie !',
  failTitle: 'Démasqué par Michel !',
  successText: 'Michel a eu les vieux biscuits, et toi les pâtisseries une fois qu’il est reparti. Michel, si tu lis ceci : désolé ! Joyeux anniversaire, Papa !',
  failText: 'Michel a trouvé les pâtisseries… et il s’est régalé. Michel, si tu lis ceci : désolé pour les autres fois ! Joyeux anniversaire, Papa !',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;
    if (!BG) BG = buildBg(api);
    const GOAL = 8, ARRIVE = 9.6;
    const TX = 480, TY = 372; // objet posé sur la table
    // suite d'objets bien mélangée (jamais plus de 3 fois le même type d'affilée)
    const queue = [];
    while (queue.length < 30) {
      const last3 = queue.slice(-3);
      let pastry = rand() < 0.5;
      if (last3.length === 3 && last3.every((q) => q.pastry === pastry)) pastry = !pastry;
      queue.push({ pastry, kind: pastry ? PASTRIES[Math.floor(rand(0, 4))] : 'biscuit' });
    }
    const s = {
      t: 0, approach: 0, ok: 0, wasted: 0, idx: 0, item: null, itemT: 0, gap: 0.3,
      flying: [], hidden: 0, onPlate: 0, msg: '', msgT: 0, papaExpr: 'surprised', caught: false, entered: false,
    };

    function nextItem() {
      s.item = { ...queue[s.idx % queue.length] };
      s.idx++;
      s.itemT = 0;
    }

    function sort(side) {
      const it = s.item;
      s.item = null; s.gap = 0.14;
      const toLeft = side < 0;
      s.flying.push({ ...it, x: TX, y: TY, tx: toLeft ? 130 + (s.hidden % 3) * 40 - 40 : 800 + (s.onPlate % 3) * 30, ty: toLeft ? (s.hidden < 3 ? 312 : 440) : 372, k: 0 });
      if (toLeft) s.hidden++; else s.onPlate++;
      api.sfx('whoosh');
      if (it.pastry && !toLeft) {
        // une pâtisserie sur l'assiette de Michel : démasqué !
        s.caught = true;
        s.msg = 'Oh, un ' + ({ eclair: 'éclair', tarte: 'tarte', millefeuille: 'mille-feuille', religieuse: 'religieuse' })[it.kind] + ' !';
        if (it.kind === 'tarte' || it.kind === 'religieuse') s.msg = 'Oh, une ' + (it.kind === 'tarte' ? 'tarte' : 'religieuse') + ' !';
        s.msgT = 2;
        api.sfx('splat'); api.shake(10);
        api.end(false, 'Une pâtisserie sur l’assiette de Michel : démasqué ! Il s’est régalé, et toi tu as eu… les vieux biscuits. Michel, si tu lis ceci : désolé pour les autres fois !');
        return;
      }
      if (!it.pastry && toLeft) {
        s.wasted++;
        s.msg = 'Pas les vieux biscuits !'; s.msgT = 0.8;
        s.gap = 0.45;
        api.sfx('boing');
        return;
      }
      s.ok++;
      s.papaExpr = 'happy';
      api.sfx(it.pastry ? 'pop' : 'catch');
      if (s.ok >= GOAL) {
        api.end(true, 'Pâtisseries à l’abri, vieux biscuits servis avec le sourire. Michel n’y a vu que du feu… et tu as tout mangé après. Michel, si tu lis ceci : désolé ! Joyeux anniversaire, Papa !');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        for (const f of s.flying) f.k = Math.min(1, f.k + dt * 4.5);
        if (api.ended) {
          if (s.ok >= GOAL && Math.floor(s.t * 6) !== Math.floor((s.t - dt) * 6)) api.burst(rand(100, 860), rand(80, 200), { n: 10, color: ['#ffd84d', '#ff6f9c', '#7fd0ff', '#9be37b'], speed: 240, gravity: 380, size: 5, shape: 'star' });
          return;
        }
        s.approach = Math.min(1, s.t / ARRIVE);
        if (s.approach >= 1) {
          s.entered = true;
          api.sfx('clang');
          api.end(false, `Toc toc ! Michel est entré avant la fin du rangement (${s.ok} / ${GOAL})… et il a tout de suite repéré les pâtisseries. Michel, si tu lis ceci : désolé pour les autres fois !`);
          return;
        }
        if (!s.item) {
          s.gap -= dt;
          if (s.gap <= 0) nextItem();
          return;
        }
        s.itemT += dt;
        if (s.itemT < 0.16) return; // l'objet est encore en train d'arriver
        let side = 0;
        if (input.pressed('left')) side = -1;
        else if (input.pressed('right')) side = 1;
        else if (input.pointer.pressed) side = input.pointer.x < W / 2 ? -1 : 1;
        if (side) sort(side);
      },
      timeout() { return s.ok >= GOAL; },
      draw(g) {
        g.drawImage(BG, 0, 0);
        // paysage de la fenêtre + Michel qui approche
        const a = s.approach;
        const sky = g.createLinearGradient(0, 62, 0, 204);
        sky.addColorStop(0, '#8fc6ef'); sky.addColorStop(1, '#fbe4b8');
        g.save();
        g.beginPath(); g.rect(302, 62, 356, 142); g.clip();
        g.fillStyle = sky; g.fillRect(302, 62, 356, 142);
        g.fillStyle = '#8cc46e'; g.fillRect(302, 160, 356, 44);
        g.fillStyle = '#e3cfa0';
        g.beginPath(); g.moveTo(330, 160); g.lineTo(360, 160); g.lineTo(520, 204); g.lineTo(440, 204); g.closePath(); g.fill();
        for (const x of [330, 600, 640]) { g.fillStyle = '#4f9a4a'; g.beginPath(); g.arc(x, 140, 22, 0, Math.PI * 2); g.fill(); }
        if (!s.entered) drawPerson(g, { ...PEOPLE.michel, x: lerp(345, 480, a), y: lerp(164, 236, a), size: lerp(10, 46, a * a), pose: 'run', t: s.t * 0.7, expression: 'smile' });
        g.restore();
        g.strokeStyle = '#8a5a35'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(480, 62); g.lineTo(480, 204); g.moveTo(302, 133); g.lineTo(658, 133); g.stroke();

        // jauge d'approche
        api.roundRect(g, 302, 222, 356, 20, 10); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
        api.roundRect(g, 302, 222, Math.max(20, 356 * a), 20, 10); g.fillStyle = a > 0.75 ? '#e8453c' : '#f2a93b'; g.fill();
        api.text(g, a > 0.75 ? 'Michel est presque là !' : 'Michel arrive…', 480, 233, { size: 14, color: '#fff', weight: 800 });

        // Papa derrière la table
        const panic = !api.ended && a > 0.7;
        const win = api.ended && s.ok >= GOAL;
        const papaHands = s.item && !api.ended ? { l: { x: TX - 34, y: TY + 6 }, r: { x: TX + 34, y: TY + 6 } } : undefined;
        api.avatar(g, {
          x: 480, y: 470, size: 66, pose: win ? 'cheer' : 'stand', t: s.t,
          expression: win ? 'happy' : api.ended ? 'laugh' : s.msgT > 0 && s.msg.startsWith('Pas') ? 'worried' : panic ? 'panic' : 'focus',
          sweat: panic, hands: papaHands, lookY: 0.6,
        });
        g.drawImage(BG, 280, 392, 400, 34, 280, 392, 400, 34); // le plateau repasse devant Papa

        // objets cachés / servis
        for (const f of s.flying) {
          const x = lerp(f.x, f.tx, f.k), y = lerp(f.y, f.ty, f.k) - Math.sin(f.k * Math.PI) * 80;
          drawItem(g, f, x, y, f.k < 1 ? 1 - f.k * 0.25 : 0.75);
        }
        // l'objet sur la table
        if (s.item && !api.ended) {
          const k = Math.min(1, s.itemT / 0.16);
          drawItem(g, s.item, TX, TY - (1 - k) * 60, 1.15);
          api.text(g, '←', 380, TY - 10, { size: 40, color: 'rgba(255,255,255,0.85)', stroke: '#0006' });
          api.text(g, '→', 580, TY - 10, { size: 40, color: 'rgba(255,255,255,0.85)', stroke: '#0006' });
        }

        // Michel entre (fin)
        if (api.ended && (s.entered || s.caught || win)) {
          const k = Math.min(1, (s.t - (s.endAt ??= s.t)) / 0.6);
          drawPerson(g, { ...PEOPLE.michel, x: lerp(1010, 880, k), y: 530, size: 64, expression: win ? 'smile' : 'love', pose: win ? 'stand' : 'arms_up', t: s.t });
          if (k >= 1) api.text(g, win ? 'Merci pour les biscuits !' : 'Miam, des pâtisseries !', 760, 290, { size: 20, color: '#fff', stroke: '#3f5a2a' });
          api.text(g, 'Joyeux anniversaire, Papa !', W / 2, 300, { size: 40, color: '#ffe14d', stroke: '#7a2140', strokeWidth: 9 });
        }

        if (s.msgT > 0) api.text(g, s.msg, 480, 300, { size: 30, color: '#fff', stroke: '#7a2140' });

        // HUD
        api.text(g, `Triés : ${s.ok} / ${GOAL}`, 30, 40, { size: 24, color: '#fff', align: 'left', stroke: '#000a' });
        api.text(g, '← placard (pâtisseries)', 30, 74, { size: 16, color: '#ffe2b0', align: 'left', stroke: '#000a', strokeWidth: 4 });
        api.text(g, '→ Michel (vieux biscuits)', 30, 98, { size: 16, color: '#d6f0c0', align: 'left', stroke: '#000a', strokeWidth: 4 });
      },
    };

    function drawItem(g, it, x, y, k) {
      g.save(); g.translate(x, y); g.scale(k, k);
      // assiette en carton
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(0, 12, 40, 9, 0, 0, Math.PI * 2); g.fill();
      switch (it.kind) {
        case 'eclair':
          g.fillStyle = '#e3b26a'; api.roundRect(g, -34, -6, 68, 20, 10); g.fill();
          g.fillStyle = '#5a321c'; api.roundRect(g, -32, -9, 64, 11, 6); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-22, -7, 30, 3);
          break;
        case 'tarte':
          g.fillStyle = '#d9a35c'; g.beginPath(); g.ellipse(0, 4, 32, 13, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#f7e2b0'; g.beginPath(); g.ellipse(0, 1, 26, 9, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#e0303e';
          for (const [px, py] of [[-14, 0], [-4, -3], [7, 0], [16, 1], [0, 4], [-10, 4]]) { g.beginPath(); g.arc(px, py, 4.5, 0, Math.PI * 2); g.fill(); }
          break;
        case 'millefeuille':
          for (let i = 0; i < 3; i++) { g.fillStyle = '#d9a35c'; g.fillRect(-28, 6 - i * 10, 56, 5); g.fillStyle = '#fff4d6'; g.fillRect(-28, 1 - i * 10, 56, 5); }
          g.fillStyle = '#fff'; g.fillRect(-28, -26, 56, 6);
          g.strokeStyle = '#6b3a20'; g.lineWidth = 1.5;
          for (let i = -24; i < 28; i += 8) { g.beginPath(); g.moveTo(i, -26); g.lineTo(i + 4, -20); g.stroke(); }
          break;
        case 'religieuse':
          g.fillStyle = '#5a321c'; g.beginPath(); g.arc(0, 0, 17, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(0, -22, 10, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fff4d6'; g.fillRect(-12, -14, 24, 4);
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(-5, -5, 5, 0, Math.PI * 2); g.fill();
          break;
        default: { // vieux biscuits secs (avec une toile d'araignée)
          for (let i = 0; i < 3; i++) {
            g.fillStyle = i % 2 ? '#c9b99a' : '#bfae8c';
            g.beginPath(); g.ellipse(0, 6 - i * 8, 26, 8, 0, 0, Math.PI * 2); g.fill();
          }
          g.strokeStyle = '#8a7a5c'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(-12, -12); g.lineTo(-4, -8); g.lineTo(2, -13); g.moveTo(8, -9); g.lineTo(14, -12); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1;
          for (let a = 0; a < 4; a++) { g.beginPath(); g.moveTo(20, -20); g.lineTo(20 + Math.cos(a * 0.5 + 1.6) * 18, -20 + Math.sin(a * 0.5 + 1.6) * 18); g.stroke(); }
          g.beginPath(); g.arc(20, -20, 9, 1.6, 3.2); g.stroke(); g.beginPath(); g.arc(20, -20, 15, 1.6, 3.2); g.stroke();
          g.fillStyle = '#8a7a5c'; g.beginPath(); g.arc(-20, 14, 2, 0, Math.PI * 2); g.arc(18, 15, 1.5, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#e8453c'; api.roundRect(g, -18, -34, 36, 12, 4); g.fill();
          api.text(g, 'VIEUX', 0, -28, { size: 9, color: '#fff', weight: 900 });
        }
      }
      g.restore();
    }
  },
};

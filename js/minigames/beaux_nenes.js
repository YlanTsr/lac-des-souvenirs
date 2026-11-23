/**
 * Le message à l'inconnu (beaux_nenes)
 * Papa voulait envoyer « Beaux Nénés 👙 » à Séléna pour la taquiner…
 * et l'a envoyé à un inconnu sur Le Bon Coin.
 * Mécanique : un surlignage descend la liste des conversations en boucle, et la liste
 * se réorganise sans cesse (notifications). Appuyer pour envoyer quand c'est « Séléna 👑 ».
 * 3 envois à Séléna = victoire ; un envoi à l'inconnu = échec immédiat.
 */
import { drawPerson, PEOPLE } from './people.js';

const CONVOS = {
  selena:  { name: 'Séléna 👑', preview: 'Papa t’es où ? 😂', color: '#e88fb4', ini: 'S', reply: 'Papaaa 🙄😂' },
  inconnu: { name: 'Inconnu – Le Bon Coin', preview: 'Le canapé est toujours dispo ?', color: '#f28c28', ini: '?', reply: '' },
  maman:   { name: 'Maman', preview: 'Tu ramènes du pain ?', color: '#c8486b', ini: 'M', reply: 'Pardon ?? 🤨' },
  jy:      { name: 'Jean-Yves', preview: 'On se fait un apéro ?', color: '#4f8fc0', ini: 'J', reply: 'Euh… merci ?' },
  pizza:   { name: 'Pizzeria 🍕', preview: 'Votre commande est prête !', color: '#3a9a5a', ini: 'P', reply: 'C’est quelle pizza, ça ?' },
};
const RANK = { selena: 2, maman: 1, jy: 1, pizza: 1, inconnu: 0 }; // pour la tolérance de timing

export default {
  id: 'beaux_nenes',
  title: 'Le message à l\'inconnu',
  instructions: 'Ton message pour taquiner Séléna est prêt : envoie-le trois fois, uniquement quand la conversation surlignée est « Séléna 👑 » !',
  controls: 'Espace / clic / tap : envoyer',
  duration: 12,
  introExpression: 'laugh',
  successTitle: 'Message bien reçu !',
  failTitle: 'Vu ✓✓',
  successText: 'Trois « Beaux Nénés 👙 » pile dans la conversation de Séléna. Elle a levé les yeux au ciel… en rigolant.',
  failText: 'Envoyé à l’inconnu du Bon Coin. « Vu ✓✓ »… et plus jamais de nouvelles. Le canapé, on ne l’a jamais eu.',

  create(api) {
    const { W, H } = api;
    const PX = 306, PY = 26, PW = 348, PH = 498;      // téléphone
    const LIST_Y = 128, ROW_H = 62;
    const s = {
      t: 0, order: ['maman', 'selena', 'jy', 'inconnu', 'pizza'],
      prevOrder: null, reorderT: 9,
      hi: 0, prevHi: 0, stepT: 0, sent: 0, wrong: 0, cooldown: 0,
      nextNotif: 1.5, badge: {}, rowY: {},
      reply: null, replyT: 0, sendFx: 0, failT: 0, failed: false,
    };
    s.order.forEach((id, i) => { s.rowY[id] = i * ROW_H; });

    // ── décor pré-rendu : le salon
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const wall = b.createLinearGradient(0, 0, 0, 400);
      wall.addColorStop(0, '#f2d9b8'); wall.addColorStop(1, '#e6c39a');
      b.fillStyle = wall; b.fillRect(0, 0, W, H);
      b.fillStyle = 'rgba(255, 255, 255, 0.18)';
      for (let x = 0; x < W; x += 48) b.fillRect(x, 0, 20, 400);
      b.fillStyle = '#a5714a'; b.fillRect(0, 400, W, H - 400);
      b.fillStyle = '#8e5f3c'; for (let y = 420; y < H; y += 26) b.fillRect(0, y, W, 2);
      // canapé
      b.fillStyle = '#7d5a8c'; api.roundRect(b, 20, 330, 920, 110, 30); b.fill();
      b.fillStyle = '#6a4a78'; api.roundRect(b, 0, 360, 70, 120, 24); b.fill(); api.roundRect(b, 890, 360, 70, 120, 24); b.fill();
      b.fillStyle = '#8f6aa0'; api.roundRect(b, 40, 400, 880, 60, 20); b.fill();
      // cadres au mur
      b.fillStyle = '#fff'; b.fillRect(60, 90, 120, 90); b.fillRect(740, 110, 100, 80);
      b.fillStyle = '#8fc6ef'; b.fillRect(68, 98, 104, 74);
      b.fillStyle = '#6aa553'; b.beginPath(); b.moveTo(68, 172); b.lineTo(110, 128); b.lineTo(140, 150); b.lineTo(172, 120); b.lineTo(172, 172); b.fill();
      b.fillStyle = '#f7d48a'; b.fillRect(748, 118, 84, 64);
      b.fillStyle = '#e88fb4'; b.beginPath(); b.arc(790, 148, 18, 0, Math.PI * 2); b.fill();
      // lampe
      b.fillStyle = '#5a4a3a'; b.fillRect(214, 170, 6, 170);
      b.fillStyle = '#ffe3a0'; b.beginPath(); b.moveTo(190, 170); b.lineTo(244, 170); b.lineTo(232, 128); b.lineTo(202, 128); b.closePath(); b.fill();
    }

    const current = () => s.order[s.hi];
    function pickTarget() {
      // tolérance : juste après un changement (surlignage ou réorganisation), on garde le meilleur des deux
      const cands = [current()];
      if (s.stepT < 0.07) cands.push(s.order[s.prevHi]);
      if (s.reorderT < 0.12 && s.prevOrder) cands.push(s.prevOrder[s.hi]);
      return cands.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
    }
    function moveToTop(id) {
      s.prevOrder = s.order.slice();
      s.order = [id, ...s.order.filter((o) => o !== id)];
      s.reorderT = 0;
    }

    function send() {
      const who = pickTarget();
      s.sendFx = 1;
      api.sfx('whoosh');
      if (who === 'selena') {
        s.sent++;
        s.cooldown = 0.3;
        s.reply = 'selena'; s.replyT = 1.3;
        api.sfx('pop');
        api.burst(820, 230, { n: 14, shape: 'star', color: ['#ffd34d', '#e88fb4', '#ffffff'], speed: 220, gravity: 250, size: 7 });
        moveToTop('selena'); // une conversation à qui l'on écrit remonte en haut
        if (s.sent >= 3) api.end(true);
      } else if (who === 'inconnu') {
        s.failed = true; s.failT = 0;
        api.sfx('splat');
        api.shake(10);
        api.end(false);
      } else {
        s.wrong++;
        s.cooldown = 0.8;
        s.reply = who; s.replyT = 1.3;
        api.sfx('boing');
        moveToTop(who);
        if (s.wrong >= 3) api.end(false, 'Maman, Jean-Yves, la pizzeria… tout le monde a reçu « Beaux Nénés 👙 », sauf Séléna. Le téléphone a été confisqué pour la soirée !');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.replyT = Math.max(0, s.replyT - dt);
        s.sendFx = Math.max(0, s.sendFx - dt * 3);
        s.cooldown = Math.max(0, s.cooldown - dt);
        s.reorderT += dt;
        if (s.failed) s.failT += dt;
        for (const id of s.order) s.rowY[id] += (s.order.indexOf(id) * ROW_H - s.rowY[id]) * Math.min(1, dt * 14);
        if (api.ended) return;

        // le surlignage descend la liste en boucle, de plus en plus vite
        s.stepT += dt;
        const period = Math.max(0.38, 0.52 - s.t * 0.012);
        if (s.stepT >= period) { s.stepT = 0; s.prevHi = s.hi; s.hi = (s.hi + 1) % s.order.length; }

        // notifications : une conversation remonte en haut
        s.nextNotif -= dt;
        if (s.nextNotif <= 0) {
          const others = s.order.slice(1);
          const id = Math.random() < 0.4 && others.includes('inconnu') ? 'inconnu' : others[Math.floor(Math.random() * others.length)];
          moveToTop(id);
          s.badge[id] = (s.badge[id] || 0) + 1;
          api.sfx('beep');
          s.nextNotif = 1.2 + Math.random() * 0.8;
        }

        if (input.pressed() && s.cooldown === 0) send();
      },
      timeout() { return s.sent >= 3; },
      draw(g) {
        g.drawImage(bg, 0, 0);

        // Séléna, sur le canapé à droite
        const selOk = s.replyT > 0 && s.reply === 'selena';
        drawPerson(g, {
          ...PEOPLE.selena, x: 830, y: 500, size: 64, flipX: true, t: s.t,
          pose: api.ended && !s.failed ? 'arms_up' : 'stand',
          expression: s.failed ? 'surprised' : selOk || api.ended ? 'laugh' : 'smile',
        });

        // Papa, à gauche, les yeux rivés sur le téléphone
        api.avatar(g, {
          x: 150, y: 512, size: 78, lookX: 1, lookY: -0.2,
          expression: s.failed ? (s.failT < 0.5 ? 'surprised' : 'panic') : api.ended ? 'laugh' : s.replyT > 0 && s.reply !== 'selena' ? 'worried' : 'focus',
          blush: s.failed ? 1 : s.wrong ? 0.5 : 0, sweat: s.failed,
          hands: { l: { x: 120, y: 470 }, r: { x: 262, y: 400 } },
        });

        // ── le téléphone géant
        g.fillStyle = '#1d1f26';
        api.roundRect(g, PX, PY, PW, PH, 36); g.fill();
        const sx = PX + 14, sy = PY + 30, sw = PW - 28, sh = PH - 60;
        g.fillStyle = '#f7f7fa';
        api.roundRect(g, sx, sy, sw, sh, 14); g.fill();
        g.fillStyle = '#1d1f26'; api.roundRect(g, PX + PW / 2 - 40, PY + 10, 80, 10, 5); g.fill();
        api.text(g, '14:32', sx + 16, sy + 16, { size: 14, color: '#333', align: 'left' });
        api.text(g, '▂▄▆  🔋', sx + sw - 14, sy + 16, { size: 13, color: '#333', align: 'right' });

        g.save();
        g.beginPath(); g.rect(sx, sy, sw, sh); g.clip();
        if (!s.failed) {
          api.text(g, 'Messages', sx + 16, sy + 50, { size: 26, color: '#1d1f26', weight: 900, align: 'left' });
          // conversations
          for (const id of s.order) {
            const c = CONVOS[id];
            const y = LIST_Y + s.rowY[id];
            const hl = s.order[s.hi] === id && !api.ended;
            g.fillStyle = hl ? '#ffe680' : '#ffffff';
            g.fillRect(sx, y, sw, ROW_H - 2);
            if (hl) { g.fillStyle = '#f2b400'; g.fillRect(sx, y, 6, ROW_H - 2); }
            g.fillStyle = c.color; g.beginPath(); g.arc(sx + 34, y + ROW_H / 2, 21, 0, Math.PI * 2); g.fill();
            api.text(g, c.ini, sx + 34, y + ROW_H / 2 + 1, { size: 20, color: '#fff', weight: 900 });
            api.text(g, c.name, sx + 64, y + 20, { size: 17, color: '#1d1f26', weight: 800, align: 'left' });
            api.text(g, c.preview, sx + 64, y + 42, { size: 14, color: '#777', weight: 600, align: 'left' });
            if (s.badge[id]) {
              g.fillStyle = '#e8453c'; g.beginPath(); g.arc(sx + sw - 22, y + 20, 10, 0, Math.PI * 2); g.fill();
              api.text(g, String(s.badge[id]), sx + sw - 22, y + 21, { size: 12, color: '#fff', weight: 900 });
            }
          }
        } else {
          // la conversation de l'inconnu… « Vu ✓✓ »
          g.fillStyle = '#ffffff'; g.fillRect(sx, sy + 28, sw, 52);
          g.fillStyle = CONVOS.inconnu.color; g.beginPath(); g.arc(sx + 32, sy + 54, 18, 0, Math.PI * 2); g.fill();
          api.text(g, '?', sx + 32, sy + 55, { size: 18, color: '#fff', weight: 900 });
          api.text(g, 'Inconnu – Le Bon Coin', sx + 58, sy + 54, { size: 17, color: '#1d1f26', weight: 800, align: 'left' });
          g.fillStyle = '#e9e9ef'; api.roundRect(g, sx + 14, sy + 100, 230, 40, 14); g.fill();
          api.text(g, 'Le canapé est toujours dispo ?', sx + 24, sy + 120, { size: 14, color: '#333', align: 'left' });
          g.fillStyle = '#3b8cf0'; api.roundRect(g, sx + sw - 190, sy + 160, 176, 44, 16); g.fill();
          api.text(g, 'Beaux Nénés 👙', sx + sw - 102, sy + 182, { size: 19, color: '#fff', weight: 800 });
          if (s.failT > 0.35) api.text(g, 'Vu ✓✓', sx + sw - 16, sy + 220, { size: 14, color: '#3b8cf0', weight: 800, align: 'right' });
          if (s.failT > 0.8) api.text(g, '… pas de réponse', sx + sw / 2, sy + 280, { size: 18, color: '#999', weight: 700 });
        }
        g.restore();

        // barre de saisie
        const by = sy + sh - 58;
        g.fillStyle = '#eceef3'; g.fillRect(sx, by - 8, sw, 66);
        g.fillStyle = '#fff'; api.roundRect(g, sx + 10, by, sw - 74, 42, 20); g.fill();
        api.text(g, 'Beaux Nénés 👙', sx + 26, by + 21, { size: 18, color: '#1d1f26', weight: 700, align: 'left' });
        const ready = s.cooldown === 0 && !api.ended;
        g.fillStyle = ready ? '#3b8cf0' : '#9fb8d8';
        g.beginPath(); g.arc(sx + sw - 32, by + 21, 21 + s.sendFx * 4, 0, Math.PI * 2); g.fill();
        api.text(g, '➤', sx + sw - 31, by + 22, { size: 20, color: '#fff' });

        // flèche hors du téléphone, à hauteur de la ligne surlignée
        if (!api.ended && !s.failed) {
          const ay = LIST_Y + s.hi * ROW_H + ROW_H / 2;
          api.text(g, '▶', PX - 16, ay, { size: 26, color: '#f2b400', stroke: '#000a', strokeWidth: 4 });
        }

        // réponses
        if (s.replyT > 0 && s.reply) {
          const c = CONVOS[s.reply];
          const isSel = s.reply === 'selena';
          g.fillStyle = '#fff'; g.strokeStyle = isSel ? '#e88fb4' : '#c8486b'; g.lineWidth = 3;
          api.roundRect(g, 676, 238, 268, 64, 16); g.fill(); g.stroke();
          api.text(g, c.name, 690, 256, { size: 14, color: '#888', align: 'left' });
          api.text(g, c.reply, 690, 282, { size: 19, color: '#1d1f26', weight: 800, align: 'left' });
        }

        // HUD
        api.text(g, `Envoyés à Séléna : ${s.sent} / 3`, 810, 140, { size: 22, color: '#fff', stroke: '#000a' });
        if (s.wrong) api.text(g, `Mauvais destinataires : ${s.wrong} / 3`, 810, 172, { size: 17, color: '#ffe0e0', stroke: '#000a' });
        if (s.failed && s.failT > 0.3) api.text(g, 'Oh non… pas lui !', 150, 150, { size: 26, color: '#fff', stroke: '#a0302a' });
      },
    };
  },
};

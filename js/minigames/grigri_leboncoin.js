/**
 * Anecdote — « Le grigri du Bon Coin » (grigri_leboncoin)
 * Papa va chercher un grigri (appareil d'escalade) d'occasion… et raconte toute sa vie au vendeur,
 * jusqu'au film Vice-Versa vu au cinéma l'après-midi même.
 * Mécanique : maintenir pour se retenir de parler (la vente avance) ; l'envie de raconter monte,
 * il faut relâcher un peu (une phrase s'échappe, le vendeur s'ennuie). Si l'envie déborde : grande tirade !
 */
import { drawPerson, PEOPLE } from './people.js';

const PHRASES = [
  'Mes enfants… j’en ai trois !',
  'Ma tendinite, tu vois…',
  'Vice-Versa, tu as vu ?',
  'Cet aprèm, j’étais au ciné !',
  'Tu grimpes où, toi ?',
  'Tristesse, c’est la meilleure !',
  'Ma fille, c’est une princesse.',
  'J’ai 40 ans de grimpe, hein…',
];
const TIRADES = [
  '…et donc Joie et Tristesse se perdent dans la mémoire à long terme, et là…',
  '…ma tendinite, c’est au coude, enfin non, à l’épaule, attends, je te montre…',
  '…alors mon fils, à la naissance, il pleurait, et moi à 3 h du matin…',
];
const STEPS = ['Il compte les billets…', 'Il va chercher le grigri…', 'Il vérifie la came…', 'Il te le tend…'];

export default {
  id: 'grigri_leboncoin',
  title: 'Le grigri du Bon Coin',
  instructions: 'Récupère ton grigri sans raconter toute ta vie au vendeur : retiens-toi de parler, mais relâche un peu avant d’exploser !',
  controls: 'Maintenir Espace / clic : se retenir · relâcher : une phrase s’échappe',
  duration: 13,
  introExpression: 'laugh',
  successTitle: 'Grigri récupéré !',
  failTitle: 'Porte refermée…',
  successText: 'Grigri en poche ! Le vendeur ne connaît que la moitié de ta vie. Vice-Versa, il le découvrira tout seul.',
  failText: 'Le vendeur a refermé doucement la porte, en plein résumé de Vice-Versa. Il connaît désormais toute ta vie… et toi, tu as eu ton grigri quand même.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const NEED = 6.0;          // secondes de silence pour conclure la vente
    const DOOR_X = 560, DOOR_W = 170, FLOOR = 470;
    const s = {
      urge: 10, bore: 0, deal: 0, holding: false, wasHolding: false,
      talkT: 0, phrase: '', phraseT: 0, phraseI: Math.floor(rand(0, PHRASES.length)),
      tirade: 0, tiradeText: '', tiradeI: 0, sentences: 0, blowups: 0,
      t: 0, endT: 0, won: false, lost: false, door: 0, grigriK: 0, puff: 0,
    };

    /* ── palier d'immeuble, pré-rendu ── */
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    (function paint(c) {
      const w = c.createLinearGradient(0, 0, 0, FLOOR);
      w.addColorStop(0, '#f2dfc0'); w.addColorStop(1, '#e6cda6');
      c.fillStyle = w; c.fillRect(0, 0, W, FLOOR);
      c.fillStyle = '#c9a77a'; c.fillRect(0, 300, W, 6);           // cimaise
      c.fillStyle = '#d9bb8f'; c.fillRect(0, 306, W, FLOOR - 306);
      c.fillStyle = '#9a7650'; c.fillRect(0, FLOOR - 14, W, 14);    // plinthe
      // carrelage
      for (let x = 0; x < W; x += 60) for (let y = FLOOR; y < H; y += 30) {
        c.fillStyle = ((x / 60 + (y - FLOOR) / 30) % 2) ? '#b8442f' : '#efe3cc';
        c.fillRect(x, y, 60, 30);
      }
      // encadrement de porte
      c.fillStyle = '#7a5332'; c.fillRect(DOOR_X - 14, 120, DOOR_W + 28, FLOOR - 120);
      c.fillStyle = '#3b2a22'; c.fillRect(DOOR_X, 134, DOOR_W, FLOOR - 134);      // intérieur sombre
      c.fillStyle = '#5a4535'; c.fillRect(DOOR_X, 134, DOOR_W, 60);
      // paillasson
      c.fillStyle = '#a9894a'; c.fillRect(DOOR_X - 10, FLOOR + 6, DOOR_W + 20, 26);
      c.fillStyle = '#7a5f2e'; c.font = '800 14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('BIENVENUE', DOOR_X + DOOR_W / 2, FLOOR + 19);
      // sonnette + numéro
      c.fillStyle = '#c9b48a'; c.fillRect(DOOR_X + DOOR_W + 26, 270, 22, 34);
      c.fillStyle = '#7a5f2e'; c.beginPath(); c.arc(DOOR_X + DOOR_W + 37, 287, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.fillRect(DOOR_X + 58, 100, 54, 14);
      c.fillStyle = '#555'; c.font = '700 11px sans-serif'; c.fillText('3e gauche', DOOR_X + 85, 108);
      // escalier vers la gauche
      c.fillStyle = '#cdb08a';
      for (let i = 0; i < 6; i++) c.fillRect(30 + i * 28, FLOOR - 60 - i * 34, 28, 60 + i * 34);
      c.strokeStyle = '#7a5332'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(20, FLOOR - 120); c.lineTo(210, FLOOR - 320); c.stroke();
      // minuterie de couloir
      c.fillStyle = '#fff6da'; c.beginPath(); c.arc(380, 60, 26, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,240,190,0.25)'; c.beginPath(); c.arc(380, 60, 70, 0, Math.PI * 2); c.fill();
    })(bg.getContext('2d'));

    function sayPhrase() {
      s.phrase = PHRASES[s.phraseI % PHRASES.length];
      s.phraseI++;
      s.phraseT = 1.3;
      s.sentences++;
      s.bore += 7;
      api.sfx('pop');
    }
    function blowUp() {
      s.blowups++;
      s.tirade = 1.6;
      s.tiradeText = TIRADES[s.tiradeI % TIRADES.length];
      s.tiradeI++;
      s.urge = 0;
      s.bore += 18;
      s.puff = 1;
      api.sfx('whoosh');
      api.shake(8);
      api.burst(300, 250, { n: 16, color: ['#fff', '#ffe3a8'], speed: 260, gravity: 0, size: 6, life: 0.7 });
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.phraseT = Math.max(0, s.phraseT - dt);
        s.puff = Math.max(0, s.puff - dt * 2);
        if (api.ended) {
          s.endT += dt;
          if (s.lost) s.door = Math.min(1, s.door + dt * 1.6);
          if (s.won) s.grigriK = Math.min(1, s.grigriK + dt * 2);
          return;
        }
        const urgeRate = 50 + 3.5 * s.t; // l'envie de raconter monte de plus en plus vite
        if (s.tirade > 0) {
          // grande tirade : impossible de s'arrêter
          s.tirade -= dt;
          s.bore += 9 * dt;
          s.holding = false;
        } else {
          s.holding = input.held();
          if (s.holding) {
            s.urge += urgeRate * dt;
            s.deal += dt;
            s.bore = Math.max(0, s.bore - 2.5 * dt); // le vendeur se détend quand Papa se tait
            if (s.urge >= 100) blowUp();
          } else {
            if (s.wasHolding || s.phraseT <= 0) sayPhrase(); // une phrase s'échappe (puis une autre…)
            s.urge = Math.max(0, s.urge - 170 * dt);
            s.bore += 14 * dt;
          }
        }
        s.wasHolding = s.holding;
        s.urge = clamp(s.urge, 0, 100);
        if (s.bore >= 100) {
          s.bore = 100;
          s.lost = true;
          api.sfx('clang');
          api.end(false, 'Le vendeur a refermé doucement la porte, en plein résumé de Vice-Versa. Il connaît désormais toute ta vie… et toi, tu as eu ton grigri quand même.');
          return;
        }
        if (s.deal >= NEED) {
          s.won = true;
          api.sfx('catch');
          api.burst(400, 300, { n: 18, shape: 'star', color: ['#ffd34d', '#7fd38a'], speed: 260, gravity: 300, size: 8 });
          api.end(true, s.sentences <= 6
            ? 'Grigri en poche, et presque sans bavarder ! Le vendeur ne saura jamais comment finit Vice-Versa.'
            : 'Grigri en poche ! Le vendeur connaît tes enfants, ta tendinite et la moitié de Vice-Versa… mais la vente est faite.');
        }
      },
      timeout() {
        s.lost = true;
        api.end(false, 'Toujours sur le palier… Le vendeur a fini par te donner le grigri, juste pour pouvoir aller dîner.');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        const talking = !s.holding && !s.won && !s.lost;

        // le vendeur dans l'encadrement
        const sleepy = s.bore > 75;
        const sx = DOOR_X + 90;
        const seller = drawPerson(g, {
          ...PEOPLE.passant, shirt: '#6f8fae', x: sx, y: FLOOR - 4, size: 70, t: s.t,
          expression: s.lost ? 'sleep' : sleepy ? 'sleep' : s.bore > 40 ? 'worried' : s.won ? 'laugh' : 'smile',
          hands: { l: { x: sx - 52, y: 362 + (sleepy ? 8 : 0) }, r: { x: sx + 40, y: 400 } },
        });
        if (sleepy && !s.won) {
          // il bâille et s'appuie contre le chambranle
          api.text(g, 'Mmh… mmh…', sx + 40, seller.hy - 64, { size: 18, color: '#5a4a3a' });
        }
        // le grigri : dans la main du vendeur, puis dans celle de Papa
        const progress = clamp(s.deal / NEED, 0, 1);
        const gx = api.lerp(sx - 52, 380, s.won ? s.grigriK : 0), gy = api.lerp(362, 360, s.won ? s.grigriK : 0) - Math.sin((s.won ? s.grigriK : 0) * Math.PI) * 40;
        if (progress > 0.4 || s.won) {
          g.save(); g.translate(gx, gy); g.rotate(-0.3);
          api.roundRect(g, -14, -20, 28, 40, 8); g.fillStyle = '#8a8f99'; g.fill();
          g.fillStyle = '#e0c040'; g.fillRect(-14, -6, 28, 8);
          g.fillStyle = '#4a4f59'; g.beginPath(); g.arc(0, -10, 5, 0, Math.PI * 2); g.fill();
          g.restore();
        }

        // la porte qui se referme (échec)
        if (s.door > 0) {
          const dw = DOOR_W * s.door;
          g.fillStyle = '#9a6a42'; g.fillRect(DOOR_X + DOOR_W - dw, 134, dw, FLOOR - 134);
          g.fillStyle = '#7a5332';
          g.fillRect(DOOR_X + DOOR_W - dw + 12, 160, Math.max(0, dw - 24), 120);
          g.fillRect(DOOR_X + DOOR_W - dw + 12, 300, Math.max(0, dw - 24), 140);
          g.fillStyle = '#e0c040'; g.beginPath(); g.arc(DOOR_X + DOOR_W - dw + 18, 310, 6, 0, Math.PI * 2); g.fill();
          if (s.door >= 1) api.text(g, 'CLIC.', DOOR_X + DOOR_W / 2, 220, { size: 34, color: '#fff', stroke: '#000a' });
        }

        // Papa sur le palier
        const blush = s.holding ? s.urge / 100 : 0;
        const wob = s.holding && s.urge > 70 ? Math.sin(s.t * 40) * (s.urge - 70) / 30 * 3 : 0;
        api.avatar(g, {
          x: 360 + wob, y: FLOOR + 4, size: 74, t: s.t,
          pose: s.won ? 'cheer' : 'stand',
          expression: s.won ? 'happy' : s.tirade > 0 ? 'laugh' : s.holding ? (s.urge > 70 ? 'panic' : 'focus') : (Math.sin(s.t * 14) > 0 ? 'laugh' : 'happy'),
          blush, sweat: s.holding && s.urge > 60, lookX: 1,
        });
        // bouche pincée quand il se retient
        if (s.holding && !s.won) {
          const hx = 360 + wob, hy = FLOOR + 4 - 1.9 * 37 - 2.05 * 37 - 37;
          g.fillStyle = '#efc29e'; g.beginPath(); g.ellipse(hx, hy + 0.5 * 37, 11, 7, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#a65a4a'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(hx - 8, hy + 0.5 * 37); g.lineTo(hx + 8, hy + 0.5 * 37); g.stroke();
          g.lineWidth = 1.5;
          for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(hx + k * 5, hy + 0.5 * 37 - 3); g.lineTo(hx + k * 5, hy + 0.5 * 37 + 3); g.stroke(); }
          if (s.urge > 80) api.text(g, '!!', hx + 46, hy - 40, { size: 30, color: '#e8453c', stroke: '#fff' });
        }

        // bulles de paroles
        if (s.tirade > 0) {
          api.roundRect(g, 60, 120, 470, 84, 18); g.fillStyle = '#fff'; g.fill();
          g.beginPath(); g.moveTo(330, 204); g.lineTo(350, 232); g.lineTo(360, 204); g.closePath(); g.fill();
          const txt = s.tiradeText;
          const mid = Math.ceil(txt.length / 2);
          const cut = txt.indexOf(' ', mid) > 0 ? txt.indexOf(' ', mid) : mid;
          api.text(g, txt.slice(0, cut), 295, 148, { size: 17, color: '#3a2a20' });
          api.text(g, txt.slice(cut + 1), 295, 176, { size: 17, color: '#3a2a20' });
          api.text(g, 'ÇA DÉBORDE !', 170, 236, { size: 22, color: '#e8453c', stroke: '#fff' });
        } else if (s.phraseT > 0 && (talking || s.phraseT > 0.6)) {
          api.roundRect(g, 150, 150, 330, 56, 18); g.fillStyle = '#fff'; g.fill();
          g.beginPath(); g.moveTo(330, 206); g.lineTo(350, 232); g.lineTo(362, 206); g.closePath(); g.fill();
          api.text(g, s.phrase, 315, 178, { size: 20, color: '#3a2a20' });
        }

        // HUD : trois jauges
        const bar = (x, y, w, v, col, label) => {
          api.text(g, label, x, y - 14, { size: 17, color: '#3a2a20', align: 'left', stroke: 'rgba(255,255,255,0.7)', strokeWidth: 4 });
          api.roundRect(g, x, y, w, 16, 8); g.fillStyle = 'rgba(60,40,30,0.25)'; g.fill();
          if (v > 0.01) { api.roundRect(g, x, y, Math.max(16, w * v), 16, 8); g.fillStyle = col; g.fill(); }
        };
        bar(40, 42, 220, s.urge / 100, s.urge > 75 ? '#e8453c' : '#f2a13d', 'Envie de raconter');
        bar(310, 42, 220, s.bore / 100, '#7a8aa8', 'Ennui du vendeur');
        bar(40, 98, 220, progress, '#4fa36b', 'Vente du grigri');
        if (!api.ended) api.text(g, STEPS[Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length))], 272, 106, { size: 16, color: '#3a6a3a', align: 'left' });
        if (s.won) api.text(g, 'Merci, au revoir !', 450, 250, { size: 30, color: '#fff', stroke: '#3a6a3a' });
      },
    };
  },
};

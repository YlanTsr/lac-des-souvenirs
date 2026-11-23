/**
 * Anecdote — « Ylan, ton premier fils » (naissance_ylan)
 * 17 septembre 2003 : Papa devient papa pour la deuxième fois, avec son premier fils Ylan.
 * Mécanique : les nuits blanches. Ylan pleure et sa bulle montre ce qu'il veut
 * (biberon / tétine / doudou) : répondre vite avec ← ↑ → (ou en cliquant l'objet).
 * 6 bonnes réponses : il s'endort. 3 ratés (erreur ou lenteur) : c'est Papa qui s'endort debout.
 */
import { drawPerson, PEOPLE } from './people.js';

const ITEMS = [
  { key: 'left', name: 'Biberon', arrow: '←', x: 160 },
  { key: 'up', name: 'Tétine', arrow: '↑', x: 480 },
  { key: 'right', name: 'Doudou', arrow: '→', x: 800 },
];
const GOAL = 6, MAX_FAT = 3;

function drawBottle(g, x, y, k = 1) {
  g.save(); g.translate(x, y); g.scale(k, k);
  g.fillStyle = '#f4f9ff'; g.strokeStyle = '#9fb8cf'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-11, -14); g.lineTo(11, -14); g.lineTo(11, 22); g.quadraticCurveTo(0, 28, -11, 22); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fffbe9'; g.fillRect(-9, -2, 18, 22);
  g.fillStyle = '#7cc0f0'; g.fillRect(-13, -20, 26, 8);
  g.fillStyle = '#f0c27a'; g.beginPath(); g.moveTo(-6, -20); g.quadraticCurveTo(0, -38, 6, -20); g.closePath(); g.fill();
  g.strokeStyle = '#9fb8cf'; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(6, 2 + i * 6); g.lineTo(11, 2 + i * 6); g.stroke(); }
  g.restore();
}
function drawPacifier(g, x, y, k = 1) {
  g.save(); g.translate(x, y); g.scale(k, k);
  g.strokeStyle = '#4fa36b'; g.lineWidth = 4;
  g.beginPath(); g.arc(0, 14, 10, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#7fd1a0';
  g.beginPath(); g.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2d1a0';
  g.beginPath(); g.ellipse(0, -14, 9, 11, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-8, -2, 3, 0, Math.PI * 2); g.fill();
  g.restore();
}
function drawDoudou(g, x, y, k = 1) {
  g.save(); g.translate(x, y); g.scale(k, k);
  g.fillStyle = '#c8935e';
  g.beginPath(); g.arc(-14, -20, 8, 0, Math.PI * 2); g.arc(14, -20, 8, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(0, 12, 16, 16, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(0, -8, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#efd2ad';
  g.beginPath(); g.ellipse(0, -3, 8, 6, 0, 0, Math.PI * 2); g.ellipse(0, 14, 9, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a2a20';
  g.beginPath(); g.arc(-6, -11, 2.2, 0, Math.PI * 2); g.arc(6, -11, 2.2, 0, Math.PI * 2); g.arc(0, -5, 2.4, 0, Math.PI * 2); g.fill();
  g.restore();
}
const DRAW = [drawBottle, drawPacifier, drawDoudou];

export default {
  id: 'naissance_ylan',
  title: 'Ylan, ton premier fils',
  instructions: 'Les nuits blanches commencent : donne vite à Ylan ce que montre sa bulle — biberon, tétine ou doudou — jusqu’à ce qu’il s’endorme.',
  controls: '← ↑ → / clic sur l’objet : biberon · tétine · doudou',
  duration: 12,
  introExpression: 'happy',
  successTitle: 'Il dort enfin…',
  failTitle: 'Qui s’est endormi ?',
  successText: '17 septembre 2003 : ton premier fils est là. Biberon, tétine, doudou… et Ylan s’endort. Chuuut, Papa.',
  failText: 'C’est Papa qui s’est endormi debout, un doudou à la main. Ylan, lui, est en pleine forme. Bienvenue chez les jeunes papas !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const CRIB_X = 470, MATTRESS = 410;
    const s = {
      phase: 'cry', need: 1, prevNeed: -1, needT: 0, limit: 2.4, score: 0, fat: 0,
      calmT: 0, cool: 0, fly: null, shout: 0, wrongT: 0, t: 0, endT: 0, won: false, lost: false,
      minutes: 0, msg: '', msgT: 0,
      stars: Array.from({ length: 22 }, () => ({ x: rand(70, 230), y: rand(95, 225), p: rand(0, 6) })),
    };

    /* ── chambre de nuit, pré-rendue ── */
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    (function paint(c) {
      const w = c.createLinearGradient(0, 0, 0, 440);
      w.addColorStop(0, '#1f2550'); w.addColorStop(1, '#3a3f74');
      c.fillStyle = w; c.fillRect(0, 0, W, 440);
      // papier peint à petites étoiles
      c.fillStyle = 'rgba(255,230,160,0.12)';
      for (let y = 30; y < 430; y += 46) for (let x = 20 + ((y / 46) % 2) * 23; x < W; x += 46) { c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); }
      // fenêtre
      c.fillStyle = '#5a4a6a'; c.fillRect(54, 84, 188, 152);
      c.fillStyle = '#0f1433'; c.fillRect(62, 92, 172, 136);
      c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(190, 130, 20, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#0f1433'; c.beginPath(); c.arc(181, 124, 18, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5a4a6a'; c.fillRect(145, 92, 6, 136); c.fillRect(62, 157, 172, 6);
      // rideaux
      c.fillStyle = '#8a5a8a';
      c.beginPath(); c.moveTo(40, 76); c.quadraticCurveTo(70, 160, 46, 250); c.lineTo(30, 250); c.lineTo(30, 76); c.fill();
      c.beginPath(); c.moveTo(256, 76); c.quadraticCurveTo(226, 160, 250, 250); c.lineTo(266, 250); c.lineTo(266, 76); c.fill();
      // sol
      c.fillStyle = '#5a3f33'; c.fillRect(0, 440, W, H - 440);
      c.fillStyle = '#4c352b'; for (let x = 0; x < W; x += 90) c.fillRect(x, 440, 3, H - 440);
      // tapis rond
      c.fillStyle = '#7a5a9a'; c.beginPath(); c.ellipse(CRIB_X, 452, 230, 22, 0, 0, Math.PI * 2); c.fill();
      // commode + veilleuse
      c.fillStyle = '#c99a6a'; c.fillRect(800, 330, 120, 112);
      c.fillStyle = '#b5845a'; c.fillRect(808, 350, 104, 38); c.fillRect(808, 396, 104, 38);
      c.fillStyle = '#7a5332'; c.fillRect(852, 366, 16, 6); c.fillRect(852, 412, 16, 6);
      const glow = c.createRadialGradient(830, 300, 4, 830, 300, 140);
      glow.addColorStop(0, 'rgba(255,214,140,0.55)'); glow.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = glow; c.fillRect(680, 160, 300, 300);
      c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(830, 312, 18, Math.PI, 0); c.fill(); c.fillRect(812, 312, 36, 18);
      // guirlande « Bienvenue Ylan »
      c.strokeStyle = '#c9b48a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(300, 26); c.quadraticCurveTo(520, 70, 740, 26); c.stroke();
      const letters = 'BIENVENUE YLAN';
      const cols = ['#7fc8e8', '#9ad18b', '#f2b33d', '#e88fb4'];
      for (let i = 0; i < letters.length; i++) {
        const u = (i + 0.5) / letters.length, x = 300 + u * 440, y = 26 + 2 * u * (1 - u) * 44 * 2 * 0.5 + 4;
        if (letters[i] === ' ') continue;
        c.fillStyle = cols[i % 4];
        c.beginPath(); c.moveTo(x - 13, y); c.lineTo(x + 13, y); c.lineTo(x, y + 30); c.closePath(); c.fill();
        c.fillStyle = '#fff'; c.font = '800 12px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(letters[i], x, y + 9);
      }
      // mobile au-dessus du berceau
      c.strokeStyle = '#d9cfa8'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(CRIB_X, 90); c.lineTo(CRIB_X, 112); c.moveTo(CRIB_X - 60, 112); c.lineTo(CRIB_X + 60, 112); c.stroke();
      [[-60, '#f2b33d'], [0, '#7fc8e8'], [60, '#e88fb4']].forEach(([dx, col]) => {
        c.beginPath(); c.moveTo(CRIB_X + dx, 112); c.lineTo(CRIB_X + dx, 132); c.stroke();
        c.fillStyle = col; c.beginPath(); c.arc(CRIB_X + dx, 140, 8, 0, Math.PI * 2); c.fill();
      });
    })(bg.getContext('2d'));

    function newNeed() {
      let n;
      do n = Math.floor(rand(0, 3)); while (n === s.prevNeed);
      s.need = n; s.prevNeed = n;
      s.phase = 'cry'; s.needT = 0;
      s.limit = Math.max(1.6, 2.4 - 0.13 * s.score);
    }
    function tired(text) {
      s.fat++;
      s.minutes += 11;
      s.msg = text; s.msgT = 1;
      api.sfx('ouch');
      api.shake(6);
      if (s.fat >= MAX_FAT) {
        s.lost = true;
        api.end(false, 'C’est Papa qui s’est endormi debout, un doudou à la main. Ylan, lui, est en pleine forme. Bienvenue chez les jeunes papas !');
      }
    }
    function choose(i) {
      if (s.phase !== 'cry' || s.cool > 0) return;
      s.cool = 0.22;
      s.fly = { i, k: 0, ok: i === s.need };
      if (i === s.need) {
        s.score++;
        s.minutes += 7;
        s.phase = 'calm'; s.calmT = 0.5;
        api.sfx('pop');
        api.burst(CRIB_X, 300, { n: 10, shape: 'star', color: ['#ffe9a8', '#ffffff'], speed: 160, gravity: 120, size: 6 });
        if (s.score >= GOAL) {
          s.won = true;
          api.end(true, '17 septembre 2003 : ton premier fils est là. Biberon, tétine, doudou… et Ylan s’endort. Chuuut, Papa.');
        }
      } else {
        s.wrongT = 0.6;
        api.sfx('boing');
        tired(['Non, pas ça !', 'OUIIIN !', 'Mauvaise pioche…'][s.fat % 3]);
      }
    }

    newNeed();

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.cool = Math.max(0, s.cool - dt);
        s.wrongT = Math.max(0, s.wrongT - dt);
        s.msgT = Math.max(0, s.msgT - dt);
        if (s.fly) { s.fly.k += dt * 3.2; if (s.fly.k >= 1) s.fly = null; }
        if (api.ended) { s.endT += dt; return; }

        if (s.phase === 'cry') {
          s.needT += dt;
          if (input.pressed('left')) choose(0);
          else if (input.pressed('up')) choose(1);
          else if (input.pressed('right')) choose(2);
          else if (input.pointer.pressed) choose(input.pointer.x < W / 3 ? 0 : input.pointer.x < (2 * W) / 3 ? 1 : 2);
          if (!api.ended && s.phase === 'cry' && s.needT > s.limit) {
            tired('Trop lent… bâââille');
            if (!api.ended) { s.prevNeed = s.need; newNeed(); }
          }
        } else {
          s.calmT -= dt;
          if (s.calmT <= 0) newNeed();
        }
      },
      timeout() {
        api.end(false, `${s.score} câlins sur ${GOAL}… Ylan a tenu plus longtemps que toi. Le jour se lève, et la nuit blanche continue !`);
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        // étoiles qui scintillent à la fenêtre
        for (const st of s.stars) {
          g.fillStyle = `rgba(255,245,200,${0.4 + 0.6 * Math.abs(Math.sin(s.t * 2 + st.p))})`;
          g.fillRect(st.x, st.y, 2.5, 2.5);
        }
        // réveil sur la commode
        const tot = 2 * 60 + 47 + s.minutes;
        const hh = String(Math.floor(tot / 60) % 24).padStart(2, '0'), mm = String(tot % 60).padStart(2, '0');
        api.roundRect(g, 806, 276, 84, 40, 8); g.fillStyle = '#2a2233'; g.fill();
        api.text(g, `${hh}:${mm}`, 848, 297, { size: 22, color: '#ff6b6b', font: 'monospace', weight: 800 });

        const sleeping = s.won;
        const crying = !sleeping && s.phase === 'cry';
        // berceau : fond
        g.fillStyle = '#e9d6b8'; g.fillRect(CRIB_X - 120, 330, 240, 12);
        g.fillStyle = '#f7f1e6'; g.fillRect(CRIB_X - 112, MATTRESS - 6, 224, 18);
        // Ylan, debout dans son lit, cramponné aux barreaux
        const shakeX = crying ? Math.sin(s.t * 40) * (s.wrongT > 0 ? 3 : 1.2) : 0;
        drawPerson(g, {
          ...PEOPLE.ylan, kind: 'baby', hair: 'bald', shirt: '#9fd6f5', pants: '#9fd6f5',
          x: CRIB_X + shakeX, y: MATTRESS, size: 74, t: s.t,
          pose: sleeping ? 'sit' : 'stand',
          expression: sleeping ? 'sleep' : crying ? (s.wrongT > 0 ? 'angry' : 'worried') : 'love',
          hands: sleeping ? undefined : { l: { x: CRIB_X - 34, y: 344 }, r: { x: CRIB_X + 34, y: 344 } },
        });
        // larmes
        if (crying) {
          g.fillStyle = '#8fd3ff';
          for (const sx of [-1, 1]) {
            const k = (s.t * 2.2 + (sx > 0 ? 0.5 : 0)) % 1;
            g.beginPath(); g.arc(CRIB_X + shakeX + sx * 22, 300 + k * 26, 4, 0, Math.PI * 2); g.fill();
          }
        }
        // barreaux devant
        g.fillStyle = '#d8bf96';
        for (let x = CRIB_X - 112; x <= CRIB_X + 112; x += 22) g.fillRect(x - 3, 340, 6, 84);
        g.fillStyle = '#c9a77a'; g.fillRect(CRIB_X - 126, 334, 252, 12); g.fillRect(CRIB_X - 126, 420, 252, 12);
        g.fillRect(CRIB_X - 130, 320, 12, 132); g.fillRect(CRIB_X + 118, 320, 12, 132);

        // bulle du besoin + patience
        if (crying) {
          const bx = CRIB_X, by = 205;
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(bx, by, 52, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.moveTo(bx - 14, by + 44); g.lineTo(bx + 4, by + 76); g.lineTo(bx + 14, by + 46); g.closePath(); g.fill();
          const left = clamp(1 - s.needT / s.limit, 0, 1);
          g.lineWidth = 7; g.strokeStyle = left > 0.4 ? '#7fd38a' : '#ff7a5a';
          g.beginPath(); g.arc(bx, by, 58, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); g.stroke();
          DRAW[s.need](g, bx, by + 4, 1.45);
          api.text(g, 'OUIN !', CRIB_X + 120 + Math.sin(s.t * 20) * 3, 270, { size: 26 + (s.wrongT > 0 ? 10 : 0), color: '#ffe0e0', stroke: '#000a', weight: 900 });
        } else if (sleeping) {
          api.text(g, 'Chuuut…', CRIB_X, 220, { size: 34, color: '#fff3c4', stroke: '#000a' });
        }

        // Papa en pyjama de nuit blanche
        const fatLook = s.fat / MAX_FAT;
        const asleep = s.lost;
        api.avatar(g, {
          x: 690, y: 446, size: 72, t: s.t,
          pose: s.won ? 'cheer' : 'stand',
          expression: asleep ? 'happy' : s.won ? 'happy' : s.wrongT > 0 ? 'panic' : fatLook > 0.5 ? 'worried' : 'focus',
          tilt: asleep ? 0.45 + Math.sin(s.endT * 2) * 0.05 : fatLook * 0.12 * Math.sin(s.t * 1.5),
          sweat: s.wrongT > 0, lookX: -1,
        });
        if (asleep) {
          for (let k = 0; k < 3; k++) api.text(g, 'Z', 740 + k * 22, 230 - k * 26 - (s.endT * 20) % 20, { size: 22 + k * 8, color: '#cfe0ff', stroke: '#000a' });
        }
        // objet qui vole vers Ylan
        if (s.fly) {
          const it = ITEMS[s.fly.i];
          const k = s.fly.k;
          const fx = api.lerp(it.x, CRIB_X, k), fy = api.lerp(490, 330, k) - Math.sin(k * Math.PI) * 80;
          if (s.fly.ok) DRAW[s.fly.i](g, fx, fy, 1.1);
          else DRAW[s.fly.i](g, api.lerp(CRIB_X, it.x, k), 330 + k * 160 - Math.sin(k * Math.PI) * 60, 1.1);
        }

        // les trois objets (zones de clic)
        for (let i = 0; i < 3; i++) {
          const it = ITEMS[i];
          api.roundRect(g, it.x - 104, 462, 208, 66, 16);
          g.fillStyle = 'rgba(255,248,230,0.92)'; g.fill();
          g.lineWidth = 3; g.strokeStyle = '#c9a77a'; g.stroke();
          DRAW[i](g, it.x - 62, 497, 0.85);
          api.text(g, it.arrow, it.x - 16, 495, { size: 30, color: '#6a4a8a', weight: 900 });
          api.text(g, it.name, it.x + 42, 495, { size: 20, color: '#4a3a3a', weight: 800 });
        }

        // HUD
        api.text(g, `Câlins : ${s.score} / ${GOAL}`, 40, 300, { size: 26, color: '#fff3c4', stroke: '#000a', align: 'left' });
        let zz = 'Fatigue : ';
        for (let k = 0; k < MAX_FAT; k++) zz += k < s.fat ? '● ' : '○ ';
        api.text(g, zz, 40, 340, { size: 24, color: s.fat ? '#ffb3a0' : '#cfe0ff', stroke: '#000a', align: 'left' });
        if (s.msgT > 0 && !api.ended) api.text(g, s.msg, 690, 196 - (1 - s.msgT) * 20, { size: 24, color: '#fff', stroke: '#a0522d' });
        api.text(g, '17/09/2003', 148, 256, { size: 16, color: '#cfc4ff' });
      },
    };
  },
};

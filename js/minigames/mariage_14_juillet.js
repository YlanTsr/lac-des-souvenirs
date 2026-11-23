/**
 * Anecdote — « Le 14 juillet 2001 » (mariage_14_juillet)
 * Papa épouse Eleonora, son étincelle, un soir de 14 juillet : tout le pays tire des feux d'artifice !
 * Mécanique : une fusée monte vers une étoile du grand cœur ; appuyer quand elle traverse
 * l'étoile pour la faire exploser pile là. Allumer les 8 étoiles = le cœur s'illumine.
 * Un appui = une fusée (trop tôt ou trop tard, elle part en fumée) : marteler ne marche pas.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'mariage_14_juillet',
  title: 'Le 14 juillet 2001',
  instructions: 'Fais exploser chaque fusée pile quand elle traverse une étoile, pour dessiner un grand cœur dans le ciel de ton mariage.',
  controls: 'Espace / clic / tap : faire exploser la fusée',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Un cœur dans le ciel !',
  failTitle: 'Feu d’artifice… artistique !',
  successText: 'Le ciel entier a signé ton mariage avec Eleonora, ton étincelle. 14 juillet 2001 : toute la France faisait la fête pour vous deux.',
  failText: 'Le cœur est resté un peu troué… mais la plus belle étincelle de la soirée était à ton bras.',

  create(api) {
    const { W, H, rand } = api;
    const CX = 480, CY = 168, SX = 10.5, SY = 9.2;
    const heart = (t) => ({
      x: CX + SX * 16 * Math.sin(t) ** 3,
      y: CY - SY * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    });
    const stars = [0, 0.75, 1.6, 2.4, Math.PI, -2.4, -1.6, -0.75].map((t) => ({ ...heart(t), lit: false, litT: 0 }));
    const N = stars.length;
    const ACC = 1200, HIT = 36, GROUND = 560;
    const COLORS = [['#ff5a6e', '#ffd0d8'], ['#ffd34d', '#fff4c2'], ['#7fd6ff', '#e6f8ff'], ['#ff9ad5', '#fff'], ['#b6ff8a', '#f4ffe6']];

    const s = {
      t: 0, lit: 0, rocket: null, wait: 0.5, shots: 0, misses: 0, msg: '', msgT: 0,
      duds: [], glow: 0, endT: 0, won: false, hearts: [], nextFw: 0,
    };

    /* ───── décor pré-rendu ───── */
    const SC = 2;
    const bg = document.createElement('canvas');
    bg.width = W * SC; bg.height = H * SC;
    {
      const b = bg.getContext('2d');
      b.scale(SC, SC);
      const sky = b.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0c0f2e'); sky.addColorStop(0.6, '#2a1f55'); sky.addColorStop(1, '#5a3a6a');
      b.fillStyle = sky; b.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) {
        const x = (i * 197.3) % W, y = (i * 83.7) % 360, r = 0.6 + ((i * 7) % 5) * 0.3;
        b.fillStyle = `rgba(255, 255, 240, ${0.3 + ((i * 13) % 7) / 10})`;
        b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill();
      }
      b.fillStyle = '#fff6d8'; b.beginPath(); b.arc(110, 90, 30, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#0c0f2e'; b.beginPath(); b.arc(124, 82, 27, 0, Math.PI * 2); b.fill();
      // toits du village en silhouette
      b.fillStyle = '#1a1433';
      b.beginPath(); b.moveTo(0, H);
      const roofs = [[0, 400], [60, 370], [120, 400], [150, 360], [220, 360], [250, 390], [300, 340], [340, 300], [350, 340], [400, 380], [600, 380], [640, 330], [700, 330], [730, 370], [780, 350], [830, 390], [870, 355], [930, 380], [W, 370]];
      for (const [x, y] of roofs) b.lineTo(x, y);
      b.lineTo(W, H); b.fill();
      b.fillStyle = '#2a2047'; b.fillRect(336, 250, 8, 60); // clocher
      b.beginPath(); b.moveTo(326, 260); b.lineTo(340, 225); b.lineTo(354, 260); b.fill();
      b.fillStyle = 'rgba(255, 210, 120, 0.8)';
      for (const [x, y] of [[80, 410], [180, 395], [270, 405], [660, 360], [690, 395], [800, 400], [890, 410], [320, 360]]) b.fillRect(x, y, 10, 13);
      // place du village
      b.fillStyle = '#2b2240'; b.fillRect(0, 470, W, H - 470);
      // guirlande de fanions bleu-blanc-rouge
      b.strokeStyle = 'rgba(255,255,255,0.5)'; b.lineWidth = 1.5;
      b.beginPath(); b.moveTo(0, 352); b.quadraticCurveTo(W / 2, 420, W, 352); b.stroke();
      const fl = ['#3a5bc7', '#f4f4f4', '#e0303a'];
      for (let i = 0; i < 24; i++) {
        const u = (i + 0.5) / 24, x = u * W;
        const yy = (1 - u) * (1 - u) * 352 + 2 * u * (1 - u) * 420 + u * u * 352;
        b.fillStyle = fl[i % 3];
        b.beginPath(); b.moveTo(x - 9, yy); b.lineTo(x + 9, yy); b.lineTo(x, yy + 16); b.fill();
      }
    }

    function launch() {
      const free = stars.filter((st) => !st.lit);
      if (!free.length) return;
      const target = free[Math.floor(Math.random() * free.length)];
      const apex = target.y - rand(40, 62);
      const vy = -Math.sqrt(2 * ACC * (GROUND - apex));
      s.rocket = { x: target.x + rand(-4, 4), y: GROUND, vy, target, col: COLORS[s.shots % COLORS.length] };
      s.shots++;
      api.sfx('whoosh');
    }

    function explodeAt(x, y, col, big) {
      api.burst(x, y, { n: big ? 34 : 10, color: col, speed: big ? 260 : 90, gravity: big ? 70 : 220, size: big ? 4.5 : 3, life: big ? 1.3 : 0.6, shape: big ? 'star' : 'dot' });
    }

    function shoot() {
      const r = s.rocket;
      if (!r) return;
      s.rocket = null;
      s.wait = 0.22;
      const st = r.target;
      const d = Math.hypot(r.x - st.x, r.y - st.y);
      if (d < HIT && !st.lit) {
        st.lit = true; st.litT = 0;
        s.lit++;
        api.sfx('catch');
        api.shake(4);
        explodeAt(st.x, st.y, r.col, true);
        s.msg = d < HIT * 0.4 ? 'Parfait !' : 'Joli !'; s.msgT = 0.8;
        if (s.lit >= N) {
          s.won = true;
          api.end(true, s.misses <= 1
            ? 'Huit étoiles, huit explosions parfaites : le cœur brille au-dessus de vous. 14 · 07 · 2001, pour toujours.'
            : 'Le grand cœur s’illumine au-dessus de la place : 14 · 07 · 2001. Eleonora, ton étincelle, te serre la main.');
        }
      } else {
        s.misses++;
        api.sfx('pop');
        explodeAt(r.x, r.y, ['#c9c2d8', '#8a829a'], false);
        s.msg = r.y > st.y ? 'Trop tôt !' : 'Trop tard !'; s.msgT = 0.8;
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        for (const st of stars) if (st.lit) st.litT += dt;
        for (let i = s.duds.length - 1; i >= 0; i--) { const d = s.duds[i]; d.vy += 500 * dt; d.y += d.vy * dt; d.life -= dt; if (d.life <= 0) s.duds.splice(i, 1); }
        for (let i = s.hearts.length - 1; i >= 0; i--) { const h = s.hearts[i]; h.y -= 50 * dt; h.life -= dt; if (h.life <= 0) s.hearts.splice(i, 1); }
        if (api.ended) {
          s.endT += dt;
          s.glow = Math.min(1, s.glow + dt * 2);
          s.nextFw -= dt;
          if (s.won && s.nextFw <= 0) {
            s.nextFw = 0.25;
            explodeAt(rand(120, 840), rand(80, 300), COLORS[Math.floor(rand(0, COLORS.length))], true);
            api.sfx('pop');
          }
          if (s.hearts.length < 6 && Math.random() < dt * 5) s.hearts.push({ x: 483 + rand(-20, 20), y: 380, life: 1.4 });
          if (s.rocket) { s.duds.push({ x: s.rocket.x, y: s.rocket.y, vy: 0, life: 0.8 }); s.rocket = null; }
          return;
        }
        const r = s.rocket;
        if (r) {
          r.vy += ACC * dt;
          r.y += r.vy * dt;
          if (r.vy >= 0) {
            // apogée sans explosion : la fusée fait « pschitt » et retombe
            s.duds.push({ x: r.x, y: r.y, vy: 0, life: 0.8 });
            s.rocket = null; s.wait = 0.22; s.misses++;
            s.msg = 'Pschitt…'; s.msgT = 0.7;
            api.sfx('grain');
          }
        } else {
          s.wait -= dt;
          if (s.wait <= 0) launch();
        }
        if (input.pressed()) shoot();
      },
      timeout() {
        api.end(false, s.lit === 0
          ? 'Pas une seule étoile… Pas grave : ce soir-là, toutes tes étoiles étaient dans les yeux d’Eleonora.'
          : `${s.lit} étoiles sur ${N} : un cœur un peu timide, mais un « oui » très sûr. 14 juillet 2001, la plus belle des fêtes.`);
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        const r = s.rocket;

        // le cœur : contour pointillé, puis lumineux à la victoire
        g.save();
        g.beginPath();
        for (let i = 0; i <= 64; i++) { const p = heart((i / 64) * Math.PI * 2); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
        g.closePath();
        if (s.won) {
          g.fillStyle = `rgba(255, 90, 120, ${0.25 * s.glow})`; g.fill();
          g.shadowColor = '#ff6b8a'; g.shadowBlur = 24 * s.glow;
          g.strokeStyle = `rgba(255, 200, 215, ${0.5 + 0.5 * s.glow})`; g.lineWidth = 5; g.stroke();
        } else {
          g.setLineDash([3, 10]); g.strokeStyle = 'rgba(255, 220, 235, 0.25)'; g.lineWidth = 2; g.stroke();
        }
        g.restore();

        // étoiles-cibles
        for (const st of stars) {
          const aimed = r && r.target === st;
          const near = aimed && Math.hypot(r.x - st.x, r.y - st.y) < HIT;
          let R = st.lit ? 13 + Math.sin(s.t * 4 + st.x) * 1.5 : aimed ? 12 : 9;
          if (near) R = 17;
          g.save(); g.translate(st.x, st.y); g.rotate(st.lit ? s.t * 0.6 : 0);
          if (st.lit || near) { g.shadowColor = st.lit ? '#ffd34d' : '#fff'; g.shadowBlur = 18; }
          g.fillStyle = st.lit ? '#ffe27a' : near ? '#ffffff' : aimed ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)';
          g.beginPath();
          for (let k = 0; k < 10; k++) { const rr = k % 2 ? R * 0.45 : R, a = -Math.PI / 2 + (k / 10) * Math.PI * 2; k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          g.closePath(); g.fill();
          g.restore();
          if (aimed && !st.lit) {
            g.strokeStyle = near ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
            g.beginPath(); g.arc(st.x, st.y, HIT, 0, Math.PI * 2); g.stroke();
          }
        }

        // fusée + traînée
        if (r) {
          const len = Math.min(70, -r.vy * 0.07);
          const tr = g.createLinearGradient(r.x, r.y, r.x, r.y + len);
          tr.addColorStop(0, 'rgba(255, 230, 160, 0.9)'); tr.addColorStop(1, 'rgba(255, 150, 80, 0)');
          g.strokeStyle = tr; g.lineWidth = 4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(r.x, r.y); g.lineTo(r.x, r.y + len); g.stroke();
          g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(r.x, r.y, 4.5, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = 'rgba(200, 190, 210, 0.7)';
        for (const d of s.duds) { g.globalAlpha = Math.max(0, d.life); g.beginPath(); g.arc(d.x, d.y, 3, 0, Math.PI * 2); g.fill(); }
        g.globalAlpha = 1;

        // Papa et Maman, main dans la main
        const meet = { x: 484, y: 458 };
        const veilX = 525 + 1.5, veilY = 528 - 4.7 * 31;
        g.fillStyle = 'rgba(255, 255, 255, 0.55)';
        g.beginPath(); g.moveTo(veilX - 26, veilY - 22); g.quadraticCurveTo(veilX - 52, veilY + 50, veilX - 40, veilY + 92);
        g.lineTo(veilX + 40, veilY + 92); g.quadraticCurveTo(veilX + 52, veilY + 50, veilX + 26, veilY - 22); g.closePath(); g.fill();
        const m = drawPerson(g, {
          ...PEOPLE.maman, dress: true, shirt: '#fbfaf5', x: 525, y: 528, size: 62, t: s.t,
          expression: s.won ? 'love' : 'smile', hands: { l: meet, r: { x: 556, y: 450 } },
        });
        // couronne de fleurs + bouquet
        g.fillStyle = '#fff';
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(m.hx + k * 9, m.hy - m.r * 0.9 + Math.abs(k) * 3, 4, 0, Math.PI * 2); g.fill(); }
        for (const [dx, dy, c] of [[0, 0, '#ff8fa8'], [-7, -6, '#fff'], [7, -6, '#ffd0dc'], [-5, 6, '#fff'], [6, 5, '#ff8fa8']]) {
          g.fillStyle = c; g.beginPath(); g.arc(m.handR.x + dx, m.handR.y - 10 + dy, 6, 0, Math.PI * 2); g.fill();
        }
        const p = api.avatar(g, {
          x: 438, y: 528, size: 62, t: s.t, expression: s.won ? 'happy' : 'smile', lookX: 0.3, lookY: -1,
          blush: s.won ? 0.7 : 0.3, hands: { r: meet, l: { x: 398, y: 470 } },
        });
        // nœud papillon
        const bx = p.hx, by = p.hy + p.r * 1.05;
        g.fillStyle = '#1c1c28';
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 11, by - 7); g.lineTo(bx - 11, by + 7); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 11, by - 7); g.lineTo(bx + 11, by + 7); g.closePath(); g.fill();
        g.beginPath(); g.arc(bx, by, 3, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#efc29e'; g.beginPath(); g.arc(meet.x, meet.y, 7, 0, Math.PI * 2); g.fill();

        for (const h of s.hearts) {
          g.globalAlpha = Math.min(1, h.life);
          api.text(g, '♥', h.x, h.y, { size: 22, color: '#ff7a95' });
        }
        g.globalAlpha = 1;

        // HUD
        if (s.won) {
          api.text(g, '14 · 07 · 2001', CX, CY + 40, { size: 44, color: '#fff3f6', stroke: '#c43a5e', strokeWidth: 8, weight: 900 });
        } else {
          api.text(g, `Étoiles du cœur : ${s.lit} / ${N}`, 150, 470, { size: 22, color: '#ffe3ec', stroke: '#000a', weight: 800 });
          if (s.msgT > 0) api.text(g, s.msg, CX, 370, { size: 30, color: '#fff', stroke: '#000a', strokeWidth: 6, weight: 800 });
        }
      },
    };
  },
};

/**
 * « Les truites de Megève » (truites_megeve)
 * Après un lâcher de truites dans le lac, Papa et ses cousins les ont « pêchées »
 * à coups de pierres pour les ramener à Papi et Mami. Version cartoon : les truites
 * sont juste étourdies (des étoiles autour de la tête) et filent dans le seau.
 * Mécanique : viser une truite qui saute (souris ou flèches) et lancer (clic / Espace).
 * Le caillou met un court instant à arriver : il faut viser un peu devant.
 * Recharge courte entre deux lancers (on ne mitraille pas le lac).
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'truites_megeve',
  title: 'Les truites de Megève',
  instructions: 'Lâcher de truites au lac de Megève ! Vise celles qui sautent et lance tes cailloux : 6 truites dans le seau pour Papi et Mami.',
  controls: 'Souris / ← → ↑ ↓ : viser · Clic / Espace : lancer',
  duration: 12,
  introExpression: 'focus',
  successTitle: 'Seau rempli !',
  failTitle: 'Les truites ont filé !',
  successText: 'Six truites dans le seau ! Tu rentres en héros chez Papi et Mami.',
  failText: 'Les truites ont été plus rapides que tes cailloux. Ce soir chez Papi et Mami, ce sera coquillettes !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const LAKE_TOP = 262, LAKE_BOT = 452;
    const GOAL = 6;
    const FLIGHT = 0.2;       // durée du vol d'un caillou (s)
    const RELOAD = 0.42;      // temps pour ramasser un autre caillou
    const HAND = { x: 172, y: 345 };
    const BUCKET = { x: 236, y: 528 };
    const s = {
      t: 0, hits: 0, inBucket: 0, throws: 0, reload: 0, throwAnim: 0, nextSpawn: 0.35,
      fish: [], stones: [], ripples: [], msg: '', msgT: 0, cheer: 0, cx: W / 2, cy: 330,
    };
    const persp = (y) => 0.6 + clamp((y - LAKE_TOP) / (LAKE_BOT - LAKE_TOP), 0, 1) * 0.6;

    // ── décor pré-rendu : montagnes, sapins, lac ──
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const sky = b.createLinearGradient(0, 0, 0, LAKE_TOP);
      sky.addColorStop(0, '#6fb2ea'); sky.addColorStop(1, '#d8ecf7');
      b.fillStyle = sky; b.fillRect(0, 0, W, LAKE_TOP + 2);
      b.fillStyle = '#fff8dc'; b.beginPath(); b.arc(170, 80, 34, 0, Math.PI * 2); b.fill();
      // montagnes enneigées
      const peaks = [[-40, 250, 120, 90, 300, 250], [180, 250, 360, 70, 560, 250], [430, 250, 640, 45, 860, 250], [700, 250, 880, 100, 1020, 250]];
      for (const [x0, y0, px, py, x1, y1] of peaks) {
        b.fillStyle = '#8a9bb3';
        b.beginPath(); b.moveTo(x0, y0); b.lineTo(px, py); b.lineTo(x1, y1); b.fill();
        b.fillStyle = '#f7fbff';
        const k = 0.3;
        b.beginPath(); b.moveTo(px, py);
        b.lineTo(px + (x1 - px) * k, py + (y1 - py) * k);
        b.lineTo(px + (x1 - px) * k * 0.6, py + (y1 - py) * k * 0.8);
        b.lineTo(px, py + (y1 - py) * k * 0.7);
        b.lineTo(px - (px - x0) * k * 0.6, py + (y0 - py) * k * 0.85);
        b.lineTo(px - (px - x0) * k, py + (y0 - py) * k);
        b.closePath(); b.fill();
      }
      // prairie de la rive d'en face + chalet
      b.fillStyle = '#7fae5e'; b.fillRect(0, 238, W, LAKE_TOP - 238 + 2);
      b.fillStyle = '#8a5a34'; b.fillRect(600, 214, 46, 30);
      b.fillStyle = '#5a3a22'; b.beginPath(); b.moveTo(592, 216); b.lineTo(623, 196); b.lineTo(654, 216); b.fill();
      b.fillStyle = '#f2e1a8'; b.fillRect(612, 222, 10, 9); b.fillRect(628, 222, 10, 9);
      // sapins de la rive d'en face
      const fir = (x, y, h, c) => {
        b.fillStyle = '#5a3d26'; b.fillRect(x - h * 0.05, y - h * 0.15, h * 0.1, h * 0.15);
        b.fillStyle = c;
        for (let k = 0; k < 3; k++) {
          const yy = y - h * 0.12 - k * h * 0.27, ww = h * (0.34 - k * 0.08);
          b.beginPath(); b.moveTo(x, yy - h * 0.42); b.lineTo(x - ww, yy); b.lineTo(x + ww, yy); b.fill();
        }
      };
      for (let i = 0; i < 26; i++) { const x = i * 38 + ((i * 17) % 23); if (x > 580 && x < 670) continue; fir(x, 252 + (i % 3) * 4, 34 + ((i * 7) % 16), i % 2 ? '#2f6a3c' : '#28583a'); }
      // lac
      const lake = b.createLinearGradient(0, LAKE_TOP, 0, LAKE_BOT);
      lake.addColorStop(0, '#5fa3c9'); lake.addColorStop(1, '#2f6f98');
      b.fillStyle = lake; b.fillRect(0, LAKE_TOP, W, LAKE_BOT - LAKE_TOP + 10);
      b.fillStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < 40; i++) { const y = LAKE_TOP + 8 + ((i * 37) % (LAKE_BOT - LAKE_TOP - 10)); const x = (i * 131) % W; b.fillRect(x, y, 20 + (y - LAKE_TOP) * 0.25, 2); }
      // rive du premier plan (herbe + galets)
      b.fillStyle = '#7a9a4c';
      b.beginPath(); b.moveTo(0, LAKE_BOT + 6); b.quadraticCurveTo(480, LAKE_BOT - 8, W, LAKE_BOT + 8); b.lineTo(W, H); b.lineTo(0, H); b.fill();
      b.fillStyle = '#a7a394';
      for (let i = 0; i < 30; i++) { b.beginPath(); b.ellipse((i * 97) % W, LAKE_BOT + 14 + ((i * 29) % 70), 9 + (i % 4) * 3, 5 + (i % 3) * 2, 0, 0, Math.PI * 2); b.fill(); }
      // grands sapins sur les côtés
      fir(30, 470, 260, '#2a5e37'); fir(935, 480, 280, '#2a5e37'); fir(880, 470, 180, '#326d40');
    }

    function spawnFish() {
      const y = rand(300, 435), k = persp(y);
      const v = rand(330, 400);
      s.fish.push({ x: rand(290, 830), y, y0: y, k, vx: rand(-70, 70) * k, vy: -v * k, g: 700 * k, state: 'jump', t: 0 });
      s.ripples.push({ x: s.fish[s.fish.length - 1].x, y, r: 4, life: 0.6, k });
    }

    function throwStone(tx, ty) {
      s.throws++;
      s.reload = RELOAD;
      s.throwAnim = 0.25;
      api.sfx('whoosh');
      s.stones.push({ x0: HAND.x, y0: HAND.y, x1: tx, y1: ty, t: 0 });
    }

    function land(st) {
      // touché ? (truite en l'air la plus proche du point d'impact)
      let best = null, bd = 1e9;
      for (const f of s.fish) {
        if (f.state !== 'jump') continue;
        const d = Math.hypot(f.x - st.x1, f.y - 12 * f.k - st.y1);
        if (d < 44 * f.k + 8 && d < bd) { bd = d; best = f; }
      }
      if (best) {
        best.state = 'stunned'; best.t = 0; best.vx = 0; best.vy = Math.max(best.vy, 0);
        s.hits++;
        s.msg = ['Bonk !', 'Toc !', 'Dans le mille !', 'Bing !'][s.hits % 4]; s.msgT = 0.7;
        s.cheer = 0.8;
        api.sfx('clang');
        api.burst(best.x, best.y - 10, { n: 10, shape: 'star', color: ['#ffe14d', '#ffffff'], speed: 170, gravity: 120, size: 8 });
        if (s.hits >= GOAL) api.end(true, s.throws <= GOAL + 2
          ? 'Six truites, presque six cailloux : quel bras ! Papi et Mami n’en reviennent pas.'
          : 'Six truites dans le seau ! Tu rentres en héros chez Papi et Mami.');
      } else if (st.y1 > LAKE_TOP) {
        api.sfx('splat');
        const k = persp(st.y1);
        api.burst(st.x1, st.y1, { n: 8, color: ['#cfeaf7', '#ffffff'], speed: 150 * k, gravity: 500, size: 4 * k, spread: 1.6 });
        s.ripples.push({ x: st.x1, y: st.y1, r: 4, life: 0.7, k });
      } else {
        api.sfx('pop');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.reload = Math.max(0, s.reload - dt);
        s.throwAnim = Math.max(0, s.throwAnim - dt);
        s.msgT = Math.max(0, s.msgT - dt);
        s.cheer = Math.max(0, s.cheer - dt);

        if (!api.ended) {
          s.cx = clamp(input.cursor.x, 0, W); s.cy = clamp(input.cursor.y, 20, H);
          s.nextSpawn -= dt;
          if (s.nextSpawn <= 0 && s.fish.length < 8) { spawnFish(); s.nextSpawn = rand(0.7, 1.1); if (Math.random() < 0.2) spawnFish(); }
          if (input.pressed() && s.reload === 0) throwStone(s.cx, s.cy);
        }

        for (const st of s.stones) {
          st.t += dt;
          if (st.t >= FLIGHT && !st.done) { st.done = true; if (!api.ended) land(st); }
        }
        s.stones = s.stones.filter((st) => !st.done);

        for (const f of s.fish) {
          f.t += dt;
          if (f.state === 'jump') {
            f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt;
            if (f.vy > 0 && f.y >= f.y0) { f.state = 'gone'; s.ripples.push({ x: f.x, y: f.y0, r: 4, life: 0.6, k: f.k }); }
          } else if (f.state === 'stunned') {
            // retombe sur l'eau, flotte un instant (étourdie), puis file au seau
            if (f.y < f.y0) { f.vy += f.g * dt; f.y = Math.min(f.y0, f.y + f.vy * dt); if (f.y >= f.y0) { f.t = 0; s.ripples.push({ x: f.x, y: f.y0, r: 4, life: 0.6, k: f.k }); } }
            else if (f.t > 0.3) { f.state = 'fly'; f.t = 0; f.fx = f.x; f.fy = f.y; }
          } else if (f.state === 'fly') {
            const k = clamp(f.t / 0.5, 0, 1);
            f.x = f.fx + (BUCKET.x - f.fx) * k;
            f.y = f.fy + (BUCKET.y - 40 - f.fy) * k - Math.sin(k * Math.PI) * 140;
            f.k = persp(f.fy) + (1 - persp(f.fy)) * k;
            if (k >= 1) { f.state = 'gone'; s.inBucket++; api.sfx('catch'); }
          }
        }
        s.fish = s.fish.filter((f) => f.state !== 'gone');
        for (const r of s.ripples) { r.life -= dt; r.r += 40 * dt; }
        s.ripples = s.ripples.filter((r) => r.life > 0);
      },
      timeout() {
        api.end(false, s.hits >= 4
          ? `${s.hits} truites sur 6… Presque ! Papi et Mami auront de quoi faire une belle entrée.`
          : 'Les truites ont été plus rapides que tes cailloux. Ce soir chez Papi et Mami, ce sera coquillettes !');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);

        // ronds dans l'eau
        for (const r of s.ripples) {
          g.strokeStyle = `rgba(255,255,255,${clamp(r.life, 0, 0.7)})`; g.lineWidth = 2;
          g.beginPath(); g.ellipse(r.x, r.y, r.r * 1.6 * r.k, r.r * 0.45 * r.k, 0, 0, Math.PI * 2); g.stroke();
        }

        // truites
        for (const f of s.fish) drawTrout(g, f);

        // le cousin qui encourage
        drawPerson(g, { ...PEOPLE.cousine, x: 830, y: 532, size: 54, t: s.t, expression: s.cheer > 0 ? 'laugh' : 'smile', pose: s.cheer > 0 ? 'arms_up' : 'stand' });

        // le seau
        const bx = BUCKET.x, by = BUCKET.y;
        for (let i = 0; i < Math.min(s.inBucket, 6); i++) {
          g.save(); g.translate(bx - 18 + i * 7, by - 44 - (i % 2) * 4); g.rotate(-1.2 + i * 0.35);
          g.fillStyle = '#8fa6a0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-7, -12); g.lineTo(7, -12); g.closePath(); g.fill();
          g.restore();
        }
        g.fillStyle = '#9aa6b2';
        g.beginPath(); g.moveTo(bx - 32, by - 46); g.lineTo(bx + 32, by - 46); g.lineTo(bx + 24, by); g.lineTo(bx - 24, by); g.closePath(); g.fill();
        g.fillStyle = '#b8c3ce'; g.fillRect(bx - 34, by - 50, 68, 7);
        g.strokeStyle = '#6c7682'; g.lineWidth = 3;
        g.beginPath(); g.arc(bx, by - 48, 30, Math.PI, 0); g.stroke();
        api.text(g, String(s.inBucket), bx, by - 22, { size: 20, color: '#33404d', weight: 800 });

        // Papa qui lance
        const a = s.throwAnim / 0.25; // 1 → 0
        const px = 110, py = 532;
        api.avatar(g, {
          x: px, y: py, size: 64, pose: api.ended && s.hits >= GOAL ? 'cheer' : 'stand', t: s.t,
          expression: api.ended ? (s.hits >= GOAL ? 'laugh' : 'worried') : s.cheer > 0 ? 'happy' : 'focus',
          lookX: 1, lookY: -0.3,
          hands: api.ended && s.hits >= GOAL ? undefined : { l: { x: 75, y: 455 }, r: { x: 150 + (1 - a) * 30, y: 330 + (1 - a) * 70 } },
        });

        // cailloux en vol
        for (const st of s.stones) {
          const k = clamp(st.t / FLIGHT, 0, 1);
          const x = st.x0 + (st.x1 - st.x0) * k, y = st.y0 + (st.y1 - st.y0) * k - Math.sin(k * Math.PI) * 60;
          g.fillStyle = '#6f6a62'; g.beginPath(); g.ellipse(x, y, 7 - k * 2, 5.5 - k * 1.5, k * 4, 0, Math.PI * 2); g.fill();
        }

        // viseur (suit le curseur ; rosé pendant la recharge)
        drawCrosshair(g);

        // HUD
        api.text(g, `Truites : ${s.hits} / ${GOAL}`, 30, 34, { size: 26, align: 'left', color: '#fff', stroke: '#000a' });
        for (let i = 0; i < GOAL; i++) {
          g.globalAlpha = i < s.hits ? 1 : 0.3;
          drawMiniTrout(g, 46 + i * 34, 66);
          g.globalAlpha = 1;
        }
        if (s.msgT > 0) api.text(g, s.msg, W / 2, 150 - (0.7 - s.msgT) * 30, { size: 40, color: '#fff7c2', stroke: '#2f5a7a', strokeWidth: 8 });

        // ── sous-fonctions
        function drawCrosshair(c) {
          if (api.ended) return;
          const x = s.cx, y = s.cy;
          const ready = s.reload === 0;
          c.strokeStyle = ready ? '#ffffff' : 'rgba(255,140,120,0.8)'; c.lineWidth = 3;
          c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.stroke();
          c.beginPath(); c.moveTo(x - 26, y); c.lineTo(x - 10, y); c.moveTo(x + 10, y); c.lineTo(x + 26, y);
          c.moveTo(x, y - 26); c.lineTo(x, y - 10); c.moveTo(x, y + 10); c.lineTo(x, y + 26); c.stroke();
          c.fillStyle = ready ? '#ffffff' : 'rgba(255,140,120,0.8)'; c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.fill();
        }
        function drawTrout(c, f) {
          const k = f.k;
          const ang = f.state === 'jump' ? Math.atan2(f.vy, f.vx === 0 ? 0.001 : f.vx) : f.state === 'fly' ? f.t * 12 : 0;
          const flip = f.state === 'jump' ? f.vx < 0 : false;
          c.save();
          c.translate(f.x, f.y - 12 * k);
          c.rotate(flip ? ang + Math.PI : ang);
          c.scale((flip ? -1 : 1) * k, k);
          if (f.state === 'stunned') c.scale(1, -1); // ventre en l'air, façon dessin animé
          // queue
          const wag = f.state === 'jump' ? Math.sin(f.t * 30) * 4 : 0;
          c.fillStyle = '#6f8f86';
          c.beginPath(); c.moveTo(-20, 0); c.lineTo(-36, -11 + wag); c.lineTo(-36, 11 + wag); c.closePath(); c.fill();
          // corps
          c.fillStyle = '#9db8ae'; c.beginPath(); c.ellipse(0, 0, 26, 10, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#e9f2ee'; c.beginPath(); c.ellipse(2, 4, 22, 5, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = 'rgba(230,120,140,0.75)'; c.fillRect(-18, -2, 36, 4);
          c.fillStyle = '#4b5f58';
          for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-14 + i * 6, -6 + (i % 2) * 2, 1.4, 0, Math.PI * 2); c.fill(); }
          c.fillStyle = '#6f8f86'; c.beginPath(); c.moveTo(-4, -9); c.lineTo(4, -15); c.lineTo(8, -9); c.fill();
          // œil
          if (f.state === 'jump') {
            c.fillStyle = '#fff'; c.beginPath(); c.arc(17, -3, 3.4, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#111'; c.beginPath(); c.arc(18, -3, 1.8, 0, Math.PI * 2); c.fill();
          } else {
            c.strokeStyle = '#111'; c.lineWidth = 1.6;
            c.beginPath(); c.moveTo(15, -6); c.lineTo(20, -1); c.moveTo(20, -6); c.lineTo(15, -1); c.stroke();
          }
          c.restore();
          if (f.state === 'stunned') {
            // étoiles qui tournent autour de la tête
            for (let i = 0; i < 3; i++) {
              const an = s.t * 6 + i * 2.1;
              star(c, f.x + Math.cos(an) * 20 * k, f.y - 24 * k + Math.sin(an) * 6 * k, 5 * k);
            }
          }
        }
        function drawMiniTrout(c, x, y) {
          c.fillStyle = '#9db8ae'; c.beginPath(); c.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x - 18, y - 6); c.lineTo(x - 18, y + 6); c.closePath(); c.fill();
          c.fillStyle = 'rgba(230,120,140,0.9)'; c.fillRect(x - 8, y - 1, 16, 2);
        }
        function star(c, x, y, r) {
          c.fillStyle = '#ffe14d';
          c.beginPath();
          for (let k2 = 0; k2 < 10; k2++) { const rr = k2 % 2 ? r * 0.45 : r, an = (k2 / 10) * Math.PI * 2 - Math.PI / 2; k2 ? c.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr) : c.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
          c.closePath(); c.fill();
        }
      },
    };
  },
};

/**
 * Chapitre I — « La mygale évadée » (mygale_evadee)
 * La mygale que Papa gardait dans un bocal s'est échappée et s'est glissée sous le lit de Papi et Mami.
 * Mécanique : vue de dessus. La mygale zigzague vers le lit par petites courses entrecoupées d'arrêts.
 * Déplacer le bocal (souris / flèches) et l'abattre (Espace / clic) sur elle. 4 essais seulement ;
 * si elle atteint le lit, Papi et Mami sautent en l'air !
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'mygale_evadee',
  title: 'La mygale évadée',
  instructions: 'Ta mygale s’est échappée de son bocal et file vers le lit de Papi et Mami : rattrape-la en abattant le bocal sur elle !',
  controls: 'Souris / flèches : viser · Espace / clic : abattre le bocal',
  duration: 11,
  introExpression: 'worried',
  successTitle: 'Mygale rattrapée !',
  failTitle: 'Sous le lit !',
  successText: 'Clac ! La mygale est de retour dans son bocal, un peu vexée. Papi et Mami n’ont rien su… et ont bien dormi.',
  failText: 'La mygale s’est glissée sous le lit… Papi et Mami ont sauté jusqu’au plafond. La nuit a été courte pour tout le monde !',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;
    const BED = { x: 600, y: 96, w: 280, h: 236 };
    const JAR_R = 50, CATCH_R = 44, TRIES = 4;
    const START = { x: 150, y: 470 };
    const s = {
      t: 0, sx: START.x, sy: START.y, ang: -0.5, walk: 0, pause: 0.35, wp: [], wi: 0, speed: 0,
      jx: 480, jy: 300, slam: 0, cool: 0, tries: TRIES, caught: false, reached: false, sprint: false,
      msg: '', msgT: 0, jump: 0,
    };
    // chemin en zigzag jusqu'au lit
    {
      const goal = { x: rand(650, 830), y: BED.y + BED.h + 4 };
      const N = 6;
      for (let k = 1; k < N; k++) {
        const bx = lerp(START.x, goal.x, k / N), by = lerp(START.y, goal.y + 40, k / N);
        const off = (k % 2 ? 1 : -1) * rand(70, 150);
        s.wp.push({ x: clamp(bx + off * 0.55, 90, 880), y: clamp(by + off, 140, 500) });
      }
      s.wp.push(goal, { x: goal.x, y: BED.y + 120 });
    }

    /* ───── chambre vue de dessus, pré-rendue ───── */
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      // parquet
      for (let i = 0; i < 14; i++) {
        b.fillStyle = i % 2 ? '#a8774a' : '#b3825a';
        b.fillRect(0, i * 40, W, 40);
        b.fillStyle = 'rgba(70, 40, 20, 0.25)'; b.fillRect(0, i * 40, W, 2);
        for (let k = 0; k < 4; k++) b.fillRect(((i * 211 + k * 260) % W), i * 40, 2, 40);
      }
      // tapis (motif pagne)
      b.fillStyle = '#c0532f'; b.fillRect(250, 230, 300, 190);
      b.fillStyle = '#f2b33d'; b.fillRect(266, 246, 268, 158);
      b.fillStyle = '#2e6b5a';
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { b.beginPath(); b.arc(290 + i * 44, 270 + j * 38, 10, 0, Math.PI * 2); b.fill(); }
      // le lit (couverture en wax)
      b.fillStyle = 'rgba(0,0,0,0.25)'; b.fillRect(BED.x + 8, BED.y + 10, BED.w, BED.h);
      b.fillStyle = '#5a3a22'; b.fillRect(BED.x - 6, BED.y - 10, BED.w + 12, 22);
      b.fillStyle = '#f4efe6'; b.fillRect(BED.x, BED.y, BED.w, BED.h);
      b.fillStyle = '#3d6fb0'; b.fillRect(BED.x, BED.y + 92, BED.w, BED.h - 92);
      b.fillStyle = '#f2b33d';
      for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) {
        b.beginPath(); b.ellipse(BED.x + 22 + i * 40, BED.y + 118 + j * 44, 13, 9, 0.5, 0, Math.PI * 2); b.fill();
      }
      b.fillStyle = '#e0453c';
      for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) { b.beginPath(); b.arc(BED.x + 22 + i * 40, BED.y + 118 + j * 44, 4, 0, Math.PI * 2); b.fill(); }
      b.fillStyle = '#e8e0d2'; b.fillRect(BED.x, BED.y + 84, BED.w, 14); // drap replié
      // oreillers
      b.fillStyle = '#ffffff';
      for (const px of [BED.x + 30, BED.x + 150]) { b.beginPath(); b.ellipse(px + 50, BED.y + 42, 56, 30, 0, 0, Math.PI * 2); b.fill(); }
      // table de chevet + lampe
      b.fillStyle = '#7a5332'; b.fillRect(520, 96, 64, 60);
      b.fillStyle = 'rgba(255, 220, 140, 0.25)'; b.beginPath(); b.arc(552, 126, 90, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#ffd98a'; b.beginPath(); b.arc(552, 126, 20, 0, Math.PI * 2); b.fill();
      // l'étagère et le bocal renversé
      b.fillStyle = '#6a4a30'; b.fillRect(60, 500, 200, 30);
      b.fillStyle = 'rgba(200, 230, 240, 0.55)'; b.beginPath(); b.ellipse(150, 505, 34, 20, 0.2, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#d9483b'; b.fillRect(186, 496, 10, 20);
      b.fillStyle = '#fff'; b.font = '700 13px sans-serif'; b.textAlign = 'center';
      b.fillText('NE PAS OUVRIR', 160, 524);
      // pénombre de la nuit dans les coins
      const v = b.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 620);
      v.addColorStop(0, 'rgba(20, 10, 40, 0)'); v.addColorStop(1, 'rgba(20, 10, 40, 0.5)');
      b.fillStyle = v; b.fillRect(0, 0, W, H);
    }

    function slamDone() {
      if (api.ended) return;
      const d = Math.hypot(s.sx - s.jx, s.sy - s.jy);
      api.shake(8);
      if (d < CATCH_R) {
        s.caught = true;
        api.sfx('catch');
        api.burst(s.jx, s.jy, { n: 16, shape: 'star', color: ['#ffe27a', '#ffffff'], speed: 230, gravity: 0, size: 7 });
        api.end(true, s.tries === TRIES - 1
          ? 'Clac ! Du premier coup ! La mygale est de retour dans son bocal, un peu vexée. Papi et Mami n’ont rien su.'
          : 'Clac ! La mygale est de retour dans son bocal, un peu vexée. Papi et Mami n’ont rien su… et ont bien dormi.');
        return;
      }
      api.sfx('clang');
      s.cool = 0.4;
      s.msg = s.tries > 0 ? 'Raté !' : 'Plus d’essai !'; s.msgT = 0.8;
      if (s.tries === 0) { s.sprint = true; s.pause = 0; }
      else { s.pause = 0; } // la mygale, effrayée, détale
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.cool = Math.max(0, s.cool - dt);
        if (s.reached) s.jump += dt;

        // le bocal suit le curseur (un peu lourd)
        if (!s.caught) {
          const k = Math.min(1, dt * 14);
          s.jx = lerp(s.jx, clamp(input.cursor.x, 40, W - 40), k);
          s.jy = lerp(s.jy, clamp(input.cursor.y, 40, H - 40), k);
        }
        if (!api.ended && input.pressed() && s.slam === 0 && s.cool === 0 && s.tries > 0) {
          s.slam = 0.14; s.tries--;
          api.sfx('whoosh');
        }
        if (s.slam > 0) { s.slam -= dt; if (s.slam <= 0) { s.slam = 0; slamDone(); } }

        // la mygale
        if (s.caught) return;
        if (s.pause > 0 && !s.sprint) { s.pause -= dt; return; }
        const w = s.wp[Math.min(s.wi, s.wp.length - 1)];
        const dx = w.x - s.sx, dy = w.y - s.sy, d = Math.hypot(dx, dy);
        const sp = s.sprint ? 380 : s.reached ? 160 : 210;
        if (d < 6) {
          if (s.wi < s.wp.length - 1) { s.wi++; if (!s.sprint) s.pause = rand(0.35, 0.65); }
        } else {
          s.ang = Math.atan2(dy, dx);
          const step = Math.min(d, sp * dt);
          s.sx += (dx / d) * step; s.sy += (dy / d) * step;
          s.walk += step;
        }
        if (!s.reached && s.sy < BED.y + BED.h + 2 && s.sx > BED.x && s.sx < BED.x + BED.w) {
          s.reached = true;
          api.sfx('boing'); api.shake(16);
          api.end(false);
        }
      },
      timeout() { s.sprint = true; return false; }, // elle file sous le lit pendant la conclusion
      draw(g) {
        g.drawImage(bg, 0, 0);

        // Papi et Mami endormis… ou qui sautent en l'air
        const jumpH = s.reached ? Math.abs(Math.sin(s.jump * 7)) * 40 + 20 : 0;
        const sz = s.reached ? 60 : 44;
        const expr = s.reached ? 'scared' : 'sleep';
        drawPerson(g, { ...PEOPLE.papi, x: BED.x + 80, y: BED.y + 40 - jumpH, size: sz, body: false, expression: expr, t: s.t });
        drawPerson(g, { ...PEOPLE.mami, x: BED.x + 200, y: BED.y + 40 - jumpH * 1.2, size: sz, body: false, expression: expr, t: s.t });
        if (s.reached) api.text(g, 'AAAAH !', BED.x + 140, BED.y + 150, { size: 54, color: '#fff', stroke: '#8a2b2b', strokeWidth: 9 });

        // la mygale (cachée sous le lit si elle l'a atteint)
        if (!(s.reached && s.sy < BED.y + BED.h - 20)) {
          g.save(); g.translate(s.sx, s.sy); g.rotate(s.ang + Math.PI / 2);
          const ph = s.walk * 0.12;
          g.strokeStyle = '#2a1e1e'; g.lineWidth = 3.5; g.lineCap = 'round'; g.lineJoin = 'round';
          for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
            const a = (-0.9 + k * 0.6) + Math.sin(ph + k * 1.6 + (side > 0 ? Math.PI : 0)) * 0.22;
            const kx = side * Math.cos(a) * 16, ky = Math.sin(a) * 16 - 2;
            g.beginPath(); g.moveTo(side * 6, -4 + k * 3); g.lineTo(kx + side * 6, ky - 6); g.lineTo(kx * 1.7 + side * 6, ky * 1.5 + 4); g.stroke();
          }
          // abdomen poilu + céphalothorax
          g.fillStyle = '#3a2a2a'; g.beginPath(); g.ellipse(0, 12, 13, 16, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#c0703a'; g.beginPath(); g.ellipse(0, 12, 5, 8, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#4a3434'; g.beginPath(); g.ellipse(0, -6, 11, 10, 0, 0, Math.PI * 2); g.fill();
          // gros yeux mignons
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(-5, -10, 5, 0, Math.PI * 2); g.arc(5, -10, 5, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#111';
          g.beginPath(); g.arc(-5, -11, 2.6, 0, Math.PI * 2); g.arc(5, -11, 2.6, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(-4, -12, 1, 0, Math.PI * 2); g.arc(6, -12, 1, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255, 120, 140, 0.5)'; g.beginPath(); g.arc(-8, -3, 2.5, 0, Math.PI * 2); g.arc(8, -3, 2.5, 0, Math.PI * 2); g.fill();
          g.restore();
          if (s.caught) api.text(g, '?!', s.sx + 22, s.sy - 26, { size: 22, color: '#fff', stroke: '#000a', strokeWidth: 4 });
        }

        // le bocal (vu de dessus) : plus gros quand il est levé
        const lift = s.caught ? 0 : s.slam > 0 ? s.slam / 0.14 : s.cool > 0 ? 0.5 + (0.4 - s.cool) * 1.2 : 1;
        const R = JAR_R * (1 + lift * 0.14);
        const ox = lift * 10, oy = lift * 16;
        g.fillStyle = `rgba(0, 0, 0, ${0.18 + (1 - lift) * 0.15})`;
        g.beginPath(); g.arc(s.jx + ox, s.jy + oy, JAR_R * 0.95, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(200, 235, 250, 0.32)';
        g.beginPath(); g.arc(s.jx, s.jy, R, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(235, 250, 255, 0.95)'; g.lineWidth = 6;
        g.beginPath(); g.arc(s.jx, s.jy, R, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(160, 200, 220, 0.8)'; g.lineWidth = 2;
        g.beginPath(); g.arc(s.jx, s.jy, R * 0.82, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 4;
        g.beginPath(); g.arc(s.jx, s.jy, R * 0.65, -2.4, -1.6); g.stroke();
        if (!api.ended && lift > 0.9) { // viseur
          g.strokeStyle = 'rgba(255, 80, 60, 0.6)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(s.jx - 10, s.jy); g.lineTo(s.jx + 10, s.jy); g.moveTo(s.jx, s.jy - 10); g.lineTo(s.jx, s.jy + 10); g.stroke();
        }

        // petit Papa, près de la porte
        const info = api.avatar(g, {
          x: 64, y: 330, size: 52, pose: s.caught ? 'cheer' : 'stand', t: s.t, lookX: 1,
          expression: s.caught ? 'happy' : s.reached ? 'laugh' : s.tries <= 1 ? 'panic' : 'focus', sweat: !api.ended && s.tries <= 2,
        });
        g.fillStyle = '#4a3424';
        g.beginPath(); g.arc(info.hx, info.hy, 27, Math.PI * 1.08, Math.PI * 1.92); g.quadraticCurveTo(info.hx, info.hy - 14, info.hx - 26.5, info.hy - 7); g.fill();

        if (s.msgT > 0) api.text(g, s.msg, s.jx, s.jy - 70, { size: 26, color: '#fff', stroke: '#000a' });
        // HUD
        api.text(g, 'Essais :', 28, 42, { align: 'left', size: 22, color: '#fff', stroke: '#000a' });
        for (let i = 0; i < TRIES; i++) {
          g.fillStyle = i < s.tries ? 'rgba(210, 240, 255, 0.9)' : 'rgba(255,255,255,0.15)';
          g.beginPath(); g.arc(140 + i * 30, 42, 10, 0, Math.PI * 2); g.fill();
        }
        if (api.ended && s.caught) api.text(g, 'Clac ! Attrapée !', W / 2 - 80, 120, { size: 46, color: '#ffe27a', stroke: '#000a', strokeWidth: 8 });
      },
    };
  },
};

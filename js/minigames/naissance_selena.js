/**
 * Anecdote — « Séléna, ta princesse » (naissance_selena)
 * 16 mai 2002 : Papa devient papa pour la première fois, avec sa princesse Séléna.
 * Mécanique : berceuse rythmique. Les notes glissent sur la portée vers le cercle ;
 * appuyer quand une note est dans le cercle berce le berceau. 8 bonnes notes = elle s'endort.
 * Notes ratées et appuis à contretemps la font pleurer (4 = raté… mais Papa fond quand même).
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'naissance_selena',
  title: 'Séléna, ta princesse',
  instructions: 'Berce ta princesse : appuie quand chaque note de la berceuse passe dans le cercle, pour l’endormir tout en douceur.',
  controls: 'Espace / clic / tap : bercer en rythme',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Elle dort, ta princesse…',
  failTitle: 'Ouin ! (et Papa fond)',
  successText: '16 mai 2002 : ta première berceuse, et ta princesse s’endort en souriant. Le plus beau métier du monde commence.',
  failText: 'Elle pleure à pleins poumons… et toi, tu fonds complètement. Bienvenue dans la vie de papa !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const ZX = 190, STAFF_Y = 96, GAP = 16, SPEED = 250, HIT = 40;
    const GOAL = 8, MAX_CRY = 4;
    const CRIB = { x: 520, y: 468 };
    // la berceuse : instants d'arrivée des notes dans le cercle (rythme doux, un peu irrégulier)
    const RHYTHM = [0.85, 0.85, 0.6, 0.6, 1.1, 0.85, 0.85, 1.1, 0.6, 0.6, 0.85, 1.1, 0.85, 0.85];
    const notes = [];
    for (let i = 0, t = 1.7; t < 12.7; t += RHYTHM[i % RHYTHM.length], i++) {
      notes.push({ at: t, line: [4, 3, 2, 3, 4, 5, 3, 2, 1, 2, 3, 4, 2, 3, 5][i % 15], hit: false, miss: false, fly: 0 });
    }
    const s = {
      t: 0, good: 0, cry: 0, rock: 0, amp: 0.02, flash: 0, wrongT: 0, endT: 0, won: false, lost: false,
      msg: '', msgT: 0, hearts: [], twinkle: Array.from({ length: 30 }, (_, i) => ({ x: (i * 173) % 300 + 60, y: (i * 97) % 150 + 220, p: i })),
      notes,
    };

    /* ───── décor pré-rendu ───── */
    const SC = 2;
    const bg = document.createElement('canvas');
    bg.width = W * SC; bg.height = H * SC;
    {
      const b = bg.getContext('2d');
      b.scale(SC, SC);
      const wall = b.createLinearGradient(0, 0, 0, H);
      wall.addColorStop(0, '#2a2552'); wall.addColorStop(1, '#3d3266');
      b.fillStyle = wall; b.fillRect(0, 0, W, H);
      // papier peint à petites étoiles
      b.fillStyle = 'rgba(255, 230, 170, 0.12)';
      for (let i = 0; i < 60; i++) {
        const x = (i * 151) % W, y = 200 + (i * 89) % 260;
        b.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 2.5 : 6, a = (k / 10) * Math.PI * 2; b.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } b.fill();
      }
      // fenêtre : nuit étoilée et lune
      b.fillStyle = '#5a4a7a'; b.fillRect(40, 200, 330, 190);
      const night = b.createLinearGradient(0, 210, 0, 380);
      night.addColorStop(0, '#0c1030'); night.addColorStop(1, '#22306a');
      b.fillStyle = night; b.fillRect(52, 212, 306, 166);
      b.fillStyle = '#fff3c4'; b.beginPath(); b.arc(290, 262, 30, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#0f1436'; b.beginPath(); b.arc(304, 254, 26, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#5a4a7a'; b.fillRect(200, 212, 8, 166);
      // rideaux
      b.fillStyle = '#e8a0b8';
      b.beginPath(); b.moveTo(30, 190); b.quadraticCurveTo(80, 300, 50, 400); b.lineTo(30, 400); b.fill();
      b.beginPath(); b.moveTo(380, 190); b.quadraticCurveTo(330, 300, 360, 400); b.lineTo(380, 400); b.fill();
      // plancher + tapis
      b.fillStyle = '#6a4a3a'; b.fillRect(0, 470, W, H - 470);
      b.fillStyle = '#e8b8c8'; b.beginPath(); b.ellipse(CRIB.x, 505, 250, 28, 0, 0, Math.PI * 2); b.fill();
      // veilleuse
      const glow = b.createRadialGradient(840, 400, 5, 840, 400, 160);
      glow.addColorStop(0, 'rgba(255, 210, 140, 0.45)'); glow.addColorStop(1, 'rgba(255, 210, 140, 0)');
      b.fillStyle = glow; b.fillRect(640, 220, 320, 320);
      b.fillStyle = '#8a6a5a'; b.fillRect(800, 430, 80, 50);
      b.fillStyle = '#ffd99a'; b.beginPath(); b.moveTo(815, 430); b.lineTo(865, 430); b.lineTo(855, 385); b.lineTo(825, 385); b.fill();
      // cadre « 16 · 05 · 2002 »
      b.fillStyle = '#c9a25a'; b.fillRect(640, 230, 120, 90);
      b.fillStyle = '#fbf2e2'; b.fillRect(648, 238, 104, 74);
      b.fillStyle = '#c4507a'; b.font = '700 15px "Nunito Sans", system-ui, sans-serif'; b.textAlign = 'center';
      b.fillText('Séléna', 700, 268); b.fillText('16 · 05 · 2002', 700, 292);
      // portée
      b.fillStyle = 'rgba(20, 16, 50, 0.55)'; api.roundRect(b, 110, STAFF_Y - 30, 690, GAP * 4 + 60, 18); b.fill();
      b.strokeStyle = 'rgba(255, 240, 220, 0.55)'; b.lineWidth = 2;
      for (let k = 0; k < 5; k++) { b.beginPath(); b.moveTo(130, STAFF_Y + k * GAP); b.lineTo(780, STAFF_Y + k * GAP); b.stroke(); }
      b.fillStyle = 'rgba(255, 240, 220, 0.8)'; b.font = '700 72px serif'; b.textAlign = 'center'; b.textBaseline = 'middle';
      b.fillText('𝄞', 145, STAFF_Y + 2 * GAP + 4);
    }

    const noteX = (n) => ZX + (n.at - s.t) * SPEED;
    const noteY = (n) => STAFF_Y + 4 * GAP - n.line * GAP / 2 - GAP;

    function cry(reason) {
      s.cry++;
      s.wrongT = 0.6;
      s.msg = reason; s.msgT = 0.8;
      api.sfx('beep');
      if (s.cry >= MAX_CRY && !api.ended) {
        s.lost = true;
        api.shake(6);
        api.end(false, s.good >= 5
          ? 'Presque endormie… et puis « Ouin ! ». Elle pleure, toi tu fonds : ta princesse a déjà tout compris.'
          : 'Ouin ! Ta princesse a de la voix… Tu la regardes pleurer, complètement fondu. C’est ça, devenir papa.');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.flash = Math.max(0, s.flash - dt * 3);
        s.wrongT = Math.max(0, s.wrongT - dt);
        s.msgT = Math.max(0, s.msgT - dt);
        s.rock += dt * 2.6;
        s.amp = Math.max(0.02, s.amp - dt * 0.03);
        for (const n of notes) if (n.hit) n.fly = Math.min(1, n.fly + dt * 1.6);
        for (let i = s.hearts.length - 1; i >= 0; i--) { const h = s.hearts[i]; h.y -= 45 * dt; h.x += Math.sin(h.y * 0.05) * 0.5; h.life -= dt; if (h.life <= 0) s.hearts.splice(i, 1); }
        if (api.ended) {
          s.endT += dt;
          if (s.hearts.length < 10 && Math.random() < dt * 6) s.hearts.push({ x: s.lost ? 330 + rand(-30, 30) : CRIB.x + rand(-80, 80), y: s.lost ? 250 : 380, life: 1.4 });
          if (s.won) s.amp = Math.max(0.03, s.amp);
          return;
        }
        // notes qui passent sans être jouées
        for (const n of notes) {
          if (!n.hit && !n.miss && noteX(n) < ZX - HIT) { n.miss = true; cry('Raté…'); if (api.ended) return; }
        }
        if (input.pressed()) {
          let best = null, bd = HIT;
          for (const n of notes) { if (n.hit || n.miss) continue; const d = Math.abs(noteX(n) - ZX); if (d < bd) { bd = d; best = n; } }
          if (best) {
            best.hit = true;
            s.good++;
            s.cry = Math.max(0, s.cry - 0.5);
            s.amp = Math.min(0.16, s.amp + 0.05);
            s.flash = 1;
            s.msg = bd < HIT * 0.4 ? 'Parfait' : 'Doux…'; s.msgT = 0.6;
            api.sfx('catch');
            api.burst(ZX, noteY(best), { n: 8, shape: 'star', color: ['#ffe27a', '#ffffff', '#ffb8d0'], speed: 140, gravity: 60, size: 5 });
            if (s.good >= GOAL) {
              s.won = true;
              api.end(true, s.cry === 0
                ? 'Huit notes parfaites : ta princesse s’endort en souriant. 16 mai 2002, le jour où tu es devenu papa.'
                : 'Quelques fausses notes, mais la plus douce des voix : Séléna s’endort en souriant dans tes bras.');
            }
          } else cry('À contretemps !');
        }
      },
      timeout() {
        api.end(false, `${s.good} notes sur ${GOAL} : ta princesse ouvre encore grand les yeux. Elle préfère te regarder… et toi, tu fonds.`);
        s.lost = true;
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        // étoiles qui scintillent dans la fenêtre
        for (const st of s.twinkle) {
          if (st.x > 350 || st.y > 370 || st.y < 214) continue;
          g.fillStyle = `rgba(255, 250, 220, ${0.4 + 0.6 * Math.abs(Math.sin(s.t * 1.5 + st.p))})`;
          g.fillRect(st.x, st.y, 2.5, 2.5);
        }

        // cercle de jeu + notes
        const zr = HIT * 0.8;
        g.strokeStyle = s.flash > 0 ? `rgba(255, 230, 140, ${0.6 + s.flash * 0.4})` : s.wrongT > 0 ? 'rgba(255, 120, 140, 0.9)' : 'rgba(255, 240, 220, 0.7)';
        g.lineWidth = 4;
        g.beginPath(); g.arc(ZX, STAFF_Y + 2 * GAP, zr + s.flash * 6, 0, Math.PI * 2); g.stroke();
        for (const n of notes) {
          let x = noteX(n), y = noteY(n);
          if (x > 800 || x < 100) { if (!n.hit) continue; }
          let alpha = n.miss ? 0.3 : 1;
          if (n.hit) { x = api.lerp(ZX, CRIB.x - 60, n.fly); y = api.lerp(y, 360, n.fly); alpha = 1 - n.fly; if (alpha <= 0) continue; }
          g.globalAlpha = alpha;
          const c = n.hit ? '#ffe27a' : n.miss ? '#9a90b0' : '#fff3d6';
          g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 3;
          g.save(); g.translate(x, y); g.rotate(-0.35);
          g.beginPath(); g.ellipse(0, 0, 9, 6.5, 0, 0, Math.PI * 2); g.fill();
          g.restore();
          g.beginPath(); g.moveTo(x + 8, y - 2); g.lineTo(x + 8, y - 34); g.stroke();
          g.beginPath(); g.moveTo(x + 8, y - 34); g.quadraticCurveTo(x + 20, y - 26, x + 16, y - 16); g.stroke();
          g.globalAlpha = 1;
        }

        // berceau à bascule
        const ang = Math.sin(s.rock) * s.amp;
        g.save();
        g.translate(CRIB.x, CRIB.y); g.rotate(ang);
        g.strokeStyle = '#c99a6a'; g.lineWidth = 9; g.lineCap = 'round';
        g.beginPath(); g.arc(0, -330, 340, Math.PI * 0.39, Math.PI * 0.61); g.stroke();
        g.fillStyle = '#e8c49a';
        api.roundRect(g, -130, -120, 260, 100, 26); g.fill();
        g.fillStyle = '#d4a878'; g.fillRect(-120, -60, 240, 8);
        g.strokeStyle = '#c99a6a'; g.lineWidth = 6;
        for (let k = -100; k <= 100; k += 25) { g.beginPath(); g.moveTo(k, -118); g.lineTo(k, -60); g.stroke(); }
        // oreiller, bébé et couverture
        g.fillStyle = '#fbf6ff'; g.beginPath(); g.ellipse(-62, -112, 46, 20, 0, 0, Math.PI * 2); g.fill();
        g.restore();

        const headLocal = { x: -62, y: -128 };
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const head = { x: CRIB.x + headLocal.x * ca - headLocal.y * sa, y: CRIB.y + headLocal.x * sa + headLocal.y * ca };
        const crying = s.lost || s.cry >= 3 || s.wrongT > 0;
        const sleepy = s.won || s.good >= 6;
        const expr = s.won ? 'sleep' : crying ? 'scared' : s.cry >= 1.5 ? 'worried' : sleepy ? 'sleep' : 'smile';
        const bh = drawPerson(g, { ...PEOPLE.selena, kind: 'baby', hair: 'short', body: false, x: head.x, y: head.y, size: 50, expression: expr, t: s.t, crown: true });
        if (s.won || (sleepy && !crying)) {
          // petit sourire endormi
          g.fillStyle = PEOPLE.selena.skin; g.beginPath(); g.arc(bh.hx, bh.hy + bh.r * 0.85 * 0.48, bh.r * 0.15, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#7a3a30'; g.lineWidth = 2;
          g.beginPath(); g.arc(bh.hx, bh.hy + bh.r * 0.85 * 0.3, bh.r * 0.2, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
        }
        if (crying) {
          g.fillStyle = 'rgba(120, 190, 255, 0.85)';
          for (const sd of [-1, 1]) {
            const ph = (s.t * 2 + (sd > 0 ? 0.5 : 0)) % 1;
            g.beginPath(); g.arc(bh.hx + sd * bh.r * 0.35, bh.hy + bh.r * 0.2 + ph * 22, 3.5, 0, Math.PI * 2); g.fill();
          }
          if (s.lost) api.text(g, 'Ouin !', bh.hx + 70, bh.hy - 40, { size: 30, color: '#ffd0dc', stroke: '#000a', weight: 900 });
        }
        // couverture (par-dessus le corps du bébé)
        g.save();
        g.translate(CRIB.x, CRIB.y); g.rotate(ang);
        g.fillStyle = '#f2a6c2';
        g.beginPath(); g.moveTo(-90, -100); g.quadraticCurveTo(10, -128, 116, -104); g.lineTo(116, -64); g.lineTo(-90, -64); g.closePath(); g.fill();
        g.fillStyle = '#fff';
        for (const [x, y] of [[-40, -88], [10, -96], [60, -90], [96, -80], [-10, -76], [40, -74]]) { g.beginPath(); g.arc(x - 3, y, 3.5, 0, Math.PI * 2); g.arc(x + 3, y, 3.5, 0, Math.PI * 2); g.moveTo(x - 6.5, y + 1); g.lineTo(x, y + 8); g.lineTo(x + 6.5, y + 1); g.fill(); }
        g.restore();

        // mobile au-dessus du berceau
        g.strokeStyle = 'rgba(255, 240, 220, 0.6)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(CRIB.x, 190); g.lineTo(CRIB.x, 214); g.stroke();
        g.beginPath(); g.moveTo(CRIB.x - 70, 214); g.lineTo(CRIB.x + 70, 214); g.stroke();
        for (let k = 0; k < 4; k++) {
          const x = CRIB.x - 60 + k * 40 + Math.sin(s.t * 1.2 + k) * 4, y = 250 + (k % 2) * 16;
          g.beginPath(); g.moveTo(CRIB.x - 60 + k * 40, 214); g.lineTo(x, y - 10); g.stroke();
          g.fillStyle = k % 2 ? '#fff3c4' : '#ffd34d';
          g.beginPath();
          for (let j = 0; j < 10; j++) { const rr = j % 2 ? 4.5 : 11, a = -Math.PI / 2 + (j / 10) * Math.PI * 2 + s.t * 0.5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          g.fill();
        }

        // Papa, la main sur le berceau
        const rim = { x: CRIB.x + (-128) * ca - (-112) * sa, y: CRIB.y + (-128) * sa + (-112) * ca };
        api.avatar(g, {
          x: 318, y: 500, size: 74, t: s.t,
          expression: s.lost ? 'happy' : s.won ? 'happy' : crying ? 'worried' : 'smile',
          blush: s.lost ? 1 : s.won ? 0.6 : 0.25, lookX: 0.9, lookY: 0.4, tilt: 0.08,
          hands: { r: rim, l: { x: 280, y: 420 } },
        });
        for (const h of s.hearts) {
          g.globalAlpha = Math.min(1, h.life);
          api.text(g, '♥', h.x, h.y, { size: 24, color: '#ff8fb0' });
        }
        g.globalAlpha = 1;

        // HUD
        api.text(g, `Berceuse : ${Math.min(s.good, GOAL)} / ${GOAL}`, 470, 210 - 30, { size: 22, color: '#fff3d6', stroke: '#000a', weight: 800 });
        api.text(g, 'Pleurs', 700, 180, { size: 18, color: '#cfe6ff', stroke: '#000a', weight: 800, align: 'right' });
        for (let k = 0; k < MAX_CRY; k++) {
          const full = s.cry >= k + 1 ? 1 : s.cry > k ? 0.5 : 0;
          const x = 720 + k * 22, y = 180;
          g.fillStyle = full ? `rgba(120, 190, 255, ${0.5 + full * 0.5})` : 'rgba(255,255,255,0.2)';
          g.beginPath(); g.moveTo(x, y - 10); g.quadraticCurveTo(x + 8, y + 2, x, y + 8); g.quadraticCurveTo(x - 8, y + 2, x, y - 10); g.fill();
        }
        if (s.msgT > 0 && !api.ended) api.text(g, s.msg, ZX, STAFF_Y + 4 * GAP + 30, { size: 20, color: s.wrongT > 0 ? '#ffb0c0' : '#ffe27a', stroke: '#000a', weight: 800 });
        if (s.won) api.text(g, '16 mai 2002', CRIB.x, 330, { size: 40, color: '#fff3f6', stroke: '#8a3a6a', strokeWidth: 8, weight: 900 });
      },
    };
  },
};

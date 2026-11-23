/**
 * Chapitre I — « Les pétards et les margouillats » (petards_margouillats)
 * Enfant, en Côte d'Ivoire, Papa faisait la guerre aux margouillats avec des pétards.
 * Version douce : AUCUN lézard blessé — le pétard explose en confettis à côté,
 * le margouillat sursaute et détale, vexé mais indemne.
 * Mécanique : maintenir pour allumer la mèche, relâcher pour lancer vers le viseur
 * (souris ou ← →). Trop tôt : le lézard voit le pétard grésiller et s'en va tranquillement.
 * Trop tard : le pétard explose dans la main (visage noirci, cheveux fumants).
 * 5 margouillats effrayés = victoire ; 2 explosions dans la main = échec.
 */

const LEDGE = 252;          // dessus du mur, où les margouillats font leurs pompes
const FUSE = 1.35;          // durée totale de la mèche (s)
const FLY = 0.34;           // durée du vol du pétard (s)
const NOTICE = 0.5;         // temps au sol avant que le lézard repère le pétard (s)
const RADIUS = 82;          // rayon de la frayeur
const GOAL = 5;
const PAPA = { x: 118, y: 512, size: 72 };
const HAND = { x: 168, y: 326 };

let BG = null;
function background(W, H) {
  if (BG) return BG;
  const c = document.createElement('canvas');
  c.width = W * 2; c.height = H * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  const sky = g.createLinearGradient(0, 0, 0, LEDGE);
  sky.addColorStop(0, '#6fbde8'); sky.addColorStop(1, '#fde6b0');
  g.fillStyle = sky; g.fillRect(0, 0, W, LEDGE);
  g.fillStyle = '#fff4c4'; g.beginPath(); g.arc(700, 80, 36, 0, Math.PI * 2); g.fill();
  // feuillages derrière le mur
  g.fillStyle = '#4f9a4a';
  for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(30 + i * 85, 225 - (i % 3) * 18, 50 + (i % 2) * 12, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#3f8a3e';
  for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(70 + i * 97, 240, 36, 0, Math.PI * 2); g.fill(); }
  // toit de tôle au loin
  g.fillStyle = '#a7b0b5'; g.beginPath(); g.moveTo(380, 190); g.lineTo(470, 140); g.lineTo(560, 190); g.closePath(); g.fill();
  // le mur crépi (ocre)
  g.fillStyle = '#e0a868'; g.fillRect(0, LEDGE + 10, W, 480 - LEDGE - 10);
  g.fillStyle = '#c98c4f'; g.fillRect(0, LEDGE, W, 12);
  g.fillStyle = '#f0bd80'; g.fillRect(0, LEDGE - 2, W, 4);
  g.fillStyle = 'rgba(150, 90, 40, 0.18)';
  for (let i = 0; i < 70; i++) { const x = (i * 131) % W, y = LEDGE + 20 + ((i * 47) % 200); g.beginPath(); g.ellipse(x, y, 10 + (i % 5) * 4, 3, 0, 0, Math.PI * 2); g.fill(); }
  // fissures
  g.strokeStyle = 'rgba(110, 60, 25, 0.45)'; g.lineWidth = 2;
  for (const [x, y] of [[330, 280], [610, 300], [820, 350], [470, 400]]) {
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12, y + 18); g.lineTo(x + 4, y + 34); g.lineTo(x + 18, y + 52); g.stroke();
  }
  // bougainvillier qui déborde du mur
  g.fillStyle = '#3d7d36';
  for (const [x, y, r] of [[880, 270, 30], [920, 300, 34], [860, 320, 22], [940, 250, 26]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#e8459a';
  for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(850 + ((i * 37) % 110), 240 + ((i * 29) % 100), 6, 0, Math.PI * 2); g.fill(); }
  // sol de terre rouge
  g.fillStyle = '#b75a33'; g.fillRect(0, 480, W, H - 480);
  g.fillStyle = '#9c4a28';
  for (let i = 0; i < 30; i++) g.fillRect((i * 73) % W, 490 + ((i * 17) % 44), 14, 3);
  BG = c;
  return c;
}

/** Margouillat stylisé : corps bleu, tête orange (le mâle qui fait ses « pompes »). */
function drawLizard(g, L, t) {
  const d = L.dir;
  const push = L.state === 'idle' ? Math.max(0, Math.sin(L.phase + t * 9)) : 0;
  const hop = L.hop > 0 ? -Math.sin((1 - L.hop / 0.35) * Math.PI) * 38 : 0;
  const x = L.x, y = LEDGE + hop;
  const run = L.state === 'walk' || L.state === 'flee' || L.state === 'leave' ? Math.sin(t * 30 + L.phase) : 0;
  g.save();
  g.translate(x, y); g.scale(d, 1);
  // queue
  g.fillStyle = '#5873a8';
  g.beginPath(); g.moveTo(-14, -9); g.quadraticCurveTo(-40, -6 + run * 3, -62, -2); g.lineTo(-14, -4); g.closePath(); g.fill();
  g.fillStyle = '#f08a24';
  g.beginPath(); g.moveTo(-46, -4); g.quadraticCurveTo(-55, -3, -62, -2); g.lineTo(-46, -2); g.closePath(); g.fill();
  // pattes
  g.strokeStyle = '#3f5684'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-10, -7); g.lineTo(-14 + run * 4, 0);
  g.moveTo(-4, -7); g.lineTo(-1 - run * 4, 0);
  g.moveTo(10, -8 - push * 6); g.lineTo(12 + run * 4, 0);
  g.moveTo(16, -9 - push * 7); g.lineTo(19 - run * 4, 0);
  g.stroke();
  // corps (se soulève avec les pompes)
  g.save(); g.translate(2, -9 - push * 4); g.rotate(-push * 0.22);
  g.fillStyle = '#4a69a6';
  g.beginPath(); g.ellipse(0, 0, 20, 7.5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath(); g.ellipse(-2, -3, 12, 2.5, 0, 0, Math.PI * 2); g.fill();
  // tête orange
  g.fillStyle = '#f2902c';
  g.beginPath(); g.ellipse(23, -3, 10, 7, -0.1, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(25, -5, L.scared ? 4 : 2.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#222';
  g.beginPath(); g.arc(26, -5, 1.6, 0, Math.PI * 2); g.fill();
  g.restore();
  g.restore();
}

function drawPetard(g, x, y, rot, fuseFrac, t) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = '#d8332a'; g.fillRect(-10, -4, 20, 8);
  g.fillStyle = '#ffd34d'; g.fillRect(-4, -4, 3, 8); g.fillRect(3, -4, 3, 8);
  g.strokeStyle = '#5a4a3a'; g.lineWidth = 2;
  const fl = 4 + 12 * Math.max(0, fuseFrac);
  g.beginPath(); g.moveTo(10, 0); g.quadraticCurveTo(10 + fl * 0.6, -fl * 0.5, 10 + fl, -fl * 0.2); g.stroke();
  // étincelle au bout de la mèche
  const sx = 10 + fl, sy = -fl * 0.2;
  g.fillStyle = Math.sin(t * 50) > 0 ? '#fff6a0' : '#ffb13d';
  g.beginPath(); g.arc(sx, sy, 3.5 + Math.sin(t * 37) * 1.2, 0, Math.PI * 2); g.fill();
  g.restore();
}

export default {
  id: 'petards_margouillats',
  title: 'Les pétards et les margouillats',
  instructions: 'Maintiens pour allumer la mèche, vise, puis relâche pour lancer le pétard près d’un margouillat : confettis, sursaut, il détale ! Mais ne garde pas le pétard trop longtemps…',
  controls: 'Maintenir puis relâcher Espace / clic : lancer · souris / ← → : viser',
  duration: 12,
  introExpression: 'focus',
  successTitle: 'Les margouillats ont détalé !',
  failTitle: 'PAF… dans la main !',
  successText: 'Cinq margouillats ont fait le saut de leur vie… et sont repartis faire leurs pompes un peu plus loin, sains et saufs.',
  failText: 'Le pétard t’a explosé dans la main : visage tout noir, cheveux qui fument. Les margouillats, eux, n’ont même pas arrêté leurs pompes.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const bg = background(W, H);
    const s = {
      t: 0, aim: 560, hand: null, cool: 0, stun: 0,
      scared: 0, booms: 0, soot: 0, smoke: [],
      petards: [], lizards: [], spawnQ: [], pops: [], msg: '', msgT: 0,
    };
    const free = (x) => s.lizards.every((L) => Math.abs(L.x - x) > 120);
    const pickSpot = () => { for (let k = 0; k < 12; k++) { const x = rand(280, 900); if (free(x)) return x; } return rand(280, 900); };
    function addLizard(enter) {
      const tx = pickSpot();
      const fromRight = Math.random() < 0.7;
      s.lizards.push({
        x: enter ? (fromRight ? W + 70 : -70) : tx, tx, dir: enter ? (fromRight ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1),
        state: enter ? 'walk' : 'idle', timer: rand(1.0, 2.6), phase: rand(0, 6), hop: 0, scared: false, speed: 150,
      });
    }
    for (let i = 0; i < 3; i++) addLizard(false);

    function explode(p) {
      api.sfx('pop');
      api.shake(6);
      api.burst(p.x, p.y, { n: 26, color: ['#ff5a5a', '#ffd34d', '#5ad1ff', '#7fe07a', '#ff8ac2', '#ffffff'], speed: 320, gravity: 380, size: 5, life: 1.1 });
      api.burst(p.x, p.y, { n: 6, shape: 'star', color: ['#ffe14d', '#ffffff'], speed: 160, gravity: 100, size: 8 });
      s.pops.push({ x: p.x, y: p.y - 34, t: 0, txt: 'PAF !' });
      if (api.ended) return;
      let n = 0;
      for (const L of s.lizards) {
        if (L.state === 'flee' || L.state === 'leave') continue;
        if (Math.abs(L.x - p.x) < RADIUS && Math.abs(LEDGE - p.y) < 70) {
          L.state = 'flee'; L.scared = true; L.hop = 0.35; L.dir = L.x >= p.x ? 1 : -1; L.speed = 560;
          s.scared++; n++;
        }
      }
      if (n) {
        api.sfx('boing');
        if (n > 1) { s.msg = 'Doublé !'; s.msgT = 1; }
        if (s.scared >= GOAL) api.end(true);
      }
    }

    function boomInHand() {
      s.hand = null;
      s.booms++;
      s.soot = 1;
      s.stun = 0.8;
      s.cool = 0.5;
      api.sfx('splat');
      api.sfx('ouch');
      api.shake(18);
      api.burst(HAND.x, HAND.y, { n: 22, color: ['#ffd34d', '#ff8a3d', '#555', '#888'], speed: 300, gravity: 300, size: 7 });
      for (let i = 0; i < 6; i++) s.smoke.push({ x: PAPA.x + rand(-30, 30), y: PAPA.y - 190, t: rand(0, 0.6), life: rand(1.2, 1.8) });
      s.pops.push({ x: HAND.x + 20, y: HAND.y - 40, t: 0, txt: 'BOUM !' });
      if (s.booms >= 2) api.end(false);
      else { s.msg = 'Trop long ! Relâche avant la fin de la mèche'; s.msgT = 1.6; }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.cool = Math.max(0, s.cool - dt);
        s.stun = Math.max(0, s.stun - dt);
        s.msgT = Math.max(0, s.msgT - dt);
        for (const p of s.pops) p.t += dt;
        s.pops = s.pops.filter((p) => p.t < 0.9);
        for (const m of s.smoke) { m.t += dt; m.y -= 30 * dt; }
        s.smoke = s.smoke.filter((m) => m.t < m.life);
        if (s.soot > 0 && s.smoke.length < 6 && Math.random() < dt * 3) s.smoke.push({ x: PAPA.x + rand(-28, 28), y: PAPA.y - 185, t: 0, life: rand(1, 1.6) });

        s.aim = clamp(input.cursor.x, 250, 920);

        // ── allumer / tenir / lancer
        if (!api.ended && s.stun <= 0) {
          if (!s.hand && s.cool <= 0 && input.pressed()) { s.hand = { fuse: FUSE }; api.sfx('grain'); }
          if (s.hand) {
            s.hand.fuse -= dt;
            if (s.hand.fuse <= 0) boomInHand();
            else if (!input.held()) {
              const T = FLY, G = 2400;
              const dx = s.aim - HAND.x, dy = LEDGE - 6 - HAND.y;
              s.petards.push({ x: HAND.x, y: HAND.y, vx: dx / T, vy: (dy - 0.5 * G * T * T) / T, g: G, fly: T, fuse: s.hand.fuse, ground: 0, rot: 0, noticed: false });
              s.hand = null;
              s.cool = 0.3;
              api.sfx('whoosh');
            }
          }
        }

        // ── pétards lancés
        for (let i = s.petards.length - 1; i >= 0; i--) {
          const p = s.petards[i];
          p.fuse -= dt;
          if (p.fly > 0) {
            p.fly -= dt;
            p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 14;
            if (p.fly <= 0) { p.y = LEDGE - 6; p.rot = 0; api.sfx('grain'); }
          } else {
            p.ground += dt;
            if (!p.noticed && p.ground > NOTICE && !api.ended) {
              p.noticed = true;
              let n = 0;
              for (const L of s.lizards) {
                if ((L.state === 'idle' || L.state === 'walk') && Math.abs(L.x - p.x) < RADIUS + 30) {
                  L.state = 'leave'; L.dir = L.x >= p.x ? 1 : -1; L.speed = 260; n++;
                }
              }
              if (n) { s.msg = 'Trop tôt : il a vu la mèche et s’en va…'; s.msgT = 1.3; }
            }
          }
          if (p.fuse <= 0) { explode(p); s.petards.splice(i, 1); }
        }

        // ── margouillats
        for (let i = s.lizards.length - 1; i >= 0; i--) {
          const L = s.lizards[i];
          L.hop = Math.max(0, L.hop - dt);
          if (L.state === 'idle') {
            L.timer -= dt;
            if (L.timer <= 0) { L.tx = pickSpot(); L.dir = L.tx > L.x ? 1 : -1; L.state = 'walk'; }
          } else if (L.state === 'walk') {
            const d = L.tx - L.x;
            if (Math.abs(d) < 4) { L.state = 'idle'; L.timer = rand(1.3, 2.8); }
            else { L.dir = Math.sign(d); L.x += L.dir * Math.min(Math.abs(d), L.speed * dt); }
          } else {
            if (L.hop <= 0.1) L.x += L.dir * L.speed * dt;
            if (L.x < -90 || L.x > W + 90) {
              s.lizards.splice(i, 1);
              if (!api.ended) s.spawnQ.push(rand(0.5, 1.0));
            }
          }
        }
        for (let k = s.spawnQ.length - 1; k >= 0; k--) {
          s.spawnQ[k] -= dt;
          if (s.spawnQ[k] <= 0) { s.spawnQ.splice(k, 1); addLizard(true); }
        }
      },
      timeout() {
        if (s.scared < GOAL) api.end(false, `${s.scared} margouillat${s.scared > 1 ? 's' : ''} effrayé${s.scared > 1 ? 's' : ''} seulement : les autres continuent leurs pompes, imperturbables. Ils sont en meilleure forme que toi !`);
        return s.scared >= GOAL;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);

        // viseur sur le mur
        if (!api.ended) {
          const pulse = 1 + 0.06 * Math.sin(s.t * 8);
          g.strokeStyle = 'rgba(255, 255, 255, 0.75)'; g.lineWidth = 2; g.setLineDash([8, 6]);
          g.beginPath(); g.ellipse(s.aim, LEDGE - 4, RADIUS * pulse, 22 * pulse, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
          g.strokeStyle = '#fff'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(s.aim - 10, LEDGE - 4); g.lineTo(s.aim + 10, LEDGE - 4); g.moveTo(s.aim, LEDGE - 14); g.lineTo(s.aim, LEDGE + 6); g.stroke();
        }

        for (const L of s.lizards) {
          drawLizard(g, L, s.t);
          if (L.scared && L.x > -40 && L.x < W + 40) api.text(g, '!', L.x, LEDGE - 52, { size: 30, color: '#fff', stroke: '#c0392b', weight: 900 });
        }

        // pétards en vol / qui grésillent
        for (const p of s.petards) {
          drawPetard(g, p.x, p.y, p.rot, p.fuse / FUSE, s.t);
          if (p.fly <= 0 && Math.random() < 0.6) {
            g.fillStyle = '#ffe58a';
            g.beginPath(); g.arc(p.x + 14 + rand(-4, 4), p.y - 4 + rand(-6, 2), 1.8, 0, Math.PI * 2); g.fill();
          }
        }

        // Papa
        const holding = !!s.hand;
        const fuseLeft = holding ? s.hand.fuse / FUSE : 1;
        const info = api.avatar(g, {
          x: PAPA.x, y: PAPA.y, size: PAPA.size, t: s.t,
          pose: api.ended && s.scared >= GOAL ? 'cheer' : 'stand',
          expression: s.stun > 0 ? 'surprised' : api.ended ? (s.scared >= GOAL ? 'laugh' : 'surprised') : holding ? (fuseLeft < 0.3 ? 'panic' : 'focus') : 'happy',
          sweat: holding && fuseLeft < 0.4, lookX: 1, lookY: -0.6,
          hands: api.ended && s.scared >= GOAL ? undefined : { l: { x: PAPA.x - 20, y: PAPA.y - 110 }, r: { x: HAND.x, y: HAND.y } },
        });
        // visage noirci façon dessin animé
        if (s.soot > 0) {
          const { hx, hy, r } = info;
          g.fillStyle = 'rgba(45, 38, 36, 0.78)';
          g.beginPath(); g.ellipse(hx, hy + r * 0.05, r * 0.98, r, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fff';
          for (const sx of [-1, 1]) { g.beginPath(); g.arc(hx + sx * r * 0.34, hy - r * 0.04, r * 0.15, 0, Math.PI * 2); g.fill(); }
          g.fillStyle = '#222';
          for (const sx of [-1, 1]) { g.beginPath(); g.arc(hx + sx * r * 0.34 + 2, hy - r * 0.04, r * 0.06, 0, Math.PI * 2); g.fill(); }
          g.strokeStyle = '#fff'; g.lineWidth = 2;
          g.beginPath(); g.arc(hx, hy + r * 0.48, r * 0.16, 0.1, Math.PI - 0.1); g.stroke();
          // cheveux ébouriffés
          g.strokeStyle = '#3a3330'; g.lineWidth = 2.5;
          for (let k = -3; k <= 3; k++) {
            const a = -Math.PI / 2 + k * 0.32;
            g.beginPath(); g.moveTo(hx + Math.cos(a) * r * 0.95, hy + Math.sin(a) * r * 0.95);
            g.lineTo(hx + Math.cos(a) * r * 1.25 + Math.sin(s.t * 20 + k) * 2, hy + Math.sin(a) * r * 1.25); g.stroke();
          }
        }
        // fumée
        for (const m of s.smoke) {
          const a = Math.max(0, 1 - m.t / m.life);
          g.fillStyle = `rgba(120, 120, 120, ${0.5 * a})`;
          g.beginPath(); g.arc(m.x + Math.sin(m.t * 4 + m.x) * 6, m.y, 8 + m.t * 10, 0, Math.PI * 2); g.fill();
        }
        // le pétard dans la main + la jauge de mèche
        if (holding) {
          drawPetard(g, HAND.x + 4, HAND.y - 8, -0.5, fuseLeft, s.t);
          const bx = 60, by = 118, bw = 200;
          api.roundRect(g, bx - 4, by - 4, bw + 8, 22, 8); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
          // zone idéale de lâcher
          const z0 = 1 - (FLY + NOTICE) / FUSE, z1 = 1 - 0.24 / FUSE;
          g.fillStyle = 'rgba(110, 220, 120, 0.55)'; g.fillRect(bx + z0 * bw, by, (z1 - z0) * bw, 14);
          g.fillStyle = 'rgba(230, 70, 60, 0.6)'; g.fillRect(bx + z1 * bw, by, (1 - z1) * bw, 14);
          const burnt = 1 - fuseLeft;
          g.fillStyle = '#fff3c4'; g.fillRect(bx, by + 4, burnt * bw, 6);
          g.fillStyle = '#ffb13d'; g.beginPath(); g.arc(bx + burnt * bw, by + 7, 7, 0, Math.PI * 2); g.fill();
          api.text(g, 'Mèche', bx, by - 16, { size: 16, align: 'left', color: '#fff', stroke: '#000a', strokeWidth: 4 });
        }

        for (const p of s.pops) {
          const a = Math.max(0, 1 - p.t / 0.9);
          api.text(g, p.txt, p.x, p.y - p.t * 30, { size: 30 + p.t * 16, color: `rgba(255, 250, 220, ${a})`, stroke: `rgba(150, 40, 20, ${a})`, weight: 900 });
        }
        if (s.msgT > 0) api.text(g, s.msg, W / 2 + 60, 190, { size: 26, color: '#fff', stroke: '#7a3a10' });

        // HUD
        api.text(g, `Margouillats effrayés : ${s.scared} / ${GOAL}`, 40, 42, { size: 26, align: 'left', color: '#fff6dc', stroke: '#000a' });
        api.text(g, `Pétards dans la main : ${'●'.repeat(s.booms)}${'○'.repeat(Math.max(0, 2 - s.booms))}`, 40, 76, { size: 19, align: 'left', color: s.booms ? '#ffb0a0' : '#fff6dc', stroke: '#000a', strokeWidth: 5 });
      },
    };
  },
};

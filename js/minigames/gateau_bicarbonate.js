/**
 * Anecdote #5 — « Le gâteau au bicarbonate » (gateau_bicarbonate)
 * 2 cuillères à SOUPE de bicarbonate au lieu de 2 cuillères à CAFÉ…
 * Mécanique : la pâte gonfle de plus en plus vite ; tapoter (Espace / clic) pour
 * la tasser avec la spatule et tenir jusqu'à la fin de la cuisson sans débordement.
 */

export default {
  id: 'gateau_bicarbonate',
  title: 'Le gâteau au bicarbonate',
  instructions: '2 cuillères à SOUPE de bicarbonate au lieu de 2 cuillères à CAFÉ… La pâte gonfle à toute vitesse ! Tapote pour la tasser avec la spatule jusqu’à la fin de la cuisson.',
  controls: 'Tapoter Espace / clic / tap : tasser la pâte',
  duration: 12,
  introExpression: 'surprised',
  successTitle: 'Gâteau (presque) maîtrisé !',
  failTitle: 'La pâte a gagné !',

  create(api) {
    const { W, H, rand } = api;
    const MOLD_X = 400, MOLD_Y = 400, MOLD_W = 250;
    const LIMIT = 232; // au-delà : débordement
    const s = {
      level: 30, push: 0, overflow: false, overT: 0, t: 0, presses: 0,
      bubbles: Array.from({ length: 14 }, () => ({ x: rand(-1, 1), y: rand(0, 1), r: rand(4, 11), p: rand(0, 6) })),
      splats: [],
    };
    const growth = (t) => 150 + 5.5 * t + 0.32 * t * t; // px/s, de plus en plus rapide

    function overflow() {
      s.overflow = true;
      api.sfx('splat');
      api.shake(18);
      for (let i = 0; i < 4; i++) api.burst(MOLD_X + rand(-120, 120), MOLD_Y - LIMIT, { n: 22, color: ['#f3d9a4', '#ecc98a', '#fbe8c2'], speed: 520, gravity: 650, size: 10, life: 1.4 });
      for (let i = 0; i < 14; i++) s.splats.push({ x: rand(40, W - 40), y: rand(40, 380), r: rand(14, 40) });
      api.end(false, 'BLOUP ! La pâte a débordé du moule, du four, et un peu de la cuisine. Le gâteau avait au moins le mérite d’être… aérien.');
    }

    return {
      update(dt, input) {
        s.t += dt;
        s.push = Math.max(0, s.push - dt * 5);
        if (!api.ended) {
          s.level += growth(s.t) * dt;
          if (input.pressed()) {
            s.level = Math.max(18, s.level - 25);
            s.push = 1;
            s.presses++;
            api.sfx('boing');
            api.burst(MOLD_X + rand(-60, 60), MOLD_Y - s.level, { n: 5, color: '#fbe8c2', speed: 120, gravity: 300, size: 5 });
          }
          if (s.level > LIMIT) overflow();
        } else if (s.overflow) {
          s.level = Math.min(LIMIT + 120, s.level + 160 * dt);
        }
        for (const b of s.bubbles) { b.y += dt * 0.25; if (b.y > 1) { b.y = 0; b.x = rand(-1, 1); } }
      },
      timeout() {
        api.end(true, s.level > LIMIT * 0.75
          ? 'Ding ! Cuisson terminée de justesse : le gâteau fait la taille d’un pouf, mais il est resté dans le moule. Victoire !'
          : 'Ding ! Pâte domptée, gâteau sauvé. Et cette fois, on vérifie la cuillère avant de verser !');
        return true;
      },
      draw(g) {
        // cuisine
        g.fillStyle = '#f4efe6'; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(150, 180, 200, 0.35)'; g.lineWidth = 2;
        for (let y = 0; y < 410; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 410); g.stroke(); }
        // minuteur de cuisson
        const left = Math.ceil(api.timeLeft);
        api.roundRect(g, 60, 40, 170, 80, 16); g.fillStyle = '#333a44'; g.fill();
        api.text(g, `00:${String(left).padStart(2, '0')}`, 145, 82, { size: 40, color: left <= 3 ? '#ff6b6b' : '#7fffb0', weight: 800, font: 'monospace' });
        api.text(g, 'CUISSON', 145, 136, { size: 14, color: '#6b7380' });
        // plan de travail
        g.fillStyle = '#b98a5a'; g.fillRect(0, MOLD_Y, W, 20);
        g.fillStyle = '#8f6440'; g.fillRect(0, MOLD_Y + 20, W, H);
        // boîte de bicarbonate + cuillère à soupe (la coupable)
        api.roundRect(g, 70, 300, 90, 100, 8); g.fillStyle = '#f5f8ff'; g.fill();
        g.fillStyle = '#e8453c'; g.fillRect(70, 322, 90, 30);
        api.text(g, 'BICARBONATE', 115, 337, { size: 11, color: '#fff', weight: 800 });
        g.fillStyle = '#c0c6cf';
        g.beginPath(); g.ellipse(225, 388, 34, 14, 0, 0, Math.PI * 2); g.fill();
        g.fillRect(255, 382, 70, 8);
        api.text(g, 'c. à SOUPE', 230, 362, { size: 13, color: '#8a2b2b', weight: 800 });

        // éclaboussures de pâte (si débordement)
        g.fillStyle = '#f3d9a4';
        for (const p of s.splats) { g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); }

        // ligne de danger
        g.setLineDash([10, 8]); g.strokeStyle = 'rgba(220, 60, 60, 0.6)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(MOLD_X - 200, MOLD_Y - LIMIT); g.lineTo(MOLD_X + 200, MOLD_Y - LIMIT); g.stroke(); g.setLineDash([]);
        api.text(g, 'débordement', MOLD_X + 250, MOLD_Y - LIMIT, { size: 14, color: 'rgba(200,50,50,0.8)' });

        // la pâte (bosselée, avec des bulles), au-dessus du moule
        const L = s.level * (1 - s.push * 0.06);
        const half = MOLD_W / 2 + Math.max(0, L - 90) * 0.35; // elle déborde sur les côtés en montant
        g.fillStyle = '#f3d9a4';
        g.beginPath();
        g.moveTo(MOLD_X - MOLD_W / 2, MOLD_Y - 50);
        g.quadraticCurveTo(MOLD_X - half - 10, MOLD_Y - 50 - L * 0.5, MOLD_X - half * 0.6, MOLD_Y - 50 - L * 0.9);
        for (let k = 0; k <= 6; k++) {
          const px = MOLD_X - half * 0.6 + (k / 6) * half * 1.2;
          const py = MOLD_Y - 50 - L - Math.sin(k * 1.9 + s.t * 4) * 6 - (k % 2) * 10;
          g.lineTo(px, py);
        }
        g.quadraticCurveTo(MOLD_X + half + 10, MOLD_Y - 50 - L * 0.5, MOLD_X + MOLD_W / 2, MOLD_Y - 50);
        g.closePath(); g.fill();
        g.fillStyle = 'rgba(255, 250, 235, 0.7)';
        for (const b of s.bubbles) {
          const bx = MOLD_X + b.x * half * 0.7, by = MOLD_Y - 50 - b.y * L * 0.9;
          g.beginPath(); g.arc(bx, by, b.r * (0.7 + 0.3 * Math.sin(s.t * 5 + b.p)), 0, Math.PI * 2); g.fill();
        }
        // moule
        g.fillStyle = '#9aa3ad';
        g.beginPath();
        g.moveTo(MOLD_X - MOLD_W / 2 - 8, MOLD_Y - 56); g.lineTo(MOLD_X + MOLD_W / 2 + 8, MOLD_Y - 56);
        g.lineTo(MOLD_X + MOLD_W / 2 - 12, MOLD_Y); g.lineTo(MOLD_X - MOLD_W / 2 + 12, MOLD_Y); g.closePath(); g.fill();
        g.fillStyle = '#c3cad2'; g.fillRect(MOLD_X - MOLD_W / 2 - 10, MOLD_Y - 60, MOLD_W + 20, 8);

        // Papa et sa spatule
        const topY = MOLD_Y - 50 - L;
        const spX = MOLD_X + 40, spY = topY - 6 + s.push * 14;
        // Papa tend les bras vers la pâte ; la longue spatule relie ses mains à la pâte
        const info = api.avatar(g, {
          x: 660, y: 470, size: 66, pose: 'stand',
          expression: api.ended ? (s.overflow ? 'laugh' : 'happy') : s.level > LIMIT * 0.72 ? 'panic' : 'focus',
          sweat: s.level > LIMIT * 0.6 && !api.ended, lookX: -1, lookY: 0.4,
          hands: { l: { x: 560, y: spY - 10 + s.push * 10 }, r: { x: 580, y: spY + 10 + s.push * 10 } },
        });
        const hand = info.hands.l;
        g.strokeStyle = '#7a5130'; g.lineWidth = 10; g.lineCap = 'round';
        g.beginPath(); g.moveTo(hand.x + 6, hand.y); g.lineTo(spX + 40, spY - 4); g.stroke();
        g.fillStyle = '#d0d6de';
        g.save(); g.translate(spX + 10, spY); g.rotate(-0.08);
        api.roundRect(g, -55, -8, 110, 16, 8); g.fill();
        g.restore();
        // les mains par-dessus le manche
        g.fillStyle = '#efc29e';
        for (const h of [info.hands.l, info.hands.r]) { g.beginPath(); g.arc(h.x, h.y, 7, 0, Math.PI * 2); g.fill(); }

        if (!api.ended && s.level > LIMIT * 0.72) api.text(g, 'Ça monte !!!', MOLD_X, 120, { size: 40, color: '#e8453c', stroke: '#fff', strokeWidth: 8 });
        if (s.overflow) api.text(g, 'BLOUP !', W / 2, 200, { size: 80, color: '#fff3d6', stroke: '#c98a3a', strokeWidth: 12 });
      },
    };
  },
};

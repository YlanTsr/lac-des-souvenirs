/**
 * « Les savons gourmands » (savons_gourmands)
 * Maman avait offert à Papa de jolis savons parfumés… qu'il a mangés, croyant à des bonbons.
 * Mécanique : sur une assiette tournante, bonbons et savons se ressemblent beaucoup ;
 * viser et cliquer pour manger les vrais bonbons (indices : les savons font des bulles et
 * portent une petite étiquette « Lavande », les bonbons scintillent de sucre).
 * 6 bonbons = victoire ; 2 savons avalés = échec (bulles par la bouche).
 */
export default {
  id: 'savons_gourmands',
  title: 'Les savons gourmands',
  instructions: 'Mange 6 vrais bonbons sur l’assiette sans croquer dans les savons parfumés de Maman (eux font des bulles et portent une étiquette) !',
  controls: 'Clic / tap : manger · ou flèches pour viser + Espace',
  duration: 12,
  introExpression: 'happy',
  successTitle: 'Gourmand… mais malin !',
  failTitle: 'Haleine fraîche garantie !',
  successText: 'Six bonbons savourés, zéro savon croqué : les cadeaux de Maman sont saufs… cette fois-ci.',
  failText: 'Deux savons avalés : tu fais des bulles en parlant et tu sens bon la lavande. Haleine fraîche garantie !',

  create(api) {
    const { W, H, rand } = api;
    const PCX = 575, PCY = 300, PR = 205;
    const GOAL = 6, MAX_SOAP = 2, HIT = 32;
    const PASTELS = ['#f6b7c8', '#c9b3f0', '#b5e3c8', '#ffe0a3', '#a9d8f5', '#f9c9a6'];
    const SCENTS = ['Lavande', 'Rose', 'Vanille', 'Amande'];
    const slots = [];
    for (let i = 0; i < 8; i++) slots.push({ a: (i / 8) * Math.PI * 2, d: 150 });
    for (let i = 0; i < 4; i++) slots.push({ a: (i / 4) * Math.PI * 2 + 0.4, d: 66 });

    const s = {
      t: 0, rot: 0, candies: 0, soaps: 0, cooldown: 0, items: [], flying: [], bubbles: [],
      msg: '', msgT: 0, msgGood: true, chew: 0, outcome: null, cursor: { x: PCX, y: PCY },
    };
    const newItem = (slot, kind) => ({
      slot, kind, shape: Math.floor(rand(0, 3)), color: PASTELS[Math.floor(rand(0, PASTELS.length))],
      scent: SCENTS[Math.floor(rand(0, SCENTS.length))], bubbleT: rand(0.3, 2), refill: 0, seed: rand(0, 6.28), tilt: rand(-0.4, 0.4),
    });
    {
      const kinds = ['bonbon', 'savon', 'bonbon', 'savon', 'bonbon', 'savon', 'bonbon', 'savon', 'bonbon', 'savon', 'bonbon', 'bonbon'];
      for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      slots.forEach((sl, i) => s.items.push(newItem(i, kinds[i])));
    }
    const posOf = (it) => { const sl = slots[it.slot]; const a = sl.a + s.rot; return { x: PCX + Math.cos(a) * sl.d, y: PCY + Math.sin(a) * sl.d * 0.82 }; };

    // ── décor précalculé : table, nappe, boîte cadeau de Maman
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      g.fillStyle = '#f3e3c8'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(200, 120, 90, 0.18)';
      for (let x = 0; x < W; x += 48) g.fillRect(x, 0, 24, H);
      for (let y = 0; y < H; y += 48) g.fillRect(0, y, W, 24);
      // ombre et assiette
      g.fillStyle = 'rgba(90, 60, 30, 0.18)'; g.beginPath(); g.ellipse(PCX + 8, PCY + 14, PR + 6, PR * 0.82 + 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(PCX, PCY, PR, PR * 0.82, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#7fb0d8'; g.lineWidth = 5; g.beginPath(); g.ellipse(PCX, PCY, PR - 14, PR * 0.82 - 12, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#e6eef5'; g.lineWidth = 2; g.beginPath(); g.ellipse(PCX, PCY, PR - 40, PR * 0.82 - 34, 0, 0, Math.PI * 2); g.stroke();
      // napperon au centre
      g.fillStyle = '#fbf3e4';
      g.beginPath();
      for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2, r = k % 2 ? 26 : 32; k ? g.lineTo(PCX + Math.cos(a) * r, PCY + Math.sin(a) * r * 0.82) : g.moveTo(PCX + Math.cos(a) * r, PCY + Math.sin(a) * r * 0.82); }
      g.fill();
      // boîte cadeau ouverte
      g.fillStyle = '#c8486b'; g.fillRect(808, 410, 120, 90);
      g.fillStyle = '#f2c14e'; g.fillRect(860, 410, 16, 90);
      g.fillStyle = '#b03a5b'; g.beginPath(); g.moveTo(800, 410); g.lineTo(936, 410); g.lineTo(950, 380); g.lineTo(814, 380); g.closePath(); g.fill();
      g.fillStyle = '#fffdf6'; g.save(); g.translate(868, 470); g.rotate(-0.06);
      g.fillRect(-52, -14, 104, 28);
      g.fillStyle = '#c8486b'; g.font = '800 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Pour toi ♥ Maman', 0, 1);
      g.restore();
    }

    function drawSweet(g, it, x, y, scale = 1) {
      const r = 21 * scale;
      g.save(); g.translate(x, y); g.rotate(it.tilt);
      g.fillStyle = it.color;
      g.beginPath();
      if (it.shape === 0) g.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
      else if (it.shape === 1) { g.moveTo(0, r * 0.8); g.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.6, -r * 1.1, 0, -r * 0.4); g.bezierCurveTo(r * 0.6, -r * 1.1, r * 1.3, -r * 0.1, 0, r * 0.8); }
      else { g.moveTo(-r + 6, -r * 0.75); g.arcTo(r, -r * 0.75, r, r * 0.75, 7 * scale); g.arcTo(r, r * 0.75, -r, r * 0.75, 7 * scale); g.arcTo(-r, r * 0.75, -r, -r * 0.75, 7 * scale); g.arcTo(-r, -r * 0.75, r, -r * 0.75, 7 * scale); }
      g.closePath(); g.fill();
      // ombre douce + reflet (les deux en ont)
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.beginPath(); g.ellipse(r * 0.2, r * 0.35, r * 0.6, r * 0.25, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.3, r * 0.3, r * 0.14, -0.5, 0, Math.PI * 2); g.fill();
      if (it.kind === 'savon') {
        // petite étiquette gravée
        g.fillStyle = 'rgba(90, 70, 90, 0.55)';
        g.font = `700 ${Math.round(8.5 * scale)}px "Nunito Sans", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(it.scent, 0, r * 0.12);
      } else {
        // cristaux de sucre qui scintillent
        for (let k = 0; k < 4; k++) {
          const tw = 0.5 + 0.5 * Math.sin(s.t * 5 + it.seed + k * 1.7);
          g.fillStyle = `rgba(255,255,255,${0.35 + 0.6 * tw})`;
          g.beginPath(); g.arc(Math.cos(k * 2.1 + it.seed) * r * 0.5, Math.sin(k * 2.1 + it.seed) * r * 0.45, 1.6 * scale + tw, 0, Math.PI * 2); g.fill();
        }
      }
      g.restore();
    }

    function eat(it) {
      const p = posOf(it);
      s.flying.push({ it: { ...it }, x0: p.x, y0: p.y, k: 0 });
      it.refill = 0.6;
      s.cooldown = 0.3;
    }
    function swallow(it) {
      if (api.ended) return;
      if (it.kind === 'bonbon') {
        s.candies++;
        s.msg = ['Miam !', 'Délicieux !', 'Hmm, fraise !', 'Encore !', 'Guimauve !', 'Le paradis !'][(s.candies - 1) % 6]; s.msgT = 0.8; s.msgGood = true;
        s.chew = 0.5;
        api.sfx('catch');
        api.burst(mouth.x, mouth.y, { n: 8, shape: 'star', color: ['#ffe14d', '#ffffff', it.color], speed: 160, gravity: 200, size: 6 });
        if (s.candies >= GOAL) {
          s.outcome = 'win';
          api.end(true, s.soaps
            ? 'Six bonbons… et un petit goût de lavande au milieu. Rien de grave : ton haleine n’a jamais été aussi fraîche !'
            : 'Six bonbons savourés, zéro savon croqué : les cadeaux de Maman sont saufs… cette fois-ci !');
        }
      } else {
        s.soaps++;
        s.msg = `Beurk… parfum ${it.scent.toLowerCase()} !`; s.msgT = 1.1; s.msgGood = false;
        s.cooldown = 0.9;
        api.sfx('ouch');
        api.shake(8);
        for (let i = 0; i < 6; i++) s.bubbles.push({ x: mouth.x + rand(-6, 6), y: mouth.y, vx: rand(20, 90), vy: rand(-90, -40), r: rand(4, 10), life: rand(0.8, 1.4) });
        if (s.soaps >= MAX_SOAP) {
          s.outcome = 'fail';
          api.end(false, 'Deux savons avalés : tu fais des bulles en parlant et tu sens bon la lavande. Haleine fraîche garantie !');
        }
      }
    }
    let mouth = { x: 200, y: 340 };

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.rot += dt * 0.22;
        s.msgT = Math.max(0, s.msgT - dt);
        s.chew = Math.max(0, s.chew - dt);
        s.cooldown = Math.max(0, s.cooldown - dt);
        if (!api.ended) s.cursor = { x: input.cursor.x, y: input.cursor.y };

        // bulles de savon (indice) + recharge de l'assiette
        for (const it of s.items) {
          if (it.refill > 0) {
            it.refill -= dt;
            if (it.refill <= 0) {
              const onPlate = s.items.filter((o) => o !== it && o.refill <= 0 && o.kind === 'bonbon').length;
              Object.assign(it, newItem(it.slot, onPlate < 4 || Math.random() > 0.45 ? 'bonbon' : 'savon'), { refill: 0 });
            }
            continue;
          }
          if (it.kind === 'savon') {
            it.bubbleT -= dt;
            if (it.bubbleT <= 0 && s.bubbles.length < 60) {
              it.bubbleT = rand(1.1, 2.2);
              const p = posOf(it);
              s.bubbles.push({ x: p.x + rand(-8, 8), y: p.y - 10, vx: rand(-10, 10), vy: -45, r: rand(4, 7), life: 1.1 });
            }
          }
        }
        for (let i = s.bubbles.length - 1; i >= 0; i--) {
          const b = s.bubbles[i];
          b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.98;
          if (b.life <= 0) s.bubbles.splice(i, 1);
        }
        for (let i = s.flying.length - 1; i >= 0; i--) {
          const f = s.flying[i];
          f.k += dt / 0.3;
          if (f.k >= 1) { s.flying.splice(i, 1); swallow(f.it); }
        }
        // échec : Papa fait des bulles par la bouche
        if (s.outcome === 'fail' && s.bubbles.length < 60 && Math.random() < 0.5) {
          s.bubbles.push({ x: mouth.x + 4, y: mouth.y, vx: rand(30, 110), vy: rand(-110, -40), r: rand(5, 13), life: rand(0.8, 1.3) });
        }
        if (api.ended) return;

        if (input.pressed() && s.cooldown === 0) {
          let best = null, bd = HIT;
          for (const it of s.items) {
            if (it.refill > 0) continue;
            const p = posOf(it);
            const d = Math.hypot(p.x - s.cursor.x, p.y - s.cursor.y);
            if (d < bd) { bd = d; best = it; }
          }
          if (best) { eat(best); api.sfx('pop'); }
        }
      },
      timeout() {
        s.outcome = 'slow';
        api.end(false, `Seulement ${s.candies} bonbon${s.candies > 1 ? 's' : ''} sur ${GOAL} : à force de renifler chaque bonbon pour vérifier, l’assiette a fini dans la salle de bain !`);
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);

        // ── l'assiette tournante
        const order = s.items.filter((it) => it.refill <= 0).map((it) => ({ it, p: posOf(it) })).sort((a, b) => a.p.y - b.p.y);
        for (const { it, p } of order) {
          g.fillStyle = 'rgba(80, 60, 40, 0.15)'; g.beginPath(); g.ellipse(p.x + 3, p.y + 14, 20, 7, 0, 0, Math.PI * 2); g.fill();
          drawSweet(g, it, p.x, p.y);
        }

        // ── Papa, à gauche, la bouche grande ouverte
        const lost = s.outcome === 'fail';
        const info = api.avatar(g, {
          x: 165, y: 560, size: 96, pose: s.outcome === 'win' ? 'cheer' : 'stand', t: s.t,
          expression: lost ? 'surprised' : s.outcome === 'win' ? 'laugh' : s.msgT > 0 && !s.msgGood ? 'ouch' : s.chew > 0 ? 'happy' : s.flying.length ? 'surprised' : 'smile',
          lookX: 1, lookY: 0.2, blush: s.soaps * 0.4,
          tilt: s.chew > 0 ? Math.sin(s.t * 20) * 0.05 : 0,
        });
        mouth = { x: info.hx + 4, y: info.hy + 0.48 * info.r };

        // bonbons / savons en vol vers la bouche
        for (const f of s.flying) {
          const k = Math.min(1, f.k);
          const x = api.lerp(f.x0, mouth.x, k), y = api.lerp(f.y0, mouth.y, k) - Math.sin(k * Math.PI) * 80;
          drawSweet(g, f.it, x, y, 1 - k * 0.6);
        }
        // bulles
        for (const b of s.bubbles) {
          g.globalAlpha = Math.min(1, b.life * 1.5);
          g.fillStyle = 'rgba(220, 240, 255, 0.35)'; g.strokeStyle = 'rgba(160, 190, 230, 0.9)'; g.lineWidth = 1.5;
          g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 1;
        }

        // ── main / cuillère au curseur
        if (!api.ended) {
          const c = s.cursor;
          g.strokeStyle = s.cooldown > 0 ? 'rgba(150, 90, 60, 0.4)' : 'rgba(200, 70, 100, 0.85)'; g.lineWidth = 3;
          g.beginPath(); g.arc(c.x, c.y, HIT - 4, 0, Math.PI * 2); g.stroke();
          g.save(); g.translate(c.x + 10, c.y + 10); g.rotate(0.6);
          g.fillStyle = '#c3cad2'; g.beginPath(); g.ellipse(0, 0, 8, 11, 0, 0, Math.PI * 2); g.fill();
          g.fillRect(-2.5, 9, 5, 46);
          g.restore();
        }

        // ── messages
        if (s.msgT > 0) api.text(g, s.msg, 300, 150, { size: 30, color: s.msgGood ? '#fff' : '#e8f4ff', stroke: s.msgGood ? '#c8486b' : '#4a6a9a' });
        if (lost) api.text(g, 'Haleine fraîche garantie !', W / 2, 505, { size: 34, color: '#e8f4ff', stroke: '#4a6a9a', strokeWidth: 8 });

        // ── HUD
        api.roundRect(g, 250, 22, 460, 46, 14); g.fillStyle = 'rgba(60, 25, 35, 0.72)'; g.fill();
        api.text(g, `Bonbons : ${s.candies} / ${GOAL}   ·   Savons croqués : ${s.soaps} / ${MAX_SOAP - 1}`, 480, 46, { size: 20, color: '#ffe7f0' });
      },
    };
  },
};

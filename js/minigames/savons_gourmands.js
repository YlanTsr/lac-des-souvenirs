/**
 * « Le calendrier de l’Avent » (savons_gourmands)
 * Mami avait offert à Papa un calendrier de l'Avent… rempli de petites perles de bain au savon.
 * Papa a cru que c'étaient des bonbons et en a croqué une.
 * Mécanique : 24 petites portes. Ouvrir une porte (clic / flèches + Espace) révèle un vrai
 * bonbon ou une perle de bain presque identique (indices : reflet nacré qui tourne, petite bulle,
 * volute de parfum fleuri). Re-cliquer une porte ouverte = manger. 5 vrais bonbons = victoire ;
 * une seule perle croquée = bulles par la bouche, échec (comme dans la vraie histoire).
 */
export default {
  id: 'savons_gourmands',
  title: 'Le calendrier de l’Avent',
  instructions: 'Ouvre les petites portes et mange 5 vrais bonbons, mais laisse les perles de bain de Mami : elles ont un reflet nacré, font des bulles et sentent la fleur !',
  controls: 'Clic / tap : ouvrir puis manger · ou flèches + Espace',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Gourmand… mais malin !',
  failTitle: 'Ça mousse !',
  successText: 'Cinq vrais bonbons, zéro perle de bain : ce Noël, ton haleine sent le chocolat, pas la rose.',
  failText: 'Crounch… ça mousse ! C’était une perle de bain : tu fais des bulles en parlant. Merci Mami !',

  create(api) {
    const { W, H, rand } = api;
    const GOAL = 5;
    const COLS = 6, ROWS = 4, X0 = 322, Y0 = 142, CW = 99, CH = 90, DW = 86, DH = 80;
    const COLORS = ['#f4b6c8', '#c9b3f0', '#b5e3c8', '#e8c860', '#f3e6cf', '#7a4a2e'];
    const DOORC = ['#c0392b', '#2e7d4f', '#d4a24c', '#efe3c8'];
    const SCENTS = ['rose', 'lavande', 'fleur d’oranger', 'violette', 'jasmin'];
    const YUM = ['Miam, praliné !', 'Hmm, framboise !', 'Chocolat noir !', 'Guimauve !', 'Caramel !', 'Pâte d’amande !'];

    // 13 bonbons, 11 perles de bain, numéros mélangés comme un vrai calendrier
    const kinds = Array.from({ length: 24 }, (_, i) => (i < 13 ? 'bonbon' : 'perle'));
    const nums = Array.from({ length: 24 }, (_, i) => i + 1);
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    shuffle(kinds); shuffle(nums);
    const doors = kinds.map((kind, i) => {
      const c = i % COLS, r = Math.floor(i / COLS);
      return {
        i, kind, num: nums[i], x: X0 + c * CW + DW / 2, y: Y0 + r * CH + DH / 2,
        color: COLORS[Math.floor(rand(0, COLORS.length))], doorC: DOORC[(c + r) % 4], deco: (c * 3 + r) % 3,
        open: 0, opening: false, eaten: false, seed: rand(0, 6.28), bubbleT: rand(0.2, 0.9), scent: SCENTS[Math.floor(rand(0, SCENTS.length))],
      };
    });

    const s = {
      t: 0, doors, sel: 0, candies: 0, outcome: null, flying: null, bubbles: [], cooldown: 0,
      msg: '', msgT: 0, msgGood: true, chew: 0, lastPtr: null, endT: 0,
    };
    const say = (m, d, good) => { s.msg = m; s.msgT = d; s.msgGood = good; };
    const doorAt = (x, y) => doors.find((d) => Math.abs(x - d.x) <= DW / 2 && Math.abs(y - d.y) <= DH / 2) || null;

    /* ───────── décor pré-rendu ───────── */
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      // mur rouge sombre à motifs, parquet
      g.fillStyle = '#6e2a2a'; g.fillRect(0, 0, W, 470);
      g.fillStyle = 'rgba(255, 220, 160, 0.06)';
      for (let x = 0; x < W; x += 40) for (let y = 20; y < 460; y += 40) { g.beginPath(); g.arc(x + ((y / 40) % 2) * 20, y, 3, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#5a2020'; g.fillRect(0, 456, W, 14);
      g.fillStyle = '#8a5a3a'; g.fillRect(0, 470, W, H - 470);
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 2;
      for (let y = 486; y < H; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // fenêtre enneigée
      g.fillStyle = '#20345e'; g.fillRect(40, 70, 170, 150);
      g.fillStyle = '#eef4ff';
      for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(46 + (i * 53) % 160, 76 + (i * 31) % 140, 1.6 + (i % 3) * 0.6, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.moveTo(40, 220); g.quadraticCurveTo(120, 190, 210, 214); g.lineTo(210, 220); g.closePath(); g.fill();
      g.strokeStyle = '#f2e8d8'; g.lineWidth = 8; g.strokeRect(40, 70, 170, 150);
      g.lineWidth = 5; g.beginPath(); g.moveTo(125, 70); g.lineTo(125, 220); g.moveTo(40, 145); g.lineTo(210, 145); g.stroke();
      // guirlande lumineuse
      g.strokeStyle = '#2f5a2f'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 30);
      for (let x = 0; x <= 780; x += 130) g.quadraticCurveTo(x + 65, 62, x + 130, 30);
      g.stroke();
      const LC = ['#ffe14d', '#ff6b6b', '#6bd0ff', '#9cff8a'];
      for (let i = 0; i < 24; i++) { const x = 20 + i * 32; const k = ((x % 130) / 130); const y = 30 + Math.sin(k * Math.PI) * 24; g.fillStyle = LC[i % 4]; g.beginPath(); g.arc(x, y + 6, 5, 0, Math.PI * 2); g.fill(); }
      // sapin
      g.fillStyle = '#5a3a24'; g.fillRect(232, 400, 18, 70);
      g.fillStyle = '#2e6b3a';
      for (let k = 0; k < 4; k++) { const y = 210 + k * 50; g.beginPath(); g.moveTo(241, y - 40); g.lineTo(241 - 30 - k * 12, y + 50); g.lineTo(241 + 30 + k * 12, y + 50); g.closePath(); g.fill(); }
      g.fillStyle = '#ffe14d'; g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? 6 : 14; g.lineTo(241 + Math.cos(a) * rr, 172 + Math.sin(a) * rr); } g.fill();
      for (const [x, y, c] of [[222, 250, '#ff6b6b'], [258, 300, '#6bd0ff'], [215, 345, '#ffe14d'], [266, 380, '#ff6b6b'], [240, 220, '#9cff8a']]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
      // le calendrier : cadre doré, fond rouge à flocons
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(306, 86, 626, 430);
      g.fillStyle = '#c9a04a'; g.fillRect(298, 76, 628, 432);
      g.fillStyle = '#a3262b'; g.fillRect(308, 86, 608, 412);
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        const x = 318 + (i * 97) % 590, y = 96 + (i * 59) % 395, r = 5 + (i % 3) * 2;
        g.beginPath(); for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI; g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.stroke();
      }
      // bandeau titre
      g.fillStyle = '#efe3c8'; g.fillRect(500, 92, 404, 40);
      g.strokeStyle = '#c9a04a'; g.lineWidth = 3; g.strokeRect(500, 92, 404, 40);
      g.fillStyle = '#a3262b'; g.font = 'italic 800 24px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Calendrier de l’Avent', 702, 113);
      // étiquette cadeau de Mami
      g.save(); g.translate(400, 112); g.rotate(-0.08);
      g.strokeStyle = '#efe3c8'; g.lineWidth = 2; g.beginPath(); g.moveTo(-90, -4); g.lineTo(-104, -30); g.stroke();
      g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(-90, -16); g.lineTo(84, -16); g.lineTo(84, 16); g.lineTo(-90, 16); g.lineTo(-100, 0); g.closePath(); g.fill();
      g.fillStyle = '#c9a04a'; g.beginPath(); g.arc(-88, 0, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7a1f2b'; g.font = 'italic 700 15px Georgia, serif';
      g.fillText('Pour mon chéri — Mami', -4, 1);
      g.restore();
      // niches (fond des portes)
      for (const d of doors) {
        g.fillStyle = '#3a1c18'; g.fillRect(d.x - DW / 2, d.y - DH / 2, DW, DH);
        g.fillStyle = '#d9b46a';
        g.beginPath(); g.moveTo(d.x - 18, d.y + 6); g.lineTo(d.x + 18, d.y + 6); g.lineTo(d.x + 13, d.y + 22); g.lineTo(d.x - 13, d.y + 22); g.closePath(); g.fill();
        g.strokeStyle = '#b8924a'; g.lineWidth = 1.5;
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(d.x + k * 7, d.y + 7); g.lineTo(d.x + k * 5.5, d.y + 21); g.stroke(); }
      }
    }

    /* ───────── dessins ───────── */
    function drawItem(g, d, x, y, sc = 1) {
      const r = 15 * sc;
      g.fillStyle = d.color;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(x + r * 0.25, y + r * 0.25, r * 0.7, 0, Math.PI * 2); g.fill();
      g.fillStyle = d.color; g.beginPath(); g.arc(x - r * 0.08, y - r * 0.08, r * 0.78, 0, Math.PI * 2); g.fill();
      if (d.kind === 'perle') {
        // reflet nacré irisé qui tourne lentement
        const a = s.t * 2.2 + d.seed;
        const IR = ['rgba(255,170,220,0.75)', 'rgba(160,230,255,0.75)', 'rgba(255,250,190,0.8)'];
        for (let k = 0; k < 3; k++) {
          g.strokeStyle = IR[k]; g.lineWidth = 2.2 * sc;
          g.beginPath(); g.arc(x, y, r * (0.52 + k * 0.1), a + k * 0.25, a + k * 0.25 + 0.9); g.stroke();
        }
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x - r * 0.38, y - r * 0.38, r * 0.17, 0, Math.PI * 2); g.fill();
      } else {
        // reflet mat et fixe, quelques grains de sucre / cacao
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.4, r * 0.28, r * 0.15, -0.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = d.color === '#7a4a2e' ? 'rgba(60,30,15,0.6)' : 'rgba(255,255,255,0.5)';
        for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + Math.cos(d.seed + k * 1.9) * r * 0.5, y + Math.sin(d.seed + k * 1.9) * r * 0.45, 1.2 * sc, 0, Math.PI * 2); g.fill(); }
      }
    }
    function drawScent(g, d) {
      // volute de parfum fleuri (petite fleur rose au bout)
      const k = (s.t * 0.7 + d.seed) % 1;
      const a = Math.sin(k * Math.PI) * 0.75;
      if (a < 0.05) return;
      const x = d.x + Math.sin(k * 6 + d.seed) * 5, y = d.y - 18 - k * 20;
      g.globalAlpha = a;
      g.strokeStyle = '#f7c6e0'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(d.x + 2, d.y - 14); g.quadraticCurveTo(d.x + 9, (d.y - 14 + y) / 2, x, y); g.stroke();
      g.fillStyle = '#ff9fcf';
      for (let p = 0; p < 5; p++) { const an = (p / 5) * Math.PI * 2 + s.t; g.beginPath(); g.arc(x + Math.cos(an) * 2.6, y + Math.sin(an) * 2.6, 1.8, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff2a0'; g.beginPath(); g.arc(x, y, 1.3, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }
    function drawDoor(g, d) {
      const x0 = d.x - DW / 2, y0 = d.y - DH / 2;
      const w = DW * (1 - d.open * 0.82);
      if (d.open > 0) {
        // porte entrouverte, rabattue à gauche (vue de biais)
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0 + w, y0, 4, DH);
      }
      g.save();
      g.beginPath(); g.rect(x0, y0, w, DH); g.clip();
      g.fillStyle = d.doorC; g.fillRect(x0, y0, w, DH);
      if (d.open > 0) { g.fillStyle = `rgba(0,0,0,${0.35 * d.open})`; g.fillRect(x0, y0, w, DH); }
      g.translate(x0, y0); g.scale(w / DW, 1);
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.strokeRect(4, 4, DW - 8, DH - 8);
      const light = d.doorC === '#efe3c8' || d.doorC === '#d4a24c';
      if (d.deco === 0) { g.fillStyle = light ? '#2e7d4f' : '#ffe14d'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? 4 : 9; g.lineTo(DW - 16 + Math.cos(a) * rr, 16 + Math.sin(a) * rr); } g.fill(); }
      else if (d.deco === 1) { g.fillStyle = '#2e7d4f'; g.beginPath(); g.ellipse(DW - 20, 16, 7, 4, 0.5, 0, Math.PI * 2); g.ellipse(DW - 11, 16, 7, 4, -0.5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e53935'; g.beginPath(); g.arc(DW - 15, 19, 3, 0, Math.PI * 2); g.fill(); }
      else { g.fillStyle = light ? 'rgba(160,40,40,0.5)' : 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(14, DH - 14, 4, 0, Math.PI * 2); g.arc(26, DH - 12, 3, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = light ? '#7a1f2b' : '#fffaf0';
      g.font = '800 28px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(d.num), DW / 2, DH / 2 + 2);
      g.fillStyle = '#c9a04a'; g.beginPath(); g.arc(DW - 9, DH / 2, 3, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    let mouth = { x: 150, y: 330 };

    function act(d) {
      if (!d || api.ended) return;
      if (d.open === 0 && !d.opening) {
        d.opening = true;
        api.sfx('pop');
        return;
      }
      if (d.open < 1 || d.eaten || s.flying || s.cooldown > 0) return;
      s.flying = { d, k: 0 };
      d.eaten = true;
      api.sfx('whoosh');
    }
    function swallow(d) {
      if (api.ended) return;
      if (d.kind === 'bonbon') {
        s.candies++;
        s.chew = 0.5;
        say(YUM[(s.candies - 1) % YUM.length], 0.9, true);
        api.sfx('catch');
        api.burst(mouth.x, mouth.y, { n: 10, shape: 'star', color: ['#ffe14d', '#ffffff', d.color], speed: 170, gravity: 220, size: 6 });
        if (s.candies >= GOAL) {
          s.outcome = 'win';
          api.end(true, 'Cinq vrais bonbons, zéro perle de bain : ce Noël, ton haleine sent le chocolat, pas la rose.');
        }
      } else {
        s.outcome = 'fail';
        api.sfx('ouch'); api.shake(10);
        say(`Pfff… parfum ${d.scent} !`, 3, false);
        for (let i = 0; i < 14; i++) s.bubbles.push({ x: mouth.x + rand(-8, 8), y: mouth.y, vx: rand(20, 140), vy: rand(-140, -40), r: rand(4, 12), life: rand(0.9, 1.6) });
        api.end(false, `Crounch… ça mousse ! C’était une perle de bain parfum ${d.scent} : tu fais des bulles en parlant. Merci Mami !`);
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.chew = Math.max(0, s.chew - dt);
        s.cooldown = Math.max(0, s.cooldown - dt);
        for (const d of doors) {
          if (d.opening) { d.open = Math.min(1, d.open + dt / 0.22); if (d.open >= 1) d.opening = false; }
          // petites bulles qui s'échappent des perles de bain ouvertes
          if (d.kind === 'perle' && d.open >= 1 && !d.eaten) {
            d.bubbleT -= dt;
            if (d.bubbleT <= 0 && s.bubbles.length < 80) {
              d.bubbleT = rand(0.7, 1.2);
              s.bubbles.push({ x: d.x + rand(-6, 6), y: d.y - 10, vx: rand(-8, 8), vy: -38, r: rand(2.5, 4.5), life: 0.9 });
            }
          }
        }
        for (let i = s.bubbles.length - 1; i >= 0; i--) {
          const b = s.bubbles[i];
          b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.98;
          if (b.life <= 0) s.bubbles.splice(i, 1);
        }
        if (s.flying) {
          s.flying.k += dt / 0.32;
          if (s.flying.k >= 1) { const d = s.flying.d; s.flying = null; s.cooldown = 0.12; swallow(d); }
        }
        if (s.outcome === 'fail' && s.bubbles.length < 80 && Math.random() < 0.55) {
          s.bubbles.push({ x: mouth.x + 4, y: mouth.y, vx: rand(30, 130), vy: rand(-130, -40), r: rand(5, 13), life: rand(0.8, 1.3) });
        }
        if (api.ended) { s.endT += dt; return; }

        // ── sélection : flèches (grille) ou survol de la souris
        const c = s.sel % COLS, r = Math.floor(s.sel / COLS);
        if (input.pressed('left')) s.sel = r * COLS + (c + COLS - 1) % COLS;
        if (input.pressed('right')) s.sel = r * COLS + (c + 1) % COLS;
        if (input.pressed('up')) s.sel = ((r + ROWS - 1) % ROWS) * COLS + c;
        if (input.pressed('down')) s.sel = ((r + 1) % ROWS) * COLS + c;
        const p = input.pointer;
        if (p.active && (!s.lastPtr || s.lastPtr.x !== p.x || s.lastPtr.y !== p.y)) {
          const d = doorAt(p.x, p.y);
          if (d) s.sel = d.i;
          s.lastPtr = { x: p.x, y: p.y };
        }

        // ── action
        if (p.pressed) act(doorAt(p.x, p.y));
        else if (input.pressed()) act(doors[s.sel]);
      },
      timeout() {
        s.outcome = 'slow';
        api.end(false, `Seulement ${s.candies} bonbon${s.candies > 1 ? 's' : ''} sur ${GOAL} : à force de renifler chaque case, Noël est passé… et le calendrier a fini dans la salle de bain.`);
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);

        // ── contenu des cases ouvertes, puis les portes
        for (const d of doors) {
          if (d.open > 0.3 && !d.eaten) {
            const k = Math.min(1, (d.open - 0.3) / 0.5);
            drawItem(g, d, d.x, d.y - 2 + (1 - k) * 4, 0.6 + 0.4 * k);
          } else if (d.eaten) {
            g.fillStyle = 'rgba(122, 74, 46, 0.6)';
            for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(d.x - 6 + k * 6, d.y + 4 + (k % 2) * 2, 1.6, 0, Math.PI * 2); g.fill(); }
          }
          drawDoor(g, d);
        }
        for (const d of doors) if (d.kind === 'perle' && d.open >= 1 && !d.eaten) drawScent(g, d);

        // ── sélection (clavier / survol)
        if (!api.ended) {
          const d = doors[s.sel];
          const pulse = 0.5 + 0.5 * Math.sin(s.t * 6);
          g.strokeStyle = `rgba(255, 236, 140, ${0.6 + 0.4 * pulse})`; g.lineWidth = 4;
          api.roundRect(g, d.x - DW / 2 - 5, d.y - DH / 2 - 5, DW + 10, DH + 10, 8); g.stroke();
        }

        // ── Papa
        const lost = s.outcome === 'fail';
        const info = api.avatar(g, {
          x: 140, y: 528, size: 92, pose: s.outcome === 'win' ? 'cheer' : 'stand', t: s.t,
          expression: lost ? (s.endT > 0.4 ? 'ouch' : 'surprised') : s.outcome === 'win' ? 'laugh' : s.flying ? 'surprised' : s.chew > 0 ? 'happy' : 'smile',
          lookX: 1, lookY: -0.2, blush: lost ? 0.8 : 0,
          tilt: s.chew > 0 ? Math.sin(s.t * 20) * 0.05 : 0,
        });
        mouth = { x: info.hx + 4, y: info.hy + 0.48 * info.r };

        // bonbon (ou perle…) en vol vers la bouche
        if (s.flying) {
          const k = Math.min(1, s.flying.k), d = s.flying.d;
          const x = api.lerp(d.x, mouth.x, k), y = api.lerp(d.y, mouth.y, k) - Math.sin(k * Math.PI) * 90;
          drawItem(g, d, x, y, 1 - k * 0.55);
        }
        // bulles
        for (const b of s.bubbles) {
          g.globalAlpha = Math.min(1, b.life * 1.5);
          g.fillStyle = 'rgba(220, 240, 255, 0.3)'; g.strokeStyle = 'rgba(190, 215, 250, 0.95)'; g.lineWidth = 1.5;
          g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 1;
        }

        // ── messages
        if (s.msgT > 0) api.text(g, s.msg, 160, 150, { size: 26, color: s.msgGood ? '#fff' : '#e8f4ff', stroke: s.msgGood ? '#a3262b' : '#3a5a8a' });
        if (lost) api.text(g, 'C’était du savon !', 615, 470 + Math.sin(s.t * 3) * 3, { size: 36, color: '#e8f4ff', stroke: '#3a5a8a', strokeWidth: 8 });
        if (s.outcome === 'win') api.text(g, 'Joyeux Noël, Papa !', 615, 470, { size: 36, color: '#fff6c8', stroke: '#a3262b', strokeWidth: 8 });

        // ── HUD
        api.roundRect(g, 300, 24, 330, 44, 14); g.fillStyle = 'rgba(40, 12, 12, 0.75)'; g.fill();
        api.text(g, `Bonbons mangés : ${s.candies} / ${GOAL}`, 465, 46, { size: 20, color: '#ffe7d0' });
      },
    };
  },
};

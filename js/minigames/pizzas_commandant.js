/**
 * « Les pizzas du commandant » (pizzas_commandant)
 * À l'armée, de garde de nuit, Papa a commandé des pizzas… au nom de son commandant.
 * Mécanique : infiltration. Maintenir pour avancer vers le livreur au portail,
 * relâcher pour se figer quand le projecteur approche ; puis rapporter les pizzas à la guérite.
 * Repéré 2 fois = échec.
 */
export default {
  id: 'pizzas_commandant',
  title: 'Les pizzas du commandant',
  instructions: 'Garde de nuit : file chercher les pizzas au portail et rapporte-les à la guérite, en te figeant quand le projecteur passe sur toi.',
  controls: 'Maintenir Espace / clic / → (puis ←) : avancer · relâcher : se figer',
  duration: 13,
  introExpression: 'focus',
  successTitle: 'Mission pizza accomplie !',
  failTitle: 'Repéré !',
  successText: 'Trois pizzas rapportées à la guérite sans un bruit. La meilleure garde de nuit de toute ta carrière militaire !',
  failText: '« Au nom de qui, la commande ? » … « Euh… du commandant, mon commandant. » Les pizzas ont fini au mess des officiers.',

  create(api) {
    const { W, H, rand } = api;
    const GROUND = 470;
    const HOME = 150, GATE = 780;
    const SPOT_R = 62;
    const TOWER = { x: 480, y: 118 };
    const s = {
      x: HOME, dir: 1, pizzas: false, moving: false, spotted: 0, stun: 0, grace: 0,
      phase: rand(0, 6), sx: 0, lastSx: 0, alarm: 0, msg: '', msgT: 0, walkT: 0, result: null,
    };
    const spotX = () => 470 + 340 * Math.sin(s.phase);
    s.sx = spotX(); s.lastSx = s.sx;

    // ── décor pré-rendu : caserne la nuit
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, '#0d1230'); sky.addColorStop(1, '#2a2f55');
      g.fillStyle = sky; g.fillRect(0, 0, W, GROUND);
      g.fillStyle = '#fff';
      for (let i = 0; i < 60; i++) { g.globalAlpha = 0.3 + ((i * 37) % 10) / 14; g.fillRect((i * 151) % W, (i * 67) % 240, 2, 2); }
      g.globalAlpha = 1;
      g.fillStyle = '#f4ecc8'; g.beginPath(); g.arc(150, 80, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0d1230'; g.beginPath(); g.arc(162, 72, 24, 0, Math.PI * 2); g.fill();
      // bâtiment de la caserne
      g.fillStyle = '#3a3f5c'; g.fillRect(40, 250, 720, GROUND - 250);
      g.fillStyle = '#2e3250'; g.fillRect(30, 238, 740, 16);
      for (let i = 0; i < 12; i++) {
        const lit = i === 3 || i === 8;
        g.fillStyle = lit ? '#f6d27a' : '#22263f';
        g.fillRect(70 + i * 58, 290, 30, 40); g.fillRect(70 + i * 58, 370, 30, 40);
      }
      api.text(g, 'CASERNE', 400, 270, { size: 16, color: '#8a90b0', weight: 800 });
      // mirador
      g.fillStyle = '#4a4f6a'; g.fillRect(TOWER.x - 6, TOWER.y + 20, 12, GROUND - TOWER.y - 20);
      g.strokeStyle = '#4a4f6a'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(TOWER.x - 40, GROUND); g.lineTo(TOWER.x, TOWER.y + 40); g.lineTo(TOWER.x + 40, GROUND); g.stroke();
      g.fillStyle = '#565b78'; g.fillRect(TOWER.x - 34, TOWER.y + 8, 68, 20);
      // sol de la cour
      g.fillStyle = '#4a4a50'; g.fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle = '#56565c';
      for (let i = 0; i < 16; i++) g.fillRect(i * 64, GROUND + 26, 40, 4);
      // guérite tricolore
      g.fillStyle = '#e9e4d6'; g.fillRect(56, 300, 84, GROUND - 300);
      g.fillStyle = '#2c4a9a'; g.fillRect(56, 300, 28, GROUND - 300);
      g.fillStyle = '#c8323a'; g.fillRect(112, 300, 28, GROUND - 300);
      g.fillStyle = '#2a2a30'; g.fillRect(70, 340, 56, GROUND - 340);
      g.fillStyle = '#5a5a66'; g.beginPath(); g.moveTo(46, 302); g.lineTo(98, 268); g.lineTo(150, 302); g.closePath(); g.fill();
      api.text(g, 'GUÉRITE', 98, 290, { size: 11, color: '#fff', weight: 800 });
      // portail
      g.strokeStyle = '#1e2033'; g.lineWidth = 5;
      g.fillStyle = '#6a6f88'; g.fillRect(822, 300, 16, GROUND - 300);
      for (let x = 846; x < W; x += 18) { g.beginPath(); g.moveTo(x, 330); g.lineTo(x, GROUND); g.stroke(); }
      g.beginPath(); g.moveTo(838, 340); g.lineTo(W, 340); g.moveTo(838, 440); g.lineTo(W, 440); g.stroke();
    }

    function spotted() {
      s.spotted++;
      s.stun = 1.1; s.grace = 1.7; s.alarm = 1.1;
      api.sfx('beep'); api.shake(10);
      api.burst(s.x, GROUND - 150, { n: 10, shape: 'star', color: ['#ffe14d', '#fff'], speed: 180, gravity: 150, size: 7 });
      s.msg = 'Qui va là ?!'; s.msgT = 1.2;
      if (s.spotted >= 2) {
        s.result = 'fail';
        api.end(false, '« Au nom de qui, la commande ? » … « Euh… du commandant, mon commandant. » Repéré deux fois : les pizzas ont fini au mess des officiers.');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.msgT = Math.max(0, s.msgT - dt);
        s.alarm = Math.max(0, s.alarm - dt);
        s.grace = Math.max(0, s.grace - dt);
        // le projecteur balaie (vitesse variable) — figé sur Papa quand il est repéré
        if (s.stun <= 0) s.phase += dt * (1.9 + 0.7 * Math.sin(api.t * 0.9 + 1.3));
        s.lastSx = s.sx;
        s.sx = s.stun > 0 ? s.sx + (s.x - s.sx) * Math.min(1, 8 * dt) : spotX();
        s.stun = Math.max(0, s.stun - dt);
        if (api.ended) { s.moving = false; if (s.result === 'win') s.walkT += dt; return; }

        const want = input.held() || (s.dir > 0 ? input.held('right') : input.held('left'));
        s.moving = want && s.stun <= 0;
        if (s.moving) {
          s.walkT += dt;
          s.x += s.dir * (s.pizzas ? 175 : 205) * dt;
          if (s.grace <= 0 && Math.abs(s.x - s.sx) < SPOT_R) spotted();
        }
        if (!api.ended && !s.pizzas && s.x >= GATE) {
          s.x = GATE; s.pizzas = true; s.dir = -1;
          api.sfx('catch');
          api.burst(GATE + 20, GROUND - 120, { n: 14, color: ['#f2b33d', '#e8453c', '#fff'], speed: 200 });
          s.msg = '3 royales pour… le commandant !'; s.msgT = 1.4;
        }
        if (!api.ended && s.pizzas && s.x <= HOME) {
          s.x = HOME; s.result = 'win';
          api.burst(HOME, GROUND - 150, { n: 26, shape: 'star', color: ['#ffd34d', '#fff3c4'], speed: 260, gravity: 200, size: 8 });
          api.end(true, s.spotted ? 'Une petite frayeur, mais trois pizzas rapportées à la guérite. Le commandant ne saura jamais qu’il régalait !'
            : 'Trois pizzas rapportées à la guérite sans un bruit. La meilleure garde de nuit de toute ta carrière militaire !');
        }
      },
      timeout() {
        s.result = 'fail';
        api.end(false, s.pizzas ? 'Le jour se lève et tu es encore au milieu de la cour, les bras chargés de pizzas… au nom du commandant. Oups.'
          : 'Le livreur a attendu, attendu… puis il a sonné chez le commandant. « Au nom de qui, la commande ? »');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        // livreur et son scooter derrière le portail
        if (!s.pizzas || s.x > GATE - 40) {
          g.fillStyle = '#c0392b'; api.roundRect(g, 860, 418, 80, 34, 10); g.fill();
          g.fillStyle = '#1e1e24'; g.beginPath(); g.arc(872, 458, 12, 0, Math.PI * 2); g.arc(928, 458, 12, 0, Math.PI * 2); g.fill();
        }
        const lx = 880, ly = GROUND - 30;
        g.fillStyle = '#c0392b'; g.fillRect(lx - 14, ly - 70, 28, 46); // livreur (silhouette simple)
        g.fillStyle = '#e4b896'; g.beginPath(); g.arc(lx, ly - 88, 16, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#c0392b'; g.beginPath(); g.arc(lx, ly - 92, 16, Math.PI, 0); g.fill(); g.fillRect(lx - 2, ly - 96, 24, 6);
        if (!s.pizzas) for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#e8d3a8' : '#f3e2bd'; g.fillRect(lx - 30, ly - 62 + i * 8, 40, 8); }

        // cône du projecteur
        const sx = s.sx;
        const cone = g.createLinearGradient(0, TOWER.y, 0, GROUND);
        cone.addColorStop(0, s.alarm > 0 ? 'rgba(255,120,110,0.5)' : 'rgba(255,250,200,0.5)');
        cone.addColorStop(1, s.alarm > 0 ? 'rgba(255,120,110,0.18)' : 'rgba(255,250,200,0.16)');
        g.fillStyle = cone;
        g.beginPath(); g.moveTo(TOWER.x - 8, TOWER.y + 18); g.lineTo(sx - SPOT_R, GROUND); g.lineTo(sx + SPOT_R, GROUND); g.lineTo(TOWER.x + 8, TOWER.y + 18); g.closePath(); g.fill();
        g.fillStyle = s.alarm > 0 ? 'rgba(255,140,120,0.45)' : 'rgba(255,250,210,0.4)';
        g.beginPath(); g.ellipse(sx, GROUND + 4, SPOT_R, 14, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(TOWER.x, TOWER.y + 18, 12, 0, Math.PI * 2); g.fill();

        // Papa (casque de soldat dessiné par-dessus)
        const lit = Math.abs(s.x - sx) < SPOT_R + 10;
        const near = Math.abs(s.x - sx) < 170;
        const size = 58, r = size / 2;
        const pose = s.moving ? 'run' : 'stand';
        const flip = s.dir < 0;
        const holdHands = s.pizzas ? { l: { x: s.x + (flip ? -26 : 26), y: GROUND - 3 * r }, r: { x: s.x + (flip ? -6 : 46), y: GROUND - 3 * r } } : undefined;
        const info = api.avatar(g, {
          x: s.x, y: GROUND, size, pose, t: s.walkT, flipX: flip,
          expression: s.result === 'win' ? 'laugh' : s.result === 'fail' ? 'panic' : s.stun > 0 ? 'surprised' : lit ? 'focus' : near ? 'worried' : 'smile',
          sweat: near && !api.ended, hands: holdHands,
        });
        g.fillStyle = '#4a5a3a';
        g.beginPath(); g.ellipse(info.hx, info.hy - r * 0.45, r * 1.08, r * 0.7, 0, Math.PI, 0); g.fill();
        g.fillRect(info.hx - r * 1.15, info.hy - r * 0.5, r * 2.3, r * 0.14);
        if (s.pizzas) {
          const px = s.x + (flip ? -16 : 36), py = GROUND - 3 * r - 6;
          for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#e8d3a8' : '#f3e2bd'; g.fillRect(px - 30, py - i * 9, 60, 9); g.strokeStyle = '#b89a6a'; g.lineWidth = 1; g.strokeRect(px - 30, py - i * 9, 60, 9); }
          api.text(g, 'PIZZA', px, py - 13, { size: 9, color: '#c0392b', weight: 800 });
        }
        if (!s.moving && lit && !api.ended && s.stun <= 0) api.text(g, 'Immobile…', s.x, GROUND - 190, { size: 20, color: '#fff', stroke: '#000a' });

        // flèche-objectif
        if (!api.ended) {
          const tx = s.pizzas ? HOME : GATE;
          api.text(g, s.pizzas ? '⬅ Guérite' : 'Livreur ➡', tx + (s.pizzas ? 40 : -50), 236, { size: 20, color: '#f6d27a', stroke: '#000a' });
        }
        // HUD
        api.text(g, `Repéré : ${s.spotted} / 2`, 30, 40, { size: 24, color: s.spotted ? '#ff8a80' : '#fff', stroke: '#000a', align: 'left' });
        api.text(g, s.pizzas ? 'Pizzas : récupérées !' : 'Pizzas : au portail', 30, 72, { size: 18, color: '#f6d27a', stroke: '#000a', align: 'left' });
        if (s.msgT > 0) api.text(g, s.msg, W / 2, 200, { size: 30, color: '#fff', stroke: '#7a1e1e', strokeWidth: 8 });
        if (s.result === 'fail' && s.msgT <= 0) api.text(g, '« Au nom de qui, la commande ? »', W / 2, 200, { size: 30, color: '#fff', stroke: '#7a1e1e', strokeWidth: 8 });
      },
    };
  },
};

/**
 * Chapitre I — « Le singe, meilleur ami » (singe_ami)
 * Un singe était devenu le meilleur ami de Papa ; il a tout tenté pour le garder à la maison…
 * Mami a fini par payer quelqu'un pour le faire partir.
 * Mécanique : jouer avec le singe remplit la jauge d'amitié. Mami étend le linge et se retourne
 * de temps en temps (signal « Hmm ? » avant) : maintenir l'action cache le singe dans le panier.
 * Caché, l'amitié ne monte pas (et le singe s'ennuie un peu). Vu 3 fois = Mami appelle le monsieur.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'singe_ami',
  title: 'Le singe, meilleur ami',
  instructions: 'Joue avec ton ami le singe pour remplir la jauge d’amitié, mais cache-le dans le panier dès que Mami se retourne !',
  controls: 'Maintenir Espace / clic : cacher le singe',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Amis pour la vie !',
  failTitle: 'Mami a appelé le monsieur…',
  successText: 'Meilleurs amis ! Mami n’a rien vu… cette fois. (Elle finira quand même par appeler le monsieur.)',
  failText: 'Mami a appelé le monsieur, et le singe est reparti dans les arbres. Mais il est resté ton meilleur ami pour toujours.',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;
    const GROUND = 470;
    const MX = 770;                 // Mami
    const KID = 230;                // petit Papa
    const PLAY_X = 380, BASKET_X = 500;
    const s = {
      t: 0, friend: 0, caught: 0, hide: 0, away: 0, held: false,
      mstate: 'back', mT: 1.8, seen: false, msg: '', msgT: 0, hearts: [],
    };

    /* ───── décor pré-rendu : cour de la maison ───── */
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const sky = b.createLinearGradient(0, 0, 0, 200);
      sky.addColorStop(0, '#79c2ec'); sky.addColorStop(1, '#cfeaf5');
      b.fillStyle = sky; b.fillRect(0, 0, W, 200);
      // mur de la maison (crépi ocre)
      b.fillStyle = '#e7c48c'; b.fillRect(0, 120, W, GROUND - 120);
      b.fillStyle = 'rgba(180, 120, 60, 0.12)';
      for (let i = 0; i < 60; i++) { b.beginPath(); b.arc((i * 137) % W, 140 + (i * 71) % 300, 6 + (i % 5) * 3, 0, Math.PI * 2); b.fill(); }
      // avancée de toit en tuiles
      b.fillStyle = '#b4532f'; b.fillRect(0, 108, W, 26);
      b.fillStyle = '#93401f'; for (let x = 0; x < W; x += 32) b.fillRect(x, 108, 4, 26);
      // fenêtre et porte
      b.fillStyle = '#6a4a30'; b.fillRect(560, 190, 120, 100);
      b.fillStyle = '#9fd0e8'; b.fillRect(568, 198, 104, 84);
      b.fillStyle = '#6a4a30'; b.fillRect(618, 198, 4, 84); b.fillRect(568, 238, 104, 4);
      b.fillStyle = '#7a4a2e'; b.fillRect(70, 230, 90, GROUND - 230);
      b.fillStyle = '#c99a5a'; b.beginPath(); b.arc(145, 360, 5, 0, Math.PI * 2); b.fill();
      // sol de terre battue
      b.fillStyle = '#c98a55'; b.fillRect(0, GROUND, W, H - GROUND);
      b.fillStyle = '#b77a48';
      for (let i = 0; i < 26; i++) { b.beginPath(); b.ellipse((i * 113) % W, GROUND + 12 + (i * 29) % 55, 18, 3, 0, 0, Math.PI * 2); b.fill(); }
      // manguier à droite (le refuge du singe)
      b.fillStyle = '#7a5332'; b.fillRect(900, 160, 24, GROUND - 160);
      b.fillStyle = '#3f8a3a';
      b.beginPath(); b.arc(912, 150, 80, 0, Math.PI * 2); b.arc(850, 190, 50, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#f2b33d';
      for (const [x, y] of [[880, 170], [930, 200], [860, 215], [950, 150]]) { b.beginPath(); b.ellipse(x, y, 7, 9, 0.3, 0, Math.PI * 2); b.fill(); }
      // corde à linge + linge
      b.fillStyle = '#8a6a44'; b.fillRect(668, 250, 7, GROUND - 250);
      b.strokeStyle = '#eee'; b.lineWidth = 2;
      b.beginPath(); b.moveTo(672, 292); b.quadraticCurveTo(780, 306, 900, 292); b.stroke();
      for (const [x, c, w, h] of [[690, '#f4f1ea', 34, 46], [736, '#e0703c', 30, 52], [820, '#5a8ad0', 36, 40], [862, '#f2d04d', 26, 34]]) {
        b.fillStyle = c; b.fillRect(x, 298, w, h);
        b.fillStyle = '#c9a07a'; b.fillRect(x + 4, 294, 4, 8); b.fillRect(x + w - 8, 294, 4, 8);
      }
    }

    function drawMonkey(g, x, y, t, mood) {
      const jump = mood === 'play' ? Math.abs(Math.sin(t * 6)) * 26 : 0;
      y -= jump;
      g.lineCap = 'round';
      // queue en spirale
      g.strokeStyle = '#6a4428'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(x + 10, y - 10); g.quadraticCurveTo(x + 40, y - 6, x + 38, y - 34); g.quadraticCurveTo(x + 36, y - 50, x + 26, y - 42); g.stroke();
      // jambes
      g.strokeStyle = '#7a5232'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(x - 7, y - 10); g.lineTo(x - 12, y); g.moveTo(x + 7, y - 10); g.lineTo(x + 12, y); g.stroke();
      // corps
      g.fillStyle = '#7a5232'; g.beginPath(); g.ellipse(x, y - 22, 15, 18, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d9b48a'; g.beginPath(); g.ellipse(x, y - 19, 9, 12, 0, 0, Math.PI * 2); g.fill();
      // bras (en l'air quand il joue)
      const wave = Math.sin(t * 10) * 6;
      g.strokeStyle = '#7a5232'; g.lineWidth = 6;
      g.beginPath();
      if (mood === 'play') { g.moveTo(x - 12, y - 30); g.lineTo(x - 24, y - 50 + wave); g.moveTo(x + 12, y - 30); g.lineTo(x + 24, y - 50 - wave); }
      else { g.moveTo(x - 12, y - 30); g.lineTo(x - 18, y - 12); g.moveTo(x + 12, y - 30); g.lineTo(x + 18, y - 12); }
      g.stroke();
      // tête
      const hy = y - 48;
      g.fillStyle = '#7a5232';
      g.beginPath(); g.arc(x - 15, hy, 7, 0, Math.PI * 2); g.arc(x + 15, hy, 7, 0, Math.PI * 2); g.arc(x, hy, 15, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8c8a0';
      g.beginPath(); g.arc(x - 15, hy, 3.5, 0, Math.PI * 2); g.arc(x + 15, hy, 3.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x - 5, hy - 2, 6, 7, 0, 0, Math.PI * 2); g.ellipse(x + 5, hy - 2, 6, 7, 0, 0, Math.PI * 2); g.ellipse(x, hy + 6, 9, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a1a10';
      g.beginPath(); g.arc(x - 5, hy - 2, 2.2, 0, Math.PI * 2); g.arc(x + 5, hy - 2, 2.2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2a1a10'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, hy + 5, 4, 0.2, Math.PI - 0.2); g.stroke();
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        for (const h of s.hearts) { h.y -= 50 * dt; h.life -= dt; }
        s.hearts = s.hearts.filter((h) => h.life > 0);

        const hold = !api.ended && input.held();
        if (hold && !s.held && s.away === 0) api.sfx('whoosh');
        s.held = hold;
        s.hide = clamp(s.hide + (hold ? 6 : -5) * dt, 0, 1);
        s.away = Math.max(0, s.away - dt);

        // Mami : dos tourné → « Hmm ? » → elle regarde
        s.mT -= dt;
        if (!api.ended && s.mT <= 0) {
          if (s.mstate === 'back') { s.mstate = 'warn'; s.mT = 0.65; api.sfx('beep'); }
          else if (s.mstate === 'warn') { s.mstate = 'look'; s.mT = rand(1.0, 1.4); s.seen = false; }
          else { s.mstate = 'back'; s.mT = s.seen ? rand(1.2, 1.6) : rand(2.0, 3.0); } // après t'avoir vu, elle se méfie
        }

        if (api.ended) return;
        if (s.mstate === 'look' && !s.seen && s.away === 0 && s.hide < 0.8) {
          s.seen = true;
          s.caught++;
          s.friend = Math.max(0, s.friend * 0.5 - 20);
          s.away = 2.0;
          api.sfx('ouch'); api.shake(10);
          s.msg = s.caught >= 3 ? 'Bon, j’appelle le monsieur !' : 'Encore ce singe ?!';
          s.msgT = 1.3;
          if (s.caught >= 3) { api.end(false); return; }
        }
        if (s.away === 0 && s.hide < 0.2) {
          s.friend += 30 * dt;
          if (Math.random() < dt * 2.5) s.hearts.push({ x: PLAY_X + rand(-40, 40), y: 360, life: 1 });
        } else if (s.hide >= 0.2) {
          s.friend = Math.max(0, s.friend - 3 * dt); // le singe s'ennuie dans le panier
        }
        if (s.friend >= 100) {
          s.friend = 100;
          api.sfx('catch');
          api.burst(PLAY_X, 380, { n: 18, color: ['#ff6b8a', '#ffd0dc', '#fff'], speed: 220, gravity: 200, size: 7 });
          api.end(true, s.caught === 0
            ? 'Meilleurs amis, et Mami n’a jamais rien vu ! (Elle finira quand même par appeler le monsieur.)'
            : 'Meilleurs amis ! Mami a des doutes… (Elle finira quand même par appeler le monsieur.)');
        }
      },
      timeout() { return s.friend >= 100; },
      draw(g) {
        g.drawImage(bg, 0, 0);
        const lost = api.ended && s.caught >= 3;

        // ── Mami
        const looking = s.mstate === 'look' || lost;
        if (looking) {
          drawPerson(g, { ...PEOPLE.mami, x: MX, y: GROUND, size: 64, t: s.t, flipX: true,
            expression: s.seen || lost ? 'angry' : 'surprised', pose: s.seen || lost ? 'point' : 'stand' });
        } else {
          // de dos, les mains sur la corde à linge
          const p = drawPerson(g, { ...PEOPLE.mami, x: MX, y: GROUND, size: 64, t: s.t,
            hands: { l: { x: MX - 34, y: 300 + Math.sin(s.t * 4) * 3 }, r: { x: MX + 30, y: 302 - Math.sin(s.t * 4) * 3 } } });
          g.fillStyle = PEOPLE.mami.hairColor;
          g.beginPath(); g.arc(p.hx, p.hy, p.r * 1.03, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(p.hx, p.hy - p.r * 0.75, p.r * 0.45, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(150, 140, 130, 0.6)'; g.lineWidth = 2;
          for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(p.hx + k * 6, p.hy - 4, p.r * 0.8, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
          if (s.mstate === 'warn') {
            const k = 1 + Math.sin(s.t * 30) * 0.08;
            api.roundRect(g, MX - 70, 120, 140, 50, 18); g.fillStyle = '#fff'; g.fill();
            g.beginPath(); g.moveTo(MX - 10, 168); g.lineTo(MX + 4, 190); g.lineTo(MX + 12, 168); g.fill();
            api.text(g, 'Hmm… ?', MX, 146, { size: 26 * k, color: '#b5577a' });
            api.text(g, '!', MX - 100, 160, { size: 60 * k, color: '#ff4d3d', stroke: '#000a', weight: 900 });
          }
        }
        if (s.msgT > 0) api.text(g, s.msg, MX - 40, 140, { size: 26, color: '#fff', stroke: '#8a2b4a', strokeWidth: 7 });

        // ── petit Papa assis
        const scared = s.mstate !== 'back' && !api.ended;
        const kidExpr = lost ? 'worried' : api.ended ? 'laugh' : s.seen && s.mstate === 'look' ? 'panic' : scared ? 'worried' : s.hide < 0.2 ? 'laugh' : 'focus';
        const info = api.avatar(g, { x: KID, y: GROUND, size: 54, pose: 'sit', expression: kidExpr, lookX: 1, sweat: scared && s.hide > 0.5,
          hands: s.hide < 0.2 && s.away === 0 ? { l: { x: KID + 60, y: GROUND - 90 + Math.sin(s.t * 6) * 8 }, r: { x: KID + 80, y: GROUND - 70 } } : undefined });
        g.fillStyle = '#4a3424';
        g.beginPath(); g.arc(info.hx, info.hy, 28, Math.PI * 1.08, Math.PI * 1.92); g.quadraticCurveTo(info.hx, info.hy - 15, info.hx - 27.5, info.hy - 7); g.fill();

        // ── le panier (fond)
        const bxl = BASKET_X;
        g.fillStyle = '#8a5a2e'; g.beginPath(); g.ellipse(bxl, GROUND - 56, 40, 10, 0, 0, Math.PI * 2); g.fill();

        // ── le singe
        if (s.away > 0 || lost) {
          // il file se réfugier dans le manguier
          const k = lost ? 1 : clamp((2.0 - s.away) / 0.5, 0, 1);
          const back = !lost && s.away < 0.4 ? (0.4 - s.away) / 0.4 : 0;
          const x = lerp(lerp(PLAY_X, 880, k), PLAY_X, back), y = lerp(lerp(GROUND, 230, k), GROUND, back);
          drawMonkey(g, x, y, s.t, 'scared');
        } else if (s.hide < 0.95) {
          const x = lerp(PLAY_X, BASKET_X, s.hide), y = GROUND - Math.sin(s.hide * Math.PI) * 60 + s.hide * 20;
          drawMonkey(g, x, y, s.t, s.hide < 0.2 ? 'play' : 'hide');
        }
        // ── le panier (devant) + couvercle
        g.fillStyle = '#c8914f';
        g.beginPath(); g.moveTo(bxl - 42, GROUND - 56); g.lineTo(bxl + 42, GROUND - 56); g.lineTo(bxl + 34, GROUND); g.lineTo(bxl - 34, GROUND); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(120, 70, 30, 0.55)'; g.lineWidth = 2;
        for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(bxl - 42 + k * 2, GROUND - 56 + k * 11); g.lineTo(bxl + 42 - k * 2, GROUND - 56 + k * 11); g.stroke(); }
        if (s.hide >= 0.95 && s.away === 0) {
          // couvercle posé… et la queue qui dépasse !
          g.strokeStyle = '#6a4428'; g.lineWidth = 5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(bxl + 30, GROUND - 58); g.quadraticCurveTo(bxl + 60, GROUND - 70 + Math.sin(s.t * 5) * 4, bxl + 54, GROUND - 92); g.stroke();
          g.fillStyle = '#a8713a'; api.roundRect(g, bxl - 46, GROUND - 66, 92, 12, 6); g.fill();
          g.fillStyle = '#8a5a2e'; g.fillRect(bxl - 8, GROUND - 74, 16, 8);
        } else {
          g.fillStyle = '#a8713a'; g.save(); g.translate(bxl - 46, GROUND - 60); g.rotate(-0.9); api.roundRect(g, 0, -12, 92, 12, 6); g.fill(); g.restore();
        }

        // cœurs d'amitié
        for (const h of s.hearts) api.text(g, '♥', h.x, h.y, { size: 24, color: `rgba(255, 90, 130, ${h.life})` });

        // HUD
        api.text(g, 'Amitié', 30, 42, { align: 'left', size: 22, color: '#fff', stroke: '#000a' });
        api.roundRect(g, 120, 30, 320, 24, 12); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
        if (s.friend > 1) { api.roundRect(g, 122, 32, Math.max(20, 316 * s.friend / 100), 20, 10); g.fillStyle = '#ff6b8a'; g.fill(); }
        api.text(g, '♥', 455, 43, { size: 26, color: '#ff6b8a', stroke: '#000a', strokeWidth: 4 });
        api.text(g, `Mami t’a vu : ${s.caught} / 3`, 30, 82, { align: 'left', size: 20, color: s.caught ? '#ffd0a0' : '#fff', stroke: '#000a', strokeWidth: 5 });
        if (api.ended) api.text(g, lost ? 'Bon, j’appelle le monsieur…' : 'Meilleurs amis !', W / 2 - 80, 200, { size: 44, color: lost ? '#fff' : '#ffe27a', stroke: '#000a', strokeWidth: 8 });
      },
    };
  },
};

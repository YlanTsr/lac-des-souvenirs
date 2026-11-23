/**
 * Chapitre I — « La course tout nu » (course_tout_nu)
 * Tout petit, Papa a couru tout nu après le « boy » qui entretenait la maison ; tout le monde riait.
 * Mécanique : runner horizontal. Sauter (Espace / clic / ↑) par-dessus seau, balai et poule.
 * On gagne du terrain surtout en courant AU SOL (sauter sans arrêt fait perdre du temps) ;
 * chaque obstacle percuté fait reculer. Rattraper le boy avant la fin = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'course_tout_nu',
  title: 'La course tout nu',
  instructions: 'Tout petit et tout nu, tu cours après le boy : saute par-dessus le seau, le balai et la poule pour le rattraper !',
  controls: 'Espace / clic / ↑ : sauter',
  duration: 12,
  introExpression: 'laugh',
  successTitle: 'Attrapé !',
  failTitle: 'Il court trop vite !',
  successText: 'Attrapé ! Le boy éclate de rire, et toute la maison avec lui. Toi, tu es très fier… et toujours tout nu.',
  failText: 'Le boy court plus vite que toi ! Toute la maison rit aux larmes. Heureusement, la censure veille.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const GROUND = 456;
    const PX = 170;          // position de petit Papa
    const V = 340;           // vitesse de défilement
    const GAP0 = 600, CATCH = 72;
    const s = {
      t: 0, scroll: 0, gap: GAP0, jy: 0, vy: 0, air: false, buffer: 0, stun: 0, hits: 0,
      obs: [], nextObs: 1.0, caught: false, msg: '', msgT: 0, jumps: 0,
    };

    /* ───── décor lointain pré-rendu (2 écrans, se répète) ───── */
    const FAR_W = 1920;
    const far = document.createElement('canvas');
    far.width = FAR_W; far.height = GROUND;
    {
      const b = far.getContext('2d');
      const sky = b.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, '#5fb3e8'); sky.addColorStop(0.7, '#bfe3f2'); sky.addColorStop(1, '#f6e2b5');
      b.fillStyle = sky; b.fillRect(0, 0, FAR_W, GROUND);
      b.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [x, y, k] of [[160, 110, 1], [700, 80, 1.3], [1150, 130, 0.9], [1600, 95, 1.1]]) {
        b.beginPath(); b.arc(x, y, 26 * k, 0, Math.PI * 2); b.arc(x + 30 * k, y - 10 * k, 32 * k, 0, Math.PI * 2); b.arc(x + 64 * k, y, 24 * k, 0, Math.PI * 2); b.fill();
      }
      // savane et arbres lointains
      b.fillStyle = '#c9c27a';
      b.beginPath(); b.moveTo(0, 360);
      for (let x = 0; x <= FAR_W; x += 80) b.lineTo(x, 350 + Math.sin(x * 0.0065) * 14);
      b.lineTo(FAR_W, GROUND); b.lineTo(0, GROUND); b.fill();
      b.fillStyle = '#7d9a52';
      for (let i = 0; i < 12; i++) {
        const x = 60 + i * 160 + (i % 3) * 20;
        b.fillRect(x - 3, 320, 6, 36);
        b.beginPath(); b.ellipse(x, 318, 42, 14, 0, 0, Math.PI * 2); b.fill(); // acacias
      }
      // la maison (véranda, toit rouge, bougainvillier)
      const hx = 900;
      b.fillStyle = '#f3e3c3'; b.fillRect(hx, 250, 420, 140);
      b.fillStyle = '#b8462e';
      b.beginPath(); b.moveTo(hx - 30, 255); b.lineTo(hx + 210, 190); b.lineTo(hx + 450, 255); b.fill();
      b.fillStyle = '#e9d6b0'; b.fillRect(hx, 330, 420, 10);
      b.fillStyle = '#d2bb92'; for (let k = 0; k < 6; k++) b.fillRect(hx + 10 + k * 80, 270, 10, 120);
      b.fillStyle = '#5a7a9a'; for (const k of [60, 300]) b.fillRect(hx + k, 280, 50, 40);
      b.fillStyle = '#7a4a2e'; b.fillRect(hx + 185, 300, 50, 90);
      b.fillStyle = '#d2479a';
      for (let k = 0; k < 40; k++) { b.beginPath(); b.arc(hx - 10 + (k * 37) % 120, 260 + (k * 23) % 110, 9, 0, Math.PI * 2); b.fill(); }
      b.fillStyle = '#4f8a3a';
      for (let k = 0; k < 18; k++) { b.beginPath(); b.arc(hx + 5 + (k * 53) % 100, 275 + (k * 31) % 100, 7, 0, Math.PI * 2); b.fill(); }
      // toute la maison rit sur la véranda
      drawPerson(b, { ...PEOPLE.mami, x: hx + 120, y: 390, size: 26, expression: 'laugh' });
      drawPerson(b, { ...PEOPLE.papi, x: hx + 160, y: 390, size: 26, expression: 'laugh' });
      drawPerson(b, { ...PEOPLE.passant, shirt: '#e0a33a', x: hx + 290, y: 390, size: 26, expression: 'laugh' });
      b.fillStyle = '#7a3e22'; b.font = '700 15px sans-serif'; b.textAlign = 'center';
      b.fillText('ha ha !', hx + 140, 312); b.fillText('hi hi !', hx + 290, 312);
    }
    const palms = Array.from({ length: 5 }, (_, i) => ({ x: i * 260 + rand(0, 80), h: rand(170, 230) }));
    const tufts = Array.from({ length: 22 }, (_, i) => ({ x: i * 48 + rand(0, 30), y: GROUND + 14 + (i % 4) * 16 }));

    const TYPES = {
      seau: { w: 36, h: 38 },
      balai: { w: 74, h: 16 },
      poule: { w: 42, h: 40 },
    };
    function spawn() {
      const k = ['seau', 'balai', 'poule'][Math.floor(rand(0, 3))];
      s.obs.push({ kind: k, x: W + 50, w: TYPES[k].w, h: TYPES[k].h, hit: false, fly: 0, vx: 0, vy: 0, oy: 0, rot: 0, ph: rand(0, 6) });
    }
    function hit(o) {
      o.hit = true; o.vx = 260; o.vy = -420;
      s.hits++; s.stun = 0.5; s.gap += 70;
      api.shake(10);
      if (o.kind === 'seau') { api.sfx('clang'); api.burst(o.x, GROUND - 20, { n: 14, color: ['#7fc8f0', '#bfe6ff'], speed: 260, gravity: 700, size: 5 }); s.msg = 'Splash !'; }
      else if (o.kind === 'balai') { api.sfx('boing'); s.msg = 'Oups, le balai !'; }
      else { api.sfx('ouch'); api.burst(o.x, GROUND - 30, { n: 12, color: ['#ffffff', '#f2e8d8'], speed: 200, gravity: 120, size: 5 }); s.msg = 'Cot cot cot !'; }
      s.msgT = 0.9;
    }

    function drawKid(g, x, y, t) {
      const run = !s.air && !api.ended;
      const ph = Math.sin(t * 15);
      const hipY = y - 30, shY = y - 58;
      g.lineCap = 'round';
      // jambes (peau)
      g.strokeStyle = '#e3b08c'; g.lineWidth = 10;
      for (const k of [-1, 1]) {
        g.beginPath(); g.moveTo(x + k * 5, hipY);
        if (s.air) g.lineTo(x + k * 6 + 8, y - 12);
        else if (run) g.lineTo(x + k * ph * 13, y - Math.max(0, k * ph) * 8);
        else g.lineTo(x + k * 7, y);
        g.stroke();
      }
      g.fillStyle = '#efc29e';
      // torse (petit bidon)
      g.beginPath(); g.ellipse(x + 2, (hipY + shY) / 2, 15, 19, 0, 0, Math.PI * 2); g.fill();
      // bras
      g.strokeStyle = '#efc29e'; g.lineWidth = 8;
      for (const k of [-1, 1]) {
        g.beginPath(); g.moveTo(x + k * 10, shY + 6);
        if (api.ended && s.caught) g.lineTo(x + k * 18, shY - 22);
        else if (s.air) g.lineTo(x + k * 22, shY - 6);
        else g.lineTo(x + k * 6 - (run ? k * ph * 12 : 0), shY + 26);
        g.stroke();
      }
      // le bandeau CENSURÉ (obligatoire !)
      g.save(); g.translate(x + 2, hipY - 4); g.rotate(-0.22);
      g.fillStyle = '#111'; g.fillRect(-40, -13, 80, 26);
      g.fillStyle = '#fff'; g.font = '900 13px "Nunito Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('CENSURÉ', 0, 1);
      g.restore();
      // tête de Papa enfant (+ ses cheveux d'enfant)
      const hx = x + 4, hy = shY - 20;
      const expr = s.stun > 0 ? 'ouch' : api.ended ? (s.caught ? 'laugh' : 'laugh') : s.air ? 'surprised' : 'happy';
      api.avatar(g, { x: hx, y: hy, size: 44, body: false, expression: expr, lookX: 1, blush: 0.7, tears: s.stun > 0 });
      g.fillStyle = '#4a3424';
      g.beginPath(); g.arc(hx, hy, 23, Math.PI * 1.08, Math.PI * 1.92); g.quadraticCurveTo(hx, hy - 12, hx - 22.5, hy - 6); g.fill();
      g.beginPath(); g.arc(hx - 3, hy - 22, 5, 0, Math.PI * 2); g.fill();
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.stun = Math.max(0, s.stun - dt);
        s.msgT = Math.max(0, s.msgT - dt);
        s.buffer = Math.max(0, s.buffer - dt);
        const v = api.ended ? (s.caught ? 0 : V * 0.4) : V * (s.stun > 0 ? 0.55 : 1);
        s.scroll += v * dt;

        if (!api.ended) {
          if (input.pressed() || input.pressed('up')) s.buffer = 0.12;
          if (s.buffer > 0 && !s.air) { s.air = true; s.vy = -640; s.buffer = 0; s.jumps++; api.sfx('whoosh'); }
          // on gagne surtout du terrain en courant au sol
          const rate = s.stun > 0 ? -40 : s.air ? 35 : 95;
          s.gap = clamp(s.gap - rate * dt, CATCH - 10, 720);
          s.nextObs -= dt;
          if (s.nextObs <= 0) { spawn(); s.nextObs = rand(0.95, 1.45); }
        }
        if (s.air) {
          s.vy += 1900 * dt; s.jy -= s.vy * dt;
          if (s.jy <= 0) { s.jy = 0; s.vy = 0; s.air = false; }
        }

        for (const o of s.obs) {
          o.x -= (v + (o.kind === 'poule' && !o.hit ? 55 : 0)) * dt;
          if (o.hit) { o.vy += 1200 * dt; o.oy += o.vy * dt; o.x += o.vx * dt; o.rot += dt * 9; if (o.kind === 'poule') { o.oy -= 600 * dt; } continue; }
          if (!api.ended && Math.abs(o.x - PX) < o.w / 2 + 12 && s.jy < o.h - 4) hit(o);
        }
        s.obs = s.obs.filter((o) => o.x > -100 && o.oy < 300 && o.oy > -600);

        if (!api.ended && s.gap <= CATCH) {
          s.caught = true;
          api.sfx('catch');
          api.burst(PX + 40, GROUND - 90, { n: 20, shape: 'star', color: ['#ffd34d', '#ffffff', '#ff9a3c'], speed: 260, gravity: 300, size: 7 });
          api.end(true, s.hits === 0
            ? 'Attrapé sans une seule chute ! Le boy éclate de rire, et toute la maison avec lui. Toi, tu es très fier… et toujours tout nu.'
            : 'Attrapé ! Le boy éclate de rire, et toute la maison avec lui. Toi, tu es très fier… et toujours tout nu.');
        }
        if (api.ended && !s.caught) s.gap += 260 * dt; // le boy file au loin
      },
      timeout() { return false; },
      draw(g) {
        // ciel + maison qui défilent lentement
        const fo = -((s.scroll * 0.15) % FAR_W);
        g.drawImage(far, fo, 0); g.drawImage(far, fo + FAR_W, 0);
        // palmiers (plan moyen)
        for (const p of palms) {
          const x = ((p.x - s.scroll * 0.55) % 1300 + 1300) % 1300 - 170;
          g.strokeStyle = '#8a6a44'; g.lineWidth = 11; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, GROUND); g.quadraticCurveTo(x + 22, GROUND - p.h / 2, x + 10, GROUND - p.h); g.stroke();
          g.strokeStyle = '#3f8a3a'; g.lineWidth = 7;
          for (let k = 0; k < 7; k++) {
            const a = -Math.PI + (k / 6) * Math.PI;
            g.beginPath(); g.moveTo(x + 10, GROUND - p.h); g.quadraticCurveTo(x + 10 + Math.cos(a) * 45, GROUND - p.h - 30, x + 10 + Math.cos(a) * 80, GROUND - p.h + 26); g.stroke();
          }
          g.fillStyle = '#8a5a2e'; g.beginPath(); g.arc(x + 4, GROUND - p.h + 10, 7, 0, Math.PI * 2); g.arc(x + 17, GROUND - p.h + 12, 7, 0, Math.PI * 2); g.fill();
        }
        // sol de latérite
        g.fillStyle = '#b9603a'; g.fillRect(0, GROUND, W, H - GROUND);
        g.fillStyle = '#c9744a'; g.fillRect(0, GROUND, W, 10);
        g.fillStyle = '#8fae4a';
        for (const tf of tufts) {
          const x = ((tf.x - s.scroll) % 1056 + 1056) % 1056 - 48;
          g.beginPath(); g.moveTo(x, tf.y); g.lineTo(x + 5, tf.y - 12); g.lineTo(x + 9, tf.y); g.lineTo(x + 14, tf.y - 9); g.lineTo(x + 18, tf.y); g.fill();
        }

        // obstacles
        for (const o of s.obs) {
          g.save(); g.translate(o.x, GROUND + o.oy); if (o.hit) g.rotate(o.rot * (o.kind === 'poule' ? 0.1 : 1));
          if (o.kind === 'seau') {
            g.fillStyle = '#7d8ea0';
            g.beginPath(); g.moveTo(-18, -38); g.lineTo(18, -38); g.lineTo(13, 0); g.lineTo(-13, 0); g.closePath(); g.fill();
            g.fillStyle = '#5f6f80'; g.fillRect(-19, -40, 38, 5);
            g.fillStyle = '#7fc8f0'; g.fillRect(-16, -36, 32, 4);
            g.strokeStyle = '#4a5560'; g.lineWidth = 2; g.beginPath(); g.arc(0, -38, 16, Math.PI, 0); g.stroke();
          } else if (o.kind === 'balai') {
            g.fillStyle = '#a07040'; g.fillRect(-37, -9, 52, 6);
            g.fillStyle = '#d9b45a';
            g.beginPath(); g.moveTo(14, -12); g.lineTo(38, -18); g.lineTo(40, 0); g.lineTo(14, -2); g.closePath(); g.fill();
            g.strokeStyle = '#b8903a'; g.lineWidth = 1.5;
            for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(16, -10 + k * 2); g.lineTo(39, -16 + k * 4); g.stroke(); }
          } else {
            const bob = o.hit ? 0 : Math.abs(Math.sin(s.t * 10 + o.ph)) * 3;
            const fl = o.hit ? Math.sin(s.t * 40) * 10 : 0;
            g.strokeStyle = '#e0a030'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(-5, -12); g.lineTo(-7 + Math.sin(s.t * 10 + o.ph) * 4, 0); g.moveTo(5, -12); g.lineTo(5 - Math.sin(s.t * 10 + o.ph) * 4, 0); g.stroke();
            g.fillStyle = '#fbf6ec';
            g.beginPath(); g.ellipse(2, -24 - bob, 19, 14, 0, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.moveTo(17, -30 - bob); g.lineTo(26, -44 - bob); g.lineTo(22, -24 - bob); g.fill(); // queue
            g.beginPath(); g.arc(-15, -36 - bob, 9, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#e8ddcc'; g.beginPath(); g.ellipse(4, -24 - bob + fl * 0.3, 10, 6 + Math.abs(fl) * 0.4, -0.3, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#e0453c'; g.beginPath(); g.arc(-16, -46 - bob, 4, 0, Math.PI * 2); g.arc(-12, -45 - bob, 3.5, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.ellipse(-20, -30 - bob, 2.5, 4, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#f0b030'; g.beginPath(); g.moveTo(-23, -38 - bob); g.lineTo(-30, -35 - bob); g.lineTo(-23, -33 - bob); g.fill();
            g.fillStyle = '#222'; g.beginPath(); g.arc(-17, -38 - bob, 1.8, 0, Math.PI * 2); g.fill();
          }
          g.restore();
        }

        // le boy, qui rit en courant (il saute lui aussi les obstacles)
        const bx = Math.min(PX + s.gap, W + 80);
        let hop = 0;
        for (const o of s.obs) if (!o.hit && Math.abs(o.x - bx) < 55) hop = Math.max(hop, Math.cos(((o.x - bx) / 55) * Math.PI / 2) * 60);
        if (bx < W + 60) {
          drawPerson(g, {
            ...PEOPLE.boy, x: bx, y: GROUND - hop, size: 50, t: s.t * 0.95,
            pose: api.ended && s.caught ? 'arms_up' : 'run', expression: 'laugh', flipX: api.ended && s.caught,
          });
          if (!api.ended && Math.sin(s.t * 3) > 0.6) api.text(g, 'Ha ha !', bx + 10, GROUND - 170 - hop, { size: 20, color: '#fff', stroke: '#000a', strokeWidth: 5 });
        } else if (!api.ended) {
          api.text(g, '→', W - 40, GROUND - 80, { size: 40, color: '#fff', stroke: '#000a' });
        }

        // petit Papa
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(PX, GROUND + 2, 22 - s.jy * 0.06, 5, 0, 0, Math.PI * 2); g.fill();
        drawKid(g, PX, GROUND - s.jy, s.t);

        if (s.msgT > 0) api.text(g, s.msg, PX + 30, GROUND - 160, { size: 26, color: '#fff', stroke: '#000a' });

        // jauge de distance
        const k = clamp(1 - (s.gap - CATCH) / (GAP0 - CATCH), 0, 1);
        api.text(g, 'Rattrape le boy !', 30, 44, { align: 'left', size: 22, color: '#fff', stroke: '#000a' });
        api.roundRect(g, 240, 32, 440, 24, 12); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
        if (k > 0.01) { api.roundRect(g, 242, 34, Math.max(20, 436 * k), 20, 10); g.fillStyle = k > 0.75 ? '#7fd36b' : '#ffc14d'; g.fill(); }
        g.fillStyle = '#f4f1ea'; g.beginPath(); g.arc(690, 44, 13, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#7a4a2e'; g.beginPath(); g.arc(690, 46, 9, 0, Math.PI * 2); g.fill();
        if (s.hits) api.text(g, `Chutes : ${s.hits}`, 30, 80, { align: 'left', size: 18, color: '#ffe3c0', stroke: '#000a', strokeWidth: 4 });

        if (api.ended) {
          api.text(g, s.caught ? 'Attrapé !' : 'Trop rapide !', W / 2, 160, { size: 56, color: s.caught ? '#ffe27a' : '#fff', stroke: '#000a', strokeWidth: 9 });
          api.text(g, 'HA HA HA !', W / 2 + Math.sin(s.t * 20) * 4, 220, { size: 30, color: '#ffd0a0', stroke: '#000a' });
        }
      },
    };
  },
};

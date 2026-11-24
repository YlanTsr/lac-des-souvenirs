/**
 * Anecdote #3 — « Le marteau sur le doigt » (marteau_doigt)
 * Mécanique de timing : le marteau balance au-dessus de l'établi ;
 * frapper quand il est pile au-dessus du clou (3 coups pour l'enfoncer)…
 * et surtout pas au-dessus du doigt !
 */
import { LOOK } from '../avatar.js';

export default {
  id: 'marteau_doigt',
  title: 'Le marteau sur le doigt',
  instructions: 'Séance bricolage ! Le marteau se balance : frappe quand il est pile au-dessus du clou. Trois bons coups pour l’enfoncer… et épargne le doigt de Papa !',
  controls: 'Espace / clic / tap : frapper',
  duration: 12,
  introExpression: 'focus',
  successTitle: 'Clou planté !',
  failTitle: 'AÏE AÏE AÏE !',

  create(api) {
    const { W, H } = api;
    const NAIL_X = 560, PLANK_Y = 372;
    const NAIL_TOP0 = 232; // tête du clou au départ
    const FINGER_MIN = 456, FINGER_MAX = 540;
    const s = {
      nails: 0, fingers: 0, misses: 0,
      swingT: 0, speed: 3,
      strike: 0, striking: false, strikeX: 0, hitType: null, hitT: 0,
      fingerSwell: 0, throb: 0, dents: [], t: 0, msg: '', msgT: 0,
    };
    const nailTop = () => NAIL_TOP0 + (PLANK_Y - 18 - NAIL_TOP0) * (s.nails / 3);
    const hammerX = () => 510 + Math.sin(s.swingT) * 190;

    function resolveStrike() {
      const x = s.strikeX;
      if (Math.abs(x - NAIL_X) < 30) {
        s.nails++;
        s.hitType = 'nail';
        s.speed += 0.4;
        api.sfx('clang');
        api.burst(NAIL_X, nailTop(), { n: 14, color: ['#fff2a8', '#ffd36b'], speed: 260, gravity: 500, size: 3 });
        s.msg = ['Toc !', 'Bien !', 'Parfait !'][s.nails - 1]; s.msgT = 0.8;
        if (s.nails >= 3) api.end(true, s.fingers ? `Clou planté… avec seulement ${s.fingers} petit${s.fingers > 1 ? 's' : ''} détour${s.fingers > 1 ? 's' : ''} par le doigt. Un vrai bricoleur du dimanche !` : 'Trois coups, zéro doigt écrasé : le bricoleur parfait. (Ce qui n’a pas été le cas le vrai jour…)');
      } else if (x > FINGER_MIN - 20 && x < FINGER_MAX + 4) {
        s.fingers++;
        s.hitType = 'finger';
        s.fingerSwell = Math.min(1, s.fingerSwell + 0.42);
        s.throb = 1;
        api.sfx('ouch');
        api.shake(14);
        api.burst(500, 300, { n: 10, shape: 'star', color: ['#ffe14d', '#fff'], speed: 260, gravity: 120, size: 10, life: 1 });
        s.msg = 'AÏE !'; s.msgT = 1;
        if (s.fingers >= 3) api.end(false, 'Trois coups sur le doigt : il a doublé de volume et pris une jolie couleur aubergine. Le clou, lui, attend toujours.');
      } else {
        s.hitType = 'wood';
        s.misses++;
        s.dents.push(x);
        api.sfx('pop');
        s.msg = 'Raté…'; s.msgT = 0.6;
      }
      s.hitT = 0.25;
    }

    return {
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.throb = Math.max(0, s.throb - dt * 1.4);
        s.hitT = Math.max(0, s.hitT - dt);
        if (!s.striking) s.swingT += dt * s.speed;
        if (s.striking) {
          s.strike += dt / 0.13;
          if (s.strike >= 1 && !s.hitType) resolveStrike();
          if (s.strike >= 2.6) { s.striking = false; s.strike = 0; s.hitType = null; }
        } else if (!api.ended && input.pressed()) {
          s.striking = true;
          s.strike = 0;
          s.strikeX = hammerX();
          s.hitType = null;
          api.sfx('whoosh');
        }
      },
      timeout() {
        if (s.nails >= 2) { api.end(true, 'Presque enfoncé ! On dira que le clou est « décoratif ».'); return true; }
        api.end(false, 'Le temps de chercher le pansement, la séance bricolage était terminée. On finira demain !');
        return false;
      },
      draw(g) {
        // mur d'atelier (panneau perforé)
        g.fillStyle = '#c99e6b'; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(80,50,20,0.25)';
        for (let y = 20; y < 330; y += 30) for (let x = 20; x < W; x += 30) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
        // outils accrochés
        g.fillStyle = '#5f6670'; g.fillRect(760, 60, 10, 110); g.fillRect(740, 50, 50, 16);
        g.fillStyle = '#c0392b'; g.fillRect(820, 70, 16, 80); g.fillStyle = '#9aa3ad'; g.fillRect(824, 150, 8, 60);
        g.strokeStyle = '#5f6670'; g.lineWidth = 6; g.beginPath(); g.arc(880, 110, 28, 0, Math.PI * 1.5); g.stroke();
        // établi + planche
        g.fillStyle = '#7a5130'; g.fillRect(0, PLANK_Y + 48, W, H);
        g.fillStyle = '#e2b77c'; g.fillRect(140, PLANK_Y, 700, 50);
        g.strokeStyle = 'rgba(140,90,40,0.5)'; g.lineWidth = 2;
        for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(140, PLANK_Y + 10 + i * 11); g.bezierCurveTo(400, PLANK_Y + 4 + i * 12, 600, PLANK_Y + 18 + i * 10, 840, PLANK_Y + 8 + i * 11); g.stroke(); }
        for (const d of s.dents) { g.fillStyle = 'rgba(90,55,20,0.6)'; g.beginPath(); g.ellipse(d, PLANK_Y + 3, 14, 4, 0, 0, Math.PI * 2); g.fill(); }

        // clou
        const nt = nailTop();
        g.fillStyle = '#9aa3ad'; g.fillRect(NAIL_X - 4, nt, 8, PLANK_Y - nt);
        g.fillStyle = '#c3cad2'; api.roundRect(g, NAIL_X - 15, nt - 8, 30, 9, 3); g.fill();

        // main de Papa qui tient le clou (doigt qui gonfle à chaque coup raté)
        const sw = s.fingerSwell, th = 1 + s.throb * 0.12 * Math.sin(s.t * 30);
        const skin = sw > 0.5 ? '#e58a7a' : sw > 0.1 ? '#f0a88e' : LOOK.skin;
        g.strokeStyle = LOOK.shirt; g.lineWidth = 64; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-40, 330); g.lineTo(250, 320); g.stroke();
        g.strokeStyle = LOOK.skin; g.lineWidth = 50;
        g.beginPath(); g.moveTo(230, 320); g.lineTo(440, 316); g.stroke();
        g.fillStyle = LOOK.skin;
        g.beginPath(); g.ellipse(460, 318, 48, 36, 0, 0, Math.PI * 2); g.fill();
        // pouce (devant le clou)
        g.beginPath(); g.ellipse(510, 340, 30, 14, 0.3, 0, Math.PI * 2); g.fill();
        // index : celui qui prend tout !
        g.save();
        g.translate(500, 296);
        g.scale(th * (1 + sw * 0.6), th * (1 + sw * 0.9));
        g.fillStyle = skin;
        g.beginPath(); g.ellipse(18, 0, 34, 14, -0.12, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.beginPath(); g.ellipse(42, -3, 7, 6, 0, 0, Math.PI * 2); g.fill();
        g.restore();
        if (s.fingers) {
          g.fillStyle = '#fff'; g.fillRect(488, 284, 26, 10); // pansement
          g.fillStyle = '#f1c27d'; g.fillRect(492, 286, 18, 6);
        }

        // zones guides (discrètes)
        g.fillStyle = 'rgba(120, 220, 120, 0.22)'; g.fillRect(NAIL_X - 30, 70, 60, 8);
        g.fillStyle = 'rgba(255, 90, 90, 0.22)'; g.fillRect(FINGER_MIN - 20, 70, FINGER_MAX - FINGER_MIN + 24, 8);

        // marteau
        const hx = s.striking ? s.strikeX : hammerX();
        const k = s.striking ? Math.min(1, s.strike) : 0;
        const back = s.striking && s.strike > 1 ? Math.min(1, (s.strike - 1) / 1.2) : 0;
        const targetY = s.strikeX > FINGER_MIN - 20 && s.strikeX < FINGER_MAX + 4 && Math.abs(s.strikeX - NAIL_X) >= 30 ? 286 : Math.abs(s.strikeX - NAIL_X) < 30 ? nt - 10 : PLANK_Y - 4;
        const hy = 120 + (targetY - 40 - 120) * k * (1 - back);
        const ang = -0.6 * (1 - k) + 0.6 * back;
        g.save();
        g.translate(hx, hy);
        g.rotate(ang);
        g.fillStyle = '#8b5a2b'; api.roundRect(g, 6, -6, 150, 16, 6); g.fill();
        g.fillStyle = '#4b5058'; api.roundRect(g, -26, -16, 52, 44, 6); g.fill();
        g.fillStyle = '#6c737d'; g.fillRect(-26, 18, 52, 10);
        g.restore();
        if (s.hitT > 0 && s.hitType === 'finger') {
          api.text(g, 'AÏE !', 500, 220, { size: 70, color: '#ff5a5a', stroke: '#fff', strokeWidth: 10 });
        } else if (s.msgT > 0) {
          api.text(g, s.msg, NAIL_X, 190, { size: 38, color: '#fff', stroke: '#7a5130' });
        }

        // Papa (buste) en haut à gauche
        api.roundRect(g, 26, 22, 220, 168, 20); g.fillStyle = 'rgba(40,25,10,0.35)'; g.fill();
        g.save(); api.roundRect(g, 26, 22, 220, 168, 20); g.clip();
        api.avatar(g, {
          x: 136, y: 380, size: 100,
          expression: s.throb > 0.2 ? 'ouch' : api.ended ? (s.nails >= 3 ? 'happy' : 'laugh') : 'focus',
          tears: s.throb > 0.3, lookX: 1, lookY: 1,
        });
        g.restore();
        // compteurs
        api.text(g, `Clou : ${'●'.repeat(s.nails)}${'○'.repeat(3 - s.nails)}`, 700, 230, { size: 26, color: '#2b1a0a', align: 'left' });
        api.text(g, `Doigt : ${'🩹'.repeat(s.fingers)}`, 700, 266, { size: 22, color: '#2b1a0a', align: 'left' });
      },
    };
  },
};

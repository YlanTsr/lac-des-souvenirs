/**
 * « Le coup de fil à Jean-Yves » (jean_yves_toilettes)
 * Papa téléphonait à Jean-Yves… depuis les toilettes.
 * Mécanique : 6 bruits compromettants s'annoncent (l'icône gonfle jusqu'au cercle) ;
 * appuyer pile quand elle remplit le cercle pour les couvrir (« Hein ? Ça capte mal ! »).
 * Trop tôt : Jean-Yves se méfie. Plus de 2 ratés : « Attends… T'es aux toilettes là ?! »
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'jean_yves_toilettes',
  title: 'Le coup de fil à Jean-Yves',
  instructions: 'Tu téléphones à Jean-Yves depuis les toilettes : appuie pile quand chaque bruit remplit le cercle pour le couvrir, sans te trahir en parlant trop tôt !',
  controls: 'Espace / clic / tap : couvrir le bruit',
  duration: 12,
  introExpression: 'worried',
  successTitle: 'Couverture parfaite !',
  failTitle: 'Démasqué !',
  successText: 'Jean-Yves n’a rien soupçonné : pour lui, tu étais dans un tunnel avec un mauvais réseau et une petite toux. Discrétion absolue.',
  failText: '« Attends… T’es aux toilettes là ?! » Jean-Yves a tout compris. L’écho, ça ne pardonne pas.',

  create(api) {
    const { W, H, rand } = api;
    const NOISES = [
      { icon: '💧', label: 'Plouf !', color: '#5aa9e6' },
      { icon: '🧻', label: 'Frrrt… (papier)', color: '#e8dcc8' },
      { icon: '🔊', label: 'Écho… écho…', color: '#b59ad8' },
      { icon: '🚰', label: 'Plic ploc', color: '#7fc8e0' },
      { icon: '🪑', label: 'Grrrinç (abattant)', color: '#d8a66a' },
      { icon: '🌊', label: 'CHASSE D’EAU !', color: '#3f8fd6' },
    ];
    const COVERS = ['Hein ? Ça capte mal !', '*Kof kof* Pardon !', 'Je passe sous un tunnel !', 'Ha ha ! Elle est bonne !', 'Quoi ? Tu coupes !', 'Allô ? ALLÔ ?'];
    const HEARD = ['C’était quoi ce bruit ?', 'T’es où, là ?', 'Y a de l’écho chez toi…'];
    const EARLY = ['Pourquoi tu cries ?', 'Ça va, toi ?', 'Tu me caches un truc…'];
    const MAX_MISS = 2;
    const EARLY_W = 0.23, LATE_W = 0.13;

    // 6 bruits, un à la fois, de plus en plus vifs
    const noises = NOISES.map((n, i) => {
      const at = 0.7 + i * 1.72 + rand(-0.12, 0.12);
      const dur = 1.55 - i * 0.07;
      return { ...n, at, burst: at + dur, state: 'wait' }; // wait | live | covered | heard | early
    });

    const s = {
      t: 0, covered: 0, missed: 0, cooldown: 0, papaMsg: '', papaT: 0, jyMsg: '', jyT: 0,
      flash: 0, flashGood: true, noises, outcome: null, endT: 0,
    };

    // ── décor précalculé
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      // couloir
      g.fillStyle = '#e9d9bd'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(180, 140, 90, 0.18)';
      for (let x = 0; x < W; x += 36) g.fillRect(x, 0, 14, H);
      g.fillStyle = '#9a6b45'; g.fillRect(0, 470, W, 70);
      g.fillStyle = '#86593a'; for (let x = 0; x < W; x += 80) g.fillRect(x, 470, 3, 70);
      // l'intérieur des toilettes, vu par la porte entrouverte
      const DX0 = 160, DX1 = 520, DY0 = 92;
      g.fillStyle = '#cfe6ea'; g.fillRect(DX0, DY0, DX1 - DX0, 470 - DY0);
      g.strokeStyle = 'rgba(120, 160, 170, 0.45)'; g.lineWidth = 2;
      for (let y = DY0; y < 470; y += 34) { g.beginPath(); g.moveTo(DX0, y); g.lineTo(DX1, y); g.stroke(); }
      for (let x = DX0; x < DX1; x += 34) { g.beginPath(); g.moveTo(x, DY0); g.lineTo(x, 470); g.stroke(); }
      g.fillStyle = '#b9d6dc'; g.fillRect(DX0, 440, DX1 - DX0, 30);
      // réservoir de la chasse d'eau + rouleau de papier
      api.roundRect(g, 222, 250, 76, 110, 10); g.fillStyle = '#ffffff'; g.fill();
      g.fillStyle = '#d8dde2'; g.fillRect(250, 262, 22, 8);
      g.fillStyle = '#9aa3ad'; g.fillRect(440, 300, 34, 6);
      g.fillStyle = '#fbfbf6'; g.beginPath(); g.arc(457, 318, 16, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d9d4c6'; g.beginPath(); g.arc(457, 318, 5, 0, Math.PI * 2); g.fill();
      // petite fenêtre
      g.fillStyle = '#9fd3f5'; g.fillRect(380, 130, 70, 50);
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeRect(380, 130, 70, 50);
      // cadre de porte
      g.strokeStyle = '#7a5130'; g.lineWidth = 14; g.strokeRect(DX0 - 7, DY0 - 7, DX1 - DX0 + 14, 470 - DY0 + 14);
      // plante du couloir
      g.fillStyle = '#c0703c'; g.fillRect(60, 420, 54, 50);
      g.fillStyle = '#4f9a4a';
      for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(87 + (k - 2.5) * 10, 380 + Math.abs(k - 2.5) * 8, 10, 36, (k - 2.5) * 0.25, 0, Math.PI * 2); g.fill(); }
    }

    function drawToilet(g) {
      // cuvette (couvercle d'abattant derrière Papa)
      g.fillStyle = '#ffffff';
      api.roundRect(g, 238, 372, 120, 22, 10); g.fill();
      g.beginPath(); g.moveTo(256, 392); g.lineTo(340, 392); g.lineTo(326, 462); g.lineTo(270, 462); g.closePath(); g.fill();
      g.fillStyle = '#e4e9ee'; g.fillRect(262, 458, 72, 10);
      // petit marchepied sous les pieds
      g.fillStyle = '#e07b39'; api.roundRect(g, 326, 394, 64, 12, 5); g.fill();
      g.fillStyle = '#c4652a'; g.fillRect(332, 404, 8, 60); g.fillRect(376, 404, 8, 60);
    }

    function bubble(g, x, y, text, tailX, tailY, color = '#fffdf6', ink = '#3a2a20') {
      g.font = '800 19px "Nunito Sans", system-ui, sans-serif';
      const w = Math.max(90, g.measureText(text).width + 30), h = 42;
      api.roundRect(g, x - w / 2, y - h / 2, w, h, 16);
      g.fillStyle = color; g.fill();
      g.strokeStyle = 'rgba(60,40,30,0.5)'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.moveTo(x - 10, y + h / 2 - 1); g.lineTo(tailX, tailY); g.lineTo(x + 10, y + h / 2 - 1); g.closePath(); g.fillStyle = color; g.fill();
      api.text(g, text, x, y + 1, { size: 19, color: ink, weight: 800 });
    }

    function resolve(n, how) {
      n.state = how;
      if (how === 'covered') {
        s.covered++;
        s.papaMsg = COVERS[(s.covered - 1) % COVERS.length]; s.papaT = 1.1;
        s.flash = 1; s.flashGood = true;
        api.sfx('catch');
        api.burst(380, 190, { n: 14, shape: 'star', color: ['#ffe14d', '#ffffff', '#8fe07a'], speed: 240, gravity: 200, size: 7 });
      } else {
        s.missed++;
        s.flash = 1; s.flashGood = false;
        api.sfx(how === 'early' ? 'beep' : 'splat');
        api.shake(how === 'early' ? 5 : 10);
        s.jyMsg = how === 'early' ? EARLY[(s.missed - 1) % EARLY.length] : HEARD[(s.missed - 1) % HEARD.length];
        s.jyT = 1.3;
        if (how === 'early') { s.papaMsg = 'HEIN ?!'; s.papaT = 0.7; }
      }
      if (s.missed > MAX_MISS) {
        s.outcome = 'fail';
        s.jyMsg = 'Attends… T’es aux toilettes là ?!'; s.jyT = 5;
        api.end(false, '« Attends… T’es aux toilettes là ?! » Jean-Yves a tout compris. L’écho, ça ne pardonne pas.');
      } else if (noises.every((m) => m.state !== 'wait' && m.state !== 'live')) {
        s.outcome = 'win';
        s.jyMsg = 'Bon, à plus, et répare ton téléphone !'; s.jyT = 5;
        api.end(true, s.missed === 0
          ? 'Six bruits, six couvertures : Jean-Yves croit que tu l’appelais d’un tunnel. Discrétion de grand espion !'
          : `${s.missed} petit${s.missed > 1 ? 's' : ''} raté${s.missed > 1 ? 's' : ''}, mais Jean-Yves met ça sur le compte du réseau. Secret bien gardé !`);
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.papaT = Math.max(0, s.papaT - dt);
        s.jyT = Math.max(0, s.jyT - dt);
        s.flash = Math.max(0, s.flash - dt * 2.5);
        s.cooldown = Math.max(0, s.cooldown - dt);
        if (api.ended) { s.endT += dt; return; }

        for (const n of noises) {
          if (n.state === 'wait' && s.t >= n.at) n.state = 'live';
          if (n.state === 'live' && s.t > n.burst + LATE_W) resolve(n, 'heard');
          if (api.ended) return;
        }
        const live = noises.find((n) => n.state === 'live');
        if (input.pressed() && s.cooldown === 0) {
          s.cooldown = 0.45; // Papa est en train de parler
          if (live) {
            if (s.t >= live.burst - EARLY_W) resolve(live, 'covered');
            else resolve(live, 'early');
          } else {
            s.papaMsg = 'Euh… oui, oui !'; s.papaT = 0.6;
            api.sfx('pop');
          }
        }
      },
      timeout() { return s.missed <= MAX_MISS && s.covered >= 4; },
      draw(g) {
        g.drawImage(bg, 0, 0);
        const live = noises.find((n) => n.state === 'live');
        const lost = s.outcome === 'fail';

        // ── Papa assis, téléphone à l'oreille (tout habillé, rien à voir !)
        drawToilet(g);
        const PX = 298, PY = 382, R = 34;
        const hy = PY - 3.05 * R;
        const info = api.avatar(g, {
          x: PX, y: PY, size: R * 2, pose: 'sit',
          expression: lost ? 'panic' : s.outcome === 'win' ? 'laugh' : s.flash > 0.3 ? (s.flashGood ? 'laugh' : 'panic') : live ? 'focus' : 'smile',
          sweat: s.missed > 0 && !api.ended, blush: lost ? 1 : s.missed * 0.3, lookX: 1,
          hands: { l: { x: PX + 40, y: PY - 20 }, r: { x: PX + R * 0.95, y: hy + 8 } },
        });
        const hand = info.hands.r;
        g.save(); g.translate(hand.x + 2, hand.y - 6); g.rotate(-0.35);
        api.roundRect(g, -7, -24, 14, 40, 4); g.fillStyle = '#2b2f36'; g.fill();
        g.fillStyle = '#7fd0ff'; g.fillRect(-5, -19, 10, 28);
        g.restore();
        g.fillStyle = '#efc29e'; g.beginPath(); g.arc(hand.x, hand.y, R * 0.22, 0, Math.PI * 2); g.fill();
        // magazine sur les genoux
        g.save(); g.translate(PX + 46, PY - 26); g.rotate(-0.2);
        g.fillStyle = '#e8453c'; g.fillRect(-26, -18, 52, 34);
        g.fillStyle = '#fff'; g.fillRect(-20, -12, 40, 6);
        g.restore();
        // porte entrouverte (au premier plan, côté droit de l'encadrement)
        g.fillStyle = '#b07a4c';
        g.beginPath(); g.moveTo(452, 96); g.lineTo(528, 70); g.lineTo(528, 500); g.lineTo(452, 470); g.closePath(); g.fill();
        g.fillStyle = '#9a6740'; g.fillRect(468, 140, 44, 110);
        g.fillStyle = '#e7c75a'; g.beginPath(); g.arc(462, 300, 6, 0, Math.PI * 2); g.fill();
        api.roundRect(g, 470, 110, 40, 22, 5); g.fillStyle = '#fff'; g.fill();
        api.text(g, 'WC', 490, 122, { size: 14, color: '#3a6fb0', weight: 900 });

        // ── le bruit qui s'annonce : l'icône gonfle jusqu'au cercle
        const NX = 380, NY = 190, RING = 52;
        if (live && !api.ended) {
          const k = api.clamp((s.t - live.at) / (live.burst - live.at), 0, 1);
          const inWin = s.t >= live.burst - EARLY_W;
          g.strokeStyle = inWin ? '#5fd35a' : 'rgba(60, 50, 40, 0.55)'; g.lineWidth = inWin ? 7 : 4;
          g.setLineDash(inWin ? [] : [8, 6]);
          g.beginPath(); g.arc(NX, NY, RING, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
          const rr = 10 + (RING - 10) * k * k;
          g.fillStyle = live.color; g.globalAlpha = 0.85;
          g.beginPath(); g.arc(NX, NY, rr, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
          api.text(g, live.icon, NX, NY + 2, { size: Math.max(12, rr * 1.1), color: '#000' });
          api.text(g, live.label, NX, NY + RING + 24, { size: 20, color: '#fff', stroke: '#3a2a20' });
          if (inWin) api.text(g, 'MAINTENANT !', NX, NY - RING - 20, { size: 22, color: '#d7ffcf', stroke: '#2a6a2a' });
        }

        // ── Jean-Yves au bout du fil
        const JX = 730, JY = 250;
        g.fillStyle = 'rgba(255, 255, 255, 0.75)';
        g.beginPath(); g.arc(JX, JY, 92, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#7a5130'; g.lineWidth = 4; g.stroke();
        g.save(); g.beginPath(); g.arc(JX, JY, 88, 0, Math.PI * 2); g.clip();
        g.fillStyle = '#ffe9c6'; g.fillRect(JX - 92, JY - 92, 184, 184);
        g.fillStyle = '#7fb36f'; g.fillRect(JX - 92, JY + 30, 184, 70);
        drawPerson(g, { ...PEOPLE.passant, shirt: '#c26a3a', hairColor: '#7a6a5a', x: JX, y: JY + 130, size: 74,
          expression: lost ? 'surprised' : s.jyT > 0 && !s.flashGood ? 'worried' : s.outcome === 'win' ? 'laugh' : 'smile', t: s.t });
        // son téléphone
        g.fillStyle = '#2b2f36'; api.roundRect(g, JX + 32, JY - 30, 12, 34, 4); g.fill();
        g.restore();
        api.text(g, '📞 Jean-Yves', JX, JY + 112, { size: 20, color: '#3a2a20', weight: 800, stroke: 'rgba(255,255,255,0.8)', strokeWidth: 5 });
        // ondes du téléphone entre les deux
        g.strokeStyle = 'rgba(122, 81, 48, 0.45)'; g.lineWidth = 3;
        for (let k = 0; k < 3; k++) {
          const p = (s.t * 0.8 + k / 3) % 1;
          g.beginPath(); g.arc(560 + p * 60, 250, 16 + k * 2, -0.7, 0.7); g.stroke();
        }

        if (s.jyT > 0) bubble(g, JX, 108, s.jyMsg, JX - 20, 150, lost ? '#ffe0e0' : '#fffdf6');
        if (s.papaT > 0 && !lost) bubble(g, 230, 160, s.papaMsg, 280, 210);

        // ── HUD
        api.roundRect(g, 260, 22, 440, 46, 14); g.fillStyle = 'rgba(40, 25, 12, 0.72)'; g.fill();
        api.text(g, `Bruits couverts : ${s.covered} / 6   ·   Ratés : ${s.missed} / ${MAX_MISS}`, 480, 46, { size: 20, color: '#ffe7b0' });
        if (s.flash > 0 && !api.ended) {
          api.text(g, s.flashGood ? 'Couvert !' : 'Entendu…', 380, 330 - (1 - s.flash) * 20, { size: 30, color: s.flashGood ? '#d7ffcf' : '#ffd0d0', stroke: s.flashGood ? '#2a6a2a' : '#8a2a2a' });
        }
        if (lost && s.endT > 0.3) api.text(g, 'Démasqué !', 380, 420, { size: 54, color: '#fff3d6', stroke: '#8a2a2a', strokeWidth: 10 });
      },
    };
  },
};

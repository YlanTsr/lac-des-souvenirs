/**
 * « La blague prémonitoire » (blague_premonitoire)
 * Papa lance des prédictions pour rire… et certaines se réalisent. Voyant extra-lucide malgré lui !
 * Mécanique : une roue de la fortune tourne ; appuyer pour la freiner (elle ralentit, et la
 * boule de cristal montre où elle s'arrêtera) afin de tomber sur le secteur doré « ÇA VA ARRIVER ».
 * 3 essais, 2 réussis = victoire.
 */
export default {
  id: 'blague_premonitoire',
  title: 'La blague prémonitoire',
  instructions: 'Tu fais le voyant pour rire : freine la roue des prédictions pour qu’elle s’arrête sur le secteur doré « ÇA VA ARRIVER » (2 fois sur 3) !',
  controls: 'Espace / clic / tap : freiner la roue',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Extra-lucide !',
  failTitle: 'Voyant… pas très voyant',
  successText: 'Deux prédictions sur trois qui tombent pile : Madame Irma peut prendre sa retraite. Attention, tes blagues ont un drôle de pouvoir !',
  failText: 'La boule de cristal était un peu embuée aujourd’hui… Mais méfie-toi : tes blagues, elles, ont tendance à se réaliser !',

  create(api) {
    const { W, H, rand } = api;
    const WX = 650, WY = 305, WR = 188;
    const N = 8, SEC = (Math.PI * 2) / N;
    const SPEEDS = [3.2, 3.8, 4.4];   // rad/s, de plus en plus vite
    const BRAKE = 0.6;                // durée du freinage (s)
    const AUTO = 2.8;                 // au-delà, la vision s'envole
    const POINTER = -Math.PI / 2;     // l'aiguille en haut
    const LABELS = [
      { wheel: '✨ ÇA VA ARRIVER ✨', say: '✨ Je le vois… ÇA VA ARRIVER !' },
      { wheel: 'Il va pleuvoir', say: 'Il va pleuvoir… (grand soleil)' },
      { wheel: 'Loto gagnant', say: 'Tu vas gagner au loto… ou pas.' },
      { wheel: 'Tendinite guérie', say: 'Ta tendinite va guérir… un jour.' },
      { wheel: 'Clés retrouvées', say: 'Tes clés ? Dans ta poche. Bof.' },
      { wheel: 'Pigeon voleur', say: 'Un pigeon va te voler une frite.' },
      { wheel: 'Chat boudeur', say: 'Le chat va bouder. Comme d’hab.' },
      { wheel: 'Tarte brûlée', say: 'La tarte va brûler… (déjà fait)' },
    ];
    const COLORS = ['#f2c14e', '#7a4fb0', '#c8486b', '#3f8fd6', '#4fa36b', '#e07b39', '#5a6abf', '#b5577a'];

    const s = {
      t: 0, tryIdx: 0, phase: 'spin', phaseT: 0, angle: rand(0, Math.PI * 2), omega: SPEEDS[0],
      results: [], msg: '', msgGold: false, wins: 0, fails: 0, glow: 0, outcome: null,
    };
    const slide = () => (s.omega * BRAKE) / 2;
    const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const sectorAt = (angle) => Math.floor(norm(POINTER - angle) / SEC) % N;

    // ── roue précalculée
    const wheel = document.createElement('canvas'); wheel.width = 420; wheel.height = 420;
    {
      const g = wheel.getContext('2d');
      const c = 210;
      for (let i = 0; i < N; i++) {
        g.fillStyle = COLORS[i];
        g.beginPath(); g.moveTo(c, c); g.arc(c, c, WR, i * SEC, (i + 1) * SEC); g.closePath(); g.fill();
        g.strokeStyle = '#fff6dc'; g.lineWidth = 3; g.stroke();
        g.save(); g.translate(c, c); g.rotate((i + 0.5) * SEC);
        g.fillStyle = i === 0 ? '#6a3a00' : '#ffffff';
        g.font = `${i === 0 ? 900 : 800} ${i === 0 ? 15 : 15}px "Nunito Sans", system-ui, sans-serif`;
        g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(LABELS[i].wheel, WR - 14, 0);
        g.restore();
      }
      // reflets dorés du secteur gagnant
      g.fillStyle = 'rgba(255, 255, 255, 0.35)';
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, WR, 0.15 * SEC, 0.35 * SEC); g.closePath(); g.fill();
      g.strokeStyle = '#8a5a2a'; g.lineWidth = 10; g.beginPath(); g.arc(c, c, WR + 4, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#f7e2a8';
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * (WR + 4), c + Math.sin(a) * (WR + 4), 3.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#8a5a2a'; g.beginPath(); g.arc(c, c, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(c, c, 14, 0, Math.PI * 2); g.fill();
    }

    // ── décor : la roulotte du voyant
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#2a1740'); grd.addColorStop(1, '#4a2450');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      // rideaux
      for (let i = 0; i < 12; i++) {
        g.fillStyle = i % 2 ? 'rgba(150, 40, 70, 0.55)' : 'rgba(120, 30, 60, 0.55)';
        g.beginPath(); g.moveTo(i * 84, 0); g.quadraticCurveTo(i * 84 + 42, 260, i * 84 + 10, H); g.lineTo(i * 84 + 84, H); g.quadraticCurveTo(i * 84 + 100, 260, i * 84 + 84, 0); g.fill();
      }
      g.fillStyle = '#f2c14e';
      for (let i = 0; i < 40; i++) {
        const x = (i * 137) % W, y = 20 + ((i * 71) % 480), r = 1.5 + (i % 3);
        g.globalAlpha = 0.35 + (i % 4) * 0.12;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      // guirlande de fanions
      g.strokeStyle = '#f7e2a8'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 30); g.quadraticCurveTo(220, 90, 440, 30); g.stroke();
      for (let i = 0; i < 9; i++) {
        const x = 20 + i * 48, y = 30 + Math.sin((x / 440) * Math.PI) * 30;
        g.fillStyle = COLORS[i % COLORS.length];
        g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.lineTo(x, y + 22); g.closePath(); g.fill();
      }
      // sol
      g.fillStyle = '#3a1c30'; g.fillRect(0, 470, W, 70);
    }

    function stopOn(sector) {
      const gold = sector === 0;
      s.results.push(gold);
      s.msg = LABELS[sector].say; s.msgGold = gold;
      if (gold) {
        s.wins++;
        s.glow = 1;
        api.sfx('catch');
        api.burst(WX, WY - WR, { n: 26, shape: 'star', color: ['#ffe14d', '#fff6dc', '#f2c14e'], speed: 320, gravity: 250, size: 9 });
        api.burst(225, 345, { n: 14, shape: 'star', color: ['#ffe14d', '#d8c8ff'], speed: 200, gravity: 120, size: 6 });
      } else {
        s.fails++;
        api.sfx('boing');
      }
      s.phase = 'result'; s.phaseT = 0;
      if (s.wins >= 2) {
        s.outcome = 'win';
        api.end(true, s.fails === 0
          ? 'Deux visions, deux « ÇA VA ARRIVER » : tu ne plaisantes plus, tu prédis. Méfie-toi de tes blagues !'
          : 'Deux prédictions sur trois tombent pile : Madame Irma peut prendre sa retraite. Méfie-toi de tes blagues !');
      } else if (s.fails >= 2) {
        s.outcome = 'fail';
        api.end(false, 'La boule de cristal était un peu embuée… Mais attention : tes blagues, elles, ont la fâcheuse tendance à se réaliser !');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.phaseT += dt;
        s.glow = Math.max(0, s.glow - dt * 0.8);
        if (s.phase === 'spin') {
          s.angle += s.omega * dt;
          if (!api.ended) {
            if (input.pressed()) { s.phase = 'brake'; s.phaseT = 0; s.v = s.omega; api.sfx('whoosh'); }
            else if (s.phaseT > AUTO) {
              s.phase = 'brake'; s.phaseT = 0; s.v = s.omega; s.auto = true;
            }
          }
        } else if (s.phase === 'brake') {
          const a = s.omega / BRAKE;
          s.v = Math.max(0, s.v - a * dt);
          s.angle += s.v * dt;
          if (s.v === 0 && !api.ended) {
            const sec = sectorAt(s.angle);
            if (s.auto) {
              // trop tard : la vision s'est envolée, ça ne compte pas comme une prédiction
              s.results.push(false); s.fails++;
              s.msg = 'Atchoum ! La vision s’est envolée…'; s.msgGold = false;
              api.sfx('beep');
              s.phase = 'result'; s.phaseT = 0; s.auto = false;
              if (s.fails >= 2) { s.outcome = 'fail'; api.end(false, 'Trop hésitant, le voyant ! Les visions se sont envolées… Mais tes blagues, elles, ont la fâcheuse tendance à se réaliser !'); }
            } else stopOn(sec);
          }
        } else if (s.phase === 'result') {
          if (s.phaseT > 1.0 && !api.ended) {
            s.tryIdx++;
            s.omega = SPEEDS[Math.min(s.tryIdx, SPEEDS.length - 1)];
            s.phase = 'spin'; s.phaseT = 0;
          }
        }
      },
      timeout() { return s.wins >= 2; },
      draw(g) {
        g.drawImage(bg, 0, 0);

        // ── la roue
        g.save(); g.translate(WX, WY); g.rotate(s.angle);
        g.drawImage(wheel, -210, -210);
        g.restore();
        // halo doré du secteur gagnant quand on tombe dessus
        if (s.glow > 0) {
          g.strokeStyle = `rgba(255, 225, 77, ${s.glow})`; g.lineWidth = 12;
          g.beginPath(); g.arc(WX, WY, WR + 14, 0, Math.PI * 2); g.stroke();
        }
        // la « vision » : où la roue s'arrêtera si tu freines maintenant
        if (s.phase === 'spin' && !api.ended) {
          const va = POINTER - slide();
          g.strokeStyle = 'rgba(216, 200, 255, 0.55)'; g.lineWidth = 6; g.setLineDash([6, 8]);
          g.beginPath(); g.arc(WX, WY, WR + 22, va, POINTER); g.stroke(); g.setLineDash([]);
          const vx = WX + Math.cos(va) * (WR + 22), vy = WY + Math.sin(va) * (WR + 22);
          g.fillStyle = 'rgba(216, 200, 255, 0.95)';
          g.beginPath(); g.arc(vx, vy, 9 + Math.sin(s.t * 8) * 2, 0, Math.PI * 2); g.fill();
          api.text(g, '🔮', vx - 30, vy - 4, { size: 20 });
          // le secteur doré passe-t-il dans la vision ?
          const goldNow = sectorAt(s.angle + slide()) === 0;
          if (goldNow) {
            g.strokeStyle = 'rgba(255, 225, 77, 0.9)'; g.lineWidth = 5;
            g.beginPath(); g.arc(vx, vy, 16, 0, Math.PI * 2); g.stroke();
          }
        }
        // aiguille
        g.fillStyle = '#fff6dc'; g.strokeStyle = '#6a3a00'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(WX, WY - WR + 22); g.lineTo(WX - 18, WY - WR - 22); g.lineTo(WX + 18, WY - WR - 22); g.closePath(); g.fill(); g.stroke();

        // ── Papa en voyant, derrière sa table
        const PX = 225;
        const info = api.avatar(g, {
          x: PX, y: 500, size: 84, pose: s.outcome === 'win' ? 'cheer' : 'stand', t: s.t,
          expression: s.outcome === 'win' ? 'laugh' : s.outcome === 'fail' ? 'laugh' : s.phase === 'result' ? (s.msgGold ? 'surprised' : 'worried') : s.phase === 'brake' ? 'focus' : 'smile',
          lookX: 1, lookY: -0.2,
          hands: s.outcome === 'win' ? undefined : { l: { x: PX - 40, y: 372 }, r: { x: PX + 40, y: 372 } },
        });
        // turban
        const { hx, hy, r } = info;
        g.fillStyle = '#f4f1ea';
        g.beginPath(); g.ellipse(hx, hy - 0.55 * r, 1.08 * r, 0.62 * r, 0, Math.PI, 0); g.lineTo(hx + 1.05 * r, hy - 0.42 * r); g.quadraticCurveTo(hx, hy - 0.22 * r, hx - 1.05 * r, hy - 0.42 * r); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(150, 140, 130, 0.6)'; g.lineWidth = 2;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(hx, hy - 0.55 * r - k * 0.16 * r, 1.0 * r - k * 0.12 * r, 0.34 * r, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
        g.fillStyle = '#c8486b'; g.beginPath(); g.arc(hx, hy - 0.48 * r, 0.16 * r, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(hx, hy - 0.48 * r, 0.08 * r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#4fa36b'; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(hx, hy - 0.62 * r); g.quadraticCurveTo(hx + 0.2 * r, hy - 1.3 * r, hx + 0.55 * r, hy - 1.5 * r); g.stroke();

        // table nappée
        g.fillStyle = '#5a2a6a';
        g.beginPath(); g.moveTo(80, 410); g.lineTo(370, 410); g.lineTo(392, H); g.lineTo(58, H); g.closePath(); g.fill();
        g.fillStyle = '#f2c14e';
        for (let i = 0; i < 6; i++) api.text(g, '★', 105 + i * 50, 450 + (i % 2) * 40, { size: 20, color: 'rgba(242,193,78,0.7)' });
        g.fillStyle = '#7a3a8a'; g.fillRect(74, 404, 302, 12);
        // boule de cristal
        const BX = PX, BY = 362, BR = 44;
        g.fillStyle = '#8a5a2a'; g.beginPath(); g.ellipse(BX, BY + BR - 4, 34, 12, 0, 0, Math.PI * 2); g.fill();
        const glowK = 0.5 + 0.2 * Math.sin(s.t * 4) + s.glow * 0.5;
        const grd = g.createRadialGradient(BX - 12, BY - 14, 4, BX, BY, BR);
        grd.addColorStop(0, s.glow > 0.1 ? '#fff6c0' : '#f1e8ff');
        grd.addColorStop(0.6, s.glow > 0.1 ? 'rgba(255, 210, 90, 0.9)' : `rgba(170, 140, 230, ${0.7 + glowK * 0.2})`);
        grd.addColorStop(1, 'rgba(90, 60, 160, 0.95)');
        g.fillStyle = grd; g.beginPath(); g.arc(BX, BY, BR, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(BX - 16, BY - 18, 10, 6, -0.6, 0, Math.PI * 2); g.fill();
        // mains posées sur la boule
        if (s.outcome !== 'win') {
          g.fillStyle = '#efc29e';
          for (const h of [info.hands.l, info.hands.r]) { g.beginPath(); g.arc(h.x, h.y, 9, 0, Math.PI * 2); g.fill(); }
        }

        // ── bulle de la prédiction
        if (s.phase === 'result' || api.ended) {
          g.font = '800 19px "Nunito Sans", system-ui, sans-serif';
          const w = Math.max(120, g.measureText(s.msg).width + 30), bx = Math.max(16 + w / 2, Math.min(400 - 0, 235)), by = 150;
          api.roundRect(g, bx - w / 2, by - 22, w, 44, 16);
          g.fillStyle = s.msgGold ? '#fff2b8' : '#fffdf6'; g.fill();
          g.strokeStyle = s.msgGold ? '#d9a21a' : 'rgba(60,40,30,0.5)'; g.lineWidth = 3; g.stroke();
          g.beginPath(); g.moveTo(bx - 10, by + 21); g.lineTo(PX, 205); g.lineTo(bx + 10, by + 21); g.closePath(); g.fill();
          api.text(g, s.msg, bx, by + 1, { size: 19, color: '#3a2a20', weight: 800 });
        }

        // ── HUD : les trois essais
        api.roundRect(g, 300, 22, 360, 48, 14); g.fillStyle = 'rgba(20, 10, 30, 0.72)'; g.fill();
        api.text(g, 'Prédictions :', 400, 46, { size: 20, color: '#f7e2a8' });
        for (let i = 0; i < 3; i++) {
          const x = 500 + i * 46, res = s.results[i];
          g.strokeStyle = '#f7e2a8'; g.lineWidth = 2;
          g.beginPath(); g.arc(x, 46, 15, 0, Math.PI * 2); g.stroke();
          if (res === true) api.text(g, '✨', x, 47, { size: 20 });
          else if (res === false) api.text(g, '✘', x, 47, { size: 20, color: '#ff8a8a' });
          else if (i === s.tryIdx && !api.ended) { g.fillStyle = 'rgba(247,226,168,0.35)'; g.beginPath(); g.arc(x, 46, 12, 0, Math.PI * 2); g.fill(); }
        }
        if (s.phase === 'spin' && !api.ended && s.phaseT > AUTO - 1) api.text(g, 'Vite, la vision s’en va !', WX, 520, { size: 22, color: '#ffd0d0', stroke: '#2a1740' });
        if (s.outcome === 'win') api.text(g, 'Extra-lucide !', WX, 520, { size: 34, color: '#fff2b8', stroke: '#6a3a00', strokeWidth: 8 });
      },
    };
  },
};

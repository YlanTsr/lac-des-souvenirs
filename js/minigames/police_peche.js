/**
 * « Cache-toi, la police ! » (police_peche)
 * Papa a dit à Iordan de se cacher de la police pendant qu'il pêchait… puis a expliqué aux
 * policiers : « Ah, c'est mon fils, il a peur de la police. »
 * Mécanique : ferrer quand le bouchon plonge (le poisson est relâché aussitôt) ; quand le
 * gyrophare s'annonce, maintenir ↓ / « Cache-toi ! » pour cacher Iordan dans les roseaux.
 * 3 poissons = victoire ; repéré 2 fois = échec (drôle).
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'police_peche',
  title: 'Cache-toi, la police !',
  instructions: 'Iordan pêche : ferre quand le bouchon plonge pour attraper 3 poissons, et cache-le dans les roseaux quand la police passe !',
  controls: 'Espace / clic : ferrer · Maintenir ↓ ou le bouton « Cache-toi ! » : se cacher',
  duration: 13,
  introExpression: 'laugh',
  successTitle: 'Pas vu, pas pris !',
  failTitle: 'Repéré !',
  successText: 'Trois poissons attrapés (et relâchés), zéro policier intrigué : Iordan est un pro du camouflage. Sa peur de la police reste notre petit secret.',
  failText: '« Ah, c’est mon fils, il a peur de la police. » Les policiers sont repartis perplexes… et toi, mort de rire.',

  create(api) {
    const { W, H, rand } = api;
    const WATER_Y = 205;
    const BOB = { x: 575, y: 372 };
    const BTN = { x: 790, y: 440, w: 150, h: 78 };
    const PASSES = [2.0, 5.8, 9.4];
    const WARN = 1.0, DRIVE = 0.5, LOOK = 1.2, LEAVE = 0.6, GRACE = 0.2;
    const GOAL = 3, MAX_SEEN = 2;

    const s = {
      t: 0, fish: 0, seen: 0, hidden: false, hideK: 0,
      line: 'water', outT: 0, biteT: rand(0.6, 1.1), wiggle: 0, plunge: 0,
      fishAnim: -1, msg: '', msgT: 0, papaMsg: '', papaT: 0, copMsg: '', copT: 0,
      passes: PASSES.map((at) => ({ at, seen: false })), police: null, outcome: null, endT: 0,
      ripples: [],
    };
    const inBtn = (p) => p.x >= BTN.x && p.x <= BTN.x + BTN.w && p.y >= BTN.y && p.y <= BTN.y + BTN.h;

    /** Phase de la police à l'instant t : null | {pass, phase, k} */
    function policeAt(t) {
      for (const p of s.passes) {
        const d = t - p.at;
        if (d < 0) continue;
        if (d < WARN) return { pass: p, phase: 'warn', k: d / WARN, d };
        if (d < WARN + DRIVE) return { pass: p, phase: 'drive', k: (d - WARN) / DRIVE, d };
        if (d < WARN + DRIVE + LOOK) return { pass: p, phase: 'look', k: (d - WARN - DRIVE) / LOOK, d };
        if (d < WARN + DRIVE + LOOK + LEAVE) return { pass: p, phase: 'leave', k: (d - WARN - DRIVE - LOOK) / LEAVE, d };
      }
      return null;
    }
    function carX(pol) {
      if (!pol) return 1200;
      if (pol.phase === 'warn') return 1200;
      if (pol.phase === 'drive') return api.lerp(1100, 660, 1 - (1 - pol.k) ** 2);
      if (pol.phase === 'look') return 660;
      return api.lerp(660, -260, pol.k * pol.k);
    }

    // ── décor précalculé
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, 150);
      sky.addColorStop(0, '#8cc8f0'); sky.addColorStop(1, '#fde7bd');
      g.fillStyle = sky; g.fillRect(0, 0, W, 150);
      g.fillStyle = '#9fcf8a';
      g.beginPath(); g.moveTo(0, 140); g.quadraticCurveTo(250, 95, 520, 130); g.quadraticCurveTo(760, 100, W, 130); g.lineTo(W, 160); g.lineTo(0, 160); g.fill();
      for (let i = 0; i < 8; i++) { g.fillStyle = '#6aa857'; g.beginPath(); g.arc(60 + i * 125, 128, 26 + (i % 3) * 6, 0, Math.PI * 2); g.fill(); }
      // route de l'autre côté de l'étang
      g.fillStyle = '#8fbf70'; g.fillRect(0, 150, W, 18);
      g.fillStyle = '#6d6a70'; g.fillRect(0, 165, W, 30);
      g.fillStyle = '#f4f1ea'; for (let x = 0; x < W; x += 60) g.fillRect(x, 179, 30, 3);
      g.fillStyle = '#8fbf70'; g.fillRect(0, 195, W, 12);
      // étang
      const wat = g.createLinearGradient(0, WATER_Y, 0, H);
      wat.addColorStop(0, '#6fb2c9'); wat.addColorStop(1, '#2f7591');
      g.fillStyle = wat; g.fillRect(0, WATER_Y, W, H - WATER_Y);
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const x = (i * 173) % W, y = WATER_Y + 20 + ((i * 59) % 300); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y); g.stroke(); }
      // nénuphars
      g.fillStyle = '#4f9a4a';
      for (const [x, y] of [[700, 300], [760, 330], [420, 260], [860, 400]]) { g.beginPath(); g.ellipse(x, y, 22, 9, 0, 0.3, Math.PI * 2); g.lineTo(x, y); g.fill(); }
      // berge (premier plan, à gauche)
      g.fillStyle = '#7bb35f';
      g.beginPath(); g.moveTo(0, 380); g.quadraticCurveTo(230, 400, 380, 470); g.quadraticCurveTo(430, 510, 440, H); g.lineTo(0, H); g.closePath(); g.fill();
      g.fillStyle = '#6aa553';
      g.beginPath(); g.moveTo(0, 420); g.quadraticCurveTo(220, 440, 330, 500); g.lineTo(350, H); g.lineTo(0, H); g.closePath(); g.fill();
      // seau
      g.fillStyle = '#9aa3ad'; g.beginPath(); g.moveTo(330, 470); g.lineTo(372, 470); g.lineTo(366, 510); g.lineTo(336, 510); g.closePath(); g.fill();
      g.strokeStyle = '#6b737d'; g.lineWidth = 2; g.beginPath(); g.arc(351, 470, 20, Math.PI, 0); g.stroke();
    }

    function catchFish() {
      s.fish++;
      s.line = 'out'; s.outT = 0.75; s.plunge = 0; s.wiggle = 0;
      s.fishAnim = 0;
      s.msg = s.fish >= GOAL ? 'Et de trois !' : 'Attrapé… et relâché !'; s.msgT = 1;
      api.sfx('catch');
      api.burst(BOB.x, BOB.y, { n: 14, color: ['#cfefff', '#ffffff'], speed: 220, gravity: 500, size: 5 });
      if (s.fish >= GOAL) {
        s.outcome = 'win';
        api.end(true, s.seen
          ? 'Trois poissons (tous relâchés) et une seule petite alerte : la police n’y a vu que du feu. Iordan, roi des roseaux !'
          : 'Trois poissons attrapés et relâchés, zéro policier intrigué : Iordan est un pro du camouflage !');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.papaT = Math.max(0, s.papaT - dt);
        s.copT = Math.max(0, s.copT - dt);
        if (s.fishAnim >= 0) { s.fishAnim += dt; if (s.fishAnim > 0.75) { s.fishAnim = -1; api.sfx('splat'); s.ripples.push({ x: BOB.x - 40, y: BOB.y + 10, t: 0 }); } }
        for (let i = s.ripples.length - 1; i >= 0; i--) { s.ripples[i].t += dt; if (s.ripples[i].t > 1) s.ripples.splice(i, 1); }
        const pol = policeAt(s.t);
        s.police = pol;
        if (api.ended) { s.endT += dt; s.hideK = Math.max(0, s.hideK - dt * 4); return; }

        // ── se cacher
        s.hidden = input.held('down') || (input.pointer.down && inBtn(input.pointer));
        s.hideK = api.clamp(s.hideK + (s.hidden ? 8 : -6) * dt, 0, 1);
        if (pol && pol.phase === 'warn' && pol.k < 0.05 && !pol.pass.warned) {
          pol.pass.warned = true;
          s.papaMsg = 'Cache-toi, la police !'; s.papaT = 1.6;
          api.sfx('beep');
        }

        // ── la police regarde
        if (pol && pol.phase === 'look' && pol.k * LOOK > GRACE && !pol.pass.seen && s.hideK < 0.5) {
          pol.pass.seen = true;
          s.seen++;
          api.sfx('ouch');
          api.shake(8);
          if (s.seen >= MAX_SEEN) {
            s.outcome = 'fail';
            s.copMsg = 'Encore lui ?!'; s.copT = 3;
            s.papaMsg = 'Ah, c’est mon fils, il a peur de la police !'; s.papaT = 5;
            api.end(false, '« Ah, c’est mon fils, il a peur de la police. » Les policiers sont repartis perplexes… et toi, mort de rire.');
            return;
          }
          s.copMsg = 'Tiens ? Un pêcheur ?'; s.copT = 1.5;
        }

        // ── la pêche
        if (s.line === 'out') {
          s.outT -= dt;
          if (s.outT <= 0) { s.line = 'water'; s.biteT = rand(0.5, 1.1); s.ripples.push({ x: BOB.x, y: BOB.y, t: 0 }); api.sfx('pop'); }
        } else {
          if (s.plunge > 0) {
            s.plunge -= dt;
            if (s.plunge <= 0) { s.plunge = 0; s.biteT = rand(0.6, 1.1); s.msg = 'Il s’est sauvé !'; s.msgT = 0.8; }
          } else if (s.wiggle > 0) {
            s.wiggle -= dt;
            if (s.wiggle <= 0) { s.wiggle = 0; s.plunge = 0.55; api.sfx('splat'); s.ripples.push({ x: BOB.x, y: BOB.y, t: 0 }); }
          } else {
            s.biteT -= dt;
            if (s.biteT <= 0 && s.hideK < 0.3) s.wiggle = 0.35;
          }
        }
        const act = input.pressed() && !(input.pointer.pressed && inBtn(input.pointer));
        if (act && s.hideK < 0.3 && s.line === 'water') {
          if (s.plunge > 0) catchFish();
          else {
            // ferrer dans le vide : la ligne sort de l'eau, il faut relancer
            s.line = 'out'; s.outT = 0.8; s.wiggle = 0;
            s.msg = 'Trop tôt !'; s.msgT = 0.8;
            api.sfx('whoosh');
          }
        }
      },
      timeout() { return false; },
      draw(g) {
        g.drawImage(bg, 0, 0);
        const pol = s.police;

        // ── voiture de police sur la route d'en face
        const cx = carX(pol);
        if (cx < 1100 && cx > -240) {
          const cy = 172;
          g.fillStyle = '#f4f6fa'; api.roundRect(g, cx - 80, cy - 8, 160, 30, 8); g.fill();
          g.fillStyle = '#2c3e6b'; g.fillRect(cx - 80, cy + 6, 160, 8);
          g.fillStyle = '#f4f6fa'; api.roundRect(g, cx - 46, cy - 36, 92, 32, 10); g.fill();
          g.fillStyle = '#a9d4ef'; g.fillRect(cx - 38, cy - 30, 34, 20); g.fillRect(cx + 4, cy - 30, 34, 20);
          drawPerson(g, { ...PEOPLE.policier, x: cx - 20, y: cy - 22, size: 24, body: false, expression: s.copT > 0 ? 'surprised' : 'smile', flipX: true });
          api.text(g, 'POLICE', cx + 36, cy + 1, { size: 11, color: '#2c3e6b', weight: 900 });
          g.fillStyle = '#2a2522';
          for (const wx of [-50, 50]) { g.beginPath(); g.arc(cx + wx, cy + 24, 11, 0, Math.PI * 2); g.fill(); }
          const blink = Math.sin(s.t * 18) > 0;
          g.fillStyle = blink ? '#ff3b3b' : '#3b7bff'; g.fillRect(cx - 12, cy - 46, 24, 10);
          g.fillStyle = blink ? 'rgba(255,60,60,0.3)' : 'rgba(60,120,255,0.3)'; g.beginPath(); g.arc(cx, cy - 41, 26, 0, Math.PI * 2); g.fill();
          // le regard des policiers vers la berge
          if (pol && pol.phase === 'look') {
            const seenNow = pol.pass.seen;
            g.fillStyle = seenNow ? 'rgba(255, 80, 60, 0.22)' : 'rgba(255, 240, 150, 0.2)';
            g.beginPath(); g.moveTo(cx - 20, cy - 18); g.lineTo(130, 470); g.lineTo(380, 470); g.closePath(); g.fill();
            api.text(g, seenNow ? '❗' : '👀', cx - 20, cy - 64, { size: 26 });
          }
        }
        // gyrophare annoncé : lueurs sur le bord droit
        if (pol && (pol.phase === 'warn' || pol.phase === 'drive') && !api.ended) {
          const blink = Math.sin(s.t * 18) > 0;
          const grd = g.createLinearGradient(W - 220, 0, W, 0);
          grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, blink ? 'rgba(255,50,50,0.45)' : 'rgba(50,110,255,0.45)');
          g.fillStyle = grd; g.fillRect(W - 220, 80, 220, 260);
          api.text(g, '🚨 Gyrophare !', 820, 240, { size: 24, color: '#fff', stroke: blink ? '#a01818' : '#1a3a9a' });
        }

        // ── rides, bouchon
        for (const r of s.ripples) {
          g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - r.t)})`; g.lineWidth = 2;
          g.beginPath(); g.ellipse(r.x, r.y + 6, 10 + r.t * 40, 4 + r.t * 14, 0, 0, Math.PI * 2); g.stroke();
        }
        let bobY = BOB.y + Math.sin(s.t * 3) * 2, bobX = BOB.x;
        if (s.wiggle > 0) bobX += Math.sin(s.t * 60) * 3;
        if (s.plunge > 0) bobY += 14;
        const showBob = s.line === 'water';

        // ── Iordan sur la berge (se cache dans les roseaux)
        const IY = 470 + s.hideK * 62;
        const ir = drawPerson(g, { ...PEOPLE.iordan, x: 245, y: IY, size: 56, pose: 'sit', t: s.t,
          expression: s.outcome === 'fail' ? 'scared' : s.fishAnim >= 0 || s.outcome === 'win' ? 'laugh' : s.hideK > 0.5 ? 'scared' : s.plunge > 0 ? 'surprised' : 'smile',
          hands: { r: { x: 290, y: IY - 52 } } });
        // canne à pêche et fil
        const hand = ir.handR;
        const tipX = 470, tipY = 300 + s.hideK * 120 + (s.fishAnim >= 0 && s.fishAnim < 0.4 ? -30 : 0);
        g.strokeStyle = '#6b4a2c'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(hand.x - 14, hand.y + 10); g.lineTo(tipX, tipY); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.5;
        if (showBob) {
          g.beginPath(); g.moveTo(tipX, tipY); g.quadraticCurveTo((tipX + bobX) / 2, Math.max(tipY, bobY) + 20, bobX, bobY - 10); g.stroke();
          g.fillStyle = '#e8453c'; g.beginPath(); g.arc(bobX, bobY - 6, 8, Math.PI, 0); g.fill();
          if (s.plunge <= 0) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(bobX, bobY - 6, 8, 0, Math.PI); g.fill(); }
          g.fillStyle = '#2a2522'; g.fillRect(bobX - 1, bobY - 22, 2, 9);
        } else {
          g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(tipX + 6, tipY + 60); g.stroke();
        }
        if (s.plunge > 0 && !api.ended) api.text(g, 'ÇA MORD !', BOB.x, BOB.y - 50, { size: 26, color: '#fff', stroke: '#2f7591' });

        // poisson attrapé puis relâché (il repart en frétillant)
        if (s.fishAnim >= 0) {
          const k = s.fishAnim;
          let fx, fy;
          if (k < 0.35) { const u = k / 0.35; fx = api.lerp(BOB.x, tipX, u); fy = api.lerp(BOB.y, tipY, u) - Math.sin(u * Math.PI) * 60; }
          else { const u = (k - 0.35) / 0.4; fx = api.lerp(tipX, BOB.x - 40, u); fy = api.lerp(tipY, BOB.y + 10, u) - Math.sin(u * Math.PI) * 90; }
          g.save(); g.translate(fx, fy + 18); g.rotate(Math.sin(s.t * 30) * 0.3);
          g.fillStyle = '#f2a33d'; g.beginPath(); g.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.moveTo(-14, 0); g.lineTo(-28, -9); g.lineTo(-28, 9); g.closePath(); g.fill();
          g.fillStyle = '#2a2522'; g.beginPath(); g.arc(9, -2, 2.2, 0, Math.PI * 2); g.fill();
          g.restore();
        }

        // ── roseaux (devant Iordan)
        for (let i = 0; i < 22; i++) {
          const bx = 140 + i * 9.5, top = 392 + ((i * 37) % 30) - (i % 4 === 0 ? 14 : 0);
          const sway = Math.sin(s.t * 1.6 + i) * 5 + (s.hideK > 0.2 ? Math.sin(s.t * 25 + i) * 2 : 0);
          g.strokeStyle = i % 3 ? '#5f8f3a' : '#4d7a2f'; g.lineWidth = 6; g.lineCap = 'round';
          g.beginPath(); g.moveTo(bx, H); g.quadraticCurveTo(bx + sway * 0.3, (top + H) / 2, bx + sway, top); g.stroke();
          if (i % 3 === 0) { g.fillStyle = '#7a5230'; api.roundRect(g, bx + sway - 4, top - 20, 8, 24, 4); g.fill(); }
        }

        // ── Papa sur la berge, qui fait le guet
        api.avatar(g, {
          x: 70, y: 528, size: 58, pose: 'stand',
          expression: s.outcome === 'fail' ? 'laugh' : s.outcome === 'win' ? 'happy' : s.papaT > 0 ? 'surprised' : 'smile',
          lookX: 1, lookY: -0.4,
        });

        // ── bulles
        const bubble = (x, y, text, tx, ty) => {
          g.font = '800 17px "Nunito Sans", system-ui, sans-serif';
          const w = g.measureText(text).width + 26, h = 36;
          const bx = api.clamp(x, 16 + w / 2, W - 16 - w / 2);
          api.roundRect(g, bx - w / 2, y - h / 2, w, h, 14); g.fillStyle = '#fffdf6'; g.fill();
          g.strokeStyle = 'rgba(60,40,30,0.5)'; g.lineWidth = 2; g.stroke();
          g.beginPath(); g.moveTo(x - 8, y + h / 2 - 1); g.lineTo(tx, ty); g.lineTo(x + 8, y + h / 2 - 1); g.closePath(); g.fill();
          api.text(g, text, bx, y + 1, { size: 17, color: '#3a2a20', weight: 800 });
        };
        if (s.papaT > 0) bubble(s.outcome === 'fail' ? 250 : 170, 330, s.papaMsg, 90, 360);
        if (s.copT > 0 && cx < 1100 && cx > -200) bubble(cx - 20, 108, s.copMsg, cx - 20, 136);
        if (s.msgT > 0 && !api.ended) api.text(g, s.msg, BOB.x + 40, BOB.y + 60, { size: 24, color: '#fff', stroke: '#2a4a5a' });

        // ── bouton « Cache-toi ! »
        api.roundRect(g, BTN.x, BTN.y, BTN.w, BTN.h, 18);
        g.fillStyle = s.hidden ? '#4d7a2f' : 'rgba(40, 60, 30, 0.8)'; g.fill();
        g.strokeStyle = '#d7f0b0'; g.lineWidth = 3; g.stroke();
        api.text(g, 'Cache-toi !', BTN.x + BTN.w / 2, BTN.y + 30, { size: 22, color: '#fff' });
        api.text(g, '(maintenir ↓)', BTN.x + BTN.w / 2, BTN.y + 56, { size: 14, color: '#d7f0b0', weight: 600 });

        // ── HUD
        api.roundRect(g, 270, 22, 420, 46, 14); g.fillStyle = 'rgba(20, 40, 50, 0.72)'; g.fill();
        api.text(g, `Poissons : ${s.fish} / ${GOAL}   ·   Repéré : ${s.seen} / ${MAX_SEEN}`, 480, 46, { size: 20, color: '#e8f6ff' });
      },
    };
  },
};

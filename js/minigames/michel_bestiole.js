/**
 * Anecdote #54 — « Michel, Michel, aidez-moi ! » (michel_bestiole)
 * Une bestiole dans le dos : Papa relève son t-shirt en appelant Michel au secours.
 * Mécanique : diriger la main de Michel (souris / flèches) et appuyer pour attraper la bestiole
 * qui court et esquive. 3 prises = victoire ; taper à côté fait sursauter Papa (5 ratés = échec).
 */
import { drawPerson, PEOPLE } from './people.js';
import { LOOK } from '../avatar.js';

let BG = null;

function buildBg(api) {
  const { W, H } = api;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 340);
  sky.addColorStop(0, '#8fc6ef'); sky.addColorStop(1, '#fbe4b8');
  g.fillStyle = sky; g.fillRect(0, 0, W, 340);
  g.fillStyle = '#9fcf8a';
  g.beginPath(); g.moveTo(0, 300); g.quadraticCurveTo(260, 240, 520, 290); g.quadraticCurveTo(760, 250, W, 290); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 150, s = 0.9 + (i % 3) * 0.15;
    g.fillStyle = '#7a5332'; g.fillRect(x - 8 * s, 330 - 90 * s, 16 * s, 90 * s);
    g.fillStyle = '#4f9a4a';
    g.beginPath(); g.arc(x, 330 - 115 * s, 55 * s, 0, Math.PI * 2); g.arc(x - 40 * s, 330 - 90 * s, 38 * s, 0, Math.PI * 2); g.arc(x + 40 * s, 330 - 90 * s, 38 * s, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e0473a';
    for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(x - 44 * s + ((a * 37) % 88) * s, 330 - 140 * s + ((a * 53) % 70) * s, 6 * s, 0, Math.PI * 2); g.fill(); }
  }
  g.fillStyle = '#6aa553'; g.fillRect(0, 380, W, H - 380);
  g.fillStyle = '#5a9446';
  for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, 395 + (i % 6) * 24, 16, 4);
  return c;
}

export default {
  id: 'michel_bestiole',
  title: '« Michel, Michel, aidez-moi ! »',
  instructions: 'Une bestiole te court dans le dos ! Guide la main de Michel et attrape-la trois fois… sans te taper partout.',
  controls: 'Souris / doigt ou ← → ↑ ↓ : viser · Espace / clic : attraper',
  duration: 12,
  introExpression: 'panic',
  successTitle: 'Dos libéré !',
  failTitle: 'Aïe, Michel !',
  successText: 'Michel a chassé la bestiole : garde-chasse, et désormais garde du dos !',
  failText: 'Michel a tapoté tout le dos… sauf la bestiole. Elle, elle a bien rigolé.',

  create(api) {
    const { W, H, rand, clamp } = api;
    if (!BG) BG = buildBg(api);
    const BX = 480, BY = 335, RX = 125, RY = 88; // zone du dos où court la bestiole
    const GOAL = 3, MAX_MISS = 5;
    const inBack = (x, y) => ((x - BX) / (RX + 40)) ** 2 + ((y - BY) / (RY + 45)) ** 2 <= 1;
    const s = {
      t: 0, bx: BX + rand(-60, 60), by: BY + rand(-40, 40), vx: 0, vy: 0, tx: BX, ty: BY, retarget: 0,
      flee: 0, dodgeCd: 0.8, caught: 0, misses: 0, grabT: 0, cool: 0, jolt: 0,
      gone: 0, flying: [], pending: 0, gx: 0, gy: 0, hx: W / 2, hy: H / 2, msg: 'Michel, Michel, aidez-moi !', msgT: 2, face: 0,
      leg: 0,
    };

    function newTarget() {
      const a = rand(0, Math.PI * 2), r = Math.sqrt(rand(0, 1));
      s.tx = BX + Math.cos(a) * RX * r; s.ty = BY + Math.sin(a) * RY * r;
      s.retarget = rand(0.3, 0.7);
    }
    newTarget();

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.grabT = Math.max(0, s.grabT - dt);
        s.cool = Math.max(0, s.cool - dt);
        s.jolt = Math.max(0, s.jolt - dt * 2.5);
        s.dodgeCd = Math.max(0, s.dodgeCd - dt);
        s.leg += dt * 30;
        // bestioles attrapées : Michel les envoie dans l'herbe (étourdies, elles filent)
        for (const f of s.flying) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 700 * dt; f.r += dt * 12; }
        s.flying = s.flying.filter((f) => f.y < H + 40);

        if (!api.ended) { s.hx = input.cursor.x; s.hy = input.cursor.y; }

        // ── la bestiole
        if (s.gone > 0) {
          s.gone -= dt;
          if (s.gone <= 0) {
            // une autre arrive par le col du t-shirt
            s.bx = BX + rand(-80, 80); s.by = BY - RY + 10; s.dodgeCd = 0.6; newTarget();
            s.msg = ['Encore une !', 'Il y en a une autre !'][s.caught % 2]; s.msgT = 1;
          }
        } else {
          const speed = 215 + s.caught * 30 + s.misses * 8;
          const dh = Math.hypot(s.hx - s.bx, s.hy - s.by);
          if (!api.ended && dh < 105 && s.dodgeCd <= 0) {
            // esquive : file à l'opposé de la main
            const ax = s.bx - s.hx, ay = s.by - s.hy, d = Math.max(1, Math.hypot(ax, ay));
            s.vx = (ax / d) * 400; s.vy = (ay / d) * 400;
            s.flee = 0.32; s.dodgeCd = 0.7 - s.caught * 0.1;
          }
          if (s.flee > 0) {
            s.flee -= dt;
          } else {
            s.retarget -= dt;
            if (s.retarget <= 0 || Math.hypot(s.tx - s.bx, s.ty - s.by) < 12) newTarget();
            const ax = s.tx - s.bx, ay = s.ty - s.by, d = Math.max(1, Math.hypot(ax, ay));
            s.vx += ((ax / d) * speed - s.vx) * Math.min(1, dt * 6);
            s.vy += ((ay / d) * speed - s.vy) * Math.min(1, dt * 6);
          }
          s.bx += s.vx * dt; s.by += s.vy * dt;
          // rester sur le dos (rebond sur les bords)
          const nx = (s.bx - BX) / RX, ny = (s.by - BY) / RY, k = Math.hypot(nx, ny);
          if (k > 1) { s.bx = BX + (nx / k) * RX; s.by = BY + (ny / k) * RY; s.vx *= -0.5; s.vy *= -0.5; newTarget(); }
          if (Math.abs(s.vx) + Math.abs(s.vy) > 5) s.face = Math.atan2(s.vy, s.vx);
        }

        if (api.ended) return;

        // ── la main de Michel
        if (input.pressed() && s.cool <= 0) {
          // la main se lève puis s'abat : la prise est jugée 0,1 s plus tard (il faut anticiper)
          s.grabT = 0.3; s.cool = 0.45; s.pending = 0.12;
          s.gx = s.hx; s.gy = s.hy;
          // réflexe de la bestiole si la main est proche
          const dd = Math.hypot(s.hx - s.bx, s.hy - s.by);
          if (s.gone <= 0 && dd < 80 && dd > 14 && rand() < 0.55) { const k = 260 / Math.max(1, dd); s.vx = (s.bx - s.hx) * k; s.vy = (s.by - s.hy) * k; s.flee = 0.2; }
        }
        if (s.pending > 0 && (s.pending -= dt) <= 0) {
          s.pending = 0;
          const d = Math.hypot(s.gx - s.bx, s.gy - s.by);
          if (s.gone <= 0 && d < 28) {
            s.caught++;
            api.sfx('catch');
            api.burst(s.bx, s.by, { n: 12, shape: 'star', color: ['#ffe14d', '#fff'], speed: 220, gravity: 300, size: 7 });
            s.flying.push({ x: s.bx, y: s.by, vx: rand(-1, 1) < 0 ? -380 : 380, vy: -520, r: 0 });
            s.gone = 0.55;
            s.msg = ['Ouf !', 'Merci Michel !', 'Bravo Michel !'][s.caught - 1]; s.msgT = 1;
            if (s.caught >= GOAL) api.end(true, s.misses === 0
              ? 'Trois prises sans une fausse tape : Michel, garde-chasse le jour, garde du dos à ses heures !'
              : 'Bestioles chassées ! Quelques tapes à côté, mais Michel a sauvé ton dos. Merci Michel !');
          } else if (inBack(s.gx, s.gy)) {
            s.misses++;
            s.jolt = 1;
            api.sfx('ouch'); api.shake(8);
            s.msg = ['Aïe, Michel !', 'Ça chatouille !', 'Pas là, Michel !', 'Aïe, Michel !!', 'MICHEL !'][Math.min(4, s.misses - 1)]; s.msgT = 0.9;
            if (s.misses >= MAX_MISS) api.end(false, 'Cinq tapes à côté : ton dos est tout rouge de tapotements, et la bestiole se promène encore. Merci quand même, Michel !');
          } else {
            api.sfx('whoosh');
          }
        }
      },
      timeout() {
        api.end(false, s.caught
          ? `${s.caught} bestiole${s.caught > 1 ? 's' : ''} sur ${GOAL}… la dernière se promène encore dans ton dos. « Michel, Michel, aidez-moi ! »`
          : 'La bestiole a fait le tour complet de ton dos sans se faire prendre. « Michel, Michel, aidez-moi ! »');
        return false;
      },
      draw(g) {
        g.drawImage(BG, 0, 0);
        const jx = s.jolt * Math.sin(s.t * 60) * 6, jy = -s.jolt * 10;
        g.save(); g.translate(jx, jy);
        drawBack(g);
        // la bestiole
        if (s.gone <= 0) drawBug(g, s.bx, s.by, s.face, 1);
        g.restore();
        for (const f of s.flying) drawBug(g, f.x, f.y, f.r, 0.9);

        // Michel : bras qui sort du bas à droite, tête qui dépasse
        const hx = s.hx, hy = s.hy + (s.grabT > 0 ? 6 : 0);
        g.strokeStyle = '#4b6332'; g.lineWidth = 34; g.lineCap = 'round';
        g.beginPath(); g.moveTo(905, 560); g.quadraticCurveTo((905 + hx) / 2 + 40, (560 + hy) / 2 + 60, hx + 22, hy + 26); g.stroke();
        drawPerson(g, { ...PEOPLE.michel, x: 885, y: 470, size: 92, body: false, expression: api.ended ? 'laugh' : s.jolt > 0.3 ? 'surprised' : 'smile' });
        drawHand(g, hx, hy, s.grabT > 0);

        // bulle de Papa
        if (s.msgT > 0) {
          const str = s.msg;
          g.font = '800 24px "Nunito Sans", system-ui, sans-serif';
          const w = (g.measureText ? g.measureText(str).width : str.length * 12) + 34;
          api.roundRect(g, 480 - w / 2, 32, w, 48, 16); g.fillStyle = '#fff'; g.fill();
          g.beginPath(); g.moveTo(470, 78); g.lineTo(486, 100); g.lineTo(492, 78); g.closePath(); g.fill();
          api.text(g, str, 480, 57, { size: 24, color: '#7a2140', weight: 800 });
        }

        // HUD
        api.text(g, `Bestioles : ${s.caught} / ${GOAL}`, 26, 110, { size: 24, color: '#fff', align: 'left', stroke: '#000a' });
        api.text(g, `Tapes à côté : ${s.misses} / ${MAX_MISS}`, 26, 142, { size: 18, color: '#ffd1c4', align: 'left', stroke: '#000a' });
      },
    };

    function drawBack(g) {
      const L = LOOK;
      // pantalon + ceinture
      g.fillStyle = L.pants; g.fillRect(BX - 150, 440, 300, 110);
      g.fillStyle = '#2a2522'; g.fillRect(BX - 152, 436, 304, 16);
      // bras levés (manches du polo) qui tiennent le t-shirt relevé
      for (const k of [-1, 1]) {
        g.strokeStyle = L.shirt; g.lineWidth = 46; g.lineCap = 'round';
        g.beginPath(); g.moveTo(BX + k * 150, 245); g.lineTo(BX + k * 215, 180); g.stroke();
        g.strokeStyle = L.skin; g.lineWidth = 34;
        g.beginPath(); g.moveTo(BX + k * 215, 180); g.lineTo(BX + k * 150, 112); g.stroke();
        g.fillStyle = L.skin; g.beginPath(); g.arc(BX + k * 146, 108, 19, 0, Math.PI * 2); g.fill();
      }
      // dos (peau) : rien de gênant, juste un dos !
      g.fillStyle = L.skin;
      g.beginPath();
      g.moveTo(BX - 160, 240); g.quadraticCurveTo(BX - 172, 340, BX - 150, 442);
      g.lineTo(BX + 150, 442); g.quadraticCurveTo(BX + 172, 340, BX + 160, 240); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(178, 118, 87, 0.45)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(BX, 262); g.quadraticCurveTo(BX + 4, 350, BX, 432); g.stroke();
      for (const k of [-1, 1]) { g.beginPath(); g.arc(BX + k * 72, 292, 44, Math.PI * (k < 0 ? 0.55 : 0.05), Math.PI * (k < 0 ? 0.95 : 0.45)); g.stroke(); }
      g.fillStyle = 'rgba(212, 154, 118, 0.35)';
      g.beginPath(); g.ellipse(BX, 430, 140, 14, 0, 0, Math.PI * 2); g.fill();
      // t-shirt roulé sur les épaules
      g.fillStyle = L.shirt;
      api.roundRect(g, BX - 172, 200, 344, 62, 30); g.fill();
      g.strokeStyle = L.shirtDark; g.lineWidth = 3;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(BX - 150 + k * 10, 222 + k * 9); g.quadraticCurveTo(BX, 214 + k * 12, BX + 150 - k * 10, 222 + k * 9); g.stroke(); }
      // cou + arrière de la tête (couronne de cheveux courts)
      g.fillStyle = L.skinShade; g.fillRect(BX - 26, 168, 52, 40);
      g.fillStyle = L.skin; g.beginPath(); g.ellipse(BX - 60, 140, 10, 16, 0, 0, Math.PI * 2); g.ellipse(BX + 60, 140, 10, 16, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(BX, 128, 60, 0, Math.PI * 2); g.fill();
      g.fillStyle = L.hair;
      g.beginPath(); g.arc(BX, 128, 61, Math.PI * 0.08, Math.PI * 0.92); g.quadraticCurveTo(BX, 150, BX + Math.cos(Math.PI * 0.08) * 61, 128 + Math.sin(Math.PI * 0.08) * 61); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(BX - 18, 96, 18, 10, -0.4, 0, Math.PI * 2); g.fill();
    }

    function drawBug(g, x, y, a, k) {
      g.save(); g.translate(x, y); g.rotate(a); g.scale(k, k);
      g.strokeStyle = '#2b2018'; g.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) for (const sd of [-1, 1]) {
        const w = Math.sin(s.leg + i * 2 + (sd > 0 ? 1 : 0)) * 4;
        g.beginPath(); g.moveTo(i * 7, sd * 6); g.lineTo(i * 7 + w, sd * 17); g.stroke();
      }
      g.beginPath(); g.moveTo(14, -3); g.lineTo(24, -10); g.moveTo(14, 3); g.lineTo(24, 10); g.stroke();
      g.fillStyle = '#d7352b'; g.beginPath(); g.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2b2018'; g.beginPath(); g.arc(14, 0, 6, 0, Math.PI * 2); g.fill();
      g.fillRect(-15, -1, 28, 2);
      for (const [px, py] of [[-6, -5], [-6, 5], [5, -5], [5, 5]]) { g.beginPath(); g.arc(px, py, 2.6, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(16, -2.5, 1.8, 0, Math.PI * 2); g.arc(16, 2.5, 1.8, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    function drawHand(g, x, y, grab) {
      g.save(); g.translate(x, y);
      g.fillStyle = PEOPLE.michel.skin;
      g.strokeStyle = '#b98663'; g.lineWidth = 2;
      if (grab) {
        g.beginPath(); g.arc(0, 4, 20, 0, Math.PI * 2); g.fill(); g.stroke();
        for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-12 + i * 8, -8, 5, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
      } else {
        g.beginPath(); g.ellipse(4, 8, 22, 20, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-12 + i * 9, -14 + Math.abs(i - 1.5) * 3, 5, 12, (i - 1.5) * 0.12, 0, Math.PI * 2); g.fill(); g.stroke(); }
        g.beginPath(); g.ellipse(-18, 10, 6, 11, -0.9, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      // repère de visée
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  },
};

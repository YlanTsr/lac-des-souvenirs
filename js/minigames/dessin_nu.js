/**
 * « Le cours de nu » (dessin_nu)
 * Aux Beaux-Arts, pendant le cours de dessin de nu… une camarade lui a laissé son numéro.
 * (Le modèle du jour : un modèle vivant caricatural, tout en rondeurs « à la Rubens »,
 *  petite tête à chignon, moustache en guidon, pose prétentieuse. Public familial oblige :
 *  aucun détail anatomique, tout est caché par des gags — feuille de vigne, bandeau CENSURÉ, chat.)
 * Mécanique : maintenir le clic (ou Espace + flèches) et suivre le contour en pointillés
 * sur le chevalet. Plus le trait est précis, plus la jauge « Ressemblance » se remplit.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'dessin_nu',
  title: 'Le cours de nu',
  instructions: 'Cours de dessin aux Beaux-Arts : maintiens le crayon appuyé et suis les pointillés pour croquer le modèle tout en rondeurs.',
  controls: 'Maintenir clic / doigt et suivre · ou Espace maintenu + flèches',
  duration: 12,
  introExpression: 'focus',
  successTitle: 'Un vrai coup de crayon !',
  failTitle: 'Période abstraite !',
  successText: 'Rondeurs, moustache, feuille de vigne : tout y est ! Et la camarade d’à côté a glissé son numéro sur ton chevalet. L’art, ça ouvre des portes !',
  failText: 'Ton modèle ressemble à un Picasso un lundi matin… mais la camarade t’a quand même laissé son numéro. L’art mène à tout !',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;
    const GROUND = 500;
    const TOL = 24;          // distance max au contour pour « accrocher » le trait
    const WIN = 0.7;         // ressemblance minimale une fois le contour bouclé
    const PEN_SPEED = 210;   // vitesse du crayon aux flèches (px/s)
    const CAN = { x: 360, y: 108, w: 260, h: 300 }; // toile du chevalet

    // ── contour du modèle caricatural, en coordonnées écran sur la toile :
    // petite tête à chignon, bras gauche levé derrière la tête, main droite sur la hanche,
    // corps tout en rondeurs (épaules, bedaine, hanches XXL), petits pieds.
    const HC = { x: 500, y: 155, r: 19 };
    const key = [
      [512, 180], [545, 186], [575, 200], [603, 228], [590, 250], [568, 262],   // épaule, bras sur la hanche
      [600, 290], [607, 325], [592, 352], [565, 372], [559, 390], [572, 402],   // hanche XXL, cuisse, mollet
      [530, 405], [500, 400], [470, 405], [428, 402],                           // petits pieds
      [441, 390], [434, 372], [400, 350], [382, 318], [386, 282], [396, 250],   // cuisse, hanche, poignée d'amour
      [410, 222], [424, 200], [404, 160], [408, 126], [440, 126], [470, 136],   // aisselle, bras levé, coude, main
    ];
    // tête : arc de cercle avec la bosse du chignon au sommet
    for (let k = 0; k <= 15; k++) {
      const a = Math.PI + 0.5 + (k / 15) * (Math.PI + 0.7);
      const r = HC.r + 13 * Math.exp(-(((a - Math.PI * 1.5) / 0.3) ** 2));
      key.push([HC.x + Math.cos(a) * r, HC.y + Math.sin(a) * r]);
    }
    // lissage Catmull-Rom (contour fermé) : des courbes bien rebondies
    const raw = [];
    for (let i = 0; i < key.length; i++) {
      const p0 = key[(i - 1 + key.length) % key.length], p1 = key[i], p2 = key[(i + 1) % key.length], p3 = key[(i + 2) % key.length];
      for (let j = 0; j < 4; j++) {
        const t = j / 4, t2 = t * t, t3 = t2 * t;
        const cr = (c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3);
        raw.push([cr(0), cr(1)]);
      }
    }
    raw.push(raw[0]);
    // points denses tous les 4 px
    const D = [];
    for (let i = 0; i < raw.length - 1; i++) {
      const [ax, ay] = raw[i], [bx, by] = raw[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 4));
      for (let j = 0; j < n; j++) D.push({ x: lerp(ax, bx, j / n), y: lerp(ay, by, j / n) });
    }
    D.push({ x: raw[raw.length - 1][0], y: raw[raw.length - 1][1] });
    const N = D.length;

    const s = {
      D, k: 0, sum: 0, pen: { x: D[0].x, y: D[0].y }, kf: 0, lastPtr: null,
      ink: [], drawing: false, result: null, endT: 0, msg: '', msgT: 0, offT: 0,
      blobs: Array.from({ length: 9 }, () => ({
        x: rand(CAN.x + 30, CAN.x + CAN.w - 30), y: rand(CAN.y + 30, CAN.y + CAN.h - 30), r: rand(14, 40),
        c: ['#e8453c', '#f2b33d', '#3a6fb0', '#4fa36b', '#c8486b'][Math.floor(rand(0, 5))], tri: rand(0, 1) < 0.5, rot: rand(0, 6),
      })),
    };
    const gauge = () => s.sum / (N - 1);
    const classmate = { ...PEOPLE.passant, hair: 'ponytail', hairColor: '#8a4a2a', shirt: '#e0a040', pants: '#4a3a5a', skin: '#f1cdb0' };

    // ── le modèle (ou son croquis) : silhouette + gags cache-tout. Coordonnées de la toile, décalées de (dx, dy).
    const REAL = { skin: '#f4c4a0', line: '#b8785a', hair: '#4a2e22', leaf: '#5f9a3a', vein: '#3d6a24', cheek: 'rgba(232, 110, 110, 0.55)', band: '#1d1a1a', lw: 3 };
    const SKETCH = { skin: 'rgba(244, 196, 160, 0.45)', line: 'rgba(60, 50, 45, 0.7)', hair: 'rgba(55, 42, 38, 0.85)', leaf: 'rgba(95, 154, 58, 0.75)', vein: 'rgba(40, 70, 30, 0.8)', cheek: 'rgba(232, 110, 110, 0.45)', band: 'rgba(30, 26, 26, 0.85)', lw: 2.5 };
    function drawModel(g, dx, dy, P) {
      g.save(); g.translate(dx, dy);
      g.lineCap = 'round'; g.lineJoin = 'round';
      // silhouette
      g.fillStyle = P.skin; g.strokeStyle = P.line; g.lineWidth = P.lw;
      g.beginPath(); raw.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.stroke();
      // rondeurs (plis comiques) : bourrelets, genoux, double menton
      g.lineWidth = 2;
      for (const [x0, y0, cx, cy, x1, y1] of [
        [420, 290, 492, 322, 575, 288], [432, 262, 470, 274, 500, 266], [392, 300, 404, 310, 412, 300],
        [440, 372, 448, 378, 456, 370], [540, 370, 548, 378, 556, 370], [490, 176, 500, 182, 510, 176], [575, 214, 582, 222, 588, 216],
      ]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke(); }
      // chignon + cheveux plaqués
      g.fillStyle = P.hair;
      g.beginPath(); g.arc(HC.x, HC.y - 24, 8.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(HC.x, HC.y, HC.r + 0.5, Math.PI + 0.25, Math.PI * 2 - 0.25); g.closePath(); g.fill();
      // visage : yeux fermés, air inspiré, joues roses, moustache en guidon
      g.fillStyle = P.cheek;
      for (const ex of [-11, 11]) { g.beginPath(); g.arc(HC.x + ex, HC.y + 6, 4, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = P.hair; g.lineWidth = 2;
      for (const ex of [-7, 7]) {
        g.beginPath(); g.arc(HC.x + ex, HC.y - 1, 3.5, 0.3, Math.PI - 0.3); g.stroke();
        g.beginPath(); g.moveTo(HC.x + ex - 4, HC.y - 8); g.lineTo(HC.x + ex + 4, HC.y - 9 - Math.sign(ex)); g.stroke();
      }
      g.fillStyle = P.line; g.beginPath(); g.arc(HC.x, HC.y + 4, 2.6, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3.5;
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(HC.x, HC.y + 8);
        g.quadraticCurveTo(HC.x + sx * 10, HC.y + 14, HC.x + sx * 19, HC.y + 6);
        g.quadraticCurveTo(HC.x + sx * 22, HC.y + 1, HC.x + sx * 17, HC.y + 1);
        g.stroke();
      }
      // bandeau « CENSURÉ » en travers de la poitrine
      g.save(); g.translate(492, 226); g.rotate(-0.1);
      g.fillStyle = P.band; g.fillRect(-64, -12, 128, 24);
      api.text(g, 'CENSURÉ', 0, 1, { size: 15, color: '#fff', weight: 800 });
      g.restore();
      // feuille de vigne géante
      g.save(); g.translate(494, 338); g.rotate(0.15);
      g.fillStyle = P.leaf;
      for (const [a, l] of [[-1.57, 20], [-0.7, 18], [-2.44, 18], [0.3, 14], [-3.44, 14]]) {
        g.beginPath(); g.ellipse(Math.cos(a) * l * 0.6, Math.sin(a) * l * 0.6 + 6, l * 0.75, l * 0.5, a, 0, Math.PI * 2); g.fill();
      }
      g.beginPath(); g.arc(0, 6, 13, 0, Math.PI * 2); g.fill();
      g.strokeStyle = P.vein; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(0, 18); g.lineTo(0, -12); g.moveTo(0, 6); g.lineTo(-14, -6); g.moveTo(0, 6); g.lineTo(14, -6); g.stroke();
      g.restore();
      g.restore();
    }

    // ── décor pré-rendu (atelier des Beaux-Arts)
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      g.fillStyle = '#ead9bd'; g.fillRect(0, 0, W, GROUND);
      // grande verrière d'atelier
      g.fillStyle = '#9cc3dd'; g.fillRect(640, 70, 120, 260);
      const sky = g.createLinearGradient(0, 70, 0, 330); sky.addColorStop(0, '#b7d7ee'); sky.addColorStop(1, '#f6dcb0');
      g.fillStyle = sky; g.fillRect(640, 70, 120, 260);
      g.strokeStyle = '#6b4a32'; g.lineWidth = 6; g.strokeRect(640, 70, 120, 260);
      g.lineWidth = 3;
      for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(640 + i * 40, 70); g.lineTo(640 + i * 40, 330); g.stroke(); }
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(640, 70 + i * 65); g.lineTo(760, 70 + i * 65); g.stroke(); }
      // moulures + plinthe
      g.fillStyle = '#d9c4a0'; g.fillRect(0, 60, W, 8); g.fillRect(0, GROUND - 26, W, 26);
      // bannière
      api.roundRect(g, 30, 22, 300, 34, 6); g.fillStyle = '#7a2e2e'; g.fill();
      api.text(g, 'ÉCOLE DES BEAUX-ARTS', 180, 40, { size: 18, color: '#f6e3c0', weight: 800 });
      // tableau accroché
      for (const [x, y, w, h, c] of [[800, 120, 110, 80, '#5d7a9a']]) {
        g.fillStyle = '#b08a4a'; g.fillRect(x - 6, y - 6, w + 12, h + 12);
        g.fillStyle = c; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x + w * 0.4, y + h * 0.45, h * 0.22, 0, Math.PI * 2); g.fill();
      }
      // chevalets du fond (silhouettes)
      g.strokeStyle = 'rgba(110, 80, 55, 0.45)'; g.lineWidth = 6; g.lineCap = 'round';
      for (const x of [830, 900]) {
        g.beginPath(); g.moveTo(x, 240); g.lineTo(x - 34, GROUND - 10); g.moveTo(x, 240); g.lineTo(x + 34, GROUND - 10); g.stroke();
        g.fillStyle = 'rgba(250, 245, 235, 0.75)'; g.fillRect(x - 32, 270, 64, 80);
      }
      // parquet
      g.fillStyle = '#a87850'; g.fillRect(0, GROUND, W, H - GROUND);
      g.strokeStyle = 'rgba(80, 50, 30, 0.35)'; g.lineWidth = 2;
      for (let y = GROUND + 12; y < H; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let i = 0; i < 30; i++) { const x = (i * 97) % W, y = GROUND + (i % 3) * 14; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 14); g.stroke(); }

      // rideau de velours derrière l'estrade du modèle
      const cur = g.createLinearGradient(40, 0, 330, 0);
      cur.addColorStop(0, '#6e1f2a'); cur.addColorStop(0.5, '#9a3442'); cur.addColorStop(1, '#6e1f2a');
      g.fillStyle = cur; g.fillRect(40, 70, 290, 330);
      g.strokeStyle = 'rgba(40, 8, 14, 0.35)'; g.lineWidth = 5;
      for (let x = 62; x < 330; x += 34) { g.beginPath(); g.moveTo(x, 84); g.quadraticCurveTo(x + 8, 240, x - 2, 398); g.stroke(); }
      g.fillStyle = '#c9a24a';
      for (let x = 40; x < 330; x += 29) { g.beginPath(); g.arc(x + 14.5, 70, 14.5, 0, Math.PI); g.fill(); }
      // estrade
      g.fillStyle = '#7a4e30'; g.fillRect(55, 410, 260, GROUND - 410);
      g.fillStyle = '#9a6a44'; g.fillRect(45, 396, 280, 16);
      api.roundRect(g, 112, 428, 146, 46, 5); g.fillStyle = '#f3ead8'; g.fill();
      api.text(g, 'MODÈLE VIVANT', 185, 443, { size: 14, color: '#5a3a2a', weight: 800 });
      api.text(g, '(prière de ne pas rire)', 185, 461, { size: 11, color: '#7a5a4a', weight: 600 });
      // le modèle lui-même, fier comme un paon (même silhouette que les pointillés, décalée)
      drawModel(g, -310, -6, REAL);

      // chevalet (pieds + toile)
      g.strokeStyle = '#8a5a34'; g.lineWidth = 12; g.lineCap = 'round';
      g.beginPath(); g.moveTo(490, 84); g.lineTo(400, GROUND + 18); g.moveTo(490, 84); g.lineTo(580, GROUND + 18); g.stroke();
      g.strokeStyle = '#6f4527'; g.lineWidth = 9;
      g.beginPath(); g.moveTo(490, 90); g.lineTo(500, GROUND + 6); g.stroke();
      g.fillStyle = '#8a5a34'; g.fillRect(CAN.x - 14, CAN.y + CAN.h + 2, CAN.w + 28, 14);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(CAN.x + 6, CAN.y + 6, CAN.w, CAN.h);
      g.fillStyle = '#fdfaf3'; g.fillRect(CAN.x, CAN.y, CAN.w, CAN.h);
      g.strokeStyle = '#e4dccb'; g.lineWidth = 2; g.strokeRect(CAN.x, CAN.y, CAN.w, CAN.h);
    }

    function nearestAhead(p, from, span) {
      let best = from, bd = Infinity;
      for (let j = Math.max(0, from - 4); j <= Math.min(N - 1, from + span); j++) {
        const d = Math.hypot(D[j].x - p.x, D[j].y - p.y);
        if (d < bd) { bd = d; best = j; }
      }
      return { j: best, d: bd };
    }

    function finish(ok) {
      s.result = ok ? 'win' : 'fail';
      s.endT = 0;
      if (ok) {
        api.sfx('catch');
        api.burst(CAN.x + CAN.w / 2, CAN.y + CAN.h / 2, { n: 24, shape: 'star', color: ['#ffd34d', '#fff3c4'], speed: 260, gravity: 200, size: 8 });
        api.end(true, `Ressemblance ${Math.round(gauge() * 100)} % : rondeurs, moustache, feuille de vigne, tout y est ! Et la camarade d’à côté a glissé son numéro sur ton chevalet.`);
      } else {
        api.sfx('splat');
        api.shake(6);
        api.end(false, 'Ton modèle ressemble à un Picasso un lundi matin… mais la camarade t’a quand même laissé son numéro. L’art mène à tout !');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.msgT = Math.max(0, s.msgT - dt);
        if (api.ended) { s.endT += dt; s.drawing = false; return; }

        // crayon : suit la souris / le doigt, ou se déplace aux flèches
        const p = input.pointer;
        const moved = p.active && (!s.lastPtr || s.lastPtr.x !== p.x || s.lastPtr.y !== p.y);
        if (moved || p.pressed) { s.pen.x = p.x; s.pen.y = p.y; s.lastPtr = { x: p.x, y: p.y }; }
        const ax = input.axis('x'), ay = input.axis('y');
        const keys = !!(ax || ay);
        const was = s.drawing;
        s.drawing = input.held();
        if (keys) {
          const n = Math.hypot(ax, ay), ux = ax / n, uy = ay / n;
          // au clavier, en traçant sur le contour, le crayon glisse le long des pointillés
          // tant que la flèche va dans le bon sens (la précision = choisir la bonne flèche)
          const a = D[s.k], b = D[Math.min(N - 1, s.k + 3)];
          const tl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const onPath = s.drawing && s.k < N - 1 && Math.hypot(a.x - s.pen.x, a.y - s.pen.y) < TOL;
          const dot = onPath ? (ux * (b.x - a.x) + uy * (b.y - a.y)) / tl : 0;
          if (dot > 0.35) {
            s.kf = Math.max(s.kf, s.k) + (PEN_SPEED * dot * dt) / 4;
            const i = Math.min(N - 1, Math.floor(s.kf));
            const off = (1 - dot) * 16 * Math.sin(api.t * 9);
            s.pen.x = D[i].x - ((b.y - a.y) / tl) * off;
            s.pen.y = D[i].y + ((b.x - a.x) / tl) * off;
          } else {
            s.pen.x = clamp(s.pen.x + ux * PEN_SPEED * dt, 0, W);
            s.pen.y = clamp(s.pen.y + uy * PEN_SPEED * dt, 0, H);
            if (onPath) {
              // mauvaise flèche : le trait gribouille sur place (et la ressemblance en pâtit)
              const ox = s.pen.x - a.x, oy = s.pen.y - a.y, d = Math.hypot(ox, oy), lim = TOL * 0.8;
              if (d > lim) { s.pen.x = a.x + (ox / d) * lim; s.pen.y = a.y + (oy / d) * lim; }
              s.sum = Math.max(0, s.sum - 4 * dt);
            }
          }
        }
        if (!s.drawing) return;
        if (!was && s.ink.length < 900) s.ink.push({ x: s.pen.x, y: s.pen.y, m: true });

        const near = nearestAhead(s.pen, s.k, 14);
        const last = s.ink[s.ink.length - 1];
        if (!last || Math.hypot(last.x - s.pen.x, last.y - s.pen.y) > 3) {
          if (s.ink.length < 900) s.ink.push({ x: s.pen.x, y: s.pen.y });
        }
        if (near.d < TOL && near.j > s.k) {
          const q = near.d < 9 ? 1 : lerp(1, 0.35, (near.d - 9) / (TOL - 9));
          s.sum += q * (near.j - s.k);
          s.k = near.j;
          if (Math.random() < 0.25) api.sfx('grain');
        } else if (near.d > TOL * 1.6 && s.pen.x > CAN.x && s.pen.x < CAN.x + CAN.w && s.pen.y > CAN.y && s.pen.y < CAN.y + CAN.h) {
          s.offT += dt;
          if (s.offT > 0.6 && s.msgT <= 0) { s.msg = 'Suis les pointillés !'; s.msgT = 1.2; s.offT = 0; }
        }
        if (s.k >= N - 1) finish(gauge() >= WIN);
      },
      timeout() {
        const ok = s.k > N * 0.9 && gauge() >= WIN;
        finish(ok);
        return ok;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);

        // le chat de l'atelier se promène pile devant le modèle
        {
          const ph = api.t * 0.55, dir = Math.cos(ph) >= 0 ? 1 : -1;
          const cx0 = 185 + Math.sin(ph) * 105, step = Math.sin(api.t * 12) * 1.5;
          g.save(); g.translate(cx0, 396); g.scale(dir, 1);
          g.strokeStyle = '#d07a2e'; g.lineWidth = 5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(-15, -12); g.quadraticCurveTo(-30, -16, -26, -34 + step); g.stroke();
          g.lineWidth = 4;
          for (const lx of [-10, 9]) { g.beginPath(); g.moveTo(lx, -8); g.lineTo(lx + step, 0); g.moveTo(lx + 4, -8); g.lineTo(lx + 4 - step, 0); g.stroke(); }
          g.fillStyle = '#e08a3a';
          g.beginPath(); g.ellipse(0, -13, 17, 8, 0, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(17, -21, 7.5, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.moveTo(11, -26); g.lineTo(13, -34); g.lineTo(17, -27); g.moveTo(18, -28); g.lineTo(23, -34); g.lineTo(24, -25); g.fill();
          g.strokeStyle = '#a85a20'; g.lineWidth = 2;
          for (const sx of [-8, -2, 4]) { g.beginPath(); g.moveTo(sx, -20); g.lineTo(sx + 2, -12); g.stroke(); }
          g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(20, -22, 1.4, 0, Math.PI * 2); g.fill();
          g.restore();
        }

        // contour à suivre (pointillés) + trait déjà fait
        g.save();
        g.beginPath(); g.rect(CAN.x, CAN.y, CAN.w, CAN.h); g.clip();
        if (s.result === 'win') drawModel(g, 0, 0, SKETCH);   // le croquis réussi, gags compris
        if (s.result === 'fail') {
          // « période abstraite »
          for (const b of s.blobs) {
            g.globalAlpha = 0.75; g.fillStyle = b.c;
            g.beginPath();
            if (b.tri) { for (let i = 0; i < 3; i++) { const a = b.rot + (i * Math.PI * 2) / 3; g.lineTo(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r); } g.closePath(); }
            else g.arc(b.x, b.y, b.r * 0.8, 0, Math.PI * 2);
            g.fill();
          }
          g.globalAlpha = 1;
          // un Picasso : moustache de travers, œil égaré, feuille de vigne en exil
          g.save(); g.translate(CAN.x + 150, CAN.y + 120); g.rotate(0.6);
          g.strokeStyle = 'rgba(55, 42, 38, 0.9)'; g.lineWidth = 4; g.lineCap = 'round';
          for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sx * 14, 8, sx * 26, -2); g.quadraticCurveTo(sx * 30, -9, sx * 23, -9); g.stroke(); }
          g.restore();
          g.fillStyle = '#fff'; g.beginPath(); g.ellipse(CAN.x + 70, CAN.y + 200, 16, 9, -0.4, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(CAN.x + 74, CAN.y + 199, 5, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(95, 154, 58, 0.85)'; g.beginPath(); g.ellipse(CAN.x + 210, CAN.y + 250, 18, 11, 0.8, 0, Math.PI * 2); g.fill();
        }
        g.setLineDash([3, 7]); g.lineWidth = 3; g.strokeStyle = 'rgba(120, 110, 100, 0.55)'; g.lineCap = 'round';
        g.beginPath();
        for (let i = s.k; i < N; i += 2) (i === s.k ? g.moveTo(D[i].x, D[i].y) : g.lineTo(D[i].x, D[i].y));
        g.stroke(); g.setLineDash([]);
        // portion validée (trait propre au fusain)
        if (s.k > 0) {
          g.strokeStyle = 'rgba(60, 50, 45, 0.85)'; g.lineWidth = 4;
          g.beginPath();
          for (let i = 0; i <= s.k; i += 2) (i ? g.lineTo(D[i].x, D[i].y) : g.moveTo(D[i].x, D[i].y));
          g.stroke();
        }
        // le vrai coup de crayon du joueur (tremblé)
        if (s.ink.length > 1) {
          g.strokeStyle = 'rgba(40, 35, 60, 0.35)'; g.lineWidth = 2;
          g.beginPath();
          s.ink.forEach((pt, i) => (i && !pt.m ? g.lineTo(pt.x, pt.y) : g.moveTo(pt.x, pt.y)));
          g.stroke();
        }
        g.restore();

        // repère : prochain point à atteindre
        if (!api.ended) {
          const nx = D[Math.min(N - 1, s.k + 6)];
          const pulse = 7 + Math.sin(api.t * 8) * 2;
          g.strokeStyle = '#e0405f'; g.lineWidth = 3;
          g.beginPath(); g.arc(nx.x, nx.y, pulse, 0, Math.PI * 2); g.stroke();
          if (s.k === 0) api.text(g, 'Départ', D[0].x - 50, D[0].y + 4, { size: 16, color: '#e0405f', stroke: '#fffa', strokeWidth: 4 });
        }

        // la camarade (et son petit papier)
        const walk = s.result ? clamp(s.endT / 0.7, 0, 1) : 0;
        const cx = lerp(880, 800, walk);
        drawPerson(g, { ...classmate, x: cx, y: GROUND + 20, size: 58, t: api.t, pose: walk > 0 && walk < 1 ? 'run' : 'stand', expression: s.result ? 'love' : 'smile', flipX: true });
        // Papa à côté du chevalet, crayon en main
        const pen = s.pen;
        const handT = { x: clamp(pen.x, 560, 700), y: clamp(pen.y, 300, 420) };
        api.avatar(g, {
          x: 700, y: GROUND + 20, size: 64, pose: 'stand',
          expression: s.result === 'win' ? 'happy' : s.result === 'fail' ? 'laugh' : s.drawing ? 'focus' : 'smile',
          lookX: -1, lookY: 0.3, blush: s.result && s.endT > 0.8 ? 1 : 0,
          hands: { l: handT, r: { x: 740, y: 440 } },
        });
        if (s.result) {
          const k = clamp((s.endT - 0.5) / 0.6, 0, 1);
          const px = lerp(cx - 30, CAN.x + CAN.w - 60, k), py = lerp(380, CAN.y + 28, k);
          g.save(); g.translate(px, py); g.rotate(lerp(0.4, -0.12, k));
          g.fillStyle = '#fff7a8'; g.fillRect(-58, -18, 116, 36);
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-58, 14, 116, 4);
          api.text(g, '06 ‥ ‥ ‥ ‥ ♥', 0, 1, { size: 17, color: '#c8486b', weight: 800 });
          g.restore();
        }

        // crayon (curseur)
        if (!api.ended) {
          g.save(); g.translate(pen.x, pen.y); g.rotate(-0.7);
          g.fillStyle = s.drawing ? '#3a3a48' : '#7a7a88';
          g.beginPath(); g.moveTo(0, 0); g.lineTo(6, -10); g.lineTo(-6, -10); g.closePath(); g.fill();
          g.fillStyle = '#f2b33d'; g.fillRect(-6, -46, 12, 36);
          g.fillStyle = '#e88fb4'; g.fillRect(-6, -54, 12, 8);
          g.restore();
        }

        // HUD
        const gv = clamp(gauge(), 0, 1);
        api.text(g, 'Ressemblance', 360, 82, { size: 18, color: '#fff', stroke: '#000a', align: 'left' });
        api.roundRect(g, 490, 72, 200, 20, 10); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
        if (gv > 0) { api.roundRect(g, 492, 74, 196 * gv, 16, 8); g.fillStyle = gv >= WIN ? '#4fa36b' : '#f2b33d'; g.fill(); }
        g.fillStyle = '#fff'; g.fillRect(490 + 200 * WIN, 68, 3, 28);
        api.text(g, `${Math.round(gv * 100)} %`, 735, 82, { size: 18, color: '#fff', stroke: '#000a' });
        if (s.msgT > 0) api.text(g, s.msg, CAN.x + CAN.w / 2, CAN.y + CAN.h + 50, { size: 24, color: '#fff', stroke: '#7a2e2e' });
        if (!api.ended && api.t < 2.5 && s.k === 0) api.text(g, 'Maintiens appuyé et suis les pointillés', CAN.x + CAN.w / 2, CAN.y + CAN.h + 50, { size: 22, color: '#fff', stroke: '#000a' });
        if (s.result === 'fail' && s.endT > 0.3) api.text(g, 'L’art mène à tout !', W / 2, 470, { size: 34, color: '#fff3d6', stroke: '#7a2e2e', strokeWidth: 8 });
      },
    };
  },
};

/**
 * « Le cours de nu » (dessin_nu)
 * Aux Beaux-Arts, pendant le cours de dessin de nu… une camarade lui a laissé son numéro.
 * (Le modèle du jour : une Vénus en plâtre, très drapée. Public familial oblige.)
 * Mécanique : maintenir le clic (ou Espace + flèches) et suivre le contour en pointillés
 * sur le chevalet. Plus le trait est précis, plus la jauge « Ressemblance » se remplit.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'dessin_nu',
  title: 'Le cours de nu',
  instructions: 'Cours de dessin aux Beaux-Arts : maintiens le crayon appuyé et suis les pointillés pour reproduire la Vénus drapée.',
  controls: 'Maintenir clic / doigt et suivre · ou Espace maintenu + flèches',
  duration: 12,
  introExpression: 'focus',
  successTitle: 'Un vrai coup de crayon !',
  failTitle: 'Période abstraite !',
  successText: 'Vénus est parfaite… et la camarade d’à côté a glissé son numéro sur ton chevalet. L’art, ça ouvre des portes !',
  failText: 'Ta Vénus ressemble à un Picasso un lundi matin… mais elle t’a quand même laissé son numéro. L’art mène à tout !',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;
    const GROUND = 500;
    const TOL = 24;          // distance max au contour pour « accrocher » le trait
    const WIN = 0.7;         // ressemblance minimale une fois le contour bouclé
    const PEN_SPEED = 210;   // vitesse du crayon aux flèches (px/s)
    const CAN = { x: 360, y: 108, w: 260, h: 300 }; // toile du chevalet

    // ── contour de la Vénus (tête + drapé), en coordonnées écran sur la toile
    const HC = { x: 490, y: 160, r: 28 };
    const raw = [];
    for (let k = 0; k <= 14; k++) {
      const a = 2.1 + (k / 14) * (Math.PI * 2 + 1.05 - 2.1);
      raw.push([HC.x + Math.cos(a) * HC.r, HC.y + Math.sin(a) * HC.r]);
    }
    raw.push([504, 190], [552, 207], [566, 268], [546, 300], [572, 392], [408, 392], [434, 300], [414, 268], [428, 207], [476, 190]);
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
      // tableaux accrochés
      for (const [x, y, w, h, c] of [[40, 90, 70, 90, '#c97b4a'], [800, 120, 110, 80, '#5d7a9a']]) {
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

      // la Vénus drapée sur son socle (même silhouette que le modèle, décalée)
      const dx = -310, dy = -2;
      g.fillStyle = '#cbbfae'; g.fillRect(105, 390, 150, 110);
      g.fillStyle = '#ddd2c2'; g.fillRect(95, 380, 170, 16);
      api.roundRect(g, 128, 420, 104, 40, 4); g.fillStyle = '#f3ead8'; g.fill();
      api.text(g, 'VÉNUS', 180, 432, { size: 13, color: '#5a4a3a', weight: 800 });
      api.text(g, '(très drapée)', 180, 449, { size: 11, color: '#7a6a5a', weight: 600 });
      g.fillStyle = '#f2ede4';
      g.beginPath();
      raw.slice(15).forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
      g.closePath(); g.fill();
      // plis du drapé
      g.strokeStyle = 'rgba(150, 135, 115, 0.55)'; g.lineWidth = 3;
      for (const [x0, y0, x1, y1] of [[126, 214, 236, 300], [132, 250, 238, 380], [118, 300, 200, 388], [150, 230, 248, 330], [160, 300, 250, 390]]) {
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 14, (y0 + y1) / 2 - 10, x1, y1); g.stroke();
      }
      // tête (chignon, yeux de statue)
      g.fillStyle = '#f2ede4';
      g.beginPath(); g.arc(HC.x + dx, HC.y + dy, HC.r, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(HC.x + dx + 4, HC.y + dy - 30, 13, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(140, 125, 105, 0.8)'; g.lineWidth = 2;
      for (const ex of [-10, 10]) { g.beginPath(); g.arc(HC.x + dx + ex, HC.y + dy - 2, 5, 0.2, Math.PI - 0.2); g.stroke(); }
      g.beginPath(); g.moveTo(HC.x + dx - 5, HC.y + dy + 14); g.quadraticCurveTo(HC.x + dx, HC.y + dy + 17, HC.x + dx + 5, HC.y + dy + 14); g.stroke();
      // couronne de laurier
      g.fillStyle = '#9cae6a';
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1.1 + i * 0.13); g.beginPath(); g.ellipse(HC.x + dx + Math.cos(a) * 27, HC.y + dy + Math.sin(a) * 27, 6, 3, a + 1.2, 0, Math.PI * 2); g.fill(); }

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
        api.end(true, `Ressemblance ${Math.round(gauge() * 100)} % : Vénus est parfaite… et la camarade d’à côté a glissé son numéro sur ton chevalet. L’art, ça ouvre des portes !`);
      } else {
        api.sfx('splat');
        api.shake(6);
        api.end(false, 'Ta Vénus ressemble à un Picasso un lundi matin… mais elle t’a quand même laissé son numéro. L’art mène à tout !');
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

        // contour à suivre (pointillés) + trait déjà fait
        g.save();
        g.beginPath(); g.rect(CAN.x, CAN.y, CAN.w, CAN.h); g.clip();
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

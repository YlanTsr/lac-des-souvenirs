/**
 * « Lasure ou crotte ? » (lasure_crotte)
 * Iordan lasurait la clôture, une tache est apparue : « c'est de la lasure » disait Iordan,
 * « c'est une crotte » disait Papa… Papa a gratté du doigt : c'était une crotte.
 * Mécanique : maintenir et balayer pour peindre la clôture (80 %), sans passer le pinceau
 * sur les crottes (indices : la mouche qui tourne autour, pas de reflet brillant).
 * Plus d'une crotte touchée → Papa gratte… et fait la grimace.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'lasure_crotte',
  title: 'Lasure ou crotte ?',
  instructions: 'Peins la clôture à 80 % en balayant avec le pinceau, mais ne passe pas sur les taches qui sont des crottes (celles qui ont une mouche) !',
  controls: 'Maintenir clic / doigt et glisser : peindre · ou flèches + Espace maintenu',
  duration: 13,
  introExpression: 'focus',
  successTitle: 'Clôture impeccable !',
  failTitle: 'C’était une crotte…',
  successText: 'Clôture lasurée, crottes contournées : Iordan peut continuer à jurer que c’était de la lasure, personne n’ira gratter.',
  failText: 'Tu as gratté du bout du doigt pour trancher le débat… Verdict : crotte. Iordan, lui, jurait que c’était de la lasure !',

  create(api) {
    const { W, H, rand } = api;
    const FX0 = 150, FX1 = 830, FY0 = 172, FY1 = 398; // zone peignable de la clôture
    const BOARD = 40;
    const GROUND = 430;
    const BR = 30;          // rayon du pinceau (peinture)
    const GOAL = 0.8;
    const CELL = 20;
    const MAX_TOUCH = 1;

    // ── grille de couverture
    const cells = [];
    for (let y = FY0 + CELL / 2; y < FY1; y += CELL) for (let x = FX0 + CELL / 2; x < FX1; x += CELL) cells.push({ x, y, v: 0, blocked: false });

    // ── calques précalculés
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const bg = mk(), paint = mk(), over = mk();
    {
      const g = bg.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, '#8cc8f0'); sky.addColorStop(1, '#fde7bd');
      g.fillStyle = sky; g.fillRect(0, 0, W, GROUND);
      g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(110, 90, 38, 0, Math.PI * 2); g.fill();
      // pommiers du verger, au loin
      g.fillStyle = '#a5cf8c';
      g.beginPath(); g.moveTo(0, 300); g.quadraticCurveTo(300, 230, 560, 290); g.quadraticCurveTo(760, 250, W, 290); g.lineTo(W, GROUND); g.lineTo(0, GROUND); g.fill();
      for (let i = 0; i < 9; i++) {
        const x = 40 + i * 112, y = 250 + (i % 3) * 10, s = 0.7 + (i % 2) * 0.2;
        g.fillStyle = '#7a5434'; g.fillRect(x - 5 * s, y, 10 * s, 50 * s);
        g.fillStyle = '#6aa857'; g.beginPath(); g.arc(x, y - 6, 34 * s, 0, Math.PI * 2); g.arc(x - 24 * s, y + 6, 24 * s, 0, Math.PI * 2); g.arc(x + 24 * s, y + 6, 24 * s, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e0473a';
        for (let a = 0; a < 4; a++) { g.beginPath(); g.arc(x - 20 * s + a * 13 * s, y - 14 + ((a * 17) % 22), 4 * s, 0, Math.PI * 2); g.fill(); }
      }
      // herbe
      g.fillStyle = '#6aa553'; g.fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle = '#5a9446';
      for (let i = 0; i < 60; i++) g.fillRect((i * 97) % W, GROUND + 8 + ((i * 37) % 95), 14, 4);
      // clôture brute (bois clair, lames à bout pointu)
      for (let x = FX0; x < FX1; x += BOARD) {
        g.fillStyle = '#dcc39a';
        g.beginPath(); g.moveTo(x + 2, FY1 + 22); g.lineTo(x + 2, FY0 - 4); g.lineTo(x + BOARD / 2, FY0 - 26); g.lineTo(x + BOARD - 2, FY0 - 4); g.lineTo(x + BOARD - 2, FY1 + 22); g.closePath(); g.fill();
      }
      // pots de lasure au pied
      g.fillStyle = '#6b6f78'; g.fillRect(118, 452, 46, 50);
      g.fillStyle = '#c27a36'; g.fillRect(118, 466, 46, 22);
      g.fillStyle = '#fff'; g.font = '800 10px sans-serif'; g.textAlign = 'center'; g.fillText('LASURE', 141, 481);
      g.fillStyle = '#8a8f98'; g.beginPath(); g.ellipse(141, 452, 23, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9a5a28'; g.beginPath(); g.ellipse(141, 452, 18, 4, 0, 0, Math.PI * 2); g.fill();
    }
    {
      // rainures entre les lames, veinage, traverses, clous (par-dessus la peinture)
      const g = over.getContext('2d');
      g.strokeStyle = 'rgba(80, 50, 25, 0.55)'; g.lineWidth = 3;
      for (let x = FX0; x <= FX1; x += BOARD) { g.beginPath(); g.moveTo(x, FY0 - 6); g.lineTo(x, FY1 + 22); g.stroke(); }
      g.strokeStyle = 'rgba(120, 80, 40, 0.18)'; g.lineWidth = 1.5;
      for (let x = FX0; x < FX1; x += BOARD) {
        for (let k = 0; k < 3; k++) {
          const gx = x + 9 + k * 11;
          g.beginPath(); g.moveTo(gx, FY0); g.bezierCurveTo(gx + 4, FY0 + 70, gx - 4, FY0 + 150, gx + 2, FY1 + 18); g.stroke();
        }
      }
      g.fillStyle = 'rgba(90, 60, 30, 0.22)';
      g.fillRect(FX0, 210, FX1 - FX0, 6); g.fillRect(FX0, 360, FX1 - FX0, 6);
      g.fillStyle = '#5c5f66';
      for (let x = FX0; x < FX1; x += BOARD) for (const y of [213, 363]) { g.beginPath(); g.arc(x + BOARD / 2, y, 2.4, 0, Math.PI * 2); g.fill(); }
    }
    const pg = paint.getContext('2d');
    pg.beginPath(); pg.rect(FX0, FY0 - 2, FX1 - FX0, FY1 - FY0 + 4); pg.clip();

    // ── taches (6 crottes, 6 lasure), apparition progressive
    const kinds = ['crotte', 'lasure', 'crotte', 'lasure', 'lasure', 'crotte', 'crotte', 'lasure', 'crotte', 'lasure', 'crotte', 'lasure'];
    const s = {
      t: 0, coverage: 0, touched: 0, painting: false, stains: [], spawnT: 0.6, spawned: 0,
      cursor: { x: 480, y: 280 }, last: null, iordanT: 0, papaT: 0, papaMsg: '',
      scratch: 0, outcome: null, splotT: 0,
    };

    function spawnStain() {
      const kind = kinds[s.spawned % kinds.length];
      // de préférence sur la partie pas encore peinte, loin du pinceau et des autres taches
      let best = null;
      for (let tries = 0; tries < 40; tries++) {
        const c = cells[Math.floor(Math.random() * cells.length)];
        if (c.x < FX0 + 24 || c.x > FX1 - 24 || c.y < FY0 + 24 || c.y > FY1 - 24) continue;
        if (Math.hypot(c.x - s.cursor.x, c.y - s.cursor.y) < 120) continue;
        if (s.stains.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < 70)) continue;
        best = c;
        if (c.v < 1 || tries > 25) break;
      }
      if (!best) return;
      s.spawned++;
      const st = { x: best.x + rand(-6, 6), y: best.y + rand(-6, 6), r: rand(13, 16), kind, age: 0, gone: 0, hit: false, seed: rand(0, 6.28) };
      s.stains.push(st);
      if (kind === 'crotte') for (const c of cells) if (Math.hypot(c.x - st.x, c.y - st.y) < st.r + 6) c.blocked = true;
      s.iordanT = 1.3;
      api.sfx('pop');
    }

    function paintAt(x, y) {
      pg.fillStyle = 'rgba(158, 86, 34, 0.42)';
      pg.beginPath(); pg.arc(x, y, BR, 0, Math.PI * 2); pg.fill();
      for (const c of cells) if (c.v < 1 && Math.abs(c.x - x) < BR && Math.abs(c.y - y) < BR && Math.hypot(c.x - x, c.y - y) < BR) c.v = 1;
      for (const st of s.stains) {
        if (st.age < 0.35 || st.gone) continue;
        const d = Math.hypot(st.x - x, st.y - y);
        if (st.kind === 'lasure' && d < BR) st.gone = 0.01; // la lasure se fond dans la peinture
        if (st.kind === 'crotte' && !st.hit && d < st.r + 12) {
          st.hit = true;
          s.touched++;
          api.sfx('splat');
          api.shake(8);
          api.burst(st.x, st.y, { n: 8, color: ['#5a3a20', '#7a5230'], speed: 140, gravity: 400, size: 4 });
          s.papaT = 1.4;
          s.papaMsg = s.touched > MAX_TOUCH ? 'Attends… je gratte.' : 'Hmm… ça colle ?!';
          if (s.touched > MAX_TOUCH) {
            s.outcome = 'crotte';
            s.scratchStain = st;
            api.end(false, 'Deux taches bizarres sous le pinceau… Tu grattes du bout du doigt : verdict, crotte. Iordan jurait que c’était de la lasure !');
          }
        }
      }
    }

    function updateCoverage() {
      let n = 0, ok = 0;
      for (const c of cells) { if (c.blocked) continue; n++; if (c.v >= 1) ok++; }
      s.coverage = n ? ok / n : 0;
    }

    function bubble(g, x, y, text, tailX, tailY, o = {}) {
      g.font = `800 ${o.size ?? 17}px "Nunito Sans", system-ui, sans-serif`;
      const w = Math.max(80, g.measureText(text).width + 26), h = 36;
      api.roundRect(g, x - w / 2, y - h / 2, w, h, 14);
      g.fillStyle = '#fffdf6'; g.fill();
      g.strokeStyle = '#7a5130'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.moveTo(x - 8, y + h / 2 - 1); g.lineTo(tailX, tailY); g.lineTo(x + 8, y + h / 2 - 1); g.closePath(); g.fillStyle = '#fffdf6'; g.fill();
      api.text(g, text, x, y + 1, { size: o.size ?? 17, color: '#4a2f1a', weight: 800 });
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.iordanT = Math.max(0, s.iordanT - dt);
        s.papaT = Math.max(0, s.papaT - dt);
        for (const st of s.stains) { st.age += dt; if (st.gone) st.gone = Math.min(1, st.gone + dt * 3); }
        if (api.ended) {
          s.painting = false;
          s.scratch += dt;
          return;
        }
        s.cursor = { x: input.cursor.x, y: input.cursor.y };
        s.painting = input.held();
        if (s.painting) {
          const to = s.cursor;
          const from = s.last || to;
          const d = Math.hypot(to.x - from.x, to.y - from.y);
          const steps = Math.max(1, Math.ceil(d / 10));
          for (let i = 1; i <= steps && !api.ended; i++) paintAt(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
          s.last = to;
          s.splotT -= dt;
          if (s.splotT <= 0 && to.x > FX0 && to.x < FX1 && to.y > FY0 && to.y < FY1) { s.splotT = 0.16; api.sfx('grain'); }
        } else s.last = null;
        if (api.ended) return;

        s.spawnT -= dt;
        if (s.spawnT <= 0 && s.spawned < kinds.length) { s.spawnT = 0.85; spawnStain(); }

        updateCoverage();
        if (s.coverage >= GOAL) {
          s.outcome = 'ok';
          api.end(true, s.touched
            ? 'Clôture lasurée à 80 %, une seule tache suspecte effleurée… On ne grattera pas pour vérifier. Bravo !'
            : 'Clôture lasurée, toutes les crottes contournées au millimètre : l’œil du connaisseur ! Iordan n’en revient pas.');
        }
      },
      timeout() {
        s.outcome = 'slow';
        api.end(false, `Clôture lasurée à ${Math.round(s.coverage * 100)} % seulement… Et pendant que tu hésitais, Iordan te répétait que tout ça, c’était de la lasure. (Ça ne l’était pas.)`);
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        g.drawImage(paint, 0, 0);
        g.drawImage(over, 0, 0);

        // ── taches
        for (const st of s.stains) {
          if (st.gone >= 1) continue;
          const grow = Math.min(1, st.age / 0.35);
          const a = st.gone ? 1 - st.gone : 1;
          g.globalAlpha = a;
          const r = st.r * grow;
          if (st.kind === 'lasure') {
            g.fillStyle = '#7d4a22';
            g.beginPath(); g.ellipse(st.x, st.y, r, r * 0.86, 0.3, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.moveTo(st.x - r * 0.3, st.y + r * 0.5); g.lineTo(st.x - r * 0.15, st.y + r * 1.9); g.arc(st.x - r * 0.05, st.y + r * 1.9, r * 0.18, Math.PI, 0, true); g.lineTo(st.x + r * 0.25, st.y + r * 0.5); g.fill();
            // reflet brillant
            g.fillStyle = 'rgba(255, 240, 210, 0.85)';
            g.beginPath(); g.ellipse(st.x - r * 0.35, st.y - r * 0.35, r * 0.28, r * 0.14, -0.6, 0, Math.PI * 2); g.fill();
          } else {
            g.fillStyle = st.hit ? '#6a4a2c' : '#704424';
            g.beginPath(); g.ellipse(st.x, st.y, r, r * 0.86, 0.3, 0, Math.PI * 2); g.fill();
            g.fillStyle = 'rgba(60, 35, 15, 0.6)';
            g.beginPath(); g.arc(st.x + r * 0.25, st.y - r * 0.1, r * 0.35, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.arc(st.x - r * 0.3, st.y + r * 0.3, r * 0.22, 0, Math.PI * 2); g.fill();
            if (st.hit) { // traînée de pinceau
              g.fillStyle = 'rgba(100, 65, 35, 0.6)';
              g.beginPath(); g.ellipse(st.x + r * 0.9, st.y, r * 1.2, r * 0.35, 0, 0, Math.PI * 2); g.fill();
            }
            // la mouche qui tourne (arrive après un court instant)
            if (st.age > 0.5) {
              const an = s.t * 6 + st.seed;
              const fx = st.x + Math.cos(an) * (r + 13), fy = st.y + Math.sin(an * 1.3) * (r + 7) - 6;
              g.fillStyle = 'rgba(220, 235, 255, 0.85)';
              const flap = Math.sin(s.t * 60) * 2;
              g.beginPath(); g.ellipse(fx - 3, fy - 3 - flap, 4, 2.4, -0.5, 0, Math.PI * 2); g.ellipse(fx + 3, fy - 3 - flap, 4, 2.4, 0.5, 0, Math.PI * 2); g.fill();
              g.fillStyle = '#1d1d22'; g.beginPath(); g.arc(fx, fy, 3, 0, Math.PI * 2); g.fill();
            }
            // petites ondes d'odeur, de temps en temps
            const pulse = (s.t * 0.9 + st.seed) % 2.2;
            if (pulse < 0.9 && st.age > 0.5) {
              g.strokeStyle = `rgba(110, 140, 60, ${0.55 * (1 - pulse / 0.9)})`; g.lineWidth = 2;
              for (const k of [-1, 1]) {
                const bx = st.x + k * 7, by = st.y - r - 4 - pulse * 18;
                g.beginPath(); g.moveTo(bx, by + 10); g.quadraticCurveTo(bx + 5, by + 5, bx, by); g.quadraticCurveTo(bx - 5, by - 5, bx, by - 10); g.stroke();
              }
            }
          }
          g.globalAlpha = 1;
        }

        // ── Papa (à gauche) — à la fin, il gratte du doigt
        const lost = api.ended && s.outcome !== 'ok';
        const papaX = 72;
        api.avatar(g, {
          x: papaX, y: 520, size: 58, pose: api.ended && !lost ? 'cheer' : 'stand', t: s.t,
          expression: lost ? (s.scratch > 0.5 ? 'ouch' : 'focus') : api.ended ? 'happy' : s.papaT > 0 ? 'surprised' : s.painting ? 'focus' : 'smile',
          lookX: 1, lookY: -0.3, tilt: lost && s.scratch > 0.5 ? -0.2 : 0, sweat: s.touched > 0 && !api.ended,
          hands: lost ? { l: { x: papaX - 30, y: 440 }, r: { x: papaX + 52, y: 360 - Math.abs(Math.sin(s.scratch * 14)) * 6 } } : undefined,
        });

        // ── Iordan (à droite), sûr de lui
        drawPerson(g, { ...PEOPLE.iordan, x: 895, y: 515, size: 52, expression: lost ? 'laugh' : 'smile', pose: api.ended && !lost ? 'arms_up' : 'stand', t: s.t, flipX: true });

        // ── pinceau au curseur
        if (!api.ended) {
          const c = s.cursor;
          g.save(); g.translate(c.x, c.y); g.rotate(s.painting ? -0.35 + Math.sin(s.t * 20) * 0.08 : -0.2);
          g.fillStyle = '#8b5a33'; api.roundRect(g, -5, -78, 10, 52, 5); g.fill();
          g.fillStyle = '#b7bcc4'; g.fillRect(-15, -30, 30, 12);
          g.fillStyle = '#9e5622'; api.roundRect(g, -15, -19, 30, 22, 4); g.fill();
          g.restore();
          g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.setLineDash([5, 6]);
          g.beginPath(); g.arc(c.x, c.y, BR, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        }

        // ── bulles
        if (s.iordanT > 0 && !api.ended) bubble(g, 840, 330, 'C’est de la lasure !', 880, 372);
        if (s.papaT > 0 && !api.ended) bubble(g, 150, 340, s.papaMsg, 90, 380);
        if (lost && s.outcome === 'crotte') {
          if (s.scratch > 0.5) api.text(g, 'C’était une crotte !', W / 2, 470, { size: 40, color: '#fff3d6', stroke: '#5a3a20', strokeWidth: 9 });
          else api.text(g, 'Tu grattes du doigt…', W / 2, 470, { size: 32, color: '#fff', stroke: '#5a3a20' });
        } else if (lost) {
          api.text(g, 'Iordan : « C’est de la lasure ! »', W / 2, 470, { size: 28, color: '#fff', stroke: '#5a3a20' });
        }

        // ── HUD
        const pct = s.coverage;
        api.roundRect(g, 230, 26, 500, 58, 14); g.fillStyle = 'rgba(40, 25, 12, 0.72)'; g.fill();
        api.text(g, `Clôture lasurée : ${Math.round(pct * 100)} % / 80 %   ·   Crottes touchées : ${s.touched} / ${MAX_TOUCH}`, W / 2, 46, { size: 18, color: '#ffe7b0' });
        api.roundRect(g, 260, 63, 440, 10, 5); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fill();
        api.roundRect(g, 260, 63, 440 * Math.min(1, pct / GOAL), 10, 5); g.fillStyle = pct >= GOAL ? '#8fe07a' : '#e3a14e'; g.fill();
      },
    };
  },
};

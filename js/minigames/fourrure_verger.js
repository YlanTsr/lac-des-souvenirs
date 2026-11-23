/**
 * La fourrure du verger (fourrure_verger)
 * Au verger, Papa a ramassé une belle « fourrure » pleine de poils… c'était du caca moisi.
 * Mécanique : viser un objet (souris ou flèches) ; MAINTENIR pour le renifler
 * (lignes vertes = caca !), APPUYER brièvement pour le ramasser.
 * 4 trésors dans le panier = victoire ; ramasser un caca = échec.
 */

const TAP = 0.22;     // en dessous : on ramasse ; au-delà : on renifle
const SNIFF = 0.55;   // temps de reniflage pour être fixé
const NEED = 4;
const SLOTS = [[115, 452], [232, 392], [352, 472], [478, 400], [600, 468], [720, 394], [848, 455]];
const KINDS = ['pomme', 'champignon', 'plume', 'fur', 'fur', 'caca', 'caca'];
const LABEL = { pomme: 'Pomme !', champignon: 'Un cèpe !', plume: 'Jolie plume !', fur: 'Vraie fourrure !' };

export default {
  id: 'fourrure_verger',
  title: 'La fourrure du verger',
  instructions: 'Ramasse 4 trésors dans le verger… mais renifle bien les « fourrures » poilues avant de les prendre : certaines n’en sont pas !',
  controls: 'Souris / ← ↑ → ↓ : viser · maintenir Espace / clic : renifler · appui bref : ramasser',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Panier de trésors !',
  failTitle: 'Beurk, la fourrure !',
  successText: 'Quatre trésors, zéro surprise : ton nez a sauvé la journée (et tes mains aussi).',
  failText: 'Une magnifique fourrure bien poilue… qui était en fait un vieux caca moisi. Exactement comme le vrai jour, on en rit encore !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const kinds = KINDS.slice().sort(() => Math.random() - 0.5);
    const objs = SLOTS.map(([x, y], i) => {
      const k = kinds[i];
      const fuzzy = k === 'fur' || k === 'caca';
      return {
        kind: k, fuzzy, x: x + rand(-14, 14), y: y + rand(-6, 6), picked: false, known: !fuzzy, sniff: 0, fly: 0,
        base: ['#7a5a3a', '#6e5034', '#84643f'][Math.floor(Math.random() * 3)],
        hairC: ['#d9d2c4', '#cfc6b2', '#bfb29a'][Math.floor(Math.random() * 3)],
        hairs: fuzzy ? Array.from({ length: 22 }, () => ({ a: rand(Math.PI * 0.95, Math.PI * 2.05), l: rand(6, 13), ox: rand(-22, 22) })) : null,
        rot: rand(-0.4, 0.4),
      };
    });
    const s = {
      t: 0, objs, count: 0, px: 300, py: 430, walk: 0,
      pressing: false, pressT: 0, sniffing: null, target: null,
      msg: '', msgT: 0, msgX: 0, msgY: 0, yuck: 0, failed: false, holding: null,
    };

    // ── décor pré-rendu : le verger
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const sky = b.createLinearGradient(0, 0, 0, 330);
      sky.addColorStop(0, '#8fc6ef'); sky.addColorStop(1, '#fbe8c4');
      b.fillStyle = sky; b.fillRect(0, 0, W, 330);
      b.fillStyle = '#ffdc8a'; b.beginPath(); b.arc(130, 90, 40, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#a5d08e';
      b.beginPath(); b.moveTo(0, 300); b.quadraticCurveTo(260, 240, 520, 290); b.quadraticCurveTo(760, 250, W, 290); b.lineTo(W, 340); b.lineTo(0, 340); b.fill();
      // pommiers
      for (const [x, sc] of [[90, 0.8], [330, 1], [600, 0.85], [860, 1.05]]) {
        b.fillStyle = '#7a5332'; b.fillRect(x - 9 * sc, 330 - 110 * sc, 18 * sc, 110 * sc);
        b.fillStyle = '#4f9a4a';
        b.beginPath(); b.arc(x, 330 - 140 * sc, 58 * sc, 0, Math.PI * 2); b.arc(x - 44 * sc, 330 - 112 * sc, 38 * sc, 0, Math.PI * 2); b.arc(x + 44 * sc, 330 - 112 * sc, 38 * sc, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#e0473a';
        for (let a = 0; a < 6; a++) { b.beginPath(); b.arc(x - 46 * sc + ((a * 37) % 92) * sc, 330 - 165 * sc + ((a * 53) % 70) * sc, 6 * sc, 0, Math.PI * 2); b.fill(); }
      }
      // herbe
      const gr = b.createLinearGradient(0, 330, 0, H);
      gr.addColorStop(0, '#79b35c'); gr.addColorStop(1, '#5e9a44');
      b.fillStyle = gr; b.fillRect(0, 330, W, H - 330);
      b.strokeStyle = '#4e8a3a'; b.lineWidth = 2;
      for (let i = 0; i < 140; i++) {
        const x = (i * 97) % W, y = 340 + ((i * 53) % 190);
        b.beginPath(); b.moveTo(x, y); b.lineTo(x - 3, y - 9); b.moveTo(x + 3, y); b.lineTo(x + 5, y - 8); b.stroke();
      }
      b.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { b.beginPath(); b.arc((i * 151) % W, 350 + ((i * 71) % 170), 3, 0, Math.PI * 2); b.fill(); }
    }

    function say(m, x, y, d = 0.9) { s.msg = m; s.msgT = d; s.msgX = clamp(x, 110, 850); s.msgY = y; }

    function pick(o) {
      if (!o || o.picked) return;
      if (o.kind === 'caca') {
        o.picked = true; s.holding = o; s.failed = true;
        api.sfx('splat'); api.shake(12);
        api.burst(o.x, o.y - 20, { n: 16, color: ['#6b8a2a', '#8fbf3a', '#5a4a2a'], speed: 200, gravity: 200, size: 6 });
        say('BEURK !!!', o.x, o.y - 120, 2);
        api.end(false);
        return;
      }
      o.picked = true; o.fly = 1;
      s.count++;
      api.sfx('catch');
      api.burst(o.x, o.y - 10, { n: 12, shape: 'star', color: ['#ffe14d', '#ffffff'], speed: 200, gravity: 300, size: 7 });
      say(LABEL[o.kind], o.x, o.y - 70);
      if (s.count >= NEED) api.end(true, s.objs.some((q) => q.kind === 'caca' && q.known)
        ? 'Quatre trésors… et le caca démasqué au flair. Ce nez mérite une médaille !' : null);
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        for (const o of s.objs) if (o.fly > 0) o.fly = Math.max(0, o.fly - dt * 2.2);
        if (s.failed) s.yuck = Math.min(1, s.yuck + dt * 2);

        if (!api.ended) {
          // cible : l'objet le plus proche du curseur
          const c = input.cursor;
          let best = null, bd = 70;
          for (const o of s.objs) { if (o.picked) continue; const d = Math.hypot(o.x - c.x, o.y - 12 - c.y); if (d < bd) { bd = d; best = o; } }
          s.target = best;

          if (input.pressed()) { s.pressing = true; s.pressT = 0; }
          if (s.pressing) {
            if (input.held()) {
              s.pressT += dt;
              if (s.pressT > TAP && s.target) {
                const o = s.target;
                if (s.sniffing !== o) { s.sniffing = o; api.sfx('whoosh'); }
                o.sniff += dt;
                if (!o.known && o.sniff >= SNIFF) {
                  o.known = true;
                  if (o.kind === 'caca') { api.sfx('ouch'); api.shake(5); say('Pouah ! Ça, c’est du caca !', o.x, o.y - 120, 1.4); }
                  else { api.sfx('pop'); say('Ça sent la laine… une vraie fourrure !', o.x, o.y - 120, 1.4); }
                }
              } else if (s.pressT > TAP) s.sniffing = null;
            } else {
              if (s.pressT < TAP) pick(s.target);
              s.pressing = false; s.sniffing = null;
            }
          }
        } else { s.sniffing = null; }

        // Papa se place à gauche de l'objet visé
        const tx = s.target ? s.target.x - 58 : clamp(input.cursor.x - 58, 40, 900);
        const ty = s.target ? s.target.y + 4 : clamp(input.cursor.y, 380, 480);
        const dx = tx - s.px, dy = ty - s.py;
        if (!api.ended) {
          s.px += clamp(dx * 8, -480, 480) * dt;
          s.py += clamp(dy * 8, -300, 300) * dt;
        }
        s.walk = Math.hypot(dx, dy) > 12 && !api.ended ? s.walk + dt : 0;
      },
      timeout() { return s.count >= NEED; },
      draw(g) {
        g.drawImage(bg, 0, 0);

        const drawObj = (o) => {
          if (o.picked && !(s.holding === o)) return;
          g.save();
          g.translate(o.x, o.y);
          if (o.kind === 'pomme') {
            g.fillStyle = '#d93a2e'; g.beginPath(); g.arc(0, -14, 15, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#f07a6a'; g.beginPath(); g.arc(-5, -19, 4, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#5a3a20'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -28); g.lineTo(2, -36); g.stroke();
            g.fillStyle = '#4f9a4a'; g.beginPath(); g.ellipse(8, -34, 7, 3.5, -0.4, 0, Math.PI * 2); g.fill();
          } else if (o.kind === 'champignon') {
            g.fillStyle = '#efe2c2'; g.fillRect(-7, -22, 14, 22);
            g.fillStyle = '#8a5a30'; g.beginPath(); g.ellipse(0, -22, 22, 14, 0, Math.PI, 0); g.fill();
            g.fillStyle = '#a5743f'; g.beginPath(); g.ellipse(-6, -28, 6, 3, 0, 0, Math.PI * 2); g.fill();
          } else if (o.kind === 'plume') {
            g.rotate(o.rot - 0.5);
            g.fillStyle = '#f3f0ea'; g.beginPath(); g.ellipse(0, -8, 26, 8, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#9aa8c0'; g.beginPath(); g.ellipse(14, -8, 10, 6, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#8a7a6a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-30, -8); g.lineTo(26, -8); g.stroke();
          } else {
            // « fourrure » : vraie ou… pas
            g.fillStyle = o.base; g.beginPath(); g.ellipse(0, -10, 28, 14, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = o.hairC; g.lineWidth = 2; g.lineCap = 'round';
            g.beginPath();
            for (const h of o.hairs) { const bx = h.ox, by = -10 - Math.sqrt(Math.max(0, 1 - (h.ox / 29) ** 2)) * 12; g.moveTo(bx, by); g.lineTo(bx + Math.cos(h.a) * h.l, by + Math.sin(h.a) * h.l); }
            g.stroke();
            if (o.known && o.kind === 'caca') {
              // lignes d'odeur vertes + mouches
              g.strokeStyle = 'rgba(110, 190, 50, 0.85)'; g.lineWidth = 3;
              for (let k = 0; k < 3; k++) {
                g.beginPath();
                for (let j = 0; j <= 8; j++) { const yy = -26 - j * 6, xx = (k - 1) * 14 + Math.sin(j * 0.9 + s.t * 5 + k) * 5; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
                g.stroke();
              }
              g.fillStyle = '#222';
              for (let k = 0; k < 2; k++) { const a = s.t * 7 + k * 3; g.beginPath(); g.arc(Math.cos(a) * 26, -40 + Math.sin(a * 1.3) * 12, 2.5, 0, Math.PI * 2); g.fill(); }
            }
          }
          g.restore();
          if (o.known && o.kind === 'fur' && !o.picked) api.text(g, '✓', o.x + 30, o.y - 34, { size: 22, color: '#2f9a3f', stroke: '#fff', strokeWidth: 4 });
        };

        // objets derrière Papa, Papa, puis objets devant
        const sorted = s.objs.filter((o) => !o.picked).sort((a, b) => a.y - b.y);
        for (const o of sorted) if (o.y <= s.py) drawObj(o);

        const sn = s.sniffing;
        const smellsBad = (sn && sn.known && sn.kind === 'caca') || s.failed;
        const handTarget = s.failed && s.holding ? { l: { x: s.px + 34, y: s.py - 90 }, r: { x: s.px + 50, y: s.py - 84 } } : undefined;
        const info = api.avatar(g, {
          x: s.px, y: s.py, size: 62, t: s.walk,
          pose: sn ? 'duck' : s.walk > 0 ? 'run' : api.ended && !s.failed ? 'cheer' : 'stand',
          expression: s.failed ? (s.yuck < 0.4 ? 'surprised' : 'ouch') : smellsBad ? 'ouch' : sn ? 'focus' : api.ended ? 'happy' : 'smile',
          lookX: 1, lookY: sn ? 1 : 0.4, sweat: !!smellsBad,
          hands: handTarget,
        });
        // Papa tout vert de dégoût
        if (s.failed) {
          g.fillStyle = `rgba(110, 200, 60, ${0.45 * s.yuck})`;
          g.beginPath(); g.arc(info.hx, info.hy, info.r * 1.02, 0, Math.PI * 2); g.fill();
          // il tient la « fourrure »… et les mouches arrivent
          const h = info.hands ? info.hands.r : { x: s.px + 50, y: s.py - 84 };
          s.holding.x = h.x; s.holding.y = h.y + 14;
          drawObj(s.holding);
          g.fillStyle = '#222';
          for (let k = 0; k < 4; k++) { const a = s.t * (6 + k) + k * 2; g.beginPath(); g.arc(h.x + Math.cos(a) * (30 + k * 6), h.y - 30 + Math.sin(a * 1.4) * 22, 3, 0, Math.PI * 2); g.fill(); }
        }
        // reniflage : petites bouffées qui montent vers le nez
        if (sn) {
          g.strokeStyle = sn.known && sn.kind === 'caca' ? 'rgba(110, 190, 50, 0.9)' : 'rgba(255, 255, 255, 0.85)';
          g.lineWidth = 2.5;
          for (let k = 0; k < 3; k++) {
            const p = (s.t * 1.8 + k / 3) % 1;
            const x = sn.x + (info.hx + info.r * 0.9 - sn.x) * p, y = sn.y - 20 + (info.hy + 6 - (sn.y - 20)) * p;
            g.beginPath(); g.arc(x, y, 4 + p * 3, 0, Math.PI * 2); g.stroke();
          }
          // jauge de reniflage
          if (!sn.known) {
            const k = clamp(sn.sniff / SNIFF, 0, 1);
            g.fillStyle = '#0006'; api.roundRect(g, sn.x - 30, sn.y + 8, 60, 10, 5); g.fill();
            g.fillStyle = '#ffe14d'; api.roundRect(g, sn.x - 30, sn.y + 8, 60 * k, 10, 5); g.fill();
          }
        }
        for (const o of sorted) if (o.y > s.py) drawObj(o);

        // curseur de visée
        if (!api.ended) {
          const o = s.target;
          if (o) {
            g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash([6, 5]);
            g.beginPath(); g.ellipse(o.x, o.y - 12, 40, 28, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
            if (o.fuzzy && !o.known && !sn) api.text(g, 'Maintiens pour renifler', o.x, o.y + 28, { size: 15, color: '#fff', stroke: '#000a', strokeWidth: 4 });
          }
        }

        // objets qui s'envolent vers le panier
        for (const o of s.objs) {
          if (!o.fly || o.kind === 'caca') continue;
          const k = 1 - o.fly;
          const x = o.x + (110 - o.x) * k, y = o.y - 12 + (52 - (o.y - 12)) * k - Math.sin(k * Math.PI) * 80;
          g.fillStyle = o.kind === 'pomme' ? '#d93a2e' : o.kind === 'champignon' ? '#8a5a30' : o.kind === 'plume' ? '#f3f0ea' : o.base;
          g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill();
        }

        // HUD : le panier
        g.fillStyle = '#b5824f'; api.roundRect(g, 36, 38, 60, 34, 8); g.fill();
        g.strokeStyle = '#8a5a30'; g.lineWidth = 4; g.beginPath(); g.arc(66, 40, 24, Math.PI, 0); g.stroke();
        api.text(g, `Trésors : ${s.count} / ${NEED}`, 108, 56, { size: 24, color: '#fff', stroke: '#000a', align: 'left' });
        if (s.msgT > 0) api.text(g, s.msg, s.msgX, s.msgY, { size: s.failed ? 44 : 22, color: s.failed ? '#c9f27a' : '#fff', stroke: s.failed ? '#3a5a1a' : '#000a', strokeWidth: 6 });
      },
    };
  },
};

/**
 * « La bataille de spaghetti » (spaghetti_bataille)
 * Étudiant, une soirée chez Tonton Bernard à Port-Camargue a fini en bataille
 * de spaghetti… debout sur la table.
 * Mécanique : Papa se déplace sur la table (← → ou souris) pour esquiver les poignées
 * qui arrivent (une ombre montre où elles tombent) et lance les siennes tout droit
 * vers les copains d'en face (Espace / clic). Recharge courte : il faut viser, pas mitrailler.
 * 5 touches avant d'en prendre 3 = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'spaghetti_bataille',
  title: 'La bataille de spaghetti',
  instructions: 'Debout sur la table, esquive les poignées de spaghetti et touche 5 fois les copains d’en face avant d’en prendre 3 !',
  controls: '← → / souris : bouger · Espace / clic : lancer',
  duration: 12,
  introExpression: 'laugh',
  successTitle: 'Roi de la bolognaise !',
  failTitle: 'Papa à la carbonara !',
  successText: 'Cinq copains repeints à la sauce tomate, et toi presque propre. Tonton Bernard n’a jamais revu sa table pareille !',
  failText: 'Tu finis couvert de spaghetti de la tête aux pieds… mais avec le plus beau fou rire de la soirée.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const FLOOR_Y = 500;                 // pieds de Papa (sur la table du premier plan)
    const FRIEND_Y = 262;                // pieds des copains (table du fond)
    const X_MIN = 190, X_MAX = 770;
    const SPEED = 420;
    const GOAL = 5, MAX_TAKEN = 3;
    const RELOAD = 0.62;
    const IN_FLIGHT = 0.95;              // durée de vol des poignées adverses
    const OUT_FLIGHT = 0.45;             // durée de vol des poignées de Papa
    const looks = [
      { ...PEOPLE.passant, shirt: '#d9534f', hair: 'curly', hairColor: '#3a2a20' },
      { ...PEOPLE.passant, shirt: '#5b9bd5', hair: 'long', hairColor: '#8a5a2a', skin: '#f3cfb3' },
      { ...PEOPLE.passant, shirt: '#f0ad4e', hair: 'short', hairColor: '#222', skin: '#c99a74' },
    ];
    const s = {
      t: 0, x: 480, vx: 0, mode: 'keys', lastPx: null, reload: 0, throwAnim: 0,
      given: 0, taken: 0, hitFlash: 0, nextEnemy: 1.0,
      friends: looks.map((lk, i) => ({ lk, x: 300 + i * 180, tx: 300 + i * 180, sp: rand(70, 120), splat: 0, hitT: 0, throwT: 0 })),
      incoming: [], outgoing: [], floorSplats: [],
    };

    // ── décor pré-rendu : salle à manger, fenêtre sur le port de Port-Camargue ──
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      b.fillStyle = '#f0cf98'; b.fillRect(0, 0, W, H);
      b.fillStyle = '#e4bd82'; for (let x = 0; x < W; x += 48) b.fillRect(x, 0, 24, 300);
      // fenêtre : le port la nuit
      const wx = 330, wy = 40, ww = 300, wh = 150;
      const night = b.createLinearGradient(0, wy, 0, wy + wh);
      night.addColorStop(0, '#1d2550'); night.addColorStop(1, '#3a4a80');
      b.fillStyle = night; b.fillRect(wx, wy, ww, wh);
      b.fillStyle = '#25356a'; b.fillRect(wx, wy + 100, ww, 50);
      b.strokeStyle = '#e8e2d0'; b.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const mx = wx + 30 + i * 48;
        b.beginPath(); b.moveTo(mx, wy + 100); b.lineTo(mx, wy + 30 + (i % 3) * 12); b.stroke();
        b.fillStyle = '#f4f1ea'; b.beginPath(); b.moveTo(mx - 16, wy + 100); b.lineTo(mx + 16, wy + 100); b.lineTo(mx + 12, wy + 110); b.lineTo(mx - 12, wy + 110); b.fill();
      }
      b.fillStyle = '#ffd98a'; for (let i = 0; i < 12; i++) b.fillRect(wx + 12 + i * 24, wy + 124 + (i % 2) * 6, 10, 3);
      b.fillStyle = '#fff6d0'; b.beginPath(); b.arc(wx + 250, wy + 30, 12, 0, Math.PI * 2); b.fill();
      b.strokeStyle = '#7a5130'; b.lineWidth = 10; b.strokeRect(wx, wy, ww, wh);
      b.lineWidth = 5; b.beginPath(); b.moveTo(wx + ww / 2, wy); b.lineTo(wx + ww / 2, wy + wh); b.stroke();
      // guirlande lumineuse
      b.strokeStyle = '#5a4a3a'; b.lineWidth = 2;
      b.beginPath(); b.moveTo(0, 26); for (let x = 0; x <= W; x += 120) b.quadraticCurveTo(x + 60, 60, x + 120, 26); b.stroke();
      for (let x = 30; x < W; x += 40) { const y = 26 + Math.sin(((x % 120) / 120) * Math.PI) * 17; b.fillStyle = ['#ffd34d', '#ff8a5a', '#9fe0a0', '#8ac4ff'][(x / 40) % 4 | 0]; b.beginPath(); b.arc(x, y + 6, 5, 0, Math.PI * 2); b.fill(); }
      // sol carrelé
      b.fillStyle = '#c98a5a'; b.fillRect(0, 300, W, H - 300);
      b.strokeStyle = 'rgba(90,50,30,0.25)'; b.lineWidth = 2;
      for (let y = 320; y < H; y += 34) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
      for (let x = -400; x < W + 400; x += 70) { b.beginPath(); b.moveTo(W / 2 + (x - W / 2) * 0.55, 300); b.lineTo(x, H); b.stroke(); }
      // table du fond (les copains)
      b.fillStyle = '#7a4f2e'; b.fillRect(230, FRIEND_Y + 14, 12, 50); b.fillRect(718, FRIEND_Y + 14, 12, 50);
      b.fillStyle = '#fbfbf5'; b.fillRect(200, FRIEND_Y - 4, 560, 20);
      b.fillStyle = '#d9534f'; for (let x = 200; x < 760; x += 28) b.fillRect(x, FRIEND_Y - 4, 14, 20);
      // table du premier plan (Papa)
      b.fillStyle = '#6a4224'; b.fillRect(160, FLOOR_Y + 22, 18, 60); b.fillRect(782, FLOOR_Y + 22, 18, 60);
      b.fillStyle = '#fbfbf5'; b.fillRect(130, FLOOR_Y - 6, 700, 30);
      b.fillStyle = '#d9534f'; for (let x = 130; x < 830; x += 35) b.fillRect(x, FLOOR_Y - 6, 17.5, 30);
      b.fillStyle = '#6a4224'; b.fillRect(130, FLOOR_Y + 22, 700, 6);
    }

    function enemyThrow() {
      const f = s.friends[Math.floor(rand(0, 3))];
      // les copains anticipent un peu ton déplacement
      const tx = clamp(s.x + s.vx * rand(0.25, 0.6) + rand(-25, 25), X_MIN - 20, X_MAX + 20);
      f.throwT = 0.3;
      s.incoming.push({ x0: f.x, y0: FRIEND_Y - 110, x1: tx, y1: FLOOR_Y - 120, t: 0 });
      api.sfx('whoosh');
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.reload = Math.max(0, s.reload - dt);
        s.throwAnim = Math.max(0, s.throwAnim - dt);
        s.hitFlash = Math.max(0, s.hitFlash - dt);

        if (!api.ended) {
          // déplacement : flèches, ou suivre la souris / le doigt
          const prevX = s.x;
          const ax = input.axis('x');
          const p = input.pointer;
          if (ax) s.mode = 'keys';
          else if (p.active && (p.down || (s.lastPx !== null && Math.abs(p.x - s.lastPx) > 0.5))) s.mode = 'mouse';
          s.lastPx = p.x;
          if (s.mode === 'keys') s.x += ax * SPEED * dt;
          else if (p.active) { const d = p.x - s.x; s.x += clamp(d, -SPEED * dt, SPEED * dt); }
          const nx = clamp(s.x, X_MIN, X_MAX);
          s.vx = s.vx * 0.85 + ((nx - prevX) / dt) * 0.15;
          s.x = nx;

          if (input.pressed() && s.reload === 0) {
            s.reload = RELOAD; s.throwAnim = 0.25;
            s.outgoing.push({ x: s.x, t: 0 });
            api.sfx('whoosh');
            // les copains ne sont pas manchots : parfois, celui qui est visé fait un pas de côté
            for (const f of s.friends) if (Math.abs(f.x - s.x) < 40 && Math.random() < 0.4) { f.tx = clamp(f.x + (f.x > s.x ? 1 : -1) * 110, 235, 725); f.dodge = 0.5; }
          }

          s.nextEnemy -= dt;
          if (s.nextEnemy <= 0) { enemyThrow(); s.nextEnemy = rand(0.75, 1.15) - Math.min(0.2, s.t * 0.02); }
        }

        // copains qui se baladent sur leur table
        for (const f of s.friends) {
          f.splat = Math.max(0, f.splat - dt); f.throwT = Math.max(0, f.throwT - dt);
          if (Math.abs(f.tx - f.x) < 6) f.tx = rand(235, 725);
          f.dodge = Math.max(0, (f.dodge || 0) - dt);
          const sp = f.dodge > 0 ? 190 : f.sp;
          if (f.splat === 0) f.x += clamp(f.tx - f.x, -sp * dt, sp * dt);
        }

        // poignées de Papa
        for (const o of s.outgoing) {
          o.t += dt;
          if (o.t >= OUT_FLIGHT && !o.done) {
            o.done = true;
            if (api.ended) continue;
            const hit = s.friends.filter((f) => Math.abs(f.x - o.x) < 30).sort((a, b) => Math.abs(a.x - o.x) - Math.abs(b.x - o.x))[0];
            if (hit) {
              hit.splat = 0.9; hit.hitT++; s.given++;
              api.sfx('splat'); api.shake(5);
              api.burst(hit.x, FRIEND_Y - 120, { n: 14, color: ['#f3d36b', '#e8b84a', '#d9432b'], speed: 200, gravity: 500, size: 5 });
              if (s.given >= GOAL) api.end(true, s.taken === 0
                ? 'Cinq copains repeints, et toi impeccable ! Tonton Bernard n’a jamais revu sa table pareille.'
                : 'Cinq copains repeints à la sauce tomate ! Tonton Bernard n’a jamais revu sa table pareille.');
            } else {
              api.sfx('pop');
              s.floorSplats.push({ x: o.x + rand(-10, 10), y: FRIEND_Y + 20 + rand(0, 20), r: rand(8, 12) });
            }
          }
        }
        s.outgoing = s.outgoing.filter((o) => !o.done);

        // poignées des copains
        for (const q of s.incoming) {
          q.t += dt;
          if (q.t >= IN_FLIGHT && !q.done) {
            q.done = true;
            if (!api.ended && Math.abs(q.x1 - s.x) < 44) {
              s.taken++; s.hitFlash = 0.6;
              api.sfx('splat'); api.shake(12);
              api.burst(s.x, FLOOR_Y - 150, { n: 16, color: ['#f3d36b', '#e8b84a', '#d9432b'], speed: 260, gravity: 600, size: 6 });
              if (s.taken >= MAX_TAKEN) api.end(false, 'Tu finis couvert de spaghetti de la tête aux pieds… mais avec le plus beau fou rire de la soirée.');
            } else {
              api.sfx('pop');
              if (s.floorSplats.length < 40) s.floorSplats.push({ x: q.x1, y: FLOOR_Y + 6, r: rand(10, 15) });
            }
          }
        }
        s.incoming = s.incoming.filter((q) => !q.done);
      },
      timeout() {
        api.end(false, s.given > s.taken
          ? `${s.given} touche${s.given > 1 ? 's' : ''} sur 5… La sauce tomate est partout, l’honneur est sauf. Presque !`
          : 'Les copains visaient mieux que toi ce soir-là. Il a fallu trois douches pour retrouver tes cheveux !');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        g.fillStyle = 'rgba(232,190,80,0.85)';
        for (const p of s.floorSplats) { g.beginPath(); g.ellipse(p.x, p.y, p.r * 1.6, p.r * 0.5, 0, 0, Math.PI * 2); g.fill(); }

        // copains
        for (const f of s.friends) {
          const expr = f.splat > 0 ? 'surprised' : f.throwT > 0 ? 'laugh' : 'smile';
          const info = drawPerson(g, { ...f.lk, x: f.x, y: FRIEND_Y, size: 44, t: s.t, expression: expr, pose: f.throwT > 0 ? 'arms_up' : 'stand' });
          strands(g, info.hx, info.hy, info.r, Math.min(8, f.hitT * 3), f.x);
        }

        // ombres d'atterrissage (indice pour esquiver)
        for (const q of s.incoming) {
          const k = clamp(q.t / IN_FLIGHT, 0, 1);
          g.fillStyle = `rgba(120,40,20,${0.15 + k * 0.35})`;
          g.beginPath(); g.ellipse(q.x1, FLOOR_Y + 2, 16 + k * 26, 5 + k * 7, 0, 0, Math.PI * 2); g.fill();
        }

        // Papa
        const a = s.throwAnim / 0.25;
        const info = api.avatar(g, {
          x: s.x, y: FLOOR_Y, size: 62, t: s.t,
          pose: api.ended && s.given >= GOAL ? 'cheer' : 'stand',
          expression: api.ended ? 'laugh' : s.hitFlash > 0 ? 'ouch' : s.throwAnim > 0 ? 'happy' : 'focus',
          lookY: -0.6, tears: s.hitFlash > 0.3,
          hands: api.ended && s.given >= GOAL ? undefined : { l: { x: s.x - 50, y: FLOOR_Y - 120 }, r: { x: s.x + 34, y: FLOOR_Y - 150 - (1 - a) * 70 } },
        });
        if (info) strands(g, info.hx, info.hy, info.r, s.taken * 4 + (api.ended && s.taken >= MAX_TAKEN ? 6 : 0), s.x);
        if (s.taken >= MAX_TAKEN) {
          // couvert de la tête aux pieds
          g.strokeStyle = '#efcf6a'; g.lineWidth = 3;
          for (let i = 0; i < 12; i++) {
            const y0 = FLOOR_Y - 170 + i * 13, x0 = s.x - 30 + ((i * 23) % 60);
            g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 10, y0 + 12, x0 - 4, y0 + 22); g.stroke();
          }
        }

        // poignées en vol
        for (const o of s.outgoing) {
          const k = clamp(o.t / OUT_FLIGHT, 0, 1);
          handful(g, o.x, (FLOOR_Y - 150) + (FRIEND_Y - 120 - (FLOOR_Y - 150)) * k, 1 - k * 0.45, o.t * 8);
        }
        for (const q of s.incoming) {
          const k = clamp(q.t / IN_FLIGHT, 0, 1);
          handful(g, q.x0 + (q.x1 - q.x0) * k, q.y0 + (q.y1 - q.y0) * k - Math.sin(k * Math.PI) * 120, 0.55 + k * 0.6, q.t * 7);
        }

        // HUD
        api.text(g, `Touchés : ${s.given} / ${GOAL}`, 24, 84, { size: 26, align: 'left', color: '#fff', stroke: '#000a' });
        api.text(g, 'Spaghetti reçus :', 24, 118, { size: 18, align: 'left', color: '#fff', stroke: '#000a', strokeWidth: 4 });
        for (let i = 0; i < MAX_TAKEN; i++) {
          g.fillStyle = i < s.taken ? '#e8b84a' : 'rgba(255,255,255,0.35)';
          g.beginPath(); g.arc(190 + i * 28, 118, 10, 0, Math.PI * 2); g.fill();
        }
        if (s.reload > 0 && !api.ended) {
          g.fillStyle = '#0006'; g.fillRect(s.x - 30, FLOOR_Y + 32, 60, 7);
          g.fillStyle = '#f3d36b'; g.fillRect(s.x - 30, FLOOR_Y + 32, 60 * (1 - s.reload / RELOAD), 7);
        }

        function strands(c, hx, hy, r, n, seed) {
          if (n <= 0) return;
          c.strokeStyle = '#efcf6a'; c.lineWidth = 2.5; c.lineCap = 'round';
          for (let i = 0; i < n; i++) {
            const x0 = hx - r * 0.8 + ((i * 37 + seed * 0.01) % (r * 1.6)), y0 = hy - r * 0.9 + (i % 3) * 3;
            c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + (i % 2 ? 8 : -8), y0 + r * 0.6, x0 + (i % 2 ? -3 : 3), y0 + r * (0.9 + (i % 4) * 0.25)); c.stroke();
          }
          c.fillStyle = '#d9432b'; c.beginPath(); c.arc(hx - r * 0.3, hy - r * 0.7, r * 0.18, 0, Math.PI * 2); c.fill();
        }
        function handful(c, x, y, sc, rot) {
          c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
          c.strokeStyle = '#efcf6a'; c.lineWidth = 3; c.lineCap = 'round';
          for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-14 + i * 5, -12); c.bezierCurveTo(-20 + i * 7, -2, -6 + i * 4, 4, -12 + i * 6, 14); c.stroke(); }
          c.fillStyle = '#d9432b'; c.beginPath(); c.arc(2, -2, 7, 0, Math.PI * 2); c.fill();
          c.restore();
        }
      },
    };
  },
};

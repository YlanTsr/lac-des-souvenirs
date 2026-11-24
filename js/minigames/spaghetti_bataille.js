/**
 * « La bataille de spaghetti » (spaghetti_bataille)
 * En école d'ingénieur, au foyer des étudiants : les pâtes ont été cuisinées avec
 * une tête d'ail ENTIÈRE au lieu d'une gousse… immangeables. Avec Gilles, la bataille
 * de spaghetti a éclaté, debout sur les tables.
 * Mécanique : Papa se déplace sur la table (← → ou souris) pour esquiver les poignées
 * (et les gousses d'ail) qui arrivent (une ombre montre où elles tombent) et lance les
 * siennes tout droit vers Gilles et les copains d'en face (Espace / clic).
 * Recharge courte : il faut viser, pas mitrailler. 5 touches avant d'en prendre 3 = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'spaghetti_bataille',
  title: 'La bataille de spaghetti',
  instructions: 'Pâtes ratées à la tête d’ail entière : debout sur la table, esquive les spaghetti (et l’ail !) et touche 5 fois Gilles et les copains avant d’en prendre 3 !',
  controls: '← → / souris : bouger · Espace / clic : lancer',
  duration: 12,
  introExpression: 'laugh',
  successTitle: 'Roi de la bolognaise !',
  failTitle: 'Papa à l’aïoli !',
  successText: 'Gilles et les copains repeints à la sauce tomate, et toi presque propre. Leçon retenue : une GOUSSE d’ail, pas une tête !',
  failText: 'Couvert de spaghetti à l’ail de la tête aux pieds… Tu as senti l’ail trois jours, mais quel fou rire avec Gilles !',

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
    const GILLES = 1;
    const looks = [
      { ...PEOPLE.passant, shirt: '#d9534f', hair: 'short', hairColor: '#3a2a20' },
      { ...PEOPLE.passant, shirt: '#3f8a5c', hair: 'curly', hairColor: '#5a3a22', skin: '#efc6a6', glasses: true }, // Gilles
      { ...PEOPLE.passant, shirt: '#f0ad4e', hair: 'cap', hairColor: '#222', capColor: '#3a5a9a', skin: '#c99a74' },
    ];
    const s = {
      t: 0, x: 480, vx: 0, mode: 'keys', lastPx: null, reload: 0, throwAnim: 0,
      given: 0, taken: 0, hitFlash: 0, nextEnemy: 1.0, garlicT: 0,
      friends: looks.map((lk, i) => ({ lk, x: 300 + i * 180, tx: 300 + i * 180, sp: rand(70, 120), splat: 0, hitT: 0, throwT: 0 })),
      incoming: [], outgoing: [], floorSplats: [],
      gSay: 'Une tête d’ail ENTIÈRE ?!', gSayT: 2.2, pSay: '', pSayT: 0,
    };
    const gilles = s.friends[GILLES];

    // ── décor pré-rendu : la cuisine du foyer des élèves ingénieurs ──
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      // mur crème + carrelage blanc en bas
      b.fillStyle = '#efe2c2'; b.fillRect(0, 0, W, H);
      b.fillStyle = '#f4f1e8'; b.fillRect(0, 196, W, 104);
      b.strokeStyle = 'rgba(120,130,140,0.25)'; b.lineWidth = 1;
      for (let y = 196; y < 300; y += 20) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
      for (let x = 0; x < W; x += 20) { b.beginPath(); b.moveTo(x, 196); b.lineTo(x, 300); b.stroke(); }
      b.fillStyle = '#c9a86a'; b.fillRect(0, 192, W, 5);
      // tableau noir couvert de formules
      const bx = 320, by = 28, bw = 330, bh = 150;
      b.fillStyle = '#8a6036'; b.fillRect(bx - 8, by - 8, bw + 16, bh + 16);
      b.fillStyle = '#2e4a3c'; b.fillRect(bx, by, bw, bh);
      b.fillStyle = 'rgba(255,255,255,0.06)'; b.fillRect(bx + 20, by + 10, 120, 40);
      b.fillStyle = '#e8eee6'; b.textBaseline = 'middle'; b.textAlign = 'left';
      b.font = 'italic 700 18px Georgia, serif';
      b.fillText('PV = nRT', bx + 16, by + 24);
      b.fillText('∫ e^x dx = e^x + C', bx + 150, by + 24);
      b.fillText('∇·E = ρ/ε₀', bx + 16, by + 58);
      b.fillText('F = m·a', bx + 160, by + 58);
      b.font = '700 19px "Nunito Sans", system-ui, sans-serif';
      b.fillStyle = '#ffe08a';
      b.fillText('1 tête d’ail ≠ 1 gousse !!', bx + 40, by + 98);
      b.strokeStyle = '#ffe08a'; b.lineWidth = 2;
      b.beginPath(); b.moveTo(bx + 40, by + 112); b.lineTo(bx + 262, by + 112); b.stroke();
      b.fillStyle = '#e8eee6'; b.font = '600 14px system-ui, sans-serif';
      b.fillText('Partiel de thermo : lundi 8h', bx + 16, by + 134);
      b.fillStyle = '#f4f1ea'; b.fillRect(bx + bw - 40, by + bh - 6, 26, 6);
      // affiche « Gala des ingés » (sous le HUD)
      b.save(); b.translate(98, 200); b.rotate(-0.05);
      b.fillStyle = '#2a3e7a'; b.fillRect(-58, -62, 116, 124);
      b.fillStyle = '#ffd34d'; b.beginPath(); b.arc(0, -16, 26, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#fff'; b.font = '800 16px system-ui, sans-serif'; b.textAlign = 'center';
      b.fillText('GALA', 0, 26); b.font = '700 12px system-ui, sans-serif'; b.fillText('des ingés', 0, 44);
      b.fillStyle = '#c33'; b.beginPath(); b.arc(-50, -55, 4, 0, Math.PI * 2); b.arc(50, -55, 4, 0, Math.PI * 2); b.fill();
      b.restore();
      // affiche « Recette » au-dessus du plan de travail
      b.save(); b.translate(722, 88); b.rotate(0.06);
      b.fillStyle = '#fff8d8'; b.fillRect(-46, -50, 92, 104);
      b.fillStyle = '#7a3a1a'; b.font = '800 13px system-ui, sans-serif'; b.textAlign = 'center';
      b.fillText('RECETTE', 0, -34);
      b.font = '600 11px system-ui, sans-serif'; b.fillStyle = '#333';
      b.fillText('500 g pâtes', 0, -14); b.fillText('tomates', 0, 2); b.fillText('1 gousse d’ail', 0, 18);
      b.strokeStyle = '#d22'; b.lineWidth = 2; b.beginPath(); b.moveTo(-30, 18); b.lineTo(30, 18); b.stroke();
      b.fillStyle = '#d22'; b.font = '800 12px system-ui, sans-serif'; b.fillText('1 TÊTE ?!', 0, 38);
      b.restore();
      // plan de travail + plaque + casserole
      b.fillStyle = '#b8bec6'; b.fillRect(786, 214, 174, 90);
      b.fillStyle = '#8f969f'; b.fillRect(786, 206, 174, 10);
      b.fillStyle = '#333'; b.beginPath(); b.ellipse(838, 210, 30, 6, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#777f8a'; b.fillRect(806, 160, 64, 48);
      b.fillStyle = '#5e6670'; b.fillRect(800, 158, 76, 7); b.fillRect(870, 172, 28, 6);
      b.fillStyle = '#efcf6a'; b.beginPath(); b.ellipse(838, 160, 30, 5, 0, 0, Math.PI * 2); b.fill();
      // tête d'ail énorme
      garlicBulb(b, 916, 206, 1.5);
      // sol en lino
      b.fillStyle = '#9aa5a0'; b.fillRect(0, 300, W, H - 300);
      b.strokeStyle = 'rgba(40,60,60,0.18)'; b.lineWidth = 2;
      for (let y = 320; y < H; y += 34) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
      for (let x = -400; x < W + 400; x += 70) { b.beginPath(); b.moveTo(W / 2 + (x - W / 2) * 0.55, 300); b.lineTo(x, H); b.stroke(); }
      // table du fond (Gilles et les copains) : formica orange
      b.fillStyle = '#555c66'; b.fillRect(230, FRIEND_Y + 14, 10, 50); b.fillRect(720, FRIEND_Y + 14, 10, 50);
      b.fillStyle = '#e8873a'; b.fillRect(200, FRIEND_Y - 4, 560, 18);
      b.fillStyle = '#c96a24'; b.fillRect(200, FRIEND_Y + 12, 560, 4);
      // table du premier plan (Papa)
      b.fillStyle = '#4a5058'; b.fillRect(162, FLOOR_Y + 22, 14, 60); b.fillRect(784, FLOOR_Y + 22, 14, 60);
      b.fillStyle = '#e8873a'; b.fillRect(130, FLOOR_Y - 6, 700, 28);
      b.fillStyle = 'rgba(255,255,255,0.18)'; b.fillRect(130, FLOOR_Y - 6, 700, 5);
      b.fillStyle = '#b55c1c'; b.fillRect(130, FLOOR_Y + 22, 700, 6);
      // assiettes abandonnées
      for (const px of [240, 690]) {
        b.fillStyle = '#fff'; b.beginPath(); b.ellipse(px, FLOOR_Y + 2, 26, 6, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#efcf6a'; b.beginPath(); b.ellipse(px, FLOOR_Y, 14, 4, 0, 0, Math.PI * 2); b.fill();
      }
    }

    function garlicBulb(c, x, y, sc) {
      // tête d'ail, base posée en (x, y)
      c.save(); c.translate(x, y); c.scale(sc, sc);
      c.fillStyle = '#f4ecd8'; c.strokeStyle = '#c9b48a'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, -38); c.bezierCurveTo(-26, -30, -30, -4, -16, 0); c.lineTo(16, 0); c.bezierCurveTo(30, -4, 26, -30, 0, -38); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, -36); c.quadraticCurveTo(-12, -18, -8, 0); c.moveTo(0, -36); c.quadraticCurveTo(12, -18, 8, 0); c.stroke();
      c.strokeStyle = '#b8a070'; c.beginPath(); c.moveTo(0, -38); c.lineTo(2, -48); c.stroke();
      c.strokeStyle = '#a08a60'; c.beginPath(); c.moveTo(-8, 0); c.lineTo(-10, 4); c.moveTo(0, 0); c.lineTo(0, 5); c.moveTo(8, 0); c.lineTo(10, 4); c.stroke();
      c.restore();
    }
    function clove(c, x, y, sc, rot) {
      c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
      c.fillStyle = '#f6efdc'; c.strokeStyle = '#b8a070'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(14, -4, 8, 10); c.quadraticCurveTo(0, 14, -8, 10); c.quadraticCurveTo(-14, -4, 0, -14); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(4, 0, 2, 11); c.stroke();
      c.restore();
    }
    function stink(c, x, y, k, t) {
      // vapeurs vertes d'ail
      c.strokeStyle = `rgba(110,190,70,${0.7 * k})`; c.lineWidth = 3; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ox = x + (i - 1) * 18, ph = t * 3 + i * 2;
        c.beginPath();
        for (let j = 0; j <= 6; j++) { const yy = y - j * 7, xx = ox + Math.sin(ph + j * 0.9) * 5; j ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }
        c.stroke();
      }
    }
    function bubble(c, str, x, y, o = {}) {
      // bulle de dialogue, pointe en (x, y)
      const size = o.size ?? 18;
      c.font = `800 ${size}px "Nunito Sans", system-ui, sans-serif`;
      const w = c.measureText(str).width + 22, h = size + 16;
      const bx = clamp(x - w / 2, 8, W - w - 8), by = y - 12 - h;
      c.fillStyle = o.bg ?? '#fff'; c.strokeStyle = o.border ?? '#333'; c.lineWidth = 2;
      api.roundRect(c, bx, by, w, h, 10); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 7, by + h - 1); c.lineTo(x, y); c.lineTo(x + 7, by + h - 1); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x - 7, by + h); c.lineTo(x, y); c.lineTo(x + 7, by + h); c.stroke();
      api.text(c, str, bx + w / 2, by + h / 2 + 1, { size, color: o.color ?? '#2a2a2a', weight: 800 });
    }
    function say(str, dur = 1.3) { s.gSay = str; s.gSayT = dur; }

    function enemyThrow() {
      const i = Math.floor(rand(0, 3));
      const f = s.friends[i];
      // les copains anticipent un peu ton déplacement
      const tx = clamp(s.x + s.vx * rand(0.25, 0.6) + rand(-25, 25), X_MIN - 20, X_MAX + 20);
      f.throwT = 0.3;
      const garlic = Math.random() < (i === GILLES ? 0.6 : 0.2);
      s.incoming.push({ x0: f.x, y0: FRIEND_Y - 110, x1: tx, y1: FLOOR_Y - 120, t: 0, garlic, big: garlic && Math.random() < 0.25 });
      if (i === GILLES && garlic && s.gSayT <= 0 && Math.random() < 0.6) say(Math.random() < 0.5 ? 'Tiens, ton ail !' : 'Une gousse, j’avais dit !');
      api.sfx('whoosh');
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.reload = Math.max(0, s.reload - dt);
        s.throwAnim = Math.max(0, s.throwAnim - dt);
        s.hitFlash = Math.max(0, s.hitFlash - dt);
        s.garlicT = Math.max(0, s.garlicT - dt);
        s.gSayT = Math.max(0, s.gSayT - dt);
        s.pSayT = Math.max(0, s.pSayT - dt);

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
              if (hit === gilles) say(['Pouah !', 'Même pas mal !', 'Dans les lunettes !'][Math.min(2, hit.hitT - 1)], 1.1);
              if (s.given >= GOAL) {
                say('Bon… on recommande des pizzas ?', 2);
                api.end(true, s.taken === 0
                  ? 'Gilles et les copains repeints, et toi impeccable ! La prochaine fois : une gousse, pas une tête.'
                  : 'Gilles et les copains repeints à la sauce tomate ! La prochaine fois : une gousse, pas une tête.');
              }
            } else {
              api.sfx('pop');
              s.floorSplats.push({ x: o.x + rand(-10, 10), y: FRIEND_Y + 20 + rand(0, 20), r: rand(8, 12) });
            }
          }
        }
        s.outgoing = s.outgoing.filter((o) => !o.done);

        // poignées (et gousses) de Gilles et des copains
        for (const q of s.incoming) {
          q.t += dt;
          if (q.t >= IN_FLIGHT && !q.done) {
            q.done = true;
            if (!api.ended && Math.abs(q.x1 - s.x) < 44) {
              s.taken++; s.hitFlash = 0.6;
              api.sfx('splat'); api.shake(12);
              if (q.garlic) {
                s.garlicT = 2.2; s.pSay = 'Beurk, l’ail !'; s.pSayT = 1.3;
                api.burst(s.x, FLOOR_Y - 150, { n: 14, color: ['#f6efdc', '#9fd06a', '#7bbf4a'], speed: 220, gravity: 300, size: 6 });
              } else {
                if (s.pSayT <= 0) { s.pSay = 'Ouille, la bolo !'; s.pSayT = 0.9; }
                api.burst(s.x, FLOOR_Y - 150, { n: 16, color: ['#f3d36b', '#e8b84a', '#d9432b'], speed: 260, gravity: 600, size: 6 });
              }
              if (s.taken >= MAX_TAKEN) {
                say('Ha ha ! Parfum ail !', 2);
                api.end(false, 'Couvert de spaghetti à l’ail de la tête aux pieds… mais avec le plus beau fou rire de l’école !');
              }
            } else {
              api.sfx('pop');
              if (s.floorSplats.length < 40) s.floorSplats.push({ x: q.x1, y: FLOOR_Y + 6, r: rand(10, 15), garlic: q.garlic });
            }
          }
        }
        s.incoming = s.incoming.filter((q) => !q.done);
      },
      timeout() {
        api.end(false, s.given > s.taken
          ? `${s.given} touche${s.given > 1 ? 's' : ''} sur 5… L’ail est partout, l’honneur est sauf. Presque !`
          : 'Gilles visait mieux que toi ce soir-là. Trois douches pour que tes cheveux ne sentent plus l’ail !');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        // vapeur de la casserole + odeur d'ail de la tête géante
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 4; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const ox = 822 + i * 16, ph = s.t * 2.5 + i * 1.7, k = (s.t * 0.6 + i * 0.33) % 1;
          g.beginPath();
          for (let j = 0; j <= 5; j++) { const yy = 150 - k * 30 - j * 9, xx = ox + Math.sin(ph + j) * 5; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
          g.stroke();
        }
        stink(g, 916, 140, 0.6 + 0.3 * Math.sin(s.t * 2), s.t);

        for (const p of s.floorSplats) {
          if (p.garlic) clove(g, p.x, p.y - 4, 0.7, p.r);
          else { g.fillStyle = 'rgba(232,190,80,0.85)'; g.beginPath(); g.ellipse(p.x, p.y, p.r * 1.6, p.r * 0.5, 0, 0, Math.PI * 2); g.fill(); }
        }

        // Gilles et les copains
        const heads = [];
        for (const f of s.friends) {
          const expr = f.splat > 0 ? 'surprised' : f.throwT > 0 ? 'laugh' : 'smile';
          const info = drawPerson(g, { ...f.lk, x: f.x, y: FRIEND_Y, size: 44, t: s.t, expression: expr, pose: f.throwT > 0 ? 'arms_up' : 'stand' });
          strands(g, info.hx, info.hy, info.r, Math.min(8, f.hitT * 3), f.x);
          heads.push(info);
        }

        // ombres d'atterrissage (indice pour esquiver)
        for (const q of s.incoming) {
          const k = clamp(q.t / IN_FLIGHT, 0, 1);
          g.fillStyle = q.garlic ? `rgba(70,120,30,${0.15 + k * 0.35})` : `rgba(120,40,20,${0.15 + k * 0.35})`;
          g.beginPath(); g.ellipse(q.x1, FLOOR_Y + 2, 16 + k * 26, 5 + k * 7, 0, 0, Math.PI * 2); g.fill();
        }

        // Papa
        const a = s.throwAnim / 0.25;
        const info = api.avatar(g, {
          x: s.x, y: FLOOR_Y, size: 62, t: s.t,
          pose: api.ended && s.given >= GOAL ? 'cheer' : 'stand',
          expression: api.ended ? 'laugh' : s.hitFlash > 0 ? 'ouch' : s.garlicT > 0 ? 'worried' : s.throwAnim > 0 ? 'happy' : 'focus',
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
        if (info && (s.garlicT > 0 || (api.ended && s.taken >= MAX_TAKEN))) stink(g, info.hx, info.hy - info.r - 6, api.ended ? 1 : Math.min(1, s.garlicT), s.t);

        // poignées en vol
        for (const o of s.outgoing) {
          const k = clamp(o.t / OUT_FLIGHT, 0, 1);
          handful(g, o.x, (FLOOR_Y - 150) + (FRIEND_Y - 120 - (FLOOR_Y - 150)) * k, 1 - k * 0.45, o.t * 8);
        }
        for (const q of s.incoming) {
          const k = clamp(q.t / IN_FLIGHT, 0, 1);
          const qx = q.x0 + (q.x1 - q.x0) * k, qy = q.y0 + (q.y1 - q.y0) * k - Math.sin(k * Math.PI) * 120, sc = 0.55 + k * 0.6;
          if (!q.garlic) handful(g, qx, qy, sc, q.t * 7);
          else if (q.big) { g.save(); g.translate(qx, qy); g.rotate(Math.sin(q.t * 6) * 0.5); garlicBulb(g, 0, 20 * sc, 0.75 * sc); g.restore(); }
          else { clove(g, qx - 8 * sc, qy, sc, q.t * 9); clove(g, qx + 9 * sc, qy + 5 * sc, sc * 0.85, -q.t * 8); }
        }

        // bulles : Gilles (toujours nommé) et Papa
        const gh = heads[GILLES];
        if (gh) {
          if (s.gSayT > 0) bubble(g, `Gilles : ${s.gSay}`, gh.hx, gh.hy - gh.r - 4, { size: 17 });
          else bubble(g, 'Gilles', gh.hx, gh.hy - gh.r - 4, { size: 15, bg: '#e9f6e4', border: '#3f8a5c', color: '#2b5a3c' });
        }
        if (info && s.pSayT > 0) bubble(g, s.pSay, info.hx + 20, info.hy - info.r - 8, { size: 20, bg: s.pSay.includes('ail') ? '#eaf7d8' : '#fff', border: s.pSay.includes('ail') ? '#5a9a2a' : '#333' });

        // HUD
        api.text(g, `Touchés : ${s.given} / ${GOAL}`, 24, 84, { size: 26, align: 'left', color: '#fff', stroke: '#000a' });
        api.text(g, 'Spaghetti reçus :', 24, 118, { size: 18, align: 'left', color: '#fff', stroke: '#000a', strokeWidth: 4 });
        for (let i = 0; i < MAX_TAKEN; i++) {
          g.fillStyle = i < s.taken ? '#e8b84a' : 'rgba(255,255,255,0.35)';
          g.strokeStyle = '#000a'; g.lineWidth = 2;
          g.beginPath(); g.arc(190 + i * 28, 118, 10, 0, Math.PI * 2); g.fill(); g.stroke();
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

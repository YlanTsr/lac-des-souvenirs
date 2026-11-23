/**
 * Le pigeon et la roue (pigeon_velo)
 * Papa change la roue du vélo de Iordan… un pigeon lui lâche un cadeau dans le dos.
 * Il touche pour voir : c'était bien une crotte. Iordan est mort de rire.
 * Mécanique : appuyer en rythme pour serrer les écrous (trop vite, la clé ripe) ;
 * quand l'ombre d'un largage apparaît sur Papa, se décaler (← → / souris) puis revenir.
 * 2 crottes dans le dos = échec ; roue serrée = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

const NUTS = 4, PER_NUT = 4;
const TOTAL = NUTS * PER_NUT;
const SLIP = 0.11;       // appuis plus rapprochés : la clé ripe
const HOME = 420;        // position de travail de Papa
const REACH = 40;
const HIT_R = 40;

export default {
  id: 'pigeon_velo',
  title: 'Le pigeon et la roue',
  instructions: 'Serre les écrous de la roue du vélo de Iordan en appuyant en rythme… et décale-toi quand l’ombre d’un pigeon vise ton dos !',
  controls: 'Espace / clic : serrer · ← → / souris : se décaler',
  duration: 13,
  introExpression: 'focus',
  successTitle: 'Roue réparée !',
  failTitle: 'Splat !',
  successText: 'Écrous serrés, dos impeccable : le pigeon est reparti bredouille. Iordan peut rouler… et il est presque déçu.',
  failText: 'Un cadeau du ciel en plein dos. Tu as touché pour vérifier : c’était bien une crotte. Iordan en pleure encore de rire !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const FLOOR = 470, WX = 520, WY = 352, WR = 56;
    const s = {
      t: 0, px: HOME, vx: 0, prog: 0, lastPress: -9, hits: 0, backSplats: [], groundSplats: [],
      drops: [], nextDrop: 1.5, laughT: 0, msg: '', msgT: 0, wrench: 0, slipT: 0, spin: 0, touchT: 0,
    };

    // ── décor pré-rendu : le jardin devant la maison
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const sky = b.createLinearGradient(0, 0, 0, 300);
      sky.addColorStop(0, '#86c3ee'); sky.addColorStop(1, '#dff0fa');
      b.fillStyle = sky; b.fillRect(0, 0, W, 300);
      b.fillStyle = '#fff';
      for (const [x, y, r] of [[200, 70, 26], [236, 62, 32], [270, 74, 22], [640, 110, 22], [668, 102, 28], [700, 112, 20]]) { b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill(); }
      // maison
      b.fillStyle = '#f0dcc0'; b.fillRect(0, 170, 330, 260);
      b.fillStyle = '#b5553a'; b.beginPath(); b.moveTo(-20, 176); b.lineTo(160, 96); b.lineTo(350, 176); b.closePath(); b.fill();
      b.fillStyle = '#7a5a40'; b.fillRect(200, 290, 70, 140);
      b.fillStyle = '#9fd0f0'; b.fillRect(50, 230, 90, 70); b.fillStyle = '#fff'; b.fillRect(93, 230, 4, 70); b.fillRect(50, 263, 90, 4);
      // haie + clôture
      b.fillStyle = '#5e9a44';
      for (let x = 330; x < W + 40; x += 46) { b.beginPath(); b.arc(x, 380, 34, 0, Math.PI * 2); b.fill(); }
      b.fillRect(330, 380, W - 330, 50);
      b.fillStyle = '#fff6e6';
      for (let x = 340; x < W; x += 34) { b.fillRect(x, 360, 14, 70); b.beginPath(); b.moveTo(x, 360); b.lineTo(x + 7, 350); b.lineTo(x + 14, 360); b.fill(); }
      b.fillRect(330, 380, W - 330, 8); b.fillRect(330, 410, W - 330, 8);
      // allée et pelouse
      b.fillStyle = '#7fb35f'; b.fillRect(0, 430, W, H - 430);
      b.fillStyle = '#d8cbb4'; b.fillRect(0, 446, W, 42);
      b.fillStyle = '#c9bba2'; for (let x = 0; x < W; x += 60) b.fillRect(x, 446, 2, 42);
      // un fil électrique : le perchoir des pigeons
      b.strokeStyle = '#333'; b.lineWidth = 2;
      b.beginPath(); b.moveTo(0, 150); b.quadraticCurveTo(480, 190, W, 140); b.stroke();
    }

    const working = () => Math.abs(s.px - HOME) < REACH && Math.abs(s.vx) < 120;
    const backX = () => s.px + 20;

    function say(m, d = 0.8) { s.msg = m; s.msgT = d; }

    function land(d) {
      d.landed = true;
      if (!api.ended && Math.abs(backX() - d.x) < HIT_R) {
        s.hits++;
        s.backSplats.push({ dx: rand(-6, 6), dy: rand(-4, 6), r: rand(8, 11) });
        s.laughT = 1.8; s.touchT = 1.1;
        api.sfx('splat'); api.shake(10);
        api.burst(backX(), 400, { n: 10, color: ['#f4f4ee', '#d8d8cc'], speed: 160, gravity: 400, size: 4 });
        say(s.hits === 1 ? 'Hein ? C’est quoi dans mon dos ?' : 'Encore !? Pigeon de malheur !', 1.2);
        if (s.hits >= 2) api.end(false);
      } else {
        s.groundSplats.push({ x: d.x, r: rand(9, 13) });
        api.sfx('pop');
        if (!api.ended) say('Esquivé !', 0.6);
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.laughT = Math.max(0, s.laughT - dt);
        s.touchT = Math.max(0, s.touchT - dt);
        s.wrench = Math.max(0, s.wrench - dt * 6);
        s.slipT = Math.max(0, s.slipT - dt);

        // déplacement (le curseur suit la souris et les flèches)
        if (!api.ended) {
          const target = clamp(input.cursor.x - 60, 120, 470);
          s.vx = clamp((target - s.px) * 10, -420, 420);
          s.px = clamp(s.px + s.vx * dt, 120, 470);
        } else s.vx = 0;

        // serrage
        if (!api.ended && input.pressed()) {
          if (!working()) { say('Trop loin de la roue !', 0.5); }
          else if (s.t - s.lastPress < SLIP) { s.slipT = 0.35; api.sfx('clang'); say('Doucement, ça ripe !', 0.5); }
          else {
            s.prog++; s.wrench = 1; s.spin += 0.5;
            api.sfx(s.prog % PER_NUT === 0 ? 'catch' : 'grain');
            if (s.prog % PER_NUT === 0) { api.burst(WX, WY, { n: 10, shape: 'star', color: ['#ffe14d', '#fff'], speed: 180, gravity: 200, size: 6 }); say(`Écrou ${s.prog / PER_NUT} serré !`, 0.6); }
            if (s.prog >= TOTAL) api.end(true, s.hits ? 'Roue réparée, avec une petite décoration dans le dos. Iordan a rigolé, mais il a son vélo !' : null);
          }
          s.lastPress = s.t;
        }

        // pigeons : une ombre vise le dos de Papa, puis le largage
        if (!api.ended && s.t >= s.nextDrop) {
          const x = clamp(backX() + rand(-10, 10), 140, 500);
          s.drops.push({ x, warnT: s.t, rel: s.t + 0.9, y: 0, vy: 0, fell: false, landed: false });
          s.nextDrop = s.t + Math.max(2.0, 2.5 - s.t * 0.05);
          api.sfx('whoosh');
        }
        for (const d of s.drops) {
          if (!d.fell && s.t >= d.rel) { d.fell = true; d.y = 108; d.vy = 120; }
          if (d.fell && !d.landed) {
            d.vy += 1400 * dt; d.y += d.vy * dt;
            if (d.y >= 396) land(d);
          }
        }
        s.drops = s.drops.filter((d) => !d.landed || s.t - d.rel < 3.4);
      },
      timeout() { return s.prog >= TOTAL; },
      draw(g) {
        g.drawImage(bg, 0, 0);

        // crottes ratées sur l'allée
        g.fillStyle = '#f2f2ea';
        for (const p of s.groundSplats) { g.beginPath(); g.ellipse(p.x, FLOOR + 2, p.r, p.r * 0.4, 0, 0, Math.PI * 2); g.fill(); }
        // ombres annonciatrices
        for (const d of s.drops) {
          if (d.landed) continue;
          const k = clamp((s.t - d.warnT) / 1.3, 0, 1);
          g.fillStyle = `rgba(30, 20, 40, ${0.15 + 0.35 * k})`;
          g.beginPath(); g.ellipse(d.x, FLOOR + 2, 16 + 26 * k, 6 + 6 * k, 0, 0, Math.PI * 2); g.fill();
          if (!api.ended) api.text(g, '!', d.x, FLOOR - 160 - k * 10, { size: 30, color: '#ff5a4a', stroke: '#fff', strokeWidth: 5 });
        }

        // le vélo à l'envers (selle et guidon au sol)
        g.lineCap = 'round';
        g.strokeStyle = '#2f6fbf'; g.lineWidth = 8;
        g.beginPath(); g.moveTo(WX, WY); g.lineTo(610, 420); g.lineTo(700, WY); g.lineTo(600, 360); g.lineTo(WX, WY); g.moveTo(610, 420); g.lineTo(600, 360); g.stroke();
        g.strokeStyle = '#333'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(610, 420); g.lineTo(612, 452); g.moveTo(WX + 8, WY + 10); g.lineTo(540, 446); g.stroke();
        g.fillStyle = '#222'; api.roundRect(g, 590, 452, 46, 14, 6); g.fill();   // selle
        g.fillRect(522, 446, 40, 8);                                              // guidon
        for (const [cx, rot] of [[700, 0], [WX, s.spin]]) {
          g.strokeStyle = '#2a2a2a'; g.lineWidth = 9;
          g.beginPath(); g.arc(cx, WY, WR, 0, Math.PI * 2); g.stroke();
          g.strokeStyle = '#b8bec6'; g.lineWidth = 1.5;
          for (let k = 0; k < 12; k++) { const a = rot + (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx, WY); g.lineTo(cx + Math.cos(a) * (WR - 4), WY + Math.sin(a) * (WR - 4)); g.stroke(); }
          g.fillStyle = '#888'; g.beginPath(); g.arc(cx, WY, 7, 0, Math.PI * 2); g.fill();
        }
        // écrous autour du moyeu
        for (let k = 0; k < NUTS; k++) {
          const a = (k / NUTS) * Math.PI * 2 + 0.4;
          const done = s.prog >= (k + 1) * PER_NUT;
          g.fillStyle = done ? '#ffd34d' : '#d0d6de';
          g.beginPath(); g.arc(WX + Math.cos(a) * 13, WY + Math.sin(a) * 13, 4, 0, Math.PI * 2); g.fill();
        }

        // Papa
        const work = working() && !api.ended;
        const moving = Math.abs(s.vx) > 40 && !api.ended;
        const wr = s.slipT > 0 ? 0.6 : s.wrench * 0.5;
        const hub = { x: WX - 8 + Math.cos(-1.2 + wr) * 10, y: WY + 4 + Math.sin(-1.2 + wr) * 10 };
        const info = api.avatar(g, {
          x: s.px, y: FLOOR, size: 64, t: s.t,
          pose: moving ? 'run' : work ? 'duck' : api.ended && s.hits < 2 ? 'cheer' : 'stand',
          flipX: false,
          expression: s.touchT > 0 ? 'surprised' : api.ended ? (s.hits >= 2 ? 'ouch' : 'happy') : s.slipT > 0 ? 'ouch' : work ? 'focus' : 'worried',
          lookX: 1, lookY: work ? 0.6 : 0, sweat: s.drops.some((d) => !d.landed) && !api.ended,
          hands: work ? { l: { x: hub.x - 14, y: hub.y + 14 }, r: hub } : s.touchT > 0 && !moving ? { l: { x: s.px - 20, y: FLOOR - 110 }, r: { x: s.px + 30, y: FLOOR - 70 } } : undefined,
        });
        // la clé dans la main
        if (work) {
          const h = info.hands.r;
          g.strokeStyle = '#9aa3ad'; g.lineWidth = 6;
          g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(WX, WY); g.stroke();
        }
        // crottes dans le dos
        const sh = info.shoulders;
        const bx = (sh.l.x + sh.r.x) / 2 - 8, by = (sh.l.y + sh.r.y) / 2 + 16;
        for (const p of s.backSplats) {
          g.fillStyle = '#f4f4ee';
          g.beginPath(); g.arc(bx + p.dx, by + p.dy, p.r, 0, Math.PI * 2); g.arc(bx + p.dx + 8, by + p.dy + 5, p.r * 0.5, 0, Math.PI * 2); g.arc(bx + p.dx - 7, by + p.dy + 8, p.r * 0.4, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#8a8a7a'; g.beginPath(); g.arc(bx + p.dx + 2, by + p.dy - 1, p.r * 0.35, 0, Math.PI * 2); g.fill();
        }

        // crottes qui tombent
        for (const d of s.drops) {
          if (!d.fell || d.landed) continue;
          g.fillStyle = '#f4f4ee'; g.beginPath(); g.ellipse(d.x, d.y, 6, 9, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#8a8a7a'; g.beginPath(); g.arc(d.x, d.y + 2, 2.5, 0, Math.PI * 2); g.fill();
        }
        // pigeons (ils passent au-dessus de la cible au moment du largage)
        for (const d of s.drops) {
          const x = d.x + (s.t - d.rel) * 320;
          if (x < -40 || x > W + 40) continue;
          const y = 104 + Math.sin(s.t * 3 + d.x) * 6;
          const flap = Math.sin(s.t * 18 + d.x) * 10;
          g.fillStyle = '#8d93a3';
          g.beginPath(); g.ellipse(x, y, 22, 12, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#6f7585';
          g.beginPath(); g.moveTo(x - 6, y - 4); g.lineTo(x - 16, y - 18 - flap); g.lineTo(x + 8, y - 4); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x - 34, y - 6); g.lineTo(x - 32, y + 6); g.closePath(); g.fill();
          g.fillStyle = '#7a8aa0'; g.beginPath(); g.arc(x + 20, y - 6, 8, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#6aa58a'; g.beginPath(); g.arc(x + 15, y, 5, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#e8a040'; g.beginPath(); g.moveTo(x + 27, y - 7); g.lineTo(x + 34, y - 4); g.lineTo(x + 27, y - 3); g.fill();
          g.fillStyle = '#222'; g.beginPath(); g.arc(x + 22, y - 8, 1.8, 0, Math.PI * 2); g.fill();
        }

        // Iordan, qui regarde (et qui rit)
        const laughing = s.laughT > 0 || (api.ended && s.hits >= 2);
        drawPerson(g, { ...PEOPLE.iordan, x: 840, y: FLOOR + 6, size: 60, flipX: true, t: s.t,
          pose: laughing ? 'arms_up' : api.ended ? 'arms_up' : 'stand',
          expression: laughing ? 'laugh' : api.ended ? 'love' : 'smile' });
        if (laughing) api.text(g, 'HA HA HA !', 836, 300 + Math.sin(s.t * 20) * 3, { size: 28, color: '#ffe14d', stroke: '#7a4a10' });

        // HUD
        const k = s.prog / TOTAL;
        api.text(g, 'Serrage de la roue', 40, 30, { size: 18, color: '#fff', stroke: '#000a', align: 'left' });
        g.fillStyle = '#0007'; api.roundRect(g, 40, 44, 300, 22, 11); g.fill();
        g.fillStyle = s.slipT > 0 ? '#ff7a5a' : '#7fd36a'; api.roundRect(g, 40, 44, Math.max(22, 300 * k), 22, 11); g.fill();
        for (let i = 1; i < NUTS; i++) { g.fillStyle = '#0005'; g.fillRect(40 + (300 * i) / NUTS - 1, 44, 2, 22); }
        api.text(g, `Crottes dans le dos : ${s.hits} / 2`, 360, 55, { size: 20, color: s.hits ? '#ffe0e0' : '#fff', stroke: '#000a', align: 'left' });
        if (s.msgT > 0) api.text(g, s.msg, clamp(s.px + 40, 180, 640), 230, { size: 24, color: '#fff', stroke: '#000a' });
      },
    };
  },
};

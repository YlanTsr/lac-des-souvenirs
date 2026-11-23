/**
 * « Chocolats, fleurs et couettes » (chocolats_couettes)
 * Pour draguer Maman, Papa déposait chaque matin chocolats et fleurs sur son bureau…
 * et lui tirait les couettes.
 * Mécanique : Maman va et vient entre son bureau et la machine à café. Déposer 3 cadeaux
 * sur son bureau quand elle ne regarde pas (un par absence), puis tirer une couette
 * pile au moment où elle se rassoit. Grillé 2 fois = raté.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'chocolats_couettes',
  title: 'Chocolats, fleurs et couettes',
  instructions: 'Dépose 3 cadeaux sur le bureau de Maman quand elle a le dos tourné, puis tire-lui une couette au moment où elle se rassoit.',
  controls: '← → / clic : se déplacer · Espace / clic sur son bureau : déposer, tirer',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Conquise !',
  failTitle: 'Grillé !',
  successText: 'Chocolats, fleurs, et une couette tirée pile au bon moment : Maman a rougi jusqu’aux oreilles. La suite, on la connaît !',
  failText: 'Maman t’a surpris la main dans le sac… et elle a souri quand même. La drague, c’est aussi une question de persévérance !',

  create(api) {
    const { W, H, clamp, lerp } = api;
    const FLOOR = 470;
    const COFFEE = 150, CHAIR = 600, DESK = { x: 380, w: 170, y: 382 };
    const ZONE = [370, 660];          // près du bureau de Maman
    const TUG = [575, 720];           // derrière sa chaise
    const SPEED = 330;
    const DUR = { desk: 0.95, toCoffee: 0.6, coffee: 0.9, back: 0.6 };
    const NEXT = { desk: 'toCoffee', toCoffee: 'coffee', coffee: 'back', back: 'desk' };
    const maman = { ...PEOPLE.maman, hair: 'pigtails' };
    const s = {
      x: 840, st: 'desk', stT: 0.7, sitT: 1, mx: CHAIR, gifts: 0, dropped: false, caught: 0,
      linger: 0, grace: 0, moving: false, dir: -1, walkT: 0, msg: '', msgT: 0, joy: 0,
      cool: 0, tugged: false, result: null, endT: 0, target: null,
    };
    const looking = () => s.st === 'desk' || s.st === 'back';
    const inZone = () => s.x >= ZONE[0] && s.x <= ZONE[1];
    const inTug = () => s.x >= TUG[0] && s.x <= TUG[1];

    // ── open space pré-rendu
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      g.fillStyle = '#f1e6d6'; g.fillRect(0, 0, W, FLOOR);
      g.fillStyle = '#8f9bb0'; g.fillRect(0, FLOOR, W, H - FLOOR);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (let x = 0; x < W; x += 48) g.fillRect(x, FLOOR, 2, H - FLOOR);
      // fenêtres
      for (const x of [230, 560]) {
        g.fillStyle = '#bfe0f4'; g.fillRect(x, 80, 170, 120);
        g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(x, 80, 170, 120);
        g.beginPath(); g.moveTo(x + 85, 80); g.lineTo(x + 85, 200); g.stroke();
      }
      // cloisons d'open space
      g.fillStyle = '#c9d3dc';
      g.fillRect(250, 320, 10, FLOOR - 320); g.fillRect(740, 320, 10, FLOOR - 320);
      // machine à café
      g.fillStyle = '#5a4a44'; api.roundRect(g, 70, 250, 100, FLOOR - 250, 8); g.fill();
      g.fillStyle = '#3a302c'; g.fillRect(84, 330, 72, 70);
      g.fillStyle = '#f6d27a'; g.fillRect(84, 270, 72, 40);
      api.text(g, 'CAFÉ', 120, 290, { size: 18, color: '#5a4a44', weight: 900 });
      g.fillStyle = '#fff'; g.fillRect(110, 378, 20, 22);
      // bureau de Papa (à droite)
      g.fillStyle = '#b48a60'; g.fillRect(790, 380, 160, 12);
      g.fillRect(800, 392, 8, FLOOR - 392); g.fillRect(935, 392, 8, FLOOR - 392);
      g.fillStyle = '#d8d2c4'; g.fillRect(850, 320, 64, 54); g.fillStyle = '#4a6a8a'; g.fillRect(856, 326, 52, 40);
      api.text(g, 'Ton bureau', 870, 420, { size: 14, color: '#5a4a3a' });
      // bureau de Maman
      g.fillStyle = '#c89a6a'; g.fillRect(DESK.x, DESK.y, DESK.w, 12);
      g.fillRect(DESK.x + 8, DESK.y + 12, 8, FLOOR - DESK.y - 12); g.fillRect(DESK.x + DESK.w - 16, DESK.y + 12, 8, FLOOR - DESK.y - 12);
      g.fillStyle = '#e2dccd'; g.fillRect(DESK.x + 10, DESK.y - 64, 70, 60); g.fillStyle = '#5a7a9a'; g.fillRect(DESK.x + 16, DESK.y - 58, 58, 46);
      g.fillStyle = '#e2dccd'; g.fillRect(DESK.x + 36, DESK.y - 6, 18, 6);
      // chaise
      g.fillStyle = '#3a3a48'; g.fillRect(CHAIR - 22, 432, 52, 8); g.fillRect(CHAIR + 22, 360, 8, 80); g.fillRect(CHAIR, 440, 6, FLOOR - 440);
    }

    function setMsg(m, t = 1) { s.msg = m; s.msgT = t; }
    function caught() {
      s.caught++; s.grace = 0.9; s.linger = 0;
      s.x = Math.max(s.x, 760); s.target = null;
      api.sfx('ouch'); api.shake(8);
      setMsg('« Hmm ? Tu fais quoi là ? »', 1.1);
      if (s.caught >= 2) {
        s.result = 'fail';
        api.end(false);
      }
    }
    function act() {
      if (s.gifts < 3) {
        if (!inZone()) { setMsg('Approche-toi de son bureau !', 0.8); return; }
        if (looking()) { if (s.grace <= 0) caught(); return; }
        if (s.dropped) { setMsg('Un cadeau à la fois !', 0.8); return; }
        s.gifts++; s.dropped = true;
        api.sfx('pop');
        api.burst(DESK.x + 95 + s.gifts * 18, DESK.y - 10, { n: 10, color: ['#e0405f', '#ffd34d', '#fff'], speed: 150, gravity: 200, size: 5 });
        setMsg(s.gifts === 3 ? 'Et maintenant… la couette !' : ['', 'Chocolats déposés !', 'Fleurs déposées !'][s.gifts], 0.9);
      } else {
        if (s.cool > 0) return;
        if (!inTug()) { setMsg('Glisse-toi derrière sa chaise !', 0.8); return; }
        if (s.st === 'desk' && s.sitT < 0.6) {
          s.tugged = true; s.result = 'win';
          api.sfx('boing');
          api.burst(s.mx, FLOOR - 140, { n: 22, color: ['#e0405f', '#ff8fb0', '#fff'], speed: 220, gravity: 120, size: 7 });
          api.end(true);
        } else {
          s.cool = 0.5;
          api.sfx('whoosh');
          setMsg(s.st === 'desk' ? 'Trop tard, elle est installée…' : 'Attends qu’elle se rassoie !', 0.8);
        }
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.msgT = Math.max(0, s.msgT - dt);
        s.grace = Math.max(0, s.grace - dt);
        s.cool = Math.max(0, s.cool - dt);
        s.joy = Math.max(0, s.joy - dt);

        // Maman : bureau → café → bureau
        s.stT -= dt; s.sitT += dt;
        if (s.stT <= 0 && !s.tugged) {
          s.st = NEXT[s.st]; s.stT = DUR[s.st];
          if (s.st === 'desk') { s.sitT = 0; if (s.dropped) { s.joy = 1; api.sfx('catch'); } s.dropped = false; }
        }
        const k = 1 - clamp(s.stT / DUR[s.st], 0, 1);
        s.mx = s.st === 'desk' ? CHAIR : s.st === 'coffee' ? COFFEE : s.st === 'toCoffee' ? lerp(CHAIR, COFFEE, k) : lerp(COFFEE, CHAIR, k);
        if (api.ended) { s.moving = false; s.endT += dt; return; }

        // déplacement de Papa
        const p = input.pointer;
        let clickAct = false;
        if (p.pressed && p.x > 360 && p.x < 740 && p.y > 240 && (s.gifts < 3 ? inZone() : inTug())) clickAct = true;
        if (p.down && !clickAct) s.target = p.x;
        let ax = input.axis('x');
        if (ax) s.target = null;
        else if (s.target != null) {
          if (Math.abs(s.target - s.x) < 6) s.target = null;
          else ax = Math.sign(s.target - s.x);
        }
        s.moving = !!ax;
        if (ax) { s.dir = ax; s.walkT += dt; s.x = clamp(s.x + ax * SPEED * dt, 200, 900); }

        if (clickAct || (input.pressed() && !p.pressed)) act();
        if (api.ended) return;
        // rester planté devant son bureau quand elle regarde = grillé
        if (s.gifts < 3 && inZone() && looking() && s.grace <= 0) {
          s.linger += dt;
          if (s.linger > 0.4) caught();
        } else s.linger = 0;
      },
      timeout() {
        s.result = 'fail';
        api.end(false, s.gifts < 3
          ? `Seulement ${s.gifts} cadeau${s.gifts > 1 ? 'x' : ''} sur 3 ce matin… mais Maman a deviné qui les apportait. Elle en sourit encore !`
          : 'Les cadeaux sont livrés, mais la couette t’a échappé. Pas grave : demain matin, tu recommences !');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0);
        // cadeaux sur le bureau
        const gx = DESK.x + 100;
        if (s.gifts >= 1) { g.fillStyle = '#7a3e22'; api.roundRect(g, gx - 12, DESK.y - 14, 28, 14, 3); g.fill(); g.fillStyle = '#e0405f'; g.fillRect(gx, DESK.y - 14, 4, 14); }
        if (s.gifts >= 2) {
          g.strokeStyle = '#4f9a4a'; g.lineWidth = 3;
          for (const a of [-0.3, 0, 0.3]) { g.beginPath(); g.moveTo(gx + 32, DESK.y - 4); g.lineTo(gx + 32 + Math.sin(a) * 26, DESK.y - 30); g.stroke(); }
          for (const [a, c] of [[-0.3, '#e0405f'], [0, '#ffd34d'], [0.3, '#e88fb4']]) { g.fillStyle = c; g.beginPath(); g.arc(gx + 32 + Math.sin(a) * 26, DESK.y - 32, 7, 0, Math.PI * 2); g.fill(); }
          g.fillStyle = '#9fd0f0'; g.fillRect(gx + 26, DESK.y - 12, 12, 12);
        }
        if (s.gifts >= 3) { g.fillStyle = '#c8486b'; g.beginPath(); g.moveTo(gx + 58, DESK.y - 4); g.arc(gx + 54, DESK.y - 12, 6, Math.PI * 0.8, Math.PI * 2); g.arc(gx + 64, DESK.y - 12, 6, Math.PI, Math.PI * 2.2); g.closePath(); g.fill(); }

        // Maman
        const back = s.st === 'coffee';
        const walking = s.st === 'toCoffee' || s.st === 'back';
        const won = s.result === 'win';
        const mExpr = won ? 'love' : s.result === 'fail' ? 'laugh' : s.msgT > 0 && s.msg.startsWith('« Hmm') ? 'surprised' : s.joy > 0 ? 'love' : 'smile';
        let info;
        if (s.st === 'desk') info = drawPerson(g, { ...maman, x: s.mx, y: 432, size: 54, pose: 'sit', flipX: true, t: api.t, expression: mExpr });
        else info = drawPerson(g, { ...maman, x: s.mx, y: FLOOR, size: 54, pose: walking ? 'run' : 'stand', flipX: s.st === 'toCoffee', t: api.t, expression: mExpr });
        if (back) { // de dos, face à la machine
          g.fillStyle = maman.hairColor; g.beginPath(); g.arc(info.hx, info.hy, info.r * 1.04, 0, Math.PI * 2); g.fill();
        }
        if (won || s.joy > 0) {
          g.fillStyle = 'rgba(230, 80, 100, 0.45)';
          for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(info.hx + sd * 0.5 * info.r, info.hy + 0.3 * info.r, 0.22 * info.r, 0.14 * info.r, 0, 0, Math.PI * 2); g.fill(); }
          api.text(g, '♥', info.hx + 30, info.hy - 40 - (won ? s.endT * 40 : (1 - s.joy) * 30), { size: 30, color: '#e0405f', stroke: '#fff', strokeWidth: 4 });
        }
        // indicateur de regard
        if (!api.ended) {
          const ex = info.hx, ey = info.hy - info.r - 34;
          const lk = looking();
          api.roundRect(g, ex - 30, ey - 16, 60, 32, 16); g.fillStyle = lk ? 'rgba(200,50,50,0.9)' : 'rgba(60,140,90,0.9)'; g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(ex - 16, ey); g.quadraticCurveTo(ex, ey - (lk ? 14 : 0) + (lk ? 0 : 8), ex + 16, ey); if (lk) g.quadraticCurveTo(ex, ey + 14, ex - 16, ey); g.stroke();
          if (lk) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 5, 0, Math.PI * 2); g.fill(); }
        }

        // Papa
        const tugPose = won ? { l: { x: s.x - 50, y: FLOOR - 140 + Math.sin(s.endT * 20) * 4 }, r: { x: s.x + 30, y: FLOOR - 70 } } : undefined;
        const ainfo = api.avatar(g, {
          x: s.x, y: FLOOR, size: 58, pose: s.moving ? 'run' : 'stand', t: s.walkT, flipX: s.dir < 0 && s.moving,
          expression: won ? 'laugh' : s.result === 'fail' ? 'worried' : s.msgT > 0 && s.msg.startsWith('« Hmm') ? 'surprised' : inZone() && looking() ? 'worried' : 'happy',
          blush: (s.msgT > 0 && s.msg.startsWith('« Hmm')) || won ? 1 : 0.3, sweat: inZone() && looking() && s.gifts < 3 && !api.ended, hands: tugPose,
        });
        if (s.gifts < 3 && !api.ended) { // prochain cadeau en main
          const h = ainfo.hands.r;
          g.fillStyle = s.gifts === 1 ? '#e0405f' : '#7a3e22';
          api.roundRect(g, h.x - 9, h.y - 16, 18, 14, 3); g.fill();
          g.fillStyle = '#ffd34d'; g.fillRect(h.x - 1, h.y - 16, 3, 14);
        }

        // HUD
        api.text(g, `Cadeaux : ${s.gifts} / 3`, 30, 40, { size: 24, color: '#fff', stroke: '#000a', align: 'left' });
        api.text(g, `Grillé : ${s.caught} / 2`, 260, 40, { size: 24, color: s.caught ? '#ff8a80' : '#fff', stroke: '#000a', align: 'left' });
        if (!api.ended) {
          const hint = s.gifts < 3 ? (looking() ? 'Elle regarde… reste loin de son bureau !' : 'Elle a le dos tourné : vas-y !') : 'Tire une couette quand elle se rassoit !';
          api.text(g, hint, 30, 74, { size: 18, color: '#fff3d6', stroke: '#000a', align: 'left' });
        }
        if (s.msgT > 0) api.text(g, s.msg, W / 2, 236, { size: 26, color: '#fff', stroke: '#7a2e4a' });
        if (won && s.endT > 0.2) api.text(g, 'Aïe ! … hi hi', s.mx - 10, 250, { size: 26, color: '#fff', stroke: '#c8486b' });
      },
    };
  },
};

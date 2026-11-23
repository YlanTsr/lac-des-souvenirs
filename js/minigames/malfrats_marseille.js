/**
 * « Les malfrats de Marseille » (malfrats_marseille)
 * À Marseille, devant son appartement, Papa a affronté des malfrats qui voulaient
 * lui voler ses courses.
 * Mécanique : Papa au centre avec 3 sacs. Des malfrats arrivent de gauche et de droite ;
 * ← / → (ou clic sur la moitié gauche / droite) pour se tourner et crier
 * « Oh ! Tu fais quoi là ? » : ceux qui sont assez près de ce côté s'enfuient.
 * Crier trop tôt ne sert à rien et il faut reprendre son souffle (petite recharge).
 * Un malfrat qui atteint un sac l'emporte. Garder au moins 2 sacs = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'malfrats_marseille',
  title: 'Les malfrats de Marseille',
  instructions: 'Des malfrats en veulent à tes courses ! Tourne-toi vers ceux qui s’approchent et fais-les fuir d’un « Oh ! Tu fais quoi là ? » — garde au moins 2 sacs.',
  controls: '← → / clic à gauche ou à droite : crier de ce côté',
  duration: 12,
  introExpression: 'surprised',
  successTitle: 'Courses sauvées !',
  failTitle: 'Adieu les courses !',
  successText: 'Les malfrats sont repartis bredouilles. À Marseille, on ne touche pas à tes courses !',
  failText: 'Les malfrats sont partis avec tes courses… Ce soir, ce sera pizza !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const PX = 480, GROUND = 474;
    const RANGE = 240;           // portée du cri (px depuis Papa)
    const COOLDOWN = 0.55;
    const looks = [
      { ...PEOPLE.voleur },
      { ...PEOPLE.voleur, shirt: '#5a3a5a', capColor: '#3a1f3a' },
      { ...PEOPLE.voleur, shirt: '#3a4a3a', capColor: '#1f2a1f', skin: '#a8765a' },
      { ...PEOPLE.voleur, shirt: '#6a4a2a', capColor: '#2a1a10', skin: '#e4b896' },
    ];
    const s = {
      t: 0, facing: 1, shoutT: 0, cool: 0, scared: 0, lost: 0, wasted: 0,
      bags: [{ x: 392, side: -1, here: true }, { x: 480, side: 0, here: true }, { x: 568, side: 1, here: true }],
      thieves: [], nextSpawn: 0.6, lastSides: [],
    };
    const bagsLeft = () => s.bags.filter((b) => b.here).length;

    // ── décor pré-rendu : rue de Marseille au crépuscule ──
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const sky = b.createLinearGradient(0, 0, 0, 300);
      sky.addColorStop(0, '#4a3a78'); sky.addColorStop(0.6, '#d9707a'); sky.addColorStop(1, '#f6b36a');
      b.fillStyle = sky; b.fillRect(0, 0, W, 320);
      // colline et la Bonne Mère au loin
      b.fillStyle = '#6a4a6a';
      b.beginPath(); b.moveTo(300, 320); b.quadraticCurveTo(480, 150, 660, 320); b.fill();
      b.fillStyle = '#4e3550';
      b.fillRect(462, 150, 36, 50); b.fillRect(472, 112, 16, 40);
      b.beginPath(); b.moveTo(462, 150); b.lineTo(480, 136); b.lineTo(498, 150); b.fill();
      b.fillStyle = '#ffd34d'; b.beginPath(); b.arc(480, 104, 5, 0, Math.PI * 2); b.fill(); b.fillRect(477, 104, 6, 10);
      // façades ocre
      const facade = (x, w, top, col) => {
        b.fillStyle = col; b.fillRect(x, top, w, 400 - top);
        b.fillStyle = '#b5643a'; b.fillRect(x - 4, top - 10, w + 8, 12);
        for (let y = top + 22; y < 360; y += 62) for (let wx = x + 16; wx < x + w - 40; wx += 56) {
          const lit = ((wx * 7 + y * 3) % 5) === 0;
          b.fillStyle = lit ? '#ffd98a' : '#3a2a30'; b.fillRect(wx, y, 26, 38);
          b.fillStyle = ((wx + y) % 3) ? '#4f8a9a' : '#5f8a4a';
          b.fillRect(wx - 11, y, 10, 38); b.fillRect(wx + 27, y, 10, 38);
          b.fillStyle = '#3a3030'; b.fillRect(wx - 6, y + 38, 38, 4);
        }
      };
      facade(-10, 280, 70, '#e3a868');
      facade(690, 290, 50, '#d99a5a');
      // linge qui sèche
      b.strokeStyle = '#3a3030'; b.lineWidth = 1.5; b.beginPath(); b.moveTo(270, 120); b.quadraticCurveTo(300, 135, 330, 122); b.stroke();
      b.strokeStyle = '#3a3030'; b.beginPath(); b.moveTo(630, 110); b.quadraticCurveTo(660, 128, 690, 112); b.stroke();
      for (const [lx, ly, c] of [[640, 118, '#ffffff'], [662, 122, '#e8453c'], [280, 126, '#8ac4ff'], [304, 130, '#ffffff']]) { b.fillStyle = c; b.fillRect(lx, ly, 14, 20); }
      // immeuble de Papa au centre (avec sa porte)
      b.fillStyle = '#e8b878'; b.fillRect(270, 230, 420, 180);
      b.fillStyle = '#6a3a24'; api.roundRect(b, 445, 300, 70, 110, 30); b.fill();
      b.fillStyle = '#8a5a34'; b.fillRect(452, 330, 56, 80);
      b.fillStyle = '#ffd34d'; b.beginPath(); b.arc(498, 372, 3, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#3a6fb0'; api.roundRect(b, 466, 286, 28, 16, 3); b.fill();
      b.fillStyle = '#fff'; b.font = '700 11px sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('13', 480, 294);
      for (const wx of [310, 380, 560, 630]) { b.fillStyle = '#3a2a30'; b.fillRect(wx, 260, 30, 44); b.fillStyle = '#4f8a9a'; b.fillRect(wx - 10, 260, 9, 44); b.fillRect(wx + 31, 260, 9, 44); }
      // trottoir + rue
      b.fillStyle = '#b9a58a'; b.fillRect(0, 400, W, 90);
      b.strokeStyle = 'rgba(80,60,40,0.25)'; b.lineWidth = 2;
      for (let x = 0; x < W; x += 60) { b.beginPath(); b.moveTo(x, 400); b.lineTo(x - 20, 490); b.stroke(); }
      b.fillStyle = '#7a6a5a'; b.fillRect(0, 488, W, 8);
      b.fillStyle = '#4a4248'; b.fillRect(0, 496, W, H - 496);
      // réverbère allumé
      const glow = b.createRadialGradient(170, 210, 5, 170, 210, 120);
      glow.addColorStop(0, 'rgba(255,220,140,0.55)'); glow.addColorStop(1, 'rgba(255,220,140,0)');
      b.fillStyle = glow; b.fillRect(40, 90, 260, 260);
      b.fillStyle = '#2a2a30'; b.fillRect(166, 214, 8, 270); b.fillRect(150, 478, 40, 8);
      b.fillStyle = '#ffe6a0'; b.beginPath(); b.moveTo(156, 196); b.lineTo(184, 196); b.lineTo(178, 220); b.lineTo(162, 220); b.fill();
      b.fillStyle = '#2a2a30'; b.fillRect(152, 190, 36, 7);
    }

    function spawn() {
      // évite trois fois de suite le même côté
      let side = Math.random() < 0.5 ? -1 : 1;
      const ls = s.lastSides;
      if (ls.length >= 2 && ls[ls.length - 1] === side && ls[ls.length - 2] === side) side = -side;
      ls.push(side);
      const sneaky = s.t > 4 && Math.random() < 0.3;
      s.thieves.push({
        side, x: side < 0 ? -40 : W + 40, state: 'walk', sp: (sneaky ? rand(165, 190) : rand(95, 130)) + s.t * 3,
        look: looks[Math.floor(rand(0, looks.length))], bag: false, t: 0,
      });
    }
    function target(th) {
      // le sac le plus proche de son côté
      const here = s.bags.filter((b) => b.here);
      if (!here.length) return null;
      return th.side < 0 ? here[0] : here[here.length - 1];
    }
    function shout(dir) {
      s.facing = dir;
      if (s.cool > 0) return;
      s.cool = COOLDOWN; s.shoutT = 0.6;
      let n = 0;
      for (const th of s.thieves) {
        if (th.state !== 'walk' || th.side !== dir) continue;
        if (Math.abs(th.x - PX) <= RANGE) { th.state = 'flee'; th.t = 0; n++; }
      }
      if (n) {
        s.scared += n;
        api.sfx('clang'); api.shake(6);
        api.burst(PX + dir * 150, GROUND - 130, { n: 8 + 4 * n, shape: 'star', color: ['#ffe14d', '#ffffff'], speed: 220, gravity: 200, size: 7 });
      } else {
        s.wasted++;
        api.sfx('beep');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.cool = Math.max(0, s.cool - dt);
        s.shoutT = Math.max(0, s.shoutT - dt);

        if (!api.ended) {
          const p = input.pointer;
          if (p.pressed) shout(p.x < PX ? -1 : 1);
          else if (input.pressed('left')) shout(-1);
          else if (input.pressed('right')) shout(1);
          else if (input.pressed()) shout(s.facing);

          s.nextSpawn -= dt;
          if (s.nextSpawn <= 0) {
            spawn();
            if (s.t > 6 && Math.random() < 0.3) spawn();
            s.nextSpawn = rand(0.85, 1.3) - Math.min(0.25, s.t * 0.025);
          }
        }

        for (const th of s.thieves) {
          th.t += dt;
          if (th.state === 'walk') {
            const tb = target(th);
            if (!tb) { th.state = 'flee'; continue; }
            th.x += -th.side * th.sp * dt;
            const reached = th.side < 0 ? th.x >= tb.x - 26 : th.x <= tb.x + 26;
            if (reached && !api.ended) {
              tb.here = false; th.bag = true; th.state = 'flee'; th.t = 0; s.lost++;
              api.sfx('whoosh');
              api.burst(tb.x, GROUND - 20, { n: 8, color: ['#c8a06a', '#f2d48a'], speed: 140, gravity: 400, size: 4 });
              if (bagsLeft() < 2) api.end(false, 'Les malfrats sont partis avec tes courses… Ce soir, ce sera pizza !');
            } else if (reached) {
              th.state = 'flee';
            }
          } else if (th.state === 'flee') {
            th.x += th.side * (th.bag ? 260 : 330) * dt;
          }
        }
        s.thieves = s.thieves.filter((th) => th.x > -80 && th.x < W + 80);
      },
      timeout() {
        const n = bagsLeft();
        api.end(n >= 2, n === 3
          ? 'Pas un seul sac perdu ! Les malfrats du quartier s’en souviennent encore.'
          : n === 2
            ? 'Un sac envolé, mais l’essentiel est sauvé : ce soir, il y a encore de quoi dîner !'
            : 'Les malfrats sont partis avec tes courses… Ce soir, ce sera pizza !');
        return n >= 2;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);

        // zones de portée du cri (repère discret au sol)
        for (const dir of [-1, 1]) {
          const near = s.thieves.some((th) => th.state === 'walk' && th.side === dir && Math.abs(th.x - PX) <= RANGE);
          g.fillStyle = near ? 'rgba(255,90,60,0.22)' : 'rgba(255,255,255,0.07)';
          g.beginPath(); g.ellipse(PX + dir * RANGE / 2, GROUND + 4, RANGE / 2, 12, 0, 0, Math.PI * 2); g.fill();
        }

        // sacs latéraux
        for (const b of s.bags) if (b.here && b.side !== 0) drawBag(g, b.x, GROUND + 2, 1);

        // Papa
        const shouting = s.shoutT > 0;
        const won = api.ended && bagsLeft() >= 2;
        const dir = s.facing;
        api.avatar(g, {
          x: PX, y: GROUND, size: 70, t: s.t,
          pose: won ? 'cheer' : 'stand',
          expression: api.ended ? (won ? 'laugh' : 'worried') : shouting ? 'surprised' : 'focus',
          lookX: 1, flipX: dir < 0, // flipX retourne aussi le regard
          hands: won ? undefined : shouting
            ? { l: { x: PX - 40, y: GROUND - 120 }, r: { x: PX + 120, y: GROUND - 175 } }
            : { l: { x: PX - 50, y: GROUND - 95 }, r: { x: PX + 50, y: GROUND - 95 } },
        });
        // sac du milieu, à ses pieds
        if (s.bags[1].here) drawBag(g, 480, GROUND + 6, 0.95);

        // malfrats
        for (const th of s.thieves) {
          const fleeing = th.state === 'flee';
          const goingRight = fleeing ? th.side > 0 : th.side < 0;
          const info = drawPerson(g, {
            ...th.look, x: th.x, y: GROUND, size: 52, t: th.t * 1.4, pose: 'run', flipX: !goingRight,
            expression: fleeing ? (th.bag ? 'laugh' : 'scared') : 'angry',
          });
          if (th.bag) drawBag(g, info.handR.x, info.handR.y + 34, 0.7);
          if (fleeing && !th.bag && th.t < 0.6) api.text(g, '!!', th.x, GROUND - 200, { size: 28, color: '#fff', stroke: '#a0302a' });
        }

        // bulle du cri
        if (shouting) {
          const bx = PX + dir * 190, by = 205;
          g.fillStyle = '#fff'; api.roundRect(g, bx - 125, by - 30, 250, 60, 18); g.fill();
          g.beginPath(); g.moveTo(PX + dir * 70, by + 20); g.lineTo(PX + dir * 40, by + 60); g.lineTo(PX + dir * 100, by + 24); g.fill();
          api.text(g, 'Oh ! Tu fais quoi là ?', bx, by, { size: 24, color: '#c8301f', weight: 900 });
        }

        // HUD
        api.text(g, `Sacs : ${bagsLeft()} / 3`, 24, 40, { size: 28, align: 'left', color: '#fff', stroke: '#000a' });
        api.text(g, `Malfrats en fuite : ${s.scared}`, 24, 74, { size: 18, align: 'left', color: '#ffe6a0', stroke: '#000a', strokeWidth: 4 });
        if (s.cool > 0 && !api.ended) {
          g.fillStyle = '#0006'; g.fillRect(PX - 36, GROUND + 26, 72, 7);
          g.fillStyle = '#ffd98a'; g.fillRect(PX - 36, GROUND + 26, 72 * (1 - s.cool / COOLDOWN), 7);
        }

        function drawBag(c, x, y, k) {
          c.save(); c.translate(x, y); c.scale(k, k);
          c.strokeStyle = '#e8c27a'; c.lineWidth = 6; c.lineCap = 'round';
          c.beginPath(); c.moveTo(-6, -46); c.lineTo(10, -64); c.stroke(); // baguette
          c.strokeStyle = '#4f9a4a'; c.lineWidth = 4;
          c.beginPath(); c.moveTo(6, -44); c.lineTo(-4, -60); c.moveTo(9, -44); c.lineTo(4, -62); c.stroke(); // poireaux
          c.fillStyle = '#c8a06a';
          c.beginPath(); c.moveTo(-20, -44); c.lineTo(20, -44); c.lineTo(22, 0); c.lineTo(-22, 0); c.closePath(); c.fill();
          c.fillStyle = '#b08a56'; c.fillRect(-20, -46, 40, 6);
          c.fillStyle = '#e8453c'; c.beginPath(); c.arc(-8, -46, 6, 0, Math.PI * 2); c.fill(); // tomate
          c.restore();
        }
      },
    };
  },
};

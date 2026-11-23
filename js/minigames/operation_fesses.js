/**
 * Anecdote — « Opéré des fesses » (operation_fesses)
 * En maternelle, Iordan a raconté à tout le monde que Papa s'était fait « opérer des fesses ».
 * Mécanique : à la sortie de l'école, la bulle de Iordan se remplit mot par mot.
 * Lui couvrir la bouche juste avant « DES FESSES ! » — pas trop tôt, sinon il recommence plus fort.
 * 3 manches, 2 réussies = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'operation_fesses',
  title: 'Opéré des fesses',
  instructions: 'À la sortie de l’école, Iordan raconte ta petite opération aux autres parents : couvre-lui la bouche juste après « opérer… », pas avant !',
  controls: 'Espace / clic / tap : couvrir la bouche de Iordan',
  duration: 13,
  introExpression: 'worried',
  successTitle: 'Secret bien gardé !',
  failTitle: '« … DES FESSES ! »',
  successText: 'Les autres parents n’en sauront rien. Iordan, lui, garde son scoop pour la prochaine sortie d’école…',
  failText: 'Toute l’école sait désormais que tu t’es fait opérer des fesses. Tu salues les parents avec un grand sourire digne.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const FLOOR = 470;
    const PAPA_X = 300, IOR_X = 395;
    const ROUNDS = 3, NEED = 2;
    const s = {
      t: 0, round: 0, phase: 'pause', pt: 0.4, words: [], shown: 0, opIdx: 0, louder: 0,
      wins: 0, losses: 0, results: [], cover: 0, outcome: null, roundRes: null, laugh: 0, msg: '', msgT: 0,
    };

    function makeWords() {
      const win = [0.8, 0.66, 0.58][Math.min(s.round, 2)];
      const w = [{ txt: 'Mon papa…', at: 0.25 }, { txt: 'il s’est fait…', at: 0 }];
      if (Math.random() < 0.45) w.push({ txt: 'euh…', at: 0 });
      w.push({ txt: 'opérer…', at: 0 });
      w.push({ txt: 'DES FESSES !', at: 0 });
      let t = w[0].at;
      for (let i = 1; i < w.length; i++) { t += i === w.length - 1 ? win : rand(0.5, 0.75); w[i].at = t; }
      s.words = w;
      s.opIdx = w.length - 2;
      s.shown = 0;
      s.pt = 0;
    }

    function startRound() {
      s.phase = 'talk';
      s.louder = 0;
      s.roundRes = null;
      s.cover = 0;
      makeWords();
    }

    function finishRound(ok) {
      s.results.push(ok);
      s.roundRes = ok;
      s.phase = 'pause';
      s.pt = 0;
      if (ok) {
        s.wins++;
        s.cover = 1;
        api.sfx('catch');
        s.msg = 'Mmmpf !'; s.msgT = 1;
      } else {
        s.losses++;
        s.laugh = 1;
        api.sfx('splat');
        api.shake(10);
        api.burst(IOR_X + 40, 200, { n: 16, shape: 'star', color: ['#ffd34d', '#ff9ecb', '#fff'], speed: 260, gravity: 250, size: 7 });
      }
      if (s.wins >= NEED) {
        s.outcome = 'win';
        api.end(true, s.losses === 0
          ? 'Deux fois, la main sur la bouche pile à temps : les autres parents ne sauront jamais rien de ta petite opération !'
          : 'Une fuite, mais deux sauvetages : la version officielle reste « une petite opération ». Ouf !');
      } else if (s.losses > ROUNDS - NEED) {
        s.outcome = 'fail';
        api.end(false);
      }
    }

    /* ── décor pré-rendu : la sortie de l'école maternelle ── */
    const SC = 1.5;
    const bg = document.createElement('canvas');
    bg.width = W * SC; bg.height = H * SC;
    (function paint(b) {
      b.scale(SC, SC);
      const sky = b.createLinearGradient(0, 0, 0, FLOOR);
      sky.addColorStop(0, '#9fd3f2'); sky.addColorStop(1, '#fdeccb');
      b.fillStyle = sky; b.fillRect(0, 0, W, FLOOR);
      // bâtiment de l'école
      b.fillStyle = '#f1c98f'; b.fillRect(40, 110, 880, FLOOR - 150);
      b.fillStyle = '#c75b46';
      b.beginPath(); b.moveTo(20, 115); b.lineTo(480, 40); b.lineTo(940, 115); b.closePath(); b.fill();
      api.roundRect(b, 330, 120, 300, 40, 10); b.fillStyle = '#fffaf0'; b.fill();
      api.text(b, 'ÉCOLE MATERNELLE', 480, 141, { size: 22, color: '#3a6fb0', weight: 900 });
      // fenêtres avec dessins d'enfants
      for (const x of [90, 220, 650, 780]) {
        b.fillStyle = '#bfe3f7'; b.fillRect(x, 190, 90, 80);
        b.strokeStyle = '#fff'; b.lineWidth = 5; b.strokeRect(x, 190, 90, 80);
        b.fillStyle = ['#e8453c', '#f2b33d', '#5bbf73', '#e88fb4'][(x / 10) % 4];
        b.beginPath(); b.arc(x + 30, 225, 12, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#ffd34d'; b.beginPath(); b.arc(x + 65, 210, 9, 0, Math.PI * 2); b.fill();
      }
      // porte
      b.fillStyle = '#4f7cac'; b.fillRect(430, 220, 100, FLOOR - 260);
      b.fillStyle = '#ffd34d'; b.beginPath(); b.arc(515, 340, 5, 0, Math.PI * 2); b.fill();
      // grille de la cour
      b.fillStyle = '#2f5a6b';
      b.fillRect(0, FLOOR - 70, W, 6);
      for (let x = 10; x < W; x += 26) b.fillRect(x, FLOOR - 96, 5, 96);
      // trottoir
      b.fillStyle = '#cfc7bb'; b.fillRect(0, FLOOR, W, H - FLOOR);
      b.fillStyle = 'rgba(0,0,0,0.08)';
      for (let x = 0; x < W; x += 90) b.fillRect(x, FLOOR, 3, H - FLOOR);
    })(bg.getContext('2d'));

    const PARENTS = [
      { ...PEOPLE.passant, x: 610, size: 64 },
      { ...PEOPLE.passant, hair: 'long', hairColor: '#8a5a3a', shirt: '#6a9fd0', skin: '#f0c9aa', dress: true, x: 715, size: 62 },
      { ...PEOPLE.passant, hair: 'curly', hairColor: '#2b2420', shirt: '#c9a04a', skin: '#c99a74', x: 830, size: 66 },
    ];

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.pt += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.laugh = Math.max(0, s.laugh - dt * 0.6);
        if (api.ended) return;
        if (s.phase === 'pause') {
          if (s.pt >= (s.round === 0 && !s.results.length ? 0.4 : 0.9)) {
            if (s.results.length) s.round++;
            if (s.round < ROUNDS) startRound();
          }
          return;
        }
        // phase 'talk'
        while (s.shown < s.words.length && s.pt >= s.words[s.shown].at) {
          s.shown++;
          api.sfx(s.shown === s.words.length ? 'boing' : 'pop');
        }
        if (s.shown >= s.words.length) { finishRound(false); return; }
        if (input.pressed() && s.shown > 0) {
          if (s.shown - 1 >= s.opIdx) finishRound(true);
          else {
            // trop tôt : il recommence, plus fort !
            s.louder = Math.min(3, s.louder + 1);
            api.sfx('boing');
            api.shake(6);
            s.msg = 'Trop tôt ! Il recommence… plus fort !'; s.msgT = 1.1;
            const keep = s.louder;
            makeWords();
            s.louder = keep;
          }
        }
      },
      timeout() { return s.wins >= NEED; },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        const talking = s.phase === 'talk' && !api.ended;
        const dangerous = talking && s.shown - 1 >= s.opIdx;
        const leaked = s.roundRes === false && s.phase === 'pause';

        // les autres parents
        PARENTS.forEach((p, i) => {
          const expr = leaked || s.laugh > 0.2 ? 'laugh' : dangerous ? 'surprised' : 'smile';
          drawPerson(g, { ...p, y: FLOOR + (s.laugh > 0.2 ? -Math.abs(Math.sin(s.t * 12 + i)) * 6 : 0), expression: expr, t: s.t, flipX: true, pose: leaked && i === 1 ? 'point' : 'stand' });
        });

        // Iordan
        const covered = s.roundRes === true && s.phase === 'pause';
        const ior = drawPerson(g, {
          ...PEOPLE.iordan, x: IOR_X, y: FLOOR - (talking && s.louder ? Math.abs(Math.sin(s.t * 14)) * 4 * s.louder : 0), size: 56, t: s.t,
          expression: covered ? 'surprised' : leaked ? 'laugh' : talking ? (Math.sin(s.t * 18) > 0 ? 'laugh' : 'smile') : 'smile',
          pose: talking && s.louder >= 1 ? 'arms_up' : leaked ? 'arms_up' : 'stand',
        });
        const mouth = { x: ior.hx, y: ior.hy + 0.45 * ior.r * 0.92 };

        // Papa
        const nearEnd = dangerous;
        api.avatar(g, {
          x: PAPA_X, y: FLOOR, size: 68, pose: 'stand', lookX: 1, lookY: 0.4, t: s.t,
          expression: covered ? 'happy' : leaked ? 'ouch' : nearEnd ? 'panic' : talking && s.shown >= 2 ? 'worried' : 'smile',
          sweat: talking && s.shown >= 2, blush: leaked ? 1 : 0,
          hands: covered ? { l: { x: PAPA_X - 40, y: FLOOR - 70 }, r: { x: mouth.x, y: mouth.y } } : undefined,
        });

        // la bulle de Iordan
        if (talking || s.phase === 'pause' && s.roundRes !== null) {
          const shown = covered ? s.words.slice(0, s.shown).map((w) => w.txt) : s.words.slice(0, s.shown).map((w) => w.txt);
          if (shown.length || covered) {
            let line = shown.join(' ');
            if (covered) line += ' Mmmpf mmf !';
            const size = Math.min(24 + s.louder * 5, 650 / (line.length * 0.52 + 1));
            const bw = Math.min(700, Math.max(200, line.length * size * 0.52 + 50)), bh = 64 + s.louder * 6;
            const bx = clamp(IOR_X + 40 - bw / 2, 20, W - 20 - bw), by = 196 - s.louder * 6;
            const jit = talking && s.louder ? (Math.random() - 0.5) * s.louder * 2 : 0;
            g.fillStyle = leaked ? '#ffe3ef' : '#fff';
            api.roundRect(g, bx + jit, by, bw, bh, 24); g.fill();
            g.beginPath(); g.moveTo(IOR_X + 10, by + bh - 2); g.lineTo(ior.hx + 6, ior.hy - 36); g.lineTo(IOR_X + 36, by + bh - 2); g.fill();
            if (leaked) {
              api.text(g, line, bx + bw / 2 + jit, by + bh / 2, { size, color: '#c2185b', weight: 900 });
            } else {
              api.text(g, line, bx + bw / 2 + jit, by + bh / 2, { size, color: covered ? '#888' : '#3a2a20', weight: 800 });
            }
          }
        }

        // messages
        if (s.msgT > 0) api.text(g, s.msg, IOR_X + 60, 290 - (1 - s.msgT) * 12, { size: 26, color: '#fff', stroke: s.msg === 'Mmmpf !' ? '#24603a' : '#8a2b2b', strokeWidth: 7 });
        if (leaked) api.text(g, 'Hi hi hi !', 720, 260, { size: 30, color: '#fff', stroke: '#c2185b', strokeWidth: 7 });
        if (dangerous) api.text(g, 'MAINTENANT !', PAPA_X, 120, { size: 30, color: '#fff3d6', stroke: '#c2410c', strokeWidth: 8 });

        // HUD
        api.text(g, `Manche ${Math.min(s.round + 1, ROUNDS)} / ${ROUNDS}`, 30, 40, { size: 22, color: '#fff', align: 'left', stroke: '#000a' });
        for (let i = 0; i < ROUNDS; i++) {
          const x = 44 + i * 34, y = 76, r = s.results[i];
          g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2);
          g.fillStyle = r === undefined ? 'rgba(0,0,0,0.3)' : r ? '#5bbf73' : '#e8453c'; g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
          if (r !== undefined) api.text(g, r ? '✓' : '✗', x, y + 1, { size: 16, color: '#fff', weight: 900 });
        }
        api.text(g, 'Après « opérer… », pas avant !', 30, 108, { size: 16, color: '#fff', align: 'left', stroke: '#000a', strokeWidth: 4 });
      },
    };
  },
};

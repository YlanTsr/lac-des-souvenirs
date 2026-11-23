/**
 * Chapitre I — « Le voleur promeneur » (voleur_promeneur)
 * Un voleur s'est introduit dans le jardin ; attrapé par le gardien, il a juré qu'il « se promenait dans le coin ».
 * Mécanique : jardin de nuit, le faisceau de la lampe torche suit le curseur. Le voleur file de buisson
 * en buisson (et passe parfois la tête). Quand il est dans la lumière : action → le gardien l'attrape.
 * Fausse alerte = la lampe clignote et s'éteint un instant. 3 captures = victoire.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'voleur_promeneur',
  title: 'Le voleur promeneur',
  instructions: 'Un voleur rôde dans le jardin : éclaire-le avec ta lampe torche et donne l’alerte pour que le gardien l’attrape, 3 fois !',
  controls: 'Souris / flèches : lampe · Espace / clic : alerter le gardien',
  duration: 13,
  introExpression: 'focus',
  successTitle: 'Promenade terminée !',
  failTitle: 'Il s’est promené jusqu’à la sortie…',
  successText: 'Trois fois pris, trois fois « Je me promenais ! ». Le gardien n’y a pas cru une seconde, et toi non plus.',
  failText: 'Le promeneur s’est promené… jusqu’à la sortie. Il paraît qu’il se promène encore.',

  create(api) {
    const { W, H, rand, lerp } = api;
    const BEAM = 88, GOAL = 3;
    const POST = { x: 900, y: 505 };
    const BUSHES = [
      { x: 160, y: 455 }, { x: 330, y: 365 }, { x: 515, y: 460 }, { x: 640, y: 320 },
      { x: 790, y: 430 }, { x: 450, y: 290 },
    ];
    const s = {
      t: 0, caught: 0, torchOff: 0, msg: '', msgT: 0,
      th: { state: 'hide', bush: 0, to: 0, k: 0, T: 0.6, x: BUSHES[0].x, y: BUSHES[0].y, freeze: 0, fast: false, run: 0 },
      gx: POST.x, gy: POST.y, cx: W / 2, cy: H / 2,
    };

    /* ───── décor pré-rendu : version éclairée + version nuit ───── */
    const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const lit = mk(), dark = mk();
    {
      const b = lit.getContext('2d');
      b.fillStyle = '#d9c39a'; b.fillRect(0, 0, W, 190);                 // mur de la maison
      b.fillStyle = '#b4532f'; b.fillRect(0, 0, W, 34);
      b.fillStyle = '#6a4a30';
      for (const x of [120, 420, 700]) { b.fillRect(x, 70, 110, 80); b.fillStyle = '#e8d6a8'; b.fillRect(x + 6, 76, 98, 68); b.fillStyle = '#6a4a30'; b.fillRect(x + 53, 76, 4, 68); }
      b.fillStyle = '#c9b48a'; b.fillRect(0, 180, W, 14);
      b.fillStyle = '#5f9a4a'; b.fillRect(0, 194, W, H - 194);           // pelouse
      b.fillStyle = '#4f8a3c';
      for (let i = 0; i < 80; i++) { const x = (i * 97) % W, y = 210 + (i * 53) % 320; b.fillRect(x, y, 3, 8); b.fillRect(x + 5, y + 2, 3, 6); }
      b.fillStyle = '#c9a77a';                                             // allée
      b.beginPath(); b.moveTo(560, 194); b.quadraticCurveTo(420, 360, 300, H); b.lineTo(420, H); b.quadraticCurveTo(520, 360, 610, 194); b.fill();
      for (const [x, y, c] of [[90, 260, '#e0453c'], [250, 520, '#f2b33d'], [700, 520, '#d2479a'], [880, 260, '#f2b33d'], [600, 400, '#e0453c']]) {
        b.fillStyle = c; for (let k = 0; k < 5; k++) { b.beginPath(); b.arc(x + Math.cos(k * 1.3) * 12, y + Math.sin(k * 1.3) * 8, 5, 0, Math.PI * 2); b.fill(); }
      }
      // véranda d'où Papa éclaire
      b.fillStyle = '#a8865a'; b.fillRect(0, 495, 150, 45);
      b.fillStyle = '#8a6a44'; b.fillRect(0, 495, 150, 6);
      const d = dark.getContext('2d');
      d.drawImage(lit, 0, 0);
      d.fillStyle = 'rgba(8, 12, 40, 0.8)'; d.fillRect(0, 0, W, H);
      d.fillStyle = '#ffd98a'; d.fillRect(426, 76, 48, 68);               // une fenêtre restée allumée
      d.fillStyle = 'rgba(255, 220, 140, 0.12)'; d.beginPath(); d.arc(450, 110, 90, 0, Math.PI * 2); d.fill();
    }
    const bushLit = mk(170, 110), bushDark = mk(170, 110);
    {
      const b = bushLit.getContext('2d');
      b.fillStyle = '#2f6b2f';
      b.beginPath(); b.arc(45, 70, 38, 0, Math.PI * 2); b.arc(85, 50, 46, 0, Math.PI * 2); b.arc(125, 70, 38, 0, Math.PI * 2); b.fill();
      b.fillRect(12, 70, 146, 40);
      b.fillStyle = '#3f8a3a';
      b.beginPath(); b.arc(55, 60, 22, 0, Math.PI * 2); b.arc(95, 38, 26, 0, Math.PI * 2); b.arc(130, 62, 18, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#e04a6a';
      for (const [x, y] of [[40, 80], [80, 30], [120, 76], [100, 92], [60, 50]]) { b.beginPath(); b.arc(x, y, 4, 0, Math.PI * 2); b.fill(); }
      const d = bushDark.getContext('2d');
      d.drawImage(bushLit, 0, 0);
      d.globalCompositeOperation = 'source-atop';
      d.fillStyle = 'rgba(8, 12, 40, 0.82)'; d.fillRect(0, 0, 170, 110);
    }

    const th = s.th;
    const catchable = () => th.state === 'run' || th.state === 'peek';
    const thiefPoint = () => (th.state === 'peek' ? { x: th.x + 34, y: th.y - 86 } : { x: th.x, y: th.y - 55 });

    function goHide(i) { th.state = 'hide'; th.bush = i; th.x = BUSHES[i].x; th.y = BUSHES[i].y; th.T = rand(0.45, 0.9); }
    function startRun(fast) {
      let j; do { j = Math.floor(rand(0, BUSHES.length)); } while (j === th.bush);
      th.state = fast ? 'escape' : 'run'; th.from = th.bush; th.to = j; th.k = 0; th.fast = !!fast; th.freeze = 0; th.lit = false;
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.torchOff = Math.max(0, s.torchOff - dt);
        s.cx = input.cursor.x; s.cy = input.cursor.y;

        // le voleur
        th.T -= dt;
        if (th.state === 'hide' && th.T <= 0 && !api.ended) {
          if (Math.random() < 0.45) { th.state = 'peek'; th.T = rand(0.7, 1.0); } else startRun(false);
        } else if (th.state === 'peek' && th.T <= 0) startRun(false);
        else if (th.state === 'run' || th.state === 'escape') {
          const p = thiefPoint();
          const inBeam = s.torchOff === 0 && Math.hypot(p.x - s.cx, p.y - s.cy) < BEAM;
          if (th.state === 'run' && inBeam && !th.lit) { th.lit = true; th.freeze = 0.3; th.fast = true; api.sfx('beep'); }
          if (th.freeze > 0) th.freeze -= dt;
          else {
            const A = BUSHES[th.from], B = BUSHES[th.to];
            const d = Math.hypot(B.x - A.x, B.y - A.y) || 1;
            th.k += ((th.fast ? 330 : 230) * dt) / d;
            th.x = lerp(A.x, B.x, Math.min(1, th.k)); th.y = lerp(A.y, B.y, Math.min(1, th.k));
            th.run += dt;
            if (th.k >= 1) goHide(th.to);
          }
        } else if (th.state === 'caught') {
          // le gardien accourt, le voleur se justifie… puis se faufile
          const k = Math.min(1, (1.5 - th.T) / 0.35);
          s.gx = lerp(POST.x, th.x + 38, k); s.gy = lerp(POST.y, th.y, k);
          if (th.T <= 0 && !api.ended) { th.bush = BUSHES.reduce((bi, b, i) => (Math.hypot(b.x - th.x, b.y - th.y) < Math.hypot(BUSHES[bi].x - th.x, BUSHES[bi].y - th.y) ? i : bi), 0); th.x = BUSHES[th.bush].x; th.y = BUSHES[th.bush].y; startRun(true); }
        }
        if (th.state !== 'caught') { s.gx = lerp(s.gx, POST.x, Math.min(1, dt * 3)); s.gy = lerp(s.gy, POST.y, Math.min(1, dt * 3)); }

        if (api.ended || !input.pressed() || s.torchOff > 0) return;
        const p = thiefPoint();
        if (catchable() && Math.hypot(p.x - s.cx, p.y - s.cy) < BEAM) {
          s.caught++;
          if (th.state === 'peek') th.x += 34;
          th.state = 'caught'; th.T = 1.5;
          api.sfx('catch'); api.shake(8);
          api.burst(th.x, th.y - 60, { n: 14, shape: 'star', color: ['#ffe27a', '#ffffff'], speed: 220, gravity: 200, size: 7 });
          if (s.caught >= GOAL) api.end(true);
        } else {
          s.torchOff = 0.6;
          s.msg = 'Fausse alerte !'; s.msgT = 0.8;
          api.sfx('beep');
        }
      },
      timeout() { return s.caught >= GOAL; },
      draw(g) {
        const torchOn = s.torchOff === 0 || Math.sin(s.t * 60) > 0.6;
        const caughtNow = th.state === 'caught';
        const drawThief = (alpha) => {
          if (th.state === 'hide') return;
          g.globalAlpha = alpha;
          if (th.state === 'peek') {
            drawPerson(g, { ...PEOPLE.voleur, x: th.x + 34, y: th.y - 86, size: 40, body: false, expression: 'smile', t: s.t });
          } else {
            drawPerson(g, {
              ...PEOPLE.voleur, x: th.x, y: th.y, size: 40, t: th.run,
              pose: caughtNow ? 'arms_up' : th.freeze > 0 ? 'stand' : 'run',
              expression: caughtNow ? 'smile' : th.freeze > 0 ? 'surprised' : 'smile',
              flipX: th.state !== 'caught' && BUSHES[th.to] && BUSHES[th.to].x < th.x,
            });
          }
          g.globalAlpha = 1;
        };
        const drawBushes = (img) => {
          for (let i = 0; i < BUSHES.length; i++) {
            const b = BUSHES[i];
            const rustle = th.state === 'hide' && th.bush === i ? Math.sin(s.t * 34) * 2.5 * (th.T < 0.35 ? 1.6 : 1) : 0;
            g.drawImage(img, b.x - 85 + rustle, b.y - 100);
          }
        };
        // passe « nuit »
        g.drawImage(dark, 0, 0);
        drawThief(0.28);
        drawBushes(bushDark);

        // passe « éclairée » : faisceau de la lampe (+ la scène de la capture)
        g.save();
        g.beginPath();
        if (torchOn) g.arc(s.cx, s.cy, BEAM, 0, Math.PI * 2);
        if (caughtNow) { g.moveTo(th.x + 130, th.y - 55); g.arc(th.x + 20, th.y - 55, 110, 0, Math.PI * 2); }
        g.clip();
        g.drawImage(lit, 0, 0);
        drawThief(1);
        drawBushes(bushLit);
        g.fillStyle = 'rgba(255, 230, 150, 0.12)'; g.fillRect(0, 0, W, H);
        g.restore();
        if (torchOn) {
          g.strokeStyle = 'rgba(255, 235, 170, 0.5)'; g.lineWidth = 2;
          g.beginPath(); g.arc(s.cx, s.cy, BEAM, 0, Math.PI * 2); g.stroke();
          // le cône de lumière qui part de la lampe de Papa
          g.fillStyle = 'rgba(255, 235, 160, 0.10)';
          const ang = Math.atan2(s.cy - 440, s.cx - 96);
          g.beginPath(); g.moveTo(96, 440);
          g.lineTo(s.cx + Math.cos(ang + Math.PI / 2) * BEAM, s.cy + Math.sin(ang + Math.PI / 2) * BEAM);
          g.lineTo(s.cx + Math.cos(ang - Math.PI / 2) * BEAM, s.cy + Math.sin(ang - Math.PI / 2) * BEAM);
          g.closePath(); g.fill();
        }

        // le gardien
        drawPerson(g, { ...PEOPLE.gardien, x: s.gx, y: s.gy, size: 46, t: s.t, pose: caughtNow ? 'hug' : 'stand', flipX: caughtNow, expression: caughtNow ? 'angry' : 'smile' });
        if (caughtNow || (api.ended && s.caught >= GOAL)) {
          const bx = Math.min(Math.max(th.x - 10, 130), 690), by = Math.max(th.y - 175, 90);
          api.roundRect(g, bx - 105, by - 24, 210, 46, 16); g.fillStyle = '#fff'; g.fill();
          g.beginPath(); g.moveTo(bx - 8, by + 20); g.lineTo(th.x, th.y - 120); g.lineTo(bx + 14, by + 20); g.fill();
          api.text(g, 'Je me promenais !', bx, by, { size: 21, color: '#2a2230', weight: 800 });
        }

        // petit Papa et sa lampe torche, sur la véranda
        const info = api.avatar(g, {
          x: 70, y: 532, size: 50, pose: 'stand', lookX: 1, lookY: -0.5,
          expression: caughtNow ? 'laugh' : s.torchOff > 0 ? 'worried' : 'focus',
          hands: { l: { x: 92, y: 448 }, r: { x: 100, y: 446 } },
        });
        g.fillStyle = '#4a3424';
        g.beginPath(); g.arc(info.hx, info.hy, 26, Math.PI * 1.08, Math.PI * 1.92); g.quadraticCurveTo(info.hx, info.hy - 13, info.hx - 25.5, info.hy - 7); g.fill();
        g.save(); g.translate(98, 444); g.rotate(Math.atan2(s.cy - 444, s.cx - 98));
        g.fillStyle = '#c0392b'; api.roundRect(g, -6, -6, 28, 12, 4); g.fill();
        g.fillStyle = torchOn ? '#fff6c0' : '#777'; g.fillRect(20, -7, 6, 14);
        g.restore();

        if (s.msgT > 0) api.text(g, s.msg, s.cx, s.cy - BEAM - 18, { size: 22, color: '#fff', stroke: '#000a', strokeWidth: 5 });
        // HUD
        api.text(g, `Attrapé : ${s.caught} / ${GOAL}`, 28, 50, { align: 'left', size: 24, color: '#ffe9a8', stroke: '#000a' });
        if (api.ended) api.text(g, s.caught >= GOAL ? 'Promenade terminée !' : 'Bonne promenade…', W / 2, 230, { size: 44, color: '#ffe27a', stroke: '#000a', strokeWidth: 8 });
      },
    };
  },
};

/**
 * Anecdote — « Iordan, ton deuxième fils » (naissance_iordan)
 * 19 septembre 2010 : Papa devient papa pour la troisième fois, la famille est au complet.
 * Mécanique : la photo de famille. Maman, Séléna, Ylan et bébé Iordan regardent ailleurs,
 * bâillent, grimacent… Déclencher pile quand TOUT LE MONDE regarde l'objectif.
 * 3 bonnes photos = victoire ; 6 photos dans l'appareil.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'naissance_iordan',
  title: 'Iordan, ton deuxième fils',
  instructions: 'La famille est au complet : prends la photo pile quand Maman, Séléna, Ylan et bébé Iordan regardent tous l’objectif. Trois belles photos !',
  controls: 'Espace / clic / tap : prendre la photo',
  duration: 12,
  introExpression: 'happy',
  successTitle: 'La photo de famille !',
  failTitle: 'Photos floues…',
  successText: 'Clic ! Les cinq de la famille, tous ensemble et tous souriants. Celle-là, elle finit encadrée dans le salon.',
  failText: 'Un qui bâille, une qui grimace, un bébé qui dort… L’album est plein de photos ratées, et ce sont les plus drôles !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const FLOOR = 430;
    const SHOTS = 6, NEED = 3, COOLDOWN = 0.5;
    const NAMES = ['Séléna', 'Maman', 'Iordan', 'Ylan'];
    const KINDS = [['grimace', 'away'], ['baby', 'away'], ['sleep', 'cry'], ['yawn', 'away']];
    const CAPTION = {
      grimace: (n) => `${n} grimace`, away: (n) => `${n} regarde ailleurs`, baby: () => 'Maman ne voit que Iordan',
      sleep: () => 'Iordan dort', cry: () => 'Iordan pleure', yawn: (n) => `${n} bâille`,
    };

    /* ── chronologie : des « fenêtres » où tout le monde regarde, séparées par du chaos ── */
    const dist = [[], [], [], []]; // par personne : [{a, b, kind}]
    const windows = [];
    {
      let t = 1.0;
      const lens = [0.7, 0.62, 0.56, 0.52, 0.5, 0.5, 0.5];
      // chaos initial
      dist[0].push({ a: 0, b: 0.6, kind: 'grimace' });
      dist[2].push({ a: 0.25, b: 0.95, kind: 'sleep' });
      for (let i = 0; t < 13; i++) {
        windows.push({ a: t, b: t + lens[Math.min(i, lens.length - 1)] });
        t += lens[Math.min(i, lens.length - 1)];
        const a = t, b = t + rand(1.45, 1.9);
        // 2 ou 3 segments qui se chevauchent : il y a toujours quelqu'un de distrait
        const nseg = Math.random() < 0.5 ? 2 : 3;
        let prev = -1, cur = a;
        for (let k = 0; k < nseg; k++) {
          let p; do p = Math.floor(rand(0, 4)); while (p === prev);
          prev = p;
          const end = k === nseg - 1 ? b : cur + (b - a) / nseg;
          const ks = KINDS[p];
          dist[p].push({ a: cur, b: end + (k === nseg - 1 ? 0 : 0.15), kind: ks[Math.floor(rand(0, ks.length))] });
          cur = end;
        }
        // une distraction bonus au milieu du chaos, pour l'ambiance
        const q = Math.floor(rand(0, 4));
        const m = rand(a + 0.2, b - 0.5);
        dist[q].push({ a: m, b: m + 0.35, kind: KINDS[q][0] });
        t = b;
      }
    }

    const s = {
      t: 0, shots: 0, good: 0, cool: 0, flash: 0, polaroids: [], windows,
      lastShot: null, msg: '', msgT: 0, outcome: null,
    };

    const stateOf = (p, t = s.t) => {
      for (const d of dist[p]) if (t >= d.a && t < d.b) return d.kind;
      return null;
    };
    const allLook = () => [0, 1, 2, 3].every((p) => !stateOf(p));
    s.allLook = allLook;

    /* ── décor pré-rendu : la chambre de la maternité ── */
    const SC = 1.5;
    const bg = document.createElement('canvas');
    bg.width = W * SC; bg.height = H * SC;
    (function paint(b) {
      b.scale(SC, SC);
      b.fillStyle = '#dcebdc'; b.fillRect(0, 0, W, FLOOR);
      b.fillStyle = 'rgba(255,255,255,0.35)';
      for (let x = 0; x < W; x += 60) b.fillRect(x, 0, 30, FLOOR);
      b.fillStyle = '#e9d8c4'; b.fillRect(0, FLOOR, W, H - FLOOR);
      b.fillStyle = 'rgba(160, 120, 90, 0.18)';
      for (let x = 0; x < W; x += 80) for (let y = FLOOR; y < H; y += 40) b.fillRect(x + ((y / 40) % 2) * 40, y, 38, 38);
      // fenêtre
      b.fillStyle = '#bfe3f7'; b.fillRect(70, 70, 150, 150);
      b.strokeStyle = '#fff'; b.lineWidth = 8; b.strokeRect(70, 70, 150, 150);
      b.beginPath(); b.moveTo(145, 70); b.lineTo(145, 220); b.stroke();
      b.fillStyle = '#ffe9a8'; b.beginPath(); b.arc(110, 110, 18, 0, Math.PI * 2); b.fill();
      // banderole
      b.strokeStyle = '#8a6a55'; b.lineWidth = 2;
      b.beginPath(); b.moveTo(250, 40); b.quadraticCurveTo(480, 90, 710, 40); b.stroke();
      const flags = ['#f2b33d', '#7cc6ef', '#e88fb4', '#5bbf73'];
      for (let i = 0; i < 11; i++) {
        const k = i / 10, x = 250 + k * 460, y = 40 + Math.sin(k * Math.PI) * 25;
        b.fillStyle = flags[i % 4]; b.beginPath(); b.moveTo(x - 14, y); b.lineTo(x + 14, y); b.lineTo(x, y + 26); b.fill();
      }
      api.roundRect(b, 330, 92, 300, 60, 14); b.fillStyle = '#fff8ea'; b.fill();
      api.text(b, 'Bienvenue Iordan !', 480, 112, { size: 26, color: '#3a6fb0', weight: 900 });
      api.text(b, '19 septembre 2010', 480, 138, { size: 16, color: '#8a6a55', weight: 700 });
      // ballons
      for (const [x, y, c] of [[760, 150, '#7cc6ef'], [800, 120, '#3a6fb0'], [835, 165, '#f2b33d']]) {
        b.strokeStyle = '#8a8a8a'; b.lineWidth = 1.5; b.beginPath(); b.moveTo(x, y + 34); b.lineTo(790, 330); b.stroke();
        b.fillStyle = c; b.beginPath(); b.ellipse(x, y, 26, 32, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = 'rgba(255,255,255,0.45)'; b.beginPath(); b.ellipse(x - 8, y - 12, 6, 10, -0.4, 0, Math.PI * 2); b.fill();
      }
      // lit
      b.fillStyle = '#b8c4cc'; b.fillRect(380, 330, 10, 100); b.fillRect(580, 360, 10, 70);
      b.fillStyle = '#ffffff'; api.roundRect(b, 370, 380, 230, 30, 10); b.fill();
      b.fillStyle = '#9fc4e0'; api.roundRect(b, 370, 395, 230, 22, 8); b.fill();
      // table + fleurs
      b.fillStyle = '#9b6b44'; b.fillRect(720, 340, 120, 10); b.fillRect(730, 350, 8, 80); b.fillRect(822, 350, 8, 80);
      b.fillStyle = '#7cc6ef'; b.fillRect(765, 300, 30, 40);
      for (const [x, y, c] of [[770, 290, '#e8453c'], [788, 284, '#f2b33d'], [780, 276, '#e88fb4']]) { b.fillStyle = c; b.beginPath(); b.arc(x, y, 9, 0, Math.PI * 2); b.fill(); }
    })(bg.getContext('2d'));

    function takePhoto() {
      s.shots++;
      s.cool = COOLDOWN;
      s.flash = 1;
      const culprits = [0, 1, 2, 3].map((p) => [p, stateOf(p)]).filter(([, k]) => k);
      const ok = culprits.length === 0;
      const ph = { ok, caption: ok ? ['Parfaite !', 'Tout le monde !', 'Magnifique !'][s.good % 3] : CAPTION[culprits[0][1]](NAMES[culprits[0][0]]),
        states: [0, 1, 2, 3].map((p) => stateOf(p)), rot: rand(-0.18, 0.18), y: 0 };
      s.polaroids.push(ph);
      s.lastShot = ph;
      if (ok) {
        s.good++;
        api.sfx('catch');
        api.burst(470, 250, { n: 18, shape: 'star', color: ['#fff6c2', '#ffd34d', '#ffffff'], speed: 260, gravity: 200, size: 8 });
        s.msg = 'Clic ! Superbe !';
      } else {
        api.sfx('boing');
        s.msg = 'Floue ! ' + ph.caption;
      }
      s.msgT = 1;
      if (s.good >= NEED) {
        s.outcome = 'win';
        api.end(true, s.shots === NEED
          ? 'Trois photos, trois chefs-d’œuvre : Maman, Séléna, Ylan et le petit Iordan, tous ensemble. La famille est au complet !'
          : 'Après quelques photos floues, trois belles photos de famille. Bienvenue, Iordan : la famille est au complet !');
      } else if (s.shots >= SHOTS) {
        s.outcome = 'fail';
        api.end(false);
      }
    }

    // dessine des yeux « pas dans l'objectif » par-dessus le visage
    function eyesOverlay(g, info, hr, kind, skin) {
      const ex = 0.36 * hr, ey = info.hy - 0.05 * hr;
      g.fillStyle = skin;
      for (const sd of [-1, 1]) { g.beginPath(); g.arc(info.hx + sd * ex, ey, 0.2 * hr, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#2a201b'; g.strokeStyle = '#2a201b'; g.lineWidth = Math.max(1.5, 0.08 * hr); g.lineCap = 'round';
      for (const sd of [-1, 1]) {
        const cx = info.hx + sd * ex;
        if (kind === 'yawn') { g.beginPath(); g.moveTo(cx - 0.12 * hr, ey); g.lineTo(cx + 0.12 * hr, ey); g.stroke(); }
        else if (kind === 'baby') { g.beginPath(); g.arc(cx + 0.06 * hr, ey + 0.08 * hr, 0.09 * hr, 0, Math.PI * 2); g.fill(); }
        else { g.beginPath(); g.arc(cx + (kind === 'awayL' ? -0.1 : 0.1) * hr, ey - 0.02 * hr, 0.09 * hr, 0, Math.PI * 2); g.fill(); }
      }
    }

    function drawFamily(g) {
      const t = s.t;
      const st = [0, 1, 2, 3].map((p) => stateOf(p));
      const won = s.outcome === 'win';
      const sway = (p) => (st[p] ? Math.sin(t * 5 + p) * 4 : 0);
      // Séléna
      {
        const k = st[0];
        const info = drawPerson(g, { ...PEOPLE.selena, x: 300 + sway(0), y: FLOOR, size: 58, t, expression: won ? 'laugh' : k === 'grimace' ? 'laugh' : 'smile', pose: k === 'grimace' ? 'arms_up' : 'stand' });
        if (k === 'grimace') { g.fillStyle = '#e0607a'; g.beginPath(); g.ellipse(info.hx, info.hy + 0.6 * info.r * 0.92, 6, 8, 0, 0, Math.PI); g.fill(); }
        if (k === 'away') eyesOverlay(g, info, info.r * 0.92, 'awayL', PEOPLE.selena.skin);
        s._heads[0] = info;
      }
      // Ylan
      {
        const k = st[3];
        const info = drawPerson(g, { ...PEOPLE.ylan, x: 640 + sway(3), y: FLOOR, size: 56, t, expression: won ? 'laugh' : k === 'yawn' ? 'surprised' : 'smile', pose: k === 'yawn' ? 'arms_up' : 'stand' });
        if (k === 'yawn' || k === 'away') eyesOverlay(g, info, info.r * 0.92, k === 'yawn' ? 'yawn' : 'awayR', PEOPLE.ylan.skin);
        s._heads[3] = info;
      }
      // Maman assise sur le lit, Iordan dans les bras
      {
        const k = st[1];
        const bx = 495, by = 352;
        const info = drawPerson(g, { ...PEOPLE.maman, x: 450, y: 392, size: 62, t, expression: won ? 'laugh' : k === 'baby' ? 'love' : 'smile', pose: 'sit', hands: { l: { x: bx - 26, y: by + 8 }, r: { x: bx + 18, y: by + 14 } } });
        if (k === 'baby') eyesOverlay(g, info, info.r, 'baby', PEOPLE.maman.skin);
        if (k === 'away') eyesOverlay(g, info, info.r, 'awayL', PEOPLE.maman.skin);
        s._heads[1] = info;
        // la couverture de Iordan
        const kb = st[2];
        const wob = kb === 'cry' ? Math.sin(t * 30) * 1.5 : 0;
        g.fillStyle = '#f6e7a8';
        g.beginPath(); g.ellipse(bx + wob, by + 12, 34, 20, -0.15, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#7cc6ef';
        g.beginPath(); g.ellipse(bx + 8 + wob, by + 14, 22, 13, -0.15, 0, Math.PI * 2); g.fill();
        const bi = drawPerson(g, { ...PEOPLE.iordan, kind: 'baby', hair: 'curly', body: false, x: bx - 16 + wob, y: by - 4, size: 40, t,
          expression: won ? 'laugh' : kb === 'sleep' ? 'sleep' : kb === 'cry' ? 'scared' : 'smile' });
        if (kb === 'cry') {
          g.fillStyle = '#8fd0ff';
          for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(bi.hx + sd * 0.4 * bi.r, bi.hy + 0.35 * bi.r + ((t * 40) % 8), 2.5, 4, 0, 0, Math.PI * 2); g.fill(); }
        }
        s._heads[2] = bi;
        // Maman tient la couverture (mains par-dessus)
        g.fillStyle = PEOPLE.maman.skin;
        g.beginPath(); g.arc(bx - 26, by + 8, 5.5, 0, Math.PI * 2); g.arc(bx + 18, by + 14, 5.5, 0, Math.PI * 2); g.fill();
      }
      // indicateurs au-dessus des têtes
      if (!api.ended || won) {
        const ICON = { grimace: ':P', away: '?', baby: '♥', sleep: 'zZ', cry: 'Ouin', yawn: 'Ahh' };
        for (let p = 0; p < 4; p++) {
          const hd = s._heads[p];
          if (!hd) continue;
          const x = p === 2 ? hd.hx + 44 : hd.hx, y = p === 2 ? hd.hy - 6 : hd.hy - hd.r * 1.25 - 22;
          const k = st[p];
          g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2);
          g.fillStyle = k ? '#f29a38' : '#5bbf73'; g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
          api.text(g, k ? ICON[k] : '✓', x, y + 1, { size: k && ICON[k].length > 2 ? 11 : 17, color: '#fff', weight: 900 });
        }
      }
    }
    s._heads = [];

    function drawPolaroid(g, ph, x, y, w) {
      const h = w * 1.15;
      g.save(); g.translate(x, y); g.rotate(ph.rot);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
      g.fillStyle = '#fffdf6'; g.fillRect(-w / 2, -h / 2, w, h);
      const pw = w - 12, phh = w * 0.75;
      g.fillStyle = ph.ok ? '#cfe6d6' : '#b9c7c0'; g.fillRect(-pw / 2, -h / 2 + 6, pw, phh);
      // mini-famille : quatre bouilles
      const cols = [[PEOPLE.selena.hairColor, '#e88fb4'], [PEOPLE.maman.hairColor, '#c8486b'], [PEOPLE.iordan.hairColor, '#7cc6ef'], [PEOPLE.ylan.hairColor, '#4fa36b']];
      const reps = ph.ok ? 1 : 3;
      for (let rpt = 0; rpt < reps; rpt++) {
        g.globalAlpha = ph.ok ? 1 : 0.4;
        const off = ph.ok ? 0 : (rpt - 1) * 4;
        for (let i = 0; i < 4; i++) {
          const hx = -pw / 2 + pw * (0.17 + i * 0.22) + off, hy = -h / 2 + 6 + phh * (i === 2 ? 0.62 : 0.5);
          const rr = i === 2 ? 5 : 7;
          g.fillStyle = cols[i][1]; g.fillRect(hx - rr, hy + rr * 0.8, rr * 2, rr * 1.6);
          g.fillStyle = '#efc6a6'; g.beginPath(); g.arc(hx, hy, rr, 0, Math.PI * 2); g.fill();
          g.fillStyle = cols[i][0]; g.beginPath(); g.arc(hx, hy - rr * 0.35, rr, Math.PI, 0); g.fill();
          if (ph.states[i]) { g.fillStyle = '#e8453c'; g.beginPath(); g.arc(hx + rr, hy - rr, 2.5, 0, Math.PI * 2); g.fill(); }
        }
      }
      g.globalAlpha = 1;
      api.text(g, ph.ok ? '♥' : 'floue', 0, h / 2 - 12, { size: 11, color: ph.ok ? '#c8486b' : '#777', weight: 800 });
      g.restore();
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.cool = Math.max(0, s.cool - dt);
        s.flash = Math.max(0, s.flash - dt * 3.5);
        s.msgT = Math.max(0, s.msgT - dt);
        for (const ph of s.polaroids) ph.y = Math.min(1, ph.y + dt * 3);
        if (api.ended) return;
        if (input.pressed() && s.cool === 0 && s.shots < SHOTS) takePhoto();
      },
      timeout() {
        s.outcome = 'fail';
        api.end(false, s.good
          ? `Seulement ${s.good} belle${s.good > 1 ? 's' : ''} photo${s.good > 1 ? 's' : ''}… La famille est au complet, mais jamais tous en même temps devant l’objectif !`
          : 'Pas une seule photo nette ! Avec trois enfants dont un nouveau-né, la photo de famille parfaite, c’est un sport de haut niveau.');
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        drawFamily(g);

        // viseur
        const ok = allLook();
        g.strokeStyle = ok && !api.ended ? '#5bbf73' : 'rgba(255,255,255,0.85)'; g.lineWidth = 5;
        const [x0, y0, x1, y1] = [235, 200, 705, 445];
        for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
          g.beginPath(); g.moveTo(cx + sx * 34, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy * 34); g.stroke();
        }
        if (!api.ended) {
          api.text(g, ok ? 'Tout le monde regarde : CLIC !' : 'Attends que tout le monde regarde…', 470, 180,
            { size: 22, color: ok ? '#d9ffe0' : '#fff', stroke: ok ? '#24603a' : '#000a', strokeWidth: 6 });
        }

        // Papa et son appareil photo (en bas à gauche)
        const pinfo = api.avatar(g, {
          x: 110, y: 540, size: 64, pose: 'stand', lookX: 1,
          expression: s.outcome === 'win' ? 'happy' : s.outcome === 'fail' ? 'laugh' : s.flash > 0.3 ? 'happy' : 'focus',
          hands: { l: { x: 140, y: 400 }, r: { x: 182, y: 404 } },
        });
        g.fillStyle = '#2f343c'; api.roundRect(g, 136, 382, 56, 36, 7); g.fill();
        g.fillStyle = '#5b6470'; g.beginPath(); g.arc(170, 400, 12, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#9fd0f0'; g.beginPath(); g.arc(170, 400, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = s.cool > 0 ? '#e8453c' : '#ffe08a'; g.fillRect(142, 376, 14, 7);
        void pinfo;

        // polaroïds
        s.polaroids.forEach((ph, i) => {
          drawPolaroid(g, ph, 640 + i * 52, 560 - ph.y * 76, 72);
        });

        // HUD
        api.text(g, `Belles photos : ${s.good} / ${NEED}`, 30, 40, { size: 22, color: '#fff', align: 'left', stroke: '#000a' });
        api.text(g, 'Pellicule', 30, 74, { size: 17, color: '#fff', align: 'left', stroke: '#000a', strokeWidth: 5 });
        for (let i = 0; i < SHOTS; i++) {
          g.beginPath(); g.arc(120 + i * 22, 74, 8, 0, Math.PI * 2);
          g.fillStyle = i < SHOTS - s.shots ? '#ffd34d' : 'rgba(0,0,0,0.35)'; g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
        }
        if (s.msgT > 0 && s.lastShot) {
          api.text(g, s.msg, 420, 470 + (1 - s.msgT) * -10, { size: 26, color: s.lastShot.ok ? '#d9ffe0' : '#ffe0d6', stroke: s.lastShot.ok ? '#24603a' : '#8a2b2b', strokeWidth: 7 });
        }
        // flash
        if (s.flash > 0) { g.fillStyle = `rgba(255,255,255,${s.flash * 0.85})`; g.fillRect(0, 0, W, H); }
      },
    };
  },
};

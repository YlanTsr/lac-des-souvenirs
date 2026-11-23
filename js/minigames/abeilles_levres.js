/**
 * Anecdote #51 — « Les lèvres d’abeille » (abeilles_levres)
 * Au verger, Papa récolte le miel de ses ruches… sans le voile. Les abeilles piquent : lèvres XXL !
 * Mécanique : déplacer Papa (flèches ou souris) pour ramasser 5 pots de miel en esquivant
 * les abeilles qui tournent. Chaque piqûre gonfle ses lèvres ; 3 piqûres = échec.
 */

let BG = null; // décor pré-rendu (une seule fois)

function buildBg(api) {
  const { W, H } = api;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // ciel d'été
  const sky = g.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#8cc8f0'); sky.addColorStop(1, '#fbe7bd');
  g.fillStyle = sky; g.fillRect(0, 0, W, 300);
  g.fillStyle = '#ffe28a'; g.beginPath(); g.arc(120, 90, 40, 0, Math.PI * 2); g.fill();
  // collines
  g.fillStyle = '#a9d48f';
  g.beginPath(); g.moveTo(0, 250); g.quadraticCurveTo(260, 190, 520, 240); g.quadraticCurveTo(760, 200, W, 235); g.lineTo(W, 320); g.lineTo(0, 320); g.fill();
  // pommiers du verger au fond
  for (let i = 0; i < 8; i++) {
    const x = 40 + i * 125 + (i % 2) * 20, s = 0.8 + (i % 3) * 0.12;
    g.fillStyle = '#7a5332'; g.fillRect(x - 7 * s, 270 - 70 * s, 14 * s, 70 * s);
    g.fillStyle = i % 2 ? '#5fa154' : '#4f9a4a';
    g.beginPath(); g.arc(x, 270 - 90 * s, 46 * s, 0, Math.PI * 2); g.arc(x - 34 * s, 270 - 70 * s, 32 * s, 0, Math.PI * 2); g.arc(x + 34 * s, 270 - 70 * s, 32 * s, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e0473a';
    for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(x - 36 * s + ((a * 31) % 72) * s, 270 - 112 * s + ((a * 47) % 60) * s, 5 * s, 0, Math.PI * 2); g.fill(); }
  }
  // prairie
  const grass = g.createLinearGradient(0, 270, 0, H);
  grass.addColorStop(0, '#8cc46e'); grass.addColorStop(1, '#5e9e48');
  g.fillStyle = grass; g.fillRect(0, 270, W, H - 270);
  // fleurs
  const cols = ['#fff', '#ffd84d', '#f59ac0', '#c9a3ff'];
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5) % W, y = 290 + ((i * 71) % 240);
    g.fillStyle = cols[i % 4];
    g.beginPath(); g.arc(x, y, 2.5 + (i % 3), 0, Math.PI * 2); g.fill();
  }
  // ruches
  for (const [x, y] of [[150, 300], [480, 292], [810, 300]]) {
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(x, y + 4, 50, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6b4a2f'; g.fillRect(x - 36, y - 10, 8, 14); g.fillRect(x + 28, y - 10, 8, 14);
    const box = ['#f4d06f', '#f7e0a0', '#efc65a'];
    for (let k = 0; k < 3; k++) {
      g.fillStyle = box[k]; g.fillRect(x - 40, y - 34 - k * 24, 80, 24);
      g.strokeStyle = 'rgba(120,80,30,0.45)'; g.lineWidth = 2; g.strokeRect(x - 40, y - 34 - k * 24, 80, 24);
    }
    g.fillStyle = '#a65a3a';
    g.beginPath(); g.moveTo(x - 50, y - 106); g.lineTo(x, y - 128); g.lineTo(x + 50, y - 106); g.closePath(); g.fill();
    g.fillStyle = '#3a2a1a'; g.fillRect(x - 14, y - 16, 28, 5);
  }
  api.text(g, 'RUCHES DE PAPA', 480, 150, { size: 15, color: '#6b4a2f', weight: 800 });
  return c;
}

export default {
  id: 'abeilles_levres',
  title: 'Les lèvres d’abeille',
  instructions: 'Récolte au verger… mais tu as oublié le voile ! Ramasse 5 pots de miel en esquivant les abeilles : chaque piqûre te gonfle les lèvres.',
  controls: '← → ↑ ↓ / souris (ou doigt) : déplacer Papa',
  duration: 13,
  introExpression: 'worried',
  successTitle: 'Miel récolté !',
  failTitle: 'Le Botox naturel !',
  successText: 'Cinq pots de miel et une bouche presque intacte. Les abeilles du verger te saluent, apiculteur !',
  failText: 'Trois piqûres : des lèvres de star de cinéma. Le Botox naturel, en direct du verger !',

  create(api) {
    const { W, H, rand, clamp } = api;
    if (!BG) BG = buildBg(api);
    const SIZE = 54, R = SIZE / 2;
    const XMIN = 70, XMAX = 890, YMIN = 335, YMAX = 510;
    const SPEED = 300;
    const GOAL = 5, MAX_STINGS = 3;
    const HIVES = [{ x: 150, y: 200 }, { x: 480, y: 190 }, { x: 810, y: 200 }];

    const s = {
      t: 0, x: 480, y: 490, vx: 0, moving: false, mode: 'keys', lpx: null, lpy: null,
      jars: [], got: 0, stings: 0, hurtT: 0, invT: 1.0, happyT: 0, msg: '', msgT: 0, jarDelay: 0,
      bees: [],
    };

    const lissa = (b, T) => {
      const a = b.w * T + b.p;
      return { x: b.cx + b.ax * Math.sin(a), y: b.cy + b.ay * Math.sin(2 * a) };
    };
    const mkBee = (i, homing = false) => ({
      cx: 170 + (i % 5) * 155 + rand(-30, 30), cy: rand(215, 350), ax: rand(90, 170), ay: rand(35, 75),
      w: rand(1.0, 1.6) * (i % 2 ? -1 : 1), p: rand(0, 6.28), x: HIVES[i % 3].x, y: HIVES[i % 3].y,
      state: homing ? 'wait' : 'fly', blend: homing ? 0 : 1, rest: 0, hive: HIVES[i % 3], homing, flap: rand(0, 6),
    });
    for (let i = 0; i < 5; i++) {
      const b = mkBee(i);
      const p = lissa(b, 0); b.x = p.x; b.y = p.y;
      s.bees.push(b);
    }
    s.bees.push(mkBee(5, true)); // l'abeille curieuse qui te suit (à partir de 3 s)

    const headPos = () => ({ x: s.x, y: s.y - 4.95 * R });
    const torsoPos = () => ({ x: s.x, y: s.y - 3 * R });

    function spawnJar() {
      let best = null;
      for (let k = 0; k < 25; k++) {
        const j = { x: rand(XMIN + 30, XMAX - 30), y: rand(YMIN + 15, YMAX - 5), bob: rand(0, 6) };
        const dP = Math.hypot(j.x - s.x, (j.y - s.y) * 1.3);
        const dJ = Math.min(999, ...s.jars.map((o) => Math.hypot(o.x - j.x, o.y - j.y)));
        if (dP > 220 && dJ > 160) { best = j; break; }
        best = j;
      }
      s.jars.push(best);
    }
    spawnJar(); spawnJar();

    function sting(b) {
      s.stings++;
      s.hurtT = 0.7;
      s.invT = 1.3;
      b.state = 'leave';
      api.sfx('ouch');
      api.shake(12);
      const h = headPos();
      api.burst(h.x, h.y + 0.47 * R, { n: 10, shape: 'star', color: ['#ffe14d', '#fff'], speed: 220, gravity: 150, size: 8 });
      s.msg = ['Bzzz… AÏE !', 'Ouille, les lèvres !', 'BOTOX !'][Math.min(2, s.stings - 1)];
      s.msgT = 1;
      if (s.stings >= MAX_STINGS) {
        api.end(false, 'Trois piqûres : des lèvres XXL dignes d’une star de cinéma. Le Botox naturel, en direct du verger !');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.hurtT = Math.max(0, s.hurtT - dt);
        s.invT = Math.max(0, s.invT - dt);
        s.happyT = Math.max(0, s.happyT - dt);
        s.msgT = Math.max(0, s.msgT - dt);

        // ── déplacement (clavier ou souris/doigt)
        let mx = 0, my = 0;
        if (!api.ended) {
          const ax = input.axis('x'), ay = input.axis('y');
          const p = input.pointer;
          if (ax || ay) s.mode = 'keys';
          else if (p.active && (p.down || p.x !== s.lpx || p.y !== s.lpy)) s.mode = 'mouse';
          s.lpx = p.x; s.lpy = p.y;
          if (ax || ay) { const n = Math.hypot(ax, ay); mx = ax / n; my = ay / n; }
          else if (s.mode === 'mouse' && p.active) {
            const tx = clamp(p.x, XMIN, XMAX), ty = clamp(p.y, YMIN, YMAX);
            const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
            if (d > 6) { mx = dx / d; my = dy / d; }
          }
        }
        const slow = s.hurtT > 0 ? 0.55 : 1;
        s.x = clamp(s.x + mx * SPEED * slow * dt, XMIN, XMAX);
        s.y = clamp(s.y + my * SPEED * 0.75 * slow * dt, YMIN, YMAX);
        s.moving = Math.abs(mx) + Math.abs(my) > 0.1;
        if (Math.abs(mx) > 0.1) s.vx = mx;

        // ── abeilles
        const h = headPos(), tor = torsoPos();
        for (const b of s.bees) {
          b.flap += dt * 40;
          if (b.state === 'wait') {
            if (s.t > 3 && !api.ended) { b.state = 'home'; b.x = b.hive.x; b.y = b.hive.y; }
            continue;
          }
          if (b.state === 'leave') {
            // elle repart tranquillement vers sa ruche (aucune abeille blessée !)
            const dx = b.hive.x - b.x, dy = b.hive.y - b.y, d = Math.hypot(dx, dy);
            if (d < 12) { b.state = 'rest'; b.rest = 2.2; }
            else { b.x += (dx / d) * 260 * dt; b.y += (dy / d) * 260 * dt; }
            continue;
          }
          if (b.state === 'rest') {
            b.rest -= dt;
            if (b.rest <= 0) { b.state = b.homing ? 'home' : 'fly'; b.blend = 0; }
            continue;
          }
          if (b.state === 'home') {
            // abeille curieuse : te suit lentement en zigzag
            const dx = h.x - b.x, dy = h.y - b.y, d = Math.max(1, Math.hypot(dx, dy));
            const sp = 72 + s.t * 3;
            b.x += ((dx / d) * sp + Math.cos(s.t * 7 + b.p) * 60) * dt;
            b.y += ((dy / d) * sp + Math.sin(s.t * 9 + b.p) * 50) * dt;
          } else {
            const p = lissa(b, s.t * (1 + s.t * 0.025));
            b.blend = Math.min(1, b.blend + dt * 1.2);
            b.x = b.blend < 1 ? b.x + (p.x - b.x) * Math.min(1, dt * 4) : p.x;
            b.y = b.blend < 1 ? b.y + (p.y - b.y) * Math.min(1, dt * 4) : p.y;
          }
          if (!api.ended && s.invT <= 0) {
            if (Math.hypot(b.x - h.x, b.y - h.y) < R * 1.05 || Math.hypot(b.x - tor.x, b.y - tor.y) < R * 0.95) sting(b);
          }
        }

        // ── pots de miel
        if (!api.ended) {
          for (let i = s.jars.length - 1; i >= 0; i--) {
            const j = s.jars[i];
            if (Math.abs(j.x - s.x) < 44 && Math.abs(j.y - s.y) < 34) {
              s.jars.splice(i, 1);
              s.got++;
              s.happyT = 0.6;
              api.sfx('catch');
              api.burst(j.x, j.y - 30, { n: 14, color: ['#ffc533', '#ffe08a', '#fff4c9'], speed: 200, gravity: 400, size: 5 });
              if (s.got >= GOAL) {
                api.end(true, s.stings === 0
                  ? 'Cinq pots de miel, zéro piqûre : même sans le voile, les abeilles n’ont rien pu faire. Respect, apiculteur !'
                  : `Cinq pots de miel… et ${s.stings === 1 ? 'une petite lèvre' : 'deux lèvres'} un peu gonflée${s.stings === 1 ? '' : 's'}. Le miel valait bien ça !`);
                break;
              }
              s.jarDelay = 0.25;
            }
          }
          if (s.jarDelay > 0) { s.jarDelay -= dt; if (s.jarDelay <= 0 && s.jars.length < 2 && s.got + s.jars.length < GOAL + 1) spawnJar(); }
          if (s.jars.length === 0 && s.jarDelay <= 0) spawnJar();
        }
      },
      timeout() {
        api.end(false, `Plus le temps : ${s.got} pot${s.got > 1 ? 's' : ''} sur ${GOAL}. Les abeilles gardent leur miel… et toi, tes lèvres gonflées !`);
        return false;
      },
      draw(g) {
        g.drawImage(BG, 0, 0);

        // calques triés en profondeur : pots + Papa
        const items = s.jars.map((j) => ({ y: j.y, j }));
        items.push({ y: s.y, papa: true });
        items.sort((a, b) => a.y - b.y);
        for (const it of items) {
          if (it.j) drawJar(g, it.j);
          else drawPapa(g);
        }

        // abeilles (toujours devant : elles volent)
        for (const b of s.bees) {
          if (b.state === 'wait' || b.state === 'rest') continue;
          drawBee(g, b);
        }

        // cible souris
        if (s.mode === 'mouse' && !api.ended && s.lpx != null) {
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
          g.beginPath(); g.ellipse(clamp(s.lpx, XMIN, XMAX), clamp(s.lpy, YMIN, YMAX), 16, 7, 0, 0, Math.PI * 2); g.stroke();
        }

        // HUD
        api.text(g, `Pots de miel : ${s.got} / ${GOAL}`, 30, 40, { size: 24, color: '#ffe08a', align: 'left', stroke: '#000a' });
        api.text(g, 'Piqûres :', 30, 76, { size: 20, color: '#fff', align: 'left', stroke: '#000a' });
        for (let i = 0; i < MAX_STINGS; i++) {
          g.fillStyle = i < s.stings ? '#ff5f8f' : 'rgba(255,255,255,0.35)';
          g.beginPath(); g.ellipse(140 + i * 30, 76, 11, 7, 0, 0, Math.PI * 2); g.fill();
        }
        if (s.msgT > 0) api.text(g, s.msg, clamp(s.x, 160, 800), s.y - 4.95 * R - 70, { size: 30, color: '#fff', stroke: '#a0522d' });
        if (api.ended && s.stings >= MAX_STINGS) api.text(g, 'BOTOX NATUREL !', W / 2, 130, { size: 56, color: '#ff8fb3', stroke: '#7a2140', strokeWidth: 10 });
      },
    };

    function drawJar(g, j) {
      const y = j.y, x = j.x, b = Math.sin(s.t * 3 + j.bob) * 2;
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x, y, 20, 6, 0, 0, Math.PI * 2); g.fill();
      // halo doré
      g.fillStyle = 'rgba(255, 220, 110, 0.28)'; g.beginPath(); g.arc(x, y - 22 + b, 34, 0, Math.PI * 2); g.fill();
      api.roundRect(g, x - 17, y - 40 + b, 34, 38, 8); g.fillStyle = '#f2a91f'; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 12, y - 34 + b, 5, 24);
      g.fillStyle = '#fff6dc'; g.fillRect(x - 13, y - 27 + b, 26, 12);
      api.text(g, 'MIEL', x, y - 21 + b, { size: 9, color: '#a4610f', weight: 900 });
      g.fillStyle = '#d8442f'; g.fillRect(x - 19, y - 46 + b, 38, 8);
    }

    function drawBee(g, b) {
      const wing = Math.abs(Math.sin(b.flap)) * 7;
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath(); g.ellipse(b.x - 4, b.y - 8, 6, 3 + wing * 0.4, -0.5, 0, Math.PI * 2); g.ellipse(b.x + 4, b.y - 8, 6, 3 + wing * 0.4, 0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf26';
      g.beginPath(); g.ellipse(b.x, b.y, 11, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2b2018';
      g.fillRect(b.x - 3, b.y - 7.5, 3, 15); g.fillRect(b.x + 3, b.y - 7, 3, 14);
      g.beginPath(); g.arc(b.x - 10, b.y, 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(b.x + 11, b.y - 2); g.lineTo(b.x + 16, b.y); g.lineTo(b.x + 11, b.y + 2); g.fill();
    }

    function drawPapa(g) {
      const near = s.bees.some((b) => (b.state === 'fly' || b.state === 'home') && Math.hypot(b.x - s.x, b.y - (s.y - 4.95 * R)) < 95);
      const blink = s.invT > 0 && !api.ended && Math.floor(s.t * 14) % 2 === 0;
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(s.x, s.y, 34, 9, 0, 0, Math.PI * 2); g.fill();
      if (blink) g.globalAlpha = 0.55;
      const expression = api.ended ? (s.stings >= MAX_STINGS ? 'laugh' : 'happy')
        : s.hurtT > 0 ? 'ouch' : s.happyT > 0 ? 'happy' : near ? 'worried' : 'focus';
      const win = api.ended && s.stings < MAX_STINGS;
      const info = api.avatar(g, {
        x: s.x, y: s.y, size: SIZE, pose: win ? 'cheer' : s.moving && !api.ended ? 'run' : 'stand', t: s.t,
        expression, lookX: s.vx, sweat: near && !api.ended, tears: s.hurtT > 0.3,
      });
      g.globalAlpha = 1;
      const hx = info.hx, hy = info.hy, r = info.r;
      // chapeau d'apiculteur… voile relevé (c'est bien là le problème)
      g.fillStyle = '#efe3b8';
      g.beginPath(); g.arc(hx, hy - 0.55 * r, 0.78 * r, Math.PI, 0); g.fill();
      g.fillStyle = '#e4d39a';
      g.beginPath(); g.ellipse(hx, hy - 0.55 * r, 1.5 * r, 0.26 * r, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9b8a6a'; g.fillRect(hx - 0.78 * r, hy - 0.78 * r, 1.56 * r, 0.16 * r);
      // le voile roulé sur le dessus
      g.fillStyle = '#c9cfd4';
      api.roundRect(g, hx - 0.7 * r, hy - 1.5 * r, 1.4 * r, 0.32 * r, 0.16 * r); g.fill();
      g.strokeStyle = 'rgba(90,100,110,0.6)'; g.lineWidth = 1;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(hx + k * 0.18 * r, hy - 1.5 * r); g.lineTo(hx + k * 0.18 * r + 0.1 * r, hy - 1.18 * r); g.stroke(); }
      // les lèvres qui gonflent
      if (s.stings > 0) drawLips(g, hx, hy + 0.5 * r, r, s.stings);
    }

    function drawLips(g, x, y, r, n) {
      const k = Math.min(3, n) * (1 + Math.sin(s.t * 9) * 0.03);
      const w = r * (0.3 + 0.2 * k), hu = r * (0.08 + 0.07 * k), hl = r * (0.1 + 0.09 * k);
      g.fillStyle = '#ff6f9c';
      g.strokeStyle = '#b8325f'; g.lineWidth = 1.5;
      // lèvre du haut (deux bosses) puis du bas
      g.beginPath(); g.ellipse(x - w * 0.42, y - hu * 0.55, w * 0.55, hu, 0.08, 0, Math.PI * 2); g.ellipse(x + w * 0.42, y - hu * 0.55, w * 0.55, hu, -0.08, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(x, y + hl * 0.75, w * 0.95, hl, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.ellipse(x - w * 0.3, y + hl * 0.45, w * 0.25, hl * 0.25, 0, 0, Math.PI * 2); g.fill();
    }
  },
};

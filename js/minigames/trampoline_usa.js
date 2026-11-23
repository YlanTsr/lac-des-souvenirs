/**
 * « Le trampoline américain » (trampoline_usa)
 * Aux États-Unis, dans sa famille d'accueil, dès que Papa faisait du trampoline,
 * le fils de la famille venait lui sauter dessus. Papa a appris à fuir en le voyant arriver.
 * Mécanique : Papa rebondit tout seul (1 point par rebond). Le fils surgit sans prévenir :
 * seul indice, la porte claque (« BAM ! » + bruit, ~0,18 s), puis il fonce et saute aussitôt
 * (~0,9 s en tout). Appuyer pour sauter hors du trampoline ; Papa remonte tout seul quand
 * la voie est libre. Sauter pour rien fait perdre du temps. Fausse alerte : il regarde par la fenêtre.
 * Écrasé 2 fois = raté ; 12 rebonds = gagné.
 */

export default {
  id: 'trampoline_usa',
  title: 'Le trampoline américain',
  instructions: 'Rebondis 12 fois sur le trampoline… et au moindre « BAM ! » de la porte, saute dehors avant que le fils de la famille d’accueil ne t’atterrisse dessus !',
  controls: 'Espace / clic / tap : sauter hors du trampoline',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Champion du trampoline !',
  failTitle: 'Aplati comme une crêpe !',
  successText: 'Douze rebonds et pas une seule crêpe : tu avais compris le truc. Le rêve américain !',
  failText: 'Écrasé deux fois, aplati comme un pancake… Bienvenue aux États-Unis !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const TX = 420, MAT_Y = 428;            // centre du trampoline
    const GRASS_X = 210, GRASS_Y = 500;     // où Papa se réfugie
    const DOOR = { x: 772, y: 418 };
    const RUN_TO = { x: 600, y: 478 };
    const GOAL = 12, MAX_CRUSH = 2;
    const PERIOD = 0.5, BOUNCE_H = 105;
    // durées de l'attaque (divisées par la vitesse) : claquement de porte → course → saut
    const BANG_T = 0.18, RUN_T = 0.38, LEAP_T = 0.38;
    const SON_FAR = 0.62;                    // échelle du fils au loin (porte)

    // programme des apparitions du fils : 3 vraies attaques à intervalles imprévisibles ;
    // une fausse alerte (tête à la fenêtre, sans bruit) possible avant la dernière
    const events = [];
    let tt = rand(1.0, 2.0);
    for (let i = 0; i < 3; i++) {
      events.push({ at: tt, type: 'attack', speed: 1 + i * 0.12 });
      tt += rand(2.7, 3.7);
      if (i === 1 && Math.random() < 0.75) { events.push({ at: tt, type: 'feint' }); tt += 1.2; }
    }
    events.sort((a, b) => a.at - b.at);

    const s = {
      t: 0, bounces: 0, crushed: 0, ph: 0,
      papa: 'bounce', pk: 0, offT: 0, flatT: 0,
      son: 'hidden', sk: 0, sx: DOOR.x, sy: DOOR.y, speed: 1, ev: 0, alertT: 0, doorOpen: 0,
      matDip: 0, boingT: 0, msg: '', msgT: 0, events,
    };

    // ── le fils de la famille : grand gaillard tout rond, dessiné à la main (pieds en 0,0, ~215 px de haut à l'échelle 1)
    const SKIN = '#f1c8a8', SHIRT = '#d0453a', SHORTS = '#2c4f8a', HAIR = '#e2bd5c', CAP = '#2a5fae';
    function sonHead(g, expr, t) {
      // tête : centre (0, -182), rayon 36
      g.fillStyle = SKIN; g.beginPath(); g.arc(0, -182, 36, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(-35, -180, 8, 0, Math.PI * 2); g.arc(35, -180, 8, 0, Math.PI * 2); g.fill();   // oreilles
      // cheveux blonds + casquette à l'envers
      g.fillStyle = HAIR; g.beginPath(); g.arc(0, -188, 36, Math.PI * 1.05, Math.PI * 1.95); g.fill();
      g.fillStyle = CAP; g.beginPath(); g.arc(0, -194, 33, Math.PI, Math.PI * 2); g.fill();
      g.fillRect(-46, -198, 22, 9);                         // visière (derrière)
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -224, 4, 0, Math.PI * 2); g.fill();
      // joues
      g.fillStyle = 'rgba(232,110,110,0.45)';
      g.beginPath(); g.ellipse(-20, -170, 8, 5, 0, 0, Math.PI * 2); g.ellipse(20, -170, 8, 5, 0, 0, Math.PI * 2); g.fill();
      // yeux
      g.fillStyle = '#2a2320';
      if (expr === 'laugh') {
        g.strokeStyle = '#2a2320'; g.lineWidth = 3.5; g.lineCap = 'round';
        for (const ex of [-13, 13]) { g.beginPath(); g.arc(ex, -183, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      } else {
        for (const ex of [-13, 13]) { g.beginPath(); g.arc(ex, -185, 4, 0, Math.PI * 2); g.fill(); }
      }
      // bouche
      if (expr === 'laugh') {
        const o = 1 + Math.sin(t * 18) * 0.15;
        g.fillStyle = '#7a2a26'; g.beginPath(); g.moveTo(-15, -168); g.quadraticCurveTo(0, -168 + 26 * o, 15, -168); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.fillRect(-9, -168, 18, 4);
      } else {
        g.strokeStyle = '#7a2a26'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.arc(0, -172, 10, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
      }
    }
    function drawSon(g, x, y, k, o) {
      const t = o.t, pose = o.pose;
      g.save();
      g.translate(x, y);
      g.scale((o.flip ? -1 : 1) * k * (1 + (o.squash || 0) * 0.22), k * (1 - (o.squash || 0) * 0.28));
      g.lineCap = 'round';
      // ombre
      g.fillStyle = 'rgba(30,60,20,0.25)'; g.beginPath(); g.ellipse(0, 2, 62, 10, 0, 0, Math.PI * 2); g.fill();
      // jambes (courtes et costaudes)
      const sw = pose === 'run' ? Math.sin(t * 16) : 0;
      const tuck = pose === 'jump' ? 1 : 0;
      g.strokeStyle = SKIN; g.lineWidth = 24;
      const feet = [[-26 + sw * 24, -Math.max(0, -sw) * 16 - tuck * 18], [26 - sw * 24, -Math.max(0, sw) * 16 - tuck * 18]];
      for (const [i, [fx, fy]] of feet.entries()) { g.beginPath(); g.moveTo(i ? 24 : -24, -50); g.lineTo(fx, fy - 8); g.stroke(); }
      g.fillStyle = '#f4f4f4';
      for (const [fx, fy] of feet) { g.beginPath(); g.ellipse(fx + 6, fy - 4, 20, 10, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#d0453a'; for (const [fx, fy] of feet) g.fillRect(fx - 8, fy - 8, 26, 3);
      // short
      g.fillStyle = SHORTS; g.beginPath(); g.ellipse(0, -62, 60, 26, 0, 0, Math.PI * 2); g.fill();
      // bras (derrière le ventre quand ils pendent)
      const shY = -140, armL = pose === 'up' || pose === 'jump' ? [-88, -205] : pose === 'run' ? [-70 - sw * 20, -95 + sw * 18] : [-72, -92];
      const armR = pose === 'up' || pose === 'jump' ? [88, -205] : pose === 'run' ? [70 - sw * 20, -95 - sw * 18] : [72, -92];
      g.strokeStyle = SHIRT; g.lineWidth = 26;
      g.beginPath(); g.moveTo(-50, shY); g.lineTo(-62, shY + 6); g.stroke();
      g.beginPath(); g.moveTo(50, shY); g.lineTo(62, shY + 6); g.stroke();
      g.strokeStyle = SKIN; g.lineWidth = 20;
      for (const [ax, ay] of [armL, armR]) { const sx = ax < 0 ? -56 : 56; g.beginPath(); g.moveTo(sx, shY + 4); g.lineTo(ax, ay); g.stroke(); }
      g.fillStyle = SKIN; for (const [ax, ay] of [armL, armR]) { g.beginPath(); g.arc(ax, ay, 13, 0, Math.PI * 2); g.fill(); }
      // gros ventre rond en t-shirt
      g.fillStyle = SHIRT; g.beginPath(); g.ellipse(0, -104, 66, 60, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(-22, -122, 20, 28, -0.4, 0, Math.PI * 2); g.fill();
      // étoile blanche sur le t-shirt
      g.fillStyle = '#fff'; g.beginPath();
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? 7 : 17, a = -Math.PI / 2 + (i / 10) * Math.PI * 2; i ? g.lineTo(Math.cos(a) * rr, -100 + Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, -100 + Math.sin(a) * rr); }
      g.fill();
      // cou + tête
      g.fillStyle = SKIN; g.fillRect(-14, -160, 28, 14);
      sonHead(g, o.expr, t);
      g.restore();
    }
    function matDipPx() { return s.matDip * 48; }

    // ── décor pré-rendu : jardin américain ──
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      const sky = b.createLinearGradient(0, 0, 0, 380);
      sky.addColorStop(0, '#5fa8e8'); sky.addColorStop(1, '#cfe9fb');
      b.fillStyle = sky; b.fillRect(0, 0, W, H);
      b.fillStyle = 'rgba(255,255,255,0.9)';
      for (const [cx, cy] of [[300, 90], [560, 60]]) { b.beginPath(); b.arc(cx, cy, 24, 0, Math.PI * 2); b.arc(cx + 28, cy - 10, 30, 0, Math.PI * 2); b.arc(cx + 58, cy, 22, 0, Math.PI * 2); b.fill(); }
      // maison blanche
      b.fillStyle = '#6c7480'; b.beginPath(); b.moveTo(620, 200); b.lineTo(780, 110); b.lineTo(950, 200); b.fill();
      b.fillStyle = '#f7f5ef'; b.fillRect(635, 200, 305, 222);
      b.strokeStyle = '#dcd8cc'; b.lineWidth = 2;
      for (let y = 212; y < 420; y += 14) { b.beginPath(); b.moveTo(635, y); b.lineTo(940, y); b.stroke(); }
      for (const [wx, wy] of [[660, 230], [850, 230], [660, 320], [850, 320]]) {
        b.fillStyle = '#9fd0f0'; b.fillRect(wx, wy, 50, 56);
        b.strokeStyle = '#fff'; b.lineWidth = 4; b.strokeRect(wx, wy, 50, 56);
        b.beginPath(); b.moveTo(wx + 25, wy); b.lineTo(wx + 25, wy + 56); b.moveTo(wx, wy + 28); b.lineTo(wx + 50, wy + 28); b.stroke();
        b.fillStyle = '#2f4f7a'; b.fillRect(wx - 14, wy, 12, 56); b.fillRect(wx + 52, wy, 12, 56);
      }
      // porche + porte
      b.fillStyle = '#8a6a4a'; b.fillRect(728, 410, 90, 12);
      b.fillStyle = '#3a2a22'; b.fillRect(DOOR.x - 30, 300, 60, 112);
      b.fillStyle = '#efe9da'; for (const cx of [722, 822]) b.fillRect(cx - 5, 260, 10, 152);
      b.fillStyle = '#6c7480'; b.fillRect(708, 252, 128, 12);
      // drapeau américain
      b.fillStyle = '#b8bec6'; b.fillRect(78, 120, 6, 300);
      b.fillStyle = '#ffd34d'; b.beginPath(); b.arc(81, 118, 6, 0, Math.PI * 2); b.fill();
      for (let i = 0; i < 13; i++) {
        b.fillStyle = i % 2 ? '#ffffff' : '#c8202f';
        b.beginPath();
        for (let x = 0; x <= 150; x += 10) { const y = 128 + i * 7 + Math.sin(x * 0.04) * 6; x ? b.lineTo(84 + x, y) : b.moveTo(84 + x, y); }
        for (let x = 150; x >= 0; x -= 10) b.lineTo(84 + x, 128 + (i + 1) * 7 + Math.sin(x * 0.04) * 6);
        b.fill();
      }
      b.fillStyle = '#23306b';
      b.beginPath(); for (let x = 0; x <= 64; x += 8) b.lineTo(84 + x, 128 + Math.sin(x * 0.04) * 6); for (let x = 64; x >= 0; x -= 8) b.lineTo(84 + x, 177 + Math.sin(x * 0.04) * 6); b.fill();
      b.fillStyle = '#fff';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const x = 90 + c * 10 + (r % 2) * 4; b.beginPath(); b.arc(x, 134 + r * 9 + Math.sin((x - 84) * 0.04) * 6, 1.6, 0, Math.PI * 2); b.fill(); }
      // pelouse + barrière blanche
      b.fillStyle = '#6fbf5a'; b.fillRect(0, 380, W, H - 380);
      b.fillStyle = '#5eab4b'; for (let i = 0; i < 40; i++) b.fillRect((i * 97) % W, 400 + ((i * 53) % 130), 22, 4);
      b.fillStyle = '#ffffff';
      for (let x = 0; x < 630; x += 22) { b.beginPath(); b.moveTo(x, 395); b.lineTo(x + 7, 382); b.lineTo(x + 14, 395); b.lineTo(x + 14, 420); b.lineTo(x, 420); b.fill(); }
      b.fillRect(0, 396, 630, 5); b.fillRect(0, 410, 630, 5);
    }

    function startEvent(e) {
      s.son = e.type === 'attack' ? 'bang' : 'peek';
      s.sk = 0; s.alertT = 0; s.sx = DOOR.x; s.sy = DOOR.y; s.speed = e.speed || 1;
      if (e.type === 'attack') { api.sfx('clang'); api.shake(4); s.doorOpen = 1; }
    }
    function sonLands() {
      s.matDip = 1; s.boingT = 0.8;
      api.sfx('boing'); api.sfx('boing'); api.shake(20);
      api.burst(TX + 10, MAT_Y + 10, { n: 10, color: ['#ffffff', '#cfe9fb'], speed: 260, gravity: 400, size: 6 });
      const onMat = s.papa === 'bounce' || s.papa === 'climb' || (s.papa === 'jumpoff' && s.pk < 0.35);
      if (onMat && !api.ended) {
        s.papa = 'flat'; s.flatT = 0; s.crushed++;
        api.sfx('splat'); api.shake(18);
        api.burst(TX, MAT_Y - 20, { n: 14, shape: 'star', color: ['#ffe14d', '#ffffff'], speed: 220, gravity: 250, size: 9 });
        s.msg = 'SPLAF !'; s.msgT = 0.9;
        if (s.crushed >= MAX_CRUSH) api.end(false, 'Écrasé deux fois, aplati comme un pancake… Bienvenue aux États-Unis !');
      } else if (!api.ended) {
        s.msg = 'Raté, il ne t’a pas eu !'; s.msgT = 0.9;
        api.sfx('catch');
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.matDip = Math.max(0, s.matDip - dt * 2.2);
        s.boingT = Math.max(0, s.boingT - dt);
        if (s.son === 'hidden') s.doorOpen = Math.max(0, s.doorOpen - dt * 3);

        // ── le fils
        if (!api.ended && s.son === 'hidden' && s.ev < events.length && s.t >= events[s.ev].at) startEvent(events[s.ev++]);
        s.sk += dt; s.alertT += dt;
        switch (s.son) {
          case 'peek': if (s.sk > 1.0) { s.son = 'hidden'; } break;
          case 'bang': if (s.sk > BANG_T / s.speed) { s.son = 'run'; s.sk = 0; } break;
          case 'run': {
            const k = clamp(s.sk / (RUN_T / s.speed), 0, 1);
            s.sx = DOOR.x + (RUN_TO.x - DOOR.x) * k; s.sy = DOOR.y + (RUN_TO.y - DOOR.y) * k;
            if (k >= 1) { s.son = 'leap'; s.sk = 0; api.sfx('whoosh'); }
            break;
          }
          case 'leap': {
            const k = clamp(s.sk / (LEAP_T / s.speed), 0, 1);
            s.sx = RUN_TO.x + (TX + 10 - RUN_TO.x) * k; s.sy = RUN_TO.y + (MAT_Y - RUN_TO.y) * k - Math.sin(k * Math.PI) * 130;
            if (k >= 1) { s.son = 'onmat'; s.sk = 0; sonLands(); }
            break;
          }
          case 'onmat': {
            // il s'enfonce d'abord dans la toile, puis rebondit
            const k = clamp(s.sk / 0.55, 0, 1);
            s.sx = TX + 10;
            s.sy = k < 0.3 ? MAT_Y + matDipPx() * 0.8 : MAT_Y - Math.sin((k - 0.3) / 0.7 * Math.PI) * 70;
            if (s.sk > 0.55) { s.son = 'hopoff'; s.sk = 0; }
            break;
          }
          case 'hopoff': {
            const k = clamp(s.sk / 0.35, 0, 1);
            s.sx = TX + 10 + (RUN_TO.x + 30 - TX - 10) * k; s.sy = MAT_Y + (RUN_TO.y - MAT_Y) * k - Math.sin(k * Math.PI) * 70;
            if (k >= 1) { s.son = 'leave'; s.sk = 0; }
            break;
          }
          case 'leave': {
            const k = clamp(s.sk / 0.6, 0, 1);
            s.sx = RUN_TO.x + 30 + (DOOR.x - RUN_TO.x - 30) * k; s.sy = RUN_TO.y + (DOOR.y - RUN_TO.y) * k;
            if (k >= 1) s.son = 'hidden';
            break;
          }
        }
        const danger = s.son === 'bang' || s.son === 'run' || s.son === 'leap' || s.son === 'onmat';

        // ── Papa
        if (s.papa === 'bounce') {
          s.ph += dt / PERIOD;
          if (s.ph >= 1) {
            s.ph -= 1;
            if (!api.ended) {
              s.bounces++;
              api.sfx('boing');
              if (s.bounces >= GOAL) api.end(true, s.crushed === 0
                ? 'Douze rebonds et pas une seule crêpe : tu avais compris le truc. Le rêve américain !'
                : 'Douze rebonds ! Un peu aplati au passage, mais toujours debout. Le rêve américain !');
            }
          }
          if (!api.ended && input.pressed()) { s.papa = 'jumpoff'; s.pk = 0; s.jy0 = MAT_Y - Math.sin(s.ph * Math.PI) * BOUNCE_H; api.sfx('whoosh'); }
        } else if (s.papa === 'jumpoff') {
          s.pk += dt / 0.35;
          if (s.pk >= 1) { s.papa = 'off'; s.offT = 0; }
        } else if (s.papa === 'off') {
          s.offT += dt;
          if (!danger && s.offT > 0.3 && !api.ended) { s.papa = 'climb'; s.pk = 0; }
        } else if (s.papa === 'climb') {
          s.pk += dt / 0.3;
          if (s.pk >= 1) { s.papa = 'bounce'; s.ph = 0; }
        } else if (s.papa === 'flat') {
          s.flatT += dt;
          if (s.flatT > 1.3 && s.son !== 'onmat' && !api.ended) { s.papa = 'bounce'; s.ph = 0; api.sfx('pop'); }
        }
      },
      timeout() {
        api.end(false, `${s.bounces} rebonds sur ${GOAL}… Tu as passé plus de temps dans l’herbe que dans les airs !`);
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        const danger = s.son === 'bang' || s.son === 'run' || s.son === 'leap';

        // la porte qui s'ouvre à la volée
        if (s.doorOpen > 0) {
          const o = s.doorOpen;
          g.fillStyle = '#17110d'; g.fillRect(DOOR.x - 30, 300, 60, 112);
          g.fillStyle = '#5a3f30';
          g.beginPath(); g.moveTo(DOOR.x - 30, 300); g.lineTo(DOOR.x - 30 - 26 * o, 292); g.lineTo(DOOR.x - 30 - 26 * o, 420); g.lineTo(DOOR.x - 30, 412); g.fill();
          g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(DOOR.x - 30 - 20 * o, 360, 3, 0, Math.PI * 2); g.fill();
        }
        // le claquement : seul indice, très bref
        if (s.son === 'bang' || (s.son === 'run' && s.sk < 0.1)) {
          g.strokeStyle = '#ffe14d'; g.lineWidth = 5; g.lineCap = 'round';
          for (let i = 0; i < 7; i++) {
            const a = Math.PI * (1.05 + i * 0.15), r0 = 70, r1 = 98;
            g.beginPath(); g.moveTo(DOOR.x + Math.cos(a) * r0, 356 + Math.sin(a) * r0); g.lineTo(DOOR.x + Math.cos(a) * r1, 356 + Math.sin(a) * r1); g.stroke();
          }
          api.text(g, 'BAM !', DOOR.x - 20, 262, { size: 34, color: '#fff', stroke: '#a0302a' });
          g.fillStyle = '#e8453c'; g.beginPath(); g.arc(DOOR.x + 44, 252, 15, 0, Math.PI * 2); g.fill();
          api.text(g, '!', DOOR.x + 44, 253, { size: 24, color: '#fff', weight: 900 });
        }
        // fausse alerte : sa tête apparaît à la fenêtre, sans un bruit
        if (s.son === 'peek') {
          const up = Math.sin(clamp(s.sk / 1.0, 0, 1) * Math.PI);
          g.save(); g.beginPath(); g.rect(852, 232, 46, 52); g.clip();
          g.translate(875, 375 - up * 34); g.scale(0.42, 0.42);
          sonHead(g, 'smile', s.t);
          g.restore();
          g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(850, 230, 50, 56);
        }

        // trampoline (s'enfonce très fort sous le fils)
        const dip = matDipPx() + (s.papa === 'bounce' && s.ph < 0.12 ? (0.12 - s.ph) * 120 : 0);
        g.strokeStyle = '#3a3f4a'; g.lineWidth = 7;
        for (const lx of [-110, -40, 40, 110]) { g.beginPath(); g.moveTo(TX + lx, MAT_Y + 6); g.lineTo(TX + lx * 1.05, MAT_Y + 62); g.stroke(); }
        g.fillStyle = 'rgba(40,80,30,0.35)'; g.beginPath(); g.ellipse(TX, MAT_Y + 64, 140, 14, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2f7fd0'; g.beginPath(); g.ellipse(TX, MAT_Y, 140, 28, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1f232b';
        g.beginPath(); g.moveTo(TX - 118, MAT_Y); g.quadraticCurveTo(TX, MAT_Y - 22 + dip * 1.6, TX + 118, MAT_Y); g.quadraticCurveTo(TX, MAT_Y + 22 + dip * 2, TX - 118, MAT_Y); g.fill();

        // le fils en action (dessiné après Papa pour qu'il lui retombe dessus)
        const drawSonNow = () => {
          if (!['run', 'leap', 'onmat', 'hopoff', 'leave'].includes(s.son)) return;
          let k = 1;
          if (s.son === 'run') k = SON_FAR + (1 - SON_FAR) * clamp(s.sk / (RUN_T / s.speed), 0, 1);
          else if (s.son === 'leave') k = 1 - (1 - SON_FAR) * clamp(s.sk / 0.6, 0, 1);
          const squash = s.son === 'onmat' ? Math.max(0, 1 - s.sk / 0.18) : 0;
          const sitOnPapa = s.son === 'onmat' && s.papa === 'flat';
          drawSon(g, s.sx, s.sy + (sitOnPapa ? -6 : 0), k, {
            t: s.t, flip: s.son === 'leave' || s.son === 'hopoff', squash,
            expr: s.son === 'leave' ? 'smile' : 'laugh',
            pose: s.son === 'run' || s.son === 'leave' ? 'run' : s.son === 'leap' ? 'jump' : 'up',
          });
          if (s.son === 'leap') api.text(g, 'YAAAH !', s.sx, s.sy - 240 * k, { size: 30, color: '#fff', stroke: '#a0302a' });
        };

        // Papa
        let px = TX - 20, py = MAT_Y, pose = 'stand', expr = 'happy';
        if (s.papa === 'bounce') {
          py = MAT_Y - Math.sin(s.ph * Math.PI) * BOUNCE_H;
          pose = s.ph > 0.25 && s.ph < 0.75 ? 'cheer' : 'stand';
          expr = danger ? 'panic' : s.son === 'peek' ? 'worried' : 'laugh';
        } else if (s.papa === 'jumpoff') {
          const k = clamp(s.pk, 0, 1);
          px = TX - 20 + (GRASS_X - TX + 20) * k; py = s.jy0 + (GRASS_Y - s.jy0) * k - Math.sin(k * Math.PI) * 70;
          pose = 'run'; expr = 'surprised';
        } else if (s.papa === 'off') {
          px = GRASS_X; py = GRASS_Y; expr = s.son === 'onmat' ? 'laugh' : 'smile';
        } else if (s.papa === 'climb') {
          const k = clamp(s.pk, 0, 1);
          px = GRASS_X + (TX - 20 - GRASS_X) * k; py = GRASS_Y + (MAT_Y - GRASS_Y) * k - Math.sin(k * Math.PI) * 60;
          pose = 'run';
        }
        if (s.papa === 'flat') {
          // la crêpe cartoon
          g.save(); g.translate(TX - 20, MAT_Y + 4 + matDipPx() * 0.8); g.scale(1.6, 0.28);
          api.avatar(g, { x: 0, y: 0, size: 64, expression: 'ouch', pose: 'stand' });
          g.restore();
          for (let i = 0; i < 3; i++) {
            const an = s.t * 6 + i * 2.1, x = TX - 20 + Math.cos(an) * 46, y = MAT_Y - 30 + Math.sin(an) * 8;
            g.fillStyle = '#ffe14d'; g.beginPath();
            for (let k = 0; k < 10; k++) { const rr = k % 2 ? 3 : 7, a = (k / 10) * Math.PI * 2; k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
            g.fill();
          }
        } else {
          api.avatar(g, { x: px, y: py, size: 64, pose, expression: api.ended && s.bounces >= GOAL ? 'laugh' : expr, t: s.t, sweat: danger && s.papa === 'bounce', lookX: 0.6 });
        }
        drawSonNow();
        if (s.boingT > 0) {
          const k = s.boingT / 0.8, sz = 46 + (1 - k) * 22;
          g.save(); g.globalAlpha = Math.min(1, k * 2);
          api.text(g, 'BOING !', TX + 10, 250 - (1 - k) * 40, { size: sz, color: '#ffe14d', stroke: '#2f4f7a' });
          g.restore();
        }

        // HUD
        api.text(g, `Rebonds : ${s.bounces} / ${GOAL}`, 250, 40, { size: 28, align: 'left', color: '#fff', stroke: '#000a' });
        api.text(g, 'Écrasé :', 250, 76, { size: 20, align: 'left', color: '#fff', stroke: '#000a', strokeWidth: 4 });
        for (let i = 0; i < MAX_CRUSH; i++) {
          g.fillStyle = i < s.crushed ? '#e8453c' : 'rgba(255,255,255,0.4)';
          g.beginPath(); g.ellipse(352 + i * 34, 76, 13, 6, 0, 0, Math.PI * 2); g.fill();
        }
        if (s.papa === 'bounce' && danger && !api.ended) api.text(g, 'Saute dehors !', TX, 190, { size: 34, color: '#fff', stroke: '#a0302a' });
        if (s.msgT > 0) api.text(g, s.msg, TX, 150 - (0.9 - s.msgT) * 30, { size: 34, color: '#fff7c2', stroke: '#2f4f7a' });
      },
    };
  },
};

/**
 * « Le trampoline américain » (trampoline_usa)
 * Aux États-Unis, dans sa famille d'accueil, dès que Papa faisait du trampoline,
 * le fils de la famille venait lui sauter dessus. Papa a appris à fuir en le voyant arriver.
 * Mécanique : Papa rebondit tout seul (1 point par rebond). Quand le « ! » apparaît
 * à la porte, appuyer pour sauter hors du trampoline ; Papa remonte tout seul quand la voie
 * est libre. Sauter pour rien fait perdre du temps (et parfois le fils sort juste… voir).
 * Écrasé 2 fois = raté ; 12 rebonds = gagné.
 */
import { drawPerson, PEOPLE } from './people.js';

export default {
  id: 'trampoline_usa',
  title: 'Le trampoline américain',
  instructions: 'Rebondis 12 fois sur le trampoline… et dès que tu vois le « ! », saute dehors avant que le fils de la famille d’accueil ne t’atterrisse dessus !',
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
    const son = { ...PEOPLE.passant, hair: 'short', hairColor: '#d8b45a', skin: '#f1c8a8', shirt: '#c0392b', pants: '#2c3e6b', big: true, kind: 'adult' };

    // programme des apparitions du fils : 3 vraies attaques ; une fausse alerte possible avant la dernière
    // (une attaque occupe ~3,1 s : porte → course → saut → rebond → retour)
    const events = [];
    let tt = rand(1.2, 1.5);
    for (let i = 0; i < 3; i++) {
      events.push({ at: tt, type: 'attack', speed: 1 + i * 0.3 });
      tt += 3.2 + rand(0, 0.3);
      if (i === 1 && Math.random() < 0.75) { events.push({ at: tt, type: 'feint' }); tt += 1.3; }
    }
    events.sort((a, b) => a.at - b.at);

    const s = {
      t: 0, bounces: 0, crushed: 0, ph: 0,
      papa: 'bounce', pk: 0, offT: 0, flatT: 0,
      son: 'hidden', sk: 0, sx: DOOR.x, sy: DOOR.y, speed: 1, ev: 0,
      matDip: 0, msg: '', msgT: 0, events,
    };

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
      s.son = e.type === 'attack' ? 'warn' : 'peek';
      s.sk = 0; s.sx = DOOR.x; s.sy = DOOR.y; s.speed = e.speed || 1;
      if (e.type === 'attack') api.sfx('beep');
    }
    function sonLands() {
      s.matDip = 1;
      api.sfx('boing'); api.shake(10);
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
        s.matDip = Math.max(0, s.matDip - dt * 3);

        // ── le fils
        if (!api.ended && s.son === 'hidden' && s.ev < events.length && s.t >= events[s.ev].at) startEvent(events[s.ev++]);
        s.sk += dt;
        switch (s.son) {
          case 'peek': if (s.sk > 1.0) { s.son = 'hidden'; } break;
          case 'warn': if (s.sk > 0.55 / s.speed) { s.son = 'run'; s.sk = 0; } break;
          case 'run': {
            const k = clamp(s.sk / (0.65 / s.speed), 0, 1);
            s.sx = DOOR.x + (RUN_TO.x - DOOR.x) * k; s.sy = DOOR.y + (RUN_TO.y - DOOR.y) * k;
            if (k >= 1) { s.son = 'leap'; s.sk = 0; api.sfx('whoosh'); }
            break;
          }
          case 'leap': {
            const k = clamp(s.sk / (0.45 / s.speed), 0, 1);
            s.sx = RUN_TO.x + (TX + 10 - RUN_TO.x) * k; s.sy = RUN_TO.y + (MAT_Y - RUN_TO.y) * k - Math.sin(k * Math.PI) * 150;
            if (k >= 1) { s.son = 'onmat'; s.sk = 0; sonLands(); }
            break;
          }
          case 'onmat': s.sx = TX + 10; s.sy = MAT_Y - Math.sin(clamp(s.sk / 0.5, 0, 1) * Math.PI) * 60; if (s.sk > 0.5) { s.son = 'hopoff'; s.sk = 0; } break;
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
        const danger = s.son === 'warn' || s.son === 'run' || s.son === 'leap' || s.son === 'onmat';

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
        const danger = s.son === 'warn' || s.son === 'run' || s.son === 'leap';

        // le fils à la porte (derrière la barrière du porche)
        if (s.son === 'peek' || s.son === 'warn') {
          drawPerson(g, { ...son, x: DOOR.x, y: DOOR.y, size: 50, t: s.t, expression: s.son === 'warn' ? 'laugh' : 'smile', pose: s.son === 'warn' ? 'arms_up' : 'stand' });
          if (s.son === 'warn') {
            const pulse = 1 + Math.sin(s.t * 20) * 0.08;
            g.fillStyle = '#e8453c'; g.beginPath(); g.arc(DOOR.x, 210, 30 * pulse, 0, Math.PI * 2); g.fill();
            api.text(g, '!', DOOR.x, 212, { size: 46 * pulse, color: '#fff', weight: 900 });
          }
        }

        // trampoline
        const dip = s.matDip * 16 + (s.papa === 'bounce' && s.ph < 0.12 ? (0.12 - s.ph) * 120 : 0);
        g.strokeStyle = '#3a3f4a'; g.lineWidth = 7;
        for (const lx of [-110, -40, 40, 110]) { g.beginPath(); g.moveTo(TX + lx, MAT_Y + 6); g.lineTo(TX + lx * 1.05, MAT_Y + 62); g.stroke(); }
        g.fillStyle = 'rgba(40,80,30,0.35)'; g.beginPath(); g.ellipse(TX, MAT_Y + 64, 140, 14, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2f7fd0'; g.beginPath(); g.ellipse(TX, MAT_Y, 140, 28, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1f232b';
        g.beginPath(); g.moveTo(TX - 118, MAT_Y); g.quadraticCurveTo(TX, MAT_Y - 22 + dip * 2.2, TX + 118, MAT_Y); g.quadraticCurveTo(TX, MAT_Y + 22 + dip, TX - 118, MAT_Y); g.fill();

        // le fils en action
        if (['run', 'leap', 'onmat', 'hopoff', 'leave'].includes(s.son)) {
          const sitOnPapa = s.son === 'onmat' && s.papa === 'flat';
          drawPerson(g, {
            ...son, x: s.sx, y: s.sy + (sitOnPapa ? -8 : 0), size: 50, t: s.t, flipX: s.son === 'leave',
            expression: s.son === 'leave' ? 'smile' : 'laugh',
            pose: s.son === 'run' || s.son === 'leave' ? 'run' : 'arms_up',
          });
          if (s.son === 'leap') api.text(g, 'YAAAH !', s.sx, s.sy - 210, { size: 26, color: '#fff', stroke: '#a0302a' });
        }

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
          g.save(); g.translate(TX - 20, MAT_Y + 4); g.scale(1.6, 0.28);
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

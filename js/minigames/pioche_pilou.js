/**
 * Chapitre I — « Le coup de pioche de Pilou » (pioche_pilou)
 * Pilou voulait récupérer la petite fleur cachée dans un bijou de Mami : un coup de pioche dans le bijou…
 * et un autre sur la tête de Papa. À eux deux, le bijou de Mami n'y a pas survécu.
 * Mécanique : pierres, éclats d'or et la fleur jaillissent du bijou brisé et glissent dans la cour ;
 * Papa court les ramasser (← → ou souris) en esquivant la pioche, annoncée par une ombre (préavis court,
 * Pilou anticipe la course de Papa, frappe parfois deux fois de suite ou feinte avant de bondir sur lui).
 * 8 morceaux = victoire ; 2 coups sur la tête = échec.
 */
import { drawPerson, PEOPLE } from './people.js';

const GROUND = 446;
const GOAL = 8;

/** Décor pré-rendu (cour de la maison en Côte d'Ivoire), une seule fois. */
let BG = null;
function background(W, H) {
  if (BG) return BG;
  const c = document.createElement('canvas');
  c.width = W * 2; c.height = H * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  // ciel chaud
  const sky = g.createLinearGradient(0, 0, 0, 330);
  sky.addColorStop(0, '#7cc3ea'); sky.addColorStop(1, '#ffe2a8');
  g.fillStyle = sky; g.fillRect(0, 0, W, 340);
  g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(150, 92, 40, 0, Math.PI * 2); g.fill();
  // cocotiers au loin
  for (const [x, h] of [[70, 210], [880, 230], [930, 180]]) {
    g.strokeStyle = '#7b5a3a'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, 335); g.quadraticCurveTo(x + 20, 335 - h / 2, x + 8, 335 - h); g.stroke();
    g.fillStyle = '#3f8a3e';
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.55;
      g.save(); g.translate(x + 8, 335 - h); g.rotate(a + Math.PI / 2);
      g.beginPath(); g.ellipse(0, -34, 9, 38, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  // maison : murs chaulés, toit de tôle, véranda
  g.fillStyle = '#f2e3c6'; g.fillRect(250, 170, 460, 180);
  g.fillStyle = '#e4cfa8'; g.fillRect(250, 300, 460, 50);
  g.fillStyle = '#9aa6ad';
  g.beginPath(); g.moveTo(225, 178); g.lineTo(480, 112); g.lineTo(735, 178); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(70, 80, 90, 0.35)'; g.lineWidth = 2;
  for (let x = 240; x < 730; x += 16) { g.beginPath(); g.moveTo(x, 178); g.lineTo(x, 178 - (1 - Math.abs(x - 480) / 255) * 66); g.stroke(); }
  g.fillStyle = '#c07a4a'; g.fillRect(225, 176, 510, 8);
  // porte et fenêtres à persiennes
  g.fillStyle = '#5d8fa8'; g.fillRect(450, 220, 60, 110);
  g.fillStyle = '#3f6f88'; for (let y = 228; y < 326; y += 10) g.fillRect(454, y, 52, 4);
  for (const x of [300, 590]) {
    g.fillStyle = '#5d8fa8'; g.fillRect(x, 215, 72, 60);
    g.fillStyle = '#3f6f88'; for (let y = 220; y < 272; y += 9) g.fillRect(x + 4, y, 64, 4);
  }
  // marche de la véranda
  g.fillStyle = '#d7c3a0'; g.fillRect(380, 330, 200, 20);
  // manguier à gauche
  g.fillStyle = '#6b4a2e'; g.fillRect(120, 250, 26, 100);
  g.fillStyle = '#2f7a3a';
  for (const [x, y, r] of [[133, 220, 70], [80, 250, 48], [190, 250, 50], [130, 170, 52]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#f2a33a';
  for (const [x, y] of [[100, 230], [160, 205], [180, 262], [120, 270], [145, 180]]) { g.beginPath(); g.ellipse(x, y, 7, 10, 0.3, 0, Math.PI * 2); g.fill(); }
  // bananier à droite
  g.fillStyle = '#6aa64a';
  for (let k = 0; k < 5; k++) {
    g.save(); g.translate(820, 300); g.rotate(-1.2 + k * 0.6);
    g.beginPath(); g.ellipse(0, -55, 16, 60, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  g.fillStyle = '#7c9a4a'; g.fillRect(812, 290, 14, 60);
  // sol de latérite
  const soil = g.createLinearGradient(0, 340, 0, H);
  soil.addColorStop(0, '#c9683a'); soil.addColorStop(1, '#a84f2a');
  g.fillStyle = soil; g.fillRect(0, 340, W, H - 340);
  g.fillStyle = 'rgba(255, 210, 160, 0.18)';
  for (let i = 0; i < 90; i++) { const x = (i * 97) % W, y = 350 + ((i * 53) % 185); g.beginPath(); g.ellipse(x, y, 6 + (i % 4) * 3, 2, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(90, 30, 10, 0.18)';
  for (let i = 0; i < 40; i++) { const x = (i * 151) % W, y = 360 + ((i * 71) % 170); g.beginPath(); g.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); g.fill(); }
  // natte, et le bijou de Mami fendu en deux par la pioche
  g.fillStyle = '#e8c77a'; g.fillRect(420, 336, 120, 14);
  g.strokeStyle = '#c9a556'; g.lineWidth = 2;
  for (let x = 424; x < 540; x += 8) { g.beginPath(); g.moveTo(x, 336); g.lineTo(x, 350); g.stroke(); }
  // la chaîne qui pend
  g.strokeStyle = '#d9b04a'; g.lineWidth = 2; g.setLineDash([3, 2]);
  g.beginPath(); g.moveTo(452, 330); g.bezierCurveTo(430, 346, 412, 338, 404, 348); g.stroke();
  g.beginPath(); g.moveTo(508, 330); g.bezierCurveTo(528, 344, 548, 336, 556, 347); g.stroke();
  g.setLineDash([]);
  for (const [cx, rot, dir] of [[466, -0.35, -1], [494, 0.35, 1]]) {
    const a0 = dir < 0 ? Math.PI / 2 : -Math.PI / 2, a1 = dir < 0 ? Math.PI * 1.5 : Math.PI / 2;
    g.save(); g.translate(cx, 330); g.rotate(rot);
    // demi-médaillon en or (bord dentelé côté cassure)
    g.fillStyle = '#c8902a';
    g.beginPath(); g.ellipse(0, 0, 15, 12, 0, a0, a1);
    for (let k = 0; k <= 4; k++) g.lineTo(-dir * (k % 2 ? 4 : 0), (dir < 0 ? -12 : 12) + (dir < 0 ? k : -k) * 6);
    g.closePath(); g.fill();
    g.fillStyle = '#f2c14e';
    g.beginPath(); g.ellipse(dir * 2, 0, 11, 8.5, 0, a0, a1); g.closePath(); g.fill();
    // une pierre encore sertie
    g.fillStyle = dir < 0 ? '#e0245e' : '#3f6fe0';
    g.beginPath(); g.arc(dir * 8, -1, 3.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(dir * 8 - 1, -2, 1.2, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // la fêlure dans la marche, souvenir du coup de pioche
  g.strokeStyle = 'rgba(90, 60, 30, 0.6)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(480, 342); g.lineTo(474, 347); g.lineTo(479, 350); g.moveTo(480, 342); g.lineTo(488, 349); g.stroke();
  BG = c;
  return c;
}

function star(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? r * 0.45 : r, a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath(); g.fill(); g.restore();
}

// ce qui jaillit du bijou : pierres précieuses, éclats d'or… et la petite fleur cachée à l'intérieur
const KINDS = [
  { kind: 'gem', c: '#e0245e' }, { kind: 'gold', c: '#f2c14e' }, { kind: 'flower', c: '#ff8ac2' },
  { kind: 'gem', c: '#3f6fe0' }, { kind: 'gem', c: '#2f9e6e' }, { kind: 'gold', c: '#f2c14e' },
  { kind: 'flower', c: '#ff8ac2' }, { kind: 'gem', c: '#9b4fd8' },
];

/** Un morceau du bijou (ou la fleur), centré sur (x, y). */
function drawPiece(g, m) {
  g.save(); g.translate(m.x, m.y); g.rotate(m.spin);
  if (m.kind === 'gem') {
    // pierre taillée
    g.fillStyle = m.c;
    g.beginPath(); g.moveTo(0, -10); g.lineTo(9, -3); g.lineTo(6, 8); g.lineTo(-6, 8); g.lineTo(-9, -3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.moveTo(0, -10); g.lineTo(9, -3); g.lineTo(0, 0); g.lineTo(-9, -3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(-3, -4, 2, 0, Math.PI * 2); g.fill();
  } else if (m.kind === 'gold') {
    // éclat d'or du médaillon
    g.fillStyle = '#c8902a';
    g.beginPath(); g.moveTo(-10, 6); g.lineTo(-3, -9); g.lineTo(4, -4); g.lineTo(10, -8); g.lineTo(8, 7); g.closePath(); g.fill();
    g.fillStyle = m.c;
    g.beginPath(); g.moveTo(-7, 4); g.lineTo(-2, -6); g.lineTo(4, -2); g.lineTo(7, 4); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(-1, -3, 4, 2);
  } else {
    // la petite fleur cachée dans le bijou
    g.fillStyle = '#4f9a3e'; g.fillRect(-1, 3, 2, 9);
    g.fillStyle = m.c;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.beginPath(); g.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 5, 3.4, a, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(0, 0, 3.6, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

export default {
  id: 'pioche_pilou',
  title: 'Le coup de pioche de Pilou',
  instructions: 'Pilou a cassé le bijou de Mami pour la fleur cachée dedans : ramasse 8 morceaux, et file dès que l’ombre de la pioche apparaît — il vise là où tu vas, et il triche !',
  controls: '← → / souris : courir',
  duration: 12,
  introExpression: 'worried',
  successTitle: 'Bijou ramassé, crâne intact !',
  failTitle: 'BONG !',
  successText: 'Huit morceaux du bijou dans ta poche, la petite fleur sauvée et pas une bosse. Reste à expliquer tout ça à Mami…',
  failText: 'Un coup de pioche sur la tête… Ça expliquerait certaines choses.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const bg = background(W, H);
    const s = {
      t: 0, px: 300, vx: 0, target: 300, lastPointerX: null, face: 1,
      got: 0, hits: 0, dizzy: 0, flash: 0,
      pieces: [], spawnT: 0.5, n: 0,
      // cycle de la pioche : wait → aim (ombre) → strike → rest
      phase: 'wait', phaseT: 0.8, tx: 600, pilouX: 760, pilouFrom: 760, side: 1, swing: 0,
      aimAge: 0, feint: false, double: false,
      msg: '', msgT: 0, pops: [],
    };
    // préavis de l'ombre (avant les 0,1 s du coup lui-même) : court, et de plus en plus court
    const warnTime = () => Math.max(0.3, 0.4 - s.t * 0.01);
    const STRIKE = 0.1;

    /** Pilou vise Papa… là où il sera au moment du coup (anticipation partielle). */
    function aimAt(lead) {
      const ahead = s.vx * (warnTime() + STRIKE) * lead;
      s.tx = clamp(s.px + ahead + rand(-18, 18), 70, W - 70);
      s.pilouFrom = s.pilouX;
      s.side = s.pilouX >= s.tx ? 1 : -1;
      if (s.tx + s.side * 56 > W - 30 || s.tx + s.side * 56 < 30) s.side = -s.side;
      s.aimAge = 0;
      api.sfx('whoosh');
    }

    function spawnPiece() {
      const tx = rand(70, 890);
      const flight = rand(0.65, 0.95);
      const k = KINDS[s.n++ % KINDS.length];
      s.pieces.push({
        x: 480, y: 322, vx: (tx - 480) / flight, vy: -380 + rand(-60, 40),
        rolling: false, life: 2.6, r: 9, kind: k.kind, c: k.c, spin: rand(0, 6),
      });
      // le bijou crache un éclat (et quelques pétales quand c'est la fleur)
      api.burst(480, 326, { n: 4, color: k.kind === 'flower' ? ['#ff8ac2', '#ffc0dc'] : ['#ffe9a0', '#ffffff'], speed: 120, gravity: 250, size: 3, angle: -Math.PI / 2, spread: 1.4 });
    }

    function impact() {
      const near = Math.abs(s.px - s.tx) < 48;
      api.burst(s.tx, GROUND - 4, { n: 10, color: ['#c9683a', '#a84f2a', '#e39a6a'], speed: 200, gravity: 700, size: 5, angle: -Math.PI / 2, spread: 2 });
      if (near && s.dizzy <= 0) {
        s.hits++;
        s.dizzy = 0.95;
        s.flash = 1;
        api.sfx('clang');
        api.sfx('ouch');
        api.shake(16);
        api.burst(s.px, GROUND - 150, { n: 12, shape: 'star', color: ['#ffe14d', '#ffffff', '#ffb84d'], speed: 230, gravity: 250, size: 9 });
        if (s.hits >= 2) {
          api.end(false, 'BONG ! Deuxième coup de pioche sur le crâne… Ça expliquerait certaines choses.');
        } else {
          s.msg = 'BONG ! Une bosse…'; s.msgT = 1.1;
        }
      } else {
        api.sfx('clang');
        api.shake(4);
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.flash = Math.max(0, s.flash - dt * 2);
        s.msgT = Math.max(0, s.msgT - dt);
        s.dizzy = Math.max(0, s.dizzy - dt);
        for (const p of s.pops) p.t += dt;
        s.pops = s.pops.filter((p) => p.t < 0.8);

        // ── déplacement de Papa (clavier direct, ou suit la souris)
        const ax = input.axis('x');
        const p = input.pointer;
        let v = 0;
        if (!api.ended && s.dizzy <= 0) {
          if (ax) { v = ax * 390; s.target = s.px + v * dt; }
          else {
            if (p.active && (p.down || p.x !== s.lastPointerX)) s.target = p.x;
            const d = s.target - s.px;
            v = Math.abs(d) < 4 ? 0 : Math.sign(d) * Math.min(390, Math.abs(d) * 9);
          }
        }
        s.lastPointerX = p.x;
        s.px = clamp(s.px + v * dt, 40, W - 40);
        s.vx = v;
        if (v > 10) s.face = 1; else if (v < -10) s.face = -1;

        // ── morceaux du bijou : jaillissent, rebondissent, glissent, puis se perdent dans la latérite
        if (!api.ended) {
          s.spawnT -= dt;
          if (s.spawnT <= 0) { spawnPiece(); s.spawnT = rand(0.66, 0.92); }
        }
        for (let i = s.pieces.length - 1; i >= 0; i--) {
          const m = s.pieces[i];
          if (!m.rolling) {
            m.vy += 1100 * dt;
            m.x += m.vx * dt; m.y += m.vy * dt;
            if (m.y >= GROUND - m.r) {
              m.y = GROUND - m.r;
              if (Math.abs(m.vy) > 160) { m.vy *= -0.35; m.vx *= 0.6; } else { m.rolling = true; m.vy = 0; m.vx *= 0.5; }
            }
          } else {
            m.life -= dt;
            m.vx *= Math.pow(0.25, dt);
            m.x += m.vx * dt;
          }
          if (m.x < 20 || m.x > W - 20) m.vx = -m.vx * 0.5, m.x = clamp(m.x, 20, W - 20);
          m.spin += (m.rolling ? 0.35 : 1) * m.vx * dt / m.r;
          if (!api.ended && m.y > GROUND - 40 && Math.abs(m.x - s.px) < 34 && s.dizzy <= 0) {
            s.pieces.splice(i, 1);
            s.got++;
            api.sfx('catch');
            api.burst(m.x, m.y, { n: 8, color: [m.c, '#ffffff'], speed: 160, gravity: 300, size: 4 });
            s.pops.push({ x: m.x, y: m.y - 30, t: 0 });
            if (s.got >= GOAL) api.end(true, s.hits ? 'Huit morceaux du bijou ramassés, la fleur sauvée… et une seule bosse comme souvenir. Reste à tout expliquer à Mami !' : undefined);
            continue;
          }
          if (m.life <= 0) s.pieces.splice(i, 1);
        }

        // ── Pilou et sa pioche
        s.phaseT -= dt;
        s.aimAge += dt;
        if (s.phase === 'aim') {
          // feinte : l'ombre apparaît à côté… puis bondit sur Papa, avec un nouveau (court) préavis
          if (s.feint && s.aimAge >= 0.26 && !api.ended) {
            s.feint = false;
            aimAt(0.6);
            s.phaseT = warnTime();
          }
          const k = clamp(1 - s.phaseT / warnTime(), 0, 1);
          s.pilouX = api.lerp(s.pilouFrom, s.tx + s.side * 56, Math.min(1, k * 3));
          s.swing = 0;
        } else if (s.phase === 'strike') {
          s.swing = clamp(1 - s.phaseT / STRIKE, 0, 1);
        }
        if (s.phaseT <= 0) {
          if (s.phase === 'wait' || s.phase === 'rest') {
            if (!api.ended) {
              s.phase = 'aim';
              s.phaseT = warnTime();
              s.feint = !s.double && s.t > 2.5 && Math.random() < 0.3;
              if (s.feint) {
                // fausse cible : un peu à côté de Papa, du côté où il ne va pas
                const away = (s.vx ? -Math.sign(s.vx) : (Math.random() < 0.5 ? -1 : 1)) * rand(80, 130);
                s.tx = clamp(s.px + away, 70, W - 70);
                s.pilouFrom = s.pilouX;
                s.side = s.pilouX >= s.tx ? 1 : -1;
                if (s.tx + s.side * 56 > W - 30 || s.tx + s.side * 56 < 30) s.side = -s.side;
                s.aimAge = 0;
                // (elle bondit avant la fin de ce préavis, puis un nouveau préavis démarre)
                api.sfx('whoosh');
              } else {
                aimAt(s.double ? 0.75 : 0.55);
              }
            } else { s.phase = 'rest'; s.phaseT = 99; }
          } else if (s.phase === 'aim') {
            s.phase = 'strike'; s.phaseT = STRIKE;
          } else if (s.phase === 'strike') {
            s.swing = 1;
            const hitsBefore = s.hits;
            if (!api.ended) impact();
            s.phase = 'rest';
            if (s.hits > hitsBefore) { s.double = false; s.phaseT = 1.2; } // le temps de reprendre ses esprits
            else if (!s.double && s.t > 1.5 && Math.random() < 0.35) { s.double = true; s.phaseT = 0.08; } // coup double !
            else { s.double = false; s.phaseT = rand(0.22, 0.42); }
          }
        }
        if (s.phase === 'rest') s.swing = Math.max(0, s.swing - dt * 2.5);
      },
      timeout() {
        if (s.got < GOAL) api.end(false, `Seulement ${s.got} morceaux du bijou retrouvés : le reste a filé sous la maison. Mami va forcément remarquer…`);
        return s.got >= GOAL;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);

        // ombre de la pioche qui va tomber
        if (s.phase === 'aim' || s.phase === 'strike') {
          const k = s.phase === 'strike' ? 1 : clamp(1 - s.phaseT / warnTime(), 0, 1);
          g.fillStyle = `rgba(40, 10, 0, ${0.2 + k * 0.4})`;
          g.beginPath(); g.ellipse(s.tx, GROUND + 4, 30 + k * 18, 9 + k * 4, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = `rgba(255, 60, 40, ${0.45 + 0.4 * Math.sin(s.t * 20) ** 2})`; g.lineWidth = 3;
          g.beginPath(); g.ellipse(s.tx, GROUND + 4, 48, 13, 0, 0, Math.PI * 2); g.stroke();
          if (!api.ended) api.text(g, '!', s.tx, GROUND + 40, { size: 30, color: '#ffe14d', stroke: '#7a1d0a', weight: 900 });
        }

        // morceaux du bijou (et la fleur)
        for (const m of s.pieces) {
          const blink = m.rolling && m.life < 0.7 && Math.sin(m.life * 30) > 0;
          if (blink) continue;
          g.fillStyle = 'rgba(60, 20, 5, 0.3)';
          g.beginPath(); g.ellipse(m.x, GROUND + 1, m.r, 3, 0, 0, Math.PI * 2); g.fill();
          drawPiece(g, m);
          // petit scintillement pour qu'on les repère sur la latérite
          if (m.kind !== 'flower' && Math.sin(s.t * 7 + m.x * 0.05) > 0.85) {
            g.fillStyle = '#fffbe0'; star(g, m.x + 6, m.y - 8, 4, s.t * 3);
          }
        }

        // Pilou (derrière) avec sa pioche
        const dirToT = s.tx >= s.pilouX ? 1 : -1;
        const P = { x: s.pilouX + dirToT * 4, y: GROUND - 84 };
        const I = { x: s.tx, y: GROUND - 4 };
        const aStrike = Math.atan2(I.y - P.y, I.x - P.x);
        const aRaised = aStrike - dirToT * 3.1;
        const wob = s.phase === 'aim' ? Math.sin(s.t * 18) * 0.06 : 0;
        const a = api.lerp(aRaised, aStrike, s.swing) + wob;
        const len = Math.hypot(I.x - P.x, I.y - P.y) - 4;
        const ca = Math.cos(a), sa = Math.sin(a);
        const h1 = { x: P.x + ca * 14, y: P.y + sa * 14 }, h2 = { x: P.x + ca * 28, y: P.y + sa * 28 };
        const moving = s.phase === 'aim' && Math.abs(s.pilouX - (s.tx + s.side * 56)) > 4;
        const pFlip = dirToT < 0 && moving;
        const mir = (h) => (pFlip ? { x: 2 * s.pilouX - h.x, y: h.y } : h); // drawPerson inverse aussi les mains
        drawPerson(g, {
          ...PEOPLE.pilou, x: s.pilouX, y: GROUND, size: 58, t: s.t,
          pose: moving ? 'run' : 'stand', flipX: pFlip,
          expression: api.ended ? (s.hits >= 2 ? 'surprised' : 'worried') : s.phase === 'aim' ? 'angry' : 'smile',
          hands: { l: mir(h1), r: mir(h2) },
        });
        // la pioche (manche + fer)
        g.save(); g.translate(P.x, P.y); g.rotate(a);
        g.strokeStyle = '#8a5a32'; g.lineWidth = 7; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-6, 0); g.lineTo(len, 0); g.stroke();
        g.fillStyle = '#6b7480';
        g.beginPath(); g.moveTo(len - 4, -22); g.quadraticCurveTo(len + 10, 0, len - 4, 22); g.lineTo(len - 10, 0); g.closePath(); g.fill();
        g.fillStyle = '#9aa4ae'; g.fillRect(len - 9, -5, 12, 10);
        g.restore();
        // les mains de Pilou par-dessus le manche
        g.fillStyle = PEOPLE.pilou.skin;
        for (const h of [h1, h2]) { g.beginPath(); g.arc(h.x, h.y, 5.5, 0, Math.PI * 2); g.fill(); }

        // Papa
        const danger = (s.phase === 'aim' || s.phase === 'strike') && Math.abs(s.px - s.tx) < 60;
        const running = Math.abs(s.vx) > 30;
        const flip = s.face < 0;
        const size = 62;
        const info = api.avatar(g, {
          x: s.px, y: GROUND, size, t: s.t,
          pose: api.ended && s.got >= GOAL ? 'cheer' : running ? 'run' : 'stand', flipX: flip && running,
          expression: s.dizzy > 0 || (api.ended && s.hits >= 2) ? 'ouch' : api.ended ? 'happy' : danger ? 'panic' : s.pops.length ? 'happy' : 'focus',
          sweat: danger, tears: s.flash > 0.5, lookX: s.face * 0.6, lookY: 0.6,
          tilt: s.dizzy > 0 ? Math.sin(s.t * 9) * 0.15 : 0,
        });
        const hx = flip && running ? 2 * s.px - info.hx : info.hx, hy = info.hy, r = info.r;
        // la bosse
        if (s.hits > 0) {
          const bump = 0.3 + 0.05 * Math.sin(s.t * 6);
          g.fillStyle = '#f0b48e';
          g.beginPath(); g.arc(hx + r * 0.15, hy - r * 0.92, r * bump, Math.PI, 0); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.5)';
          g.beginPath(); g.arc(hx + r * 0.08, hy - r * 1.05, r * 0.08, 0, Math.PI * 2); g.fill();
          if (s.hits >= 2) {
            g.fillStyle = '#f0b48e';
            g.beginPath(); g.arc(hx - r * 0.35, hy - r * 0.85, r * 0.24, Math.PI, 0); g.fill();
          }
        }
        // étoiles qui tournent
        if (s.dizzy > 0 || (api.ended && s.hits >= 2)) {
          g.fillStyle = '#ffe14d';
          for (let k = 0; k < 4; k++) {
            const an = s.t * 5 + (k * Math.PI) / 2;
            star(g, hx + Math.cos(an) * r * 1.2, hy - r * 1.25 + Math.sin(an) * r * 0.3, 7, s.t * 4);
          }
        }
        // +1 qui s'envole
        for (const pp of s.pops) api.text(g, '+1', pp.x, pp.y - pp.t * 50, { size: 22, color: `rgba(255, 245, 200, ${1 - pp.t / 0.8})`, stroke: `rgba(90, 30, 10, ${1 - pp.t / 0.8})`, strokeWidth: 4 });

        if (s.msgT > 0) api.text(g, s.msg, W / 2, 170, { size: 38, color: '#fff3d6', stroke: '#7a1d0a', strokeWidth: 8 });
        if (api.ended && s.hits >= 2) api.text(g, 'Ça expliquerait certaines choses…', W / 2, 200, { size: 32, color: '#fff', stroke: '#5a1a0a', strokeWidth: 7 });

        // HUD
        api.text(g, `Morceaux : ${s.got} / ${GOAL}`, 40, 42, { size: 26, align: 'left', color: '#fff6dc', stroke: '#000a' });
        api.text(g, s.hits ? 'Bosses : ●' + (s.hits > 1 ? '●' : '○') : 'Bosses : ○○', 40, 76, { size: 20, align: 'left', color: s.hits ? '#ffb0a0' : '#fff6dc', stroke: '#000a', strokeWidth: 5 });
      },
    };
  },
};

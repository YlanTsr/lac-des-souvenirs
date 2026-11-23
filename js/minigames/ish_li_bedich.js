/**
 * Chapitre I — « Ish li bedich » (ish_li_bedich)
 * En 6e, Papa a écrit « Ish li bedich » sur un petit papier pour une camarade…
 * La maîtresse, c'était Mami. Elle l'a surpris et l'a lu devant toute la classe.
 * Mécanique « 1, 2, 3, soleil » : Mami écrit au tableau morceau par morceau ;
 * chaque appui fait passer le mot au pupitre suivant (≈ 0,5 s). Quand la craie s'arrête,
 * elle se retourne : si le mot bouge à ce moment-là, il est confisqué… et lu à voix haute.
 */
import { drawPerson, PEOPLE } from './people.js';

const CHUNKS = ['Conjugaison :', 'le verbe aimer', 'j’aime, tu aimes,', 'il aime, nous aimons', 'vous aimez…'];
const HOP = 0.6;          // durée d'un passage de pupitre en pupitre
const PAUSE = 0.32;       // la craie s'arrête… puis elle se retourne
const ROWS = [{ y: 282, k: 0.68 }, { y: 352, k: 0.84 }, { y: 440, k: 1 }];
const PUPILS = [
  { x: 330, row: 0, hair: '#2a1d16', shirt: '#6aa0d8' }, { x: 470, row: 0, hair: '#7a4a2a', shirt: '#e0a040' },
  { x: 620, row: 0, hair: '#1d1512', shirt: '#7fbf7a' }, { x: 770, row: 0, hair: '#2a1a12', shirt: '#f28ab0', girl: true, crush: true },
  { x: 330, row: 1, hair: '#4a3020', shirt: '#d8645a' }, { x: 520, row: 1, hair: '#c99a5a', shirt: '#8a7ad0', girl: true },
  { x: 710, row: 1, hair: '#1d1512', shirt: '#f2c94c' }, { x: 870, row: 1, hair: '#5a3a28', shirt: '#5ab0a0' },
  { x: 370, row: 2, hair: '#3a2418', shirt: '#e07b39' }, { x: 590, row: 2, hair: '#1d1512', shirt: '#4f7cac', girl: true },
  { x: 810, row: 2, hair: '#6a4a30', shirt: '#9fd0a0' },
];
const PAPA = { x: 150, y: 566, size: 70 };
const deskPt = (p) => { const R = ROWS[p.row]; return { x: p.x + 40 * R.k, y: R.y - 18 * R.k }; };
// trajet du mot : Papa → 6 pupitres → la camarade
const PATH = [{ x: 205, y: 470 }, ...[8, 4, 5, 1, 2, 3].map((i) => deskPt(PUPILS[i]))];
PATH[PATH.length - 1] = { x: 770 - 38 * 0.68, y: ROWS[0].y - 18 * 0.68 };

let BG = null;
function background(W, H) {
  if (BG) return BG;
  const c = document.createElement('canvas');
  c.width = W * 2; c.height = H * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#f0e0c0'; g.fillRect(0, 0, W, 230);
  g.fillStyle = '#e4cfa8'; g.fillRect(0, 200, W, 30);
  // fenêtres à droite, carte de France à gauche
  g.fillStyle = '#9fd0f0'; g.fillRect(820, 40, 110, 130);
  g.strokeStyle = '#a07850'; g.lineWidth = 6; g.strokeRect(820, 40, 110, 130);
  g.beginPath(); g.moveTo(875, 40); g.lineTo(875, 170); g.stroke();
  g.fillStyle = '#fff9e8'; g.fillRect(40, 60, 140, 120);
  g.fillStyle = '#8fbf7a'; g.beginPath(); g.moveTo(80, 80); g.lineTo(140, 75); g.lineTo(160, 120); g.lineTo(130, 165); g.lineTo(75, 160); g.lineTo(60, 115); g.closePath(); g.fill();
  // tableau noir (vert)
  g.fillStyle = '#7a5532'; g.fillRect(222, 42, 516, 156);
  g.fillStyle = '#2f5a45'; g.fillRect(230, 50, 500, 140);
  g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(250, 60, 200, 60);
  g.fillStyle = '#7a5532'; g.fillRect(230, 190, 500, 8);
  g.fillStyle = '#fff'; g.fillRect(600, 186, 18, 5);
  // estrade
  g.fillStyle = '#b8875a'; g.fillRect(200, 230, 560, 20);
  // sol
  const fl = g.createLinearGradient(0, 230, 0, H);
  fl.addColorStop(0, '#c99a66'); fl.addColorStop(1, '#a87a4a');
  g.fillStyle = fl; g.fillRect(0, 250, W, H - 250);
  g.strokeStyle = 'rgba(90, 60, 30, 0.25)'; g.lineWidth = 2;
  for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(480 + i * 40, 250); g.lineTo(480 + i * 110, H); g.stroke(); }
  // bureau de la maîtresse
  g.fillStyle = '#8a5a34'; g.fillRect(90, 220, 120, 16); g.fillRect(96, 236, 10, 40); g.fillRect(194, 236, 10, 40);
  g.fillStyle = '#d8453c'; g.beginPath(); g.arc(130, 212, 9, 0, Math.PI * 2); g.fill();
  BG = c;
  return c;
}

/** Élève vu de dos à son pupitre. */
function drawPupilBack(g, p, t, laugh) {
  const R = ROWS[p.row], k = R.k, x = p.x, y = R.y;
  const bob = laugh ? Math.abs(Math.sin(t * 14 + x)) * 4 * k : 0;
  // pupitre (le plateau dépasse de chaque côté)
  g.fillStyle = '#b07a48'; g.fillRect(x - 58 * k, y - 24 * k, 116 * k, 12 * k);
  g.fillStyle = '#8a5a34'; g.fillRect(x - 54 * k, y - 12 * k, 8 * k, 44 * k); g.fillRect(x + 46 * k, y - 12 * k, 8 * k, 44 * k);
  // dos + tête (cheveux)
  g.fillStyle = p.shirt;
  g.beginPath(); g.moveTo(x - 26 * k, y + 4 * k); g.lineTo(x - 24 * k, y - 52 * k - bob); g.quadraticCurveTo(x, y - 62 * k - bob, x + 24 * k, y - 52 * k - bob); g.lineTo(x + 26 * k, y + 4 * k); g.closePath(); g.fill();
  const hy = y - 78 * k - bob;
  g.fillStyle = '#e8b890';
  g.beginPath(); g.ellipse(x - 21 * k, hy + 3 * k, 5 * k, 7 * k, 0, 0, Math.PI * 2); g.ellipse(x + 21 * k, hy + 3 * k, 5 * k, 7 * k, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(x - 7 * k, hy + 14 * k, 14 * k, 10 * k);
  g.fillStyle = p.hair;
  g.beginPath(); g.arc(x, hy - 2 * k, 21 * k, 0, Math.PI * 2); g.fill();
  if (p.girl) {
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(x + sx * 22 * k, hy + 10 * k, 7 * k, 14 * k, sx * 0.4, 0, Math.PI * 2); g.fill(); }
  }
  // dossier de chaise
  g.fillStyle = '#6a4a2e'; g.fillRect(x - 24 * k, y - 8 * k, 48 * k, 10 * k);
  g.fillRect(x - 22 * k, y + 2 * k, 6 * k, 30 * k); g.fillRect(x + 16 * k, y + 2 * k, 6 * k, 30 * k);
  return { hx: x, hy };
}

function drawNote(g, x, y, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = '#fffdf4'; g.fillRect(-9, -6, 18, 12);
  g.strokeStyle = '#b8b0a0'; g.lineWidth = 1.2; g.strokeRect(-9, -6, 18, 12);
  g.beginPath(); g.moveTo(-9, -6); g.lineTo(0, 1); g.lineTo(9, -6); g.stroke();
  g.fillStyle = '#e0405f'; g.beginPath(); g.arc(4, 3, 2, 0, Math.PI * 2); g.fill();
  g.restore();
}

export default {
  id: 'ish_li_bedich',
  title: '« Ish li bedich »',
  instructions: 'Fais passer ton petit mot de pupitre en pupitre jusqu’à ta camarade… mais quand la craie de Mami s’arrête, elle se retourne : plus rien ne bouge !',
  controls: 'Espace / clic / tap : passer le mot au pupitre suivant',
  duration: 13,
  introExpression: 'smile',
  successTitle: 'Message transmis !',
  failTitle: 'Confisqué !',
  successText: 'Le mot est arrivé ! Ta camarade a rougi jusqu’aux oreilles. Mami, elle, n’a rien vu… cette fois.',
  failText: 'Mami a confisqué le papier et l’a lu devant toute la classe : « Ish li bedich ! » Fou rire général, et toi tout rouge au fond de la classe.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const bg = background(W, H);
    const s = {
      t: 0, phase: 'write', phaseT: 0, chunk: 0, chars: 0, rate: 7.2,
      idx: 0, hopT: -1, caught: false, won: false, readT: 0, hearts: [],
    };
    const chunkLen = () => CHUNKS[s.chunk % CHUNKS.length].length;
    s.writeLeft = chunkLen() / s.rate;

    function caught() {
      if (api.ended) return;
      s.caught = true;
      api.sfx('beep');
      api.shake(8);
      api.end(false);
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.phaseT += dt;
        if (s.caught) s.readT += dt;
        for (const h of s.hearts) { h.t += dt; h.y -= 40 * dt; }

        // ── Mami : écrit → s'arrête → se retourne → se remet à écrire
        if (s.phase === 'write') {
          s.chars += s.rate * dt;
          s.writeLeft = Math.max(0, (chunkLen() - s.chars) / s.rate);
          if (s.chars >= chunkLen()) { s.chars = chunkLen(); s.phase = 'pause'; s.phaseT = 0; }
        } else if (s.phase === 'pause') {
          if (s.phaseT >= PAUSE) { s.phase = 'look'; s.phaseT = 0; s.lookDur = rand(0.85, 1.2); api.sfx('whoosh'); }
        } else if (s.phase === 'look') {
          if (!s.caught && s.phaseT >= (s.lookDur || 1)) { s.phase = 'back'; s.phaseT = 0; }
        } else if (s.phase === 'back') {
          if (s.phaseT >= 0.2) {
            s.phase = 'write'; s.phaseT = 0; s.chunk++; s.chars = 0; s.rate = rand(6.5, 8);
            s.writeLeft = chunkLen() / s.rate;
          }
        }

        // ── le petit mot
        if (s.hopT >= 0) {
          s.hopT += dt / HOP;
          if (s.hopT >= 1) {
            s.hopT = -1; s.idx++;
            api.sfx('grain');
            if (s.idx >= PATH.length - 1 && !api.ended) {
              s.won = true;
              api.sfx('catch');
              for (let i = 0; i < 6; i++) s.hearts.push({ x: 770 + rand(-30, 30), y: 180 + rand(-10, 10), t: -i * 0.12 });
              api.end(true);
            }
          }
        }
        if (!api.ended) {
          if (s.phase === 'look' && s.hopT >= 0) caught();
          else if (input.pressed()) {
            if (s.phase === 'look') caught();
            else if (s.hopT < 0 && s.idx < PATH.length - 1) { s.hopT = 0; api.sfx('whoosh'); }
          }
        }
      },
      timeout() {
        if (!s.won) api.end(false, 'Driiing ! La cloche sonne avant que le mot n’arrive. Il finit au fond d’une trousse… et le secret est bien gardé.');
        return s.won;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);

        // ── le tableau : morceaux déjà écrits + morceau en cours (avec guide pâle)
        const lineY = (i) => 74 + (i % CHUNKS.length) * 26;
        for (let i = 0; i <= s.chunk && i < CHUNKS.length; i++) {
          const full = CHUNKS[i];
          const done = i < s.chunk ? full : full.slice(0, Math.floor(s.chars));
          if (i === s.chunk) api.text(g, full, 250, lineY(i), { size: 22, align: 'left', color: 'rgba(255,255,255,0.13)', font: '"Comic Sans MS", "Segoe Print", cursive', weight: 400 });
          api.text(g, done, 250, lineY(i), { size: 22, align: 'left', color: '#f4f4ea', font: '"Comic Sans MS", "Segoe Print", cursive', weight: 400 });
        }
        if (s.caught && s.readT > 0.2) {
          api.text(g, 'Ish li bedich', 480, 176, { size: 24, color: '#ffd0dc', font: '"Comic Sans MS", "Segoe Print", cursive', weight: 700 });
        }

        // ── Mami
        const cur = Math.min(s.chunk, CHUNKS.length - 1);
        const writeX = 250 + Math.min(CHUNKS[cur].length, s.chars) * 11.5;
        const mx = clamp(writeX + 34, 300, 700);
        const turned = s.phase === 'look' || s.caught;
        const handUp = s.phase === 'write' || s.phase === 'pause';
        const info = drawPerson(g, {
          ...PEOPLE.mami, x: s.caught ? 480 : mx, y: 300, size: 64, t: s.t,
          expression: s.caught ? (s.readT > 0.4 ? 'laugh' : 'surprised') : 'angry',
          pose: s.caught ? 'stand' : 'stand',
          hands: handUp ? { r: { x: writeX + 4, y: lineY(cur) + 6 }, l: { x: mx - 24, y: 270 } }
            : s.caught ? { l: { x: 455, y: 236 }, r: { x: 505, y: 236 } } : undefined,
        });
        if (!turned) {
          // vue de dos : on recouvre le visage par les cheveux
          g.fillStyle = PEOPLE.mami.hairColor;
          g.beginPath(); g.arc(info.hx, info.hy, info.r * 1.02, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.08)';
          g.beginPath(); g.arc(info.hx, info.hy + info.r * 0.3, info.r * 0.7, 0, Math.PI); g.fill();
        }
        if (handUp) {
          // la craie qui crisse
          g.fillStyle = '#fff'; g.fillRect(writeX + 2, lineY(cur) - 2, 4, 9);
          if (s.phase === 'write' && Math.sin(s.t * 40) > 0) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(writeX + 8, lineY(cur) + 8 + Math.random() * 6, 1.5, 0, Math.PI * 2); g.fill(); }
        }
        if (s.phase === 'pause' && !api.ended) api.text(g, '…', info.hx + 46, info.hy - 30, { size: 34, color: '#fff', stroke: '#000a' });
        if (s.phase === 'look' && !s.caught) api.text(g, '?!', info.hx + 44, info.hy - 30, { size: 30, color: '#ffd34d', stroke: '#000a', weight: 900 });
        if (s.caught) {
          // le papier confisqué, lu à voix haute
          drawNote(g, 480, 232, 0);
          if (s.readT > 0.4) {
            api.roundRect(g, 560, 120, 250, 56, 16); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
            api.text(g, '« Ish li bedich ! »', 685, 148, { size: 26, color: '#b0303a', weight: 800 });
          }
        }

        // ── la classe (de dos), du fond vers l'avant
        const laugh = s.caught && s.readT > 0.5;
        for (const p of PUPILS) {
          if (p.crush && s.won) {
            const R = ROWS[p.row];
            drawPupilBack(g, p, s.t, false);
            drawPerson(g, { ...PEOPLE.cousine, hairColor: p.hair, shirt: p.shirt, x: p.x, y: R.y - 78 * R.k, size: 42 * R.k, body: false, expression: 'love', t: s.t });
          } else drawPupilBack(g, p, s.t, laugh);
        }
        if (laugh) {
          for (let i = 0; i < 6; i++) {
            const p = PUPILS[(i * 3) % PUPILS.length], R = ROWS[p.row];
            api.text(g, i % 2 ? 'HA HA' : 'Hi hi !', p.x + 20, R.y - 120 * R.k - Math.abs(Math.sin(s.t * 6 + i)) * 8, { size: 18 + R.k * 6, color: '#fff', stroke: '#7a3a10', strokeWidth: 4 });
          }
        }
        for (const h of s.hearts) if (h.t > 0) api.text(g, '♥', h.x, h.y, { size: 26, color: `rgba(230, 60, 100, ${Math.max(0, 1 - h.t)})` });

        // ── le petit mot qui voyage
        if (!s.caught) {
          let nx, ny, rot = 0;
          if (s.hopT >= 0) {
            const a = PATH[s.idx], b = PATH[s.idx + 1], k = s.hopT;
            nx = api.lerp(a.x, b.x, k); ny = api.lerp(a.y, b.y, k) - Math.sin(k * Math.PI) * 40; rot = k * 6;
          } else { const a = PATH[Math.min(s.idx, PATH.length - 1)]; nx = a.x; ny = a.y; }
          drawNote(g, nx, ny, rot);
          if (s.hopT >= 0) { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.arc(nx, ny, 14, 0, Math.PI * 2); g.stroke(); }
        }

        // ── Papa, au fond de la classe
        g.fillStyle = '#b07a48'; g.fillRect(40, 478, 240, 16);
        g.fillStyle = '#8a5a34'; g.fillRect(48, 494, 224, 46);
        const info2 = api.avatar(g, {
          x: PAPA.x, y: PAPA.y, size: PAPA.size, t: s.t,
          expression: s.caught ? 'worried' : s.won ? 'happy' : s.phase === 'look' ? 'panic' : s.hopT >= 0 ? 'focus' : 'smile',
          blush: s.caught ? 1 : s.won ? 0.6 : 0, sweat: s.phase === 'look' && !api.ended,
          lookX: 0.8, lookY: -0.6,
          hands: { l: { x: PAPA.x - 30, y: 480 }, r: { x: 200, y: 478 } },
        });
        g.fillStyle = '#b07a48'; g.fillRect(40, 486, 240, 8);
        if (s.idx === 0 && s.hopT < 0 && !s.caught) drawNote(g, PATH[0].x, PATH[0].y, 0);
        if (s.caught && s.readT > 0.6) api.text(g, 'Oups…', info2.hx + 70, info2.hy - 50, { size: 24, color: '#fff', stroke: '#7a3a10' });

        // HUD
        const left = PATH.length - 1 - s.idx;
        api.text(g, `Pupitres avant ta camarade : ${Math.max(0, left)}`, 300, 520, { size: 22, align: 'left', color: '#fff6dc', stroke: '#000a' });
        if (!api.ended) {
          const safe = s.phase === 'write';
          api.text(g, safe ? '✎ La craie crisse : vas-y !' : s.phase === 'pause' ? '… la craie s’arrête !' : '👀 Pas un geste !', 300, 490, { size: 20, align: 'left', color: safe ? '#bff5b0' : '#ffb0a0', stroke: '#000a', strokeWidth: 5 });
        }
      },
    };
  },
};

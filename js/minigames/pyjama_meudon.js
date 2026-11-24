/**
 * « Le pyjama de Meudon » (pyjama_meudon)
 * En pleine nuit à Meudon, Papa se réveille : une silhouette les observe près de l'armoire.
 * Mécanique : le cœur s'emballe (BPM). Maintenir = se glisser hors du lit puis avancer à pas de loup
 * vers l'interrupteur ; relâcher = se figer et respirer (le cœur redescend, moins vite près de la
 * silhouette). Quand le rideau frémit, la silhouette « bouge » : être en mouvement à ce moment-là fait
 * bondir le cœur. 200 BPM = crise cardiaque (Papa s'évanouit). Lumière allumée = c'était un pyjama.
 */
import { drawPerson, PEOPLE } from './people.js';

const SH = '#0b0912';                 // couleur des silhouettes dans le noir
const HOOK = { x: 655, y: 100 };      // crochet du cintre (sur le côté de l'armoire)
const PX = 150, PY = 440;             // Papa assis dans le lit (hanches)
const MAMAN = { x: 92, y: 470 };      // tête de Maman sur l'oreiller
const FLOOR = 455;
const FEET = 510;                     // pieds de Papa debout
const X0 = 492, X1 = 900;             // du bord du lit à l'interrupteur
const SW = { x: 930, y: 334 };        // interrupteur
const OUT = 0.14;                     // part du trajet passée à sortir du lit
const TRIP = 5.8;                     // s d'avancée nécessaires (sortie du lit comprise)
const MAXBPM = 200;

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export default {
  id: 'pyjama_meudon',
  title: 'Le pyjama de Meudon',
  instructions: 'Quelqu’un vous observe ! Va allumer la lumière avant que ton cœur ne lâche : fige-toi quand le rideau frémit, et respire.',
  controls: 'Maintenir Espace / clic / → : avancer · relâcher : respirer',
  duration: 13,
  introExpression: 'worried',
  successTitle: 'Clic ! La lumière !',
  failTitle: 'Crise cardiaque !',
  successText: '… C’est un pyjama. Le pyjama combinaison de Maman, qui sèche sur son cintre.',
  failText: 'Ton cœur a lâché (enfin, presque). Maman allume la lampe… sur son pyjama, sagement suspendu à son cintre.',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;

    /* ───────── décor pré-rendu ───────── */
    const bg = mk(W, H);
    {
      const g = bg.getContext('2d');
      // papier peint
      g.fillStyle = '#d3bf98'; g.fillRect(0, 0, W, FLOOR);
      g.fillStyle = '#c8b28a';
      for (let x = 0; x < W; x += 44) g.fillRect(x, 0, 20, FLOOR);
      g.fillStyle = 'rgba(150, 90, 70, 0.16)';
      for (let x = 22; x < W; x += 44) for (let y = 40; y < FLOOR - 30; y += 56) { g.beginPath(); g.arc(x + 10, y + ((x / 44) % 2) * 28, 4, 0, Math.PI * 2); g.fill(); }
      // plinthe + parquet
      g.fillStyle = '#8a6a4a'; g.fillRect(0, FLOOR - 14, W, 14);
      g.fillStyle = '#7a5236'; g.fillRect(0, FLOOR, W, H - FLOOR);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
      for (let y = FLOOR + 16; y < H; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let i = 0; i < 34; i++) { const x = (i * 149) % W, y = FLOOR + ((i * 5) % 5) * 18; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 18); g.stroke(); }
      // tapis sous la chaise
      g.fillStyle = '#9a4a4a'; g.beginPath(); g.ellipse(560, 492, 150, 30, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e0b070'; g.lineWidth = 3; g.beginPath(); g.ellipse(560, 492, 132, 24, 0, 0, Math.PI * 2); g.stroke();
      // tringle à rideaux
      g.strokeStyle = '#6b4a32'; g.lineWidth = 5; g.beginPath(); g.moveTo(250, 62); g.lineTo(490, 62); g.stroke();
      // fenêtre : ciel de Meudon, lune, toits et la coupole de l'Observatoire
      g.fillStyle = '#1b2650'; g.fillRect(304, 74, 132, 152);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [x, y] of [[318, 90], [420, 96], [352, 140], [330, 118], [426, 150], [372, 92]]) { g.beginPath(); g.arc(x, y, 1.4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(250, 245, 210, 0.18)'; g.beginPath(); g.arc(400, 112, 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f4f0d0'; g.beginPath(); g.arc(400, 112, 20, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(200, 195, 160, 0.6)'; g.beginPath(); g.arc(394, 106, 4, 0, Math.PI * 2); g.arc(406, 118, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0f1630';
      g.beginPath(); g.moveTo(304, 226); g.lineTo(304, 196); g.lineTo(326, 182); g.lineTo(348, 196); g.lineTo(348, 188); g.lineTo(372, 188);
      g.lineTo(372, 178); g.arc(392, 178, 20, Math.PI, 0); g.lineTo(412, 192); g.lineTo(436, 184); g.lineTo(436, 226); g.closePath(); g.fill();
      g.fillStyle = '#f2d27a'; g.fillRect(330, 204, 5, 6); g.fillRect(420, 200, 5, 6);
      g.strokeStyle = '#efe7da'; g.lineWidth = 8; g.strokeRect(304, 74, 132, 152);
      g.lineWidth = 5; g.beginPath(); g.moveTo(370, 74); g.lineTo(370, 226); g.moveTo(304, 150); g.lineTo(436, 150); g.stroke();
      g.fillStyle = '#e8dfd0'; g.fillRect(296, 226, 148, 10);
      // rideau droit (attaché)
      g.fillStyle = '#8fb3d9';
      g.beginPath(); g.moveTo(436, 62); g.lineTo(478, 62); g.quadraticCurveTo(470, 200, 476, 340); g.lineTo(450, 340); g.quadraticCurveTo(452, 220, 436, 160); g.closePath(); g.fill();
      g.fillStyle = '#c8486b'; g.fillRect(442, 206, 34, 7);
      // petit cadre au-dessus du lit
      g.fillStyle = '#6b4a32'; g.fillRect(150, 150, 84, 62);
      g.fillStyle = '#f0e2c4'; g.fillRect(157, 157, 70, 48);
      g.fillStyle = '#7a9cc4'; g.beginPath(); g.moveTo(157, 205); g.lineTo(185, 178); g.lineTo(206, 196); g.lineTo(227, 182); g.lineTo(227, 205); g.closePath(); g.fill();
      g.fillStyle = '#c8486b'; g.font = '800 11px sans-serif'; g.textAlign = 'center'; g.fillText('MEUDON', 192, 170);
      // armoire
      g.fillStyle = '#3e2a1d'; g.fillRect(684, 98, 182, FLOOR - 96);
      g.fillStyle = '#6b4630'; g.fillRect(690, 104, 170, FLOOR - 112);
      g.fillStyle = '#5a3a28'; g.fillRect(678, 84, 194, 16);
      g.strokeStyle = '#4a3020'; g.lineWidth = 3;
      g.strokeRect(700, 116, 72, 300); g.strokeRect(778, 116, 72, 300);
      g.strokeRect(712, 132, 48, 120); g.strokeRect(790, 132, 48, 120);
      g.strokeRect(712, 270, 48, 130); g.strokeRect(790, 270, 48, 130);
      g.fillStyle = '#d4a94f'; g.beginPath(); g.arc(766, 270, 4, 0, Math.PI * 2); g.arc(784, 270, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3e2a1d'; g.fillRect(690, FLOOR - 8, 14, 8); g.fillRect(846, FLOOR - 8, 14, 8);
      // potence du cintre
      g.strokeStyle = '#b8a070'; g.lineWidth = 4; g.beginPath(); g.moveTo(684, 96); g.lineTo(HOOK.x - 2, 96); g.stroke();
    }

    // le lit (devant les objets) : tête de lit, matelas, oreiller de Papa
    const bedBack = mk(W, H);
    {
      const g = bedBack.getContext('2d');
      g.fillStyle = '#5e3d29'; g.beginPath(); g.moveTo(0, 290); g.quadraticCurveTo(30, 284, 40, 300); g.lineTo(40, H); g.lineTo(0, H); g.closePath(); g.fill();
      g.fillStyle = '#6f4a32'; g.fillRect(6, 310, 26, H - 310);
      g.fillStyle = '#e9e4f2'; g.fillRect(36, 420, 432, H - 420);
      g.fillStyle = '#f4f1fa'; g.beginPath(); g.ellipse(88, 412, 52, 22, -0.12, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d0c8e0'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#5e3d29'; g.fillRect(458, 376, 22, H - 376);
      g.fillStyle = '#6f4a32'; g.beginPath(); g.ellipse(469, 376, 14, 6, 0, 0, Math.PI * 2); g.fill();
    }
    // la couette (par-dessus les jambes de Papa et le corps de Maman) + oreiller de Maman
    const quilt = mk(W, H);
    {
      const g = quilt.getContext('2d');
      g.fillStyle = '#f4f1fa'; g.beginPath(); g.ellipse(84, 484, 50, 20, 0.05, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c86a5a';
      g.beginPath(); g.moveTo(118, 440); g.quadraticCurveTo(160, 412, 230, 422); g.quadraticCurveTo(320, 430, 462, 440);
      g.lineTo(462, H); g.lineTo(122, H); g.quadraticCurveTo(112, 500, 118, 440); g.closePath(); g.fill();
      g.fillStyle = '#d77e6c';
      g.beginPath(); g.moveTo(124, 494); g.quadraticCurveTo(220, 470, 330, 482); g.quadraticCurveTo(400, 488, 462, 486); g.lineTo(462, H); g.lineTo(124, H); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255, 230, 200, 0.4)'; g.lineWidth = 2;
      for (let x = 170; x < 460; x += 48) { g.beginPath(); g.moveTo(x, 430); g.quadraticCurveTo(x + 10, 480, x - 4, H); g.stroke(); }
      g.fillStyle = 'rgba(255, 240, 220, 0.5)';
      for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(150 + (i * 67) % 300, 450 + (i * 37) % 85, 3, 0, Math.PI * 2); g.fill(); }
    }

    // nuit : masque d'obscurité (plus clair devant la fenêtre, sur le lit, autour de la silhouette)
    const PAD = 24;
    const mask = mk(W + PAD * 2, H + PAD * 2);
    {
      const g = mask.getContext('2d');
      g.translate(PAD, PAD);
      g.fillStyle = 'rgba(4, 6, 22, 0.94)'; g.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      };
      g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(304, 74, 132, 152);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.beginPath(); g.moveTo(304, 226); g.lineTo(436, 226); g.lineTo(640, FLOOR); g.lineTo(700, H); g.lineTo(470, H); g.lineTo(450, FLOOR); g.closePath(); g.fill();
      hole(370, 150, 190, 0.28);
      hole(180, 450, 240, 0.4);
      hole(650, 250, 150, 0.3);
      g.globalCompositeOperation = 'source-over';
    }
    const shade = mk(W + PAD * 2, H + PAD * 2);
    const sg = shade.getContext('2d');

    // vignette rouge de panique
    const vign = mk(W, H);
    {
      const g = vign.getContext('2d');
      const gr = g.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 600);
      gr.addColorStop(0, 'rgba(170, 10, 30, 0)'); gr.addColorStop(1, 'rgba(170, 10, 30, 0.85)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }

    /* ───────── état ───────── */
    const s = {
      t: 0, bpm: 92, p: 0, moving: false, walkT: 0, ph: 0,
      warn: 0, sway: 0, hitThis: false, nextEv: rand(1.3, 1.9),
      pjAng: 0, curtainGust: 0, gust: 0, msg: '', msgT: 0, msgCol: '#fff',
      outcome: null, endT: 0, lightK: 0,
    };
    const say = (txt, dur = 1.1, col = '#fff', force = false) => {
      if (!force && s.msgT > 0.35 && s.msg !== txt) return;
      s.msg = txt; s.msgT = dur; s.msgCol = col;
    };
    const papaX = () => (s.p < OUT ? lerp(PX, 430, s.p / OUT) : lerp(X0, X1, (s.p - OUT) / (1 - OUT)));
    const prox = () => clamp(1 - Math.abs(papaX() - (HOOK.x + 10)) / 260, 0, 1);

    function finish(outcome) {
      if (api.ended) return;
      s.outcome = outcome;
      if (outcome === 'win') {
        api.sfx('clang');
        api.burst(HOOK.x, HOOK.y + 150, { n: 18, shape: 'star', color: ['#fff6c8', '#b49ad8', '#ffffff'], speed: 200, gravity: 120, size: 6 });
        api.end(true, '« Clic ! » La lumière s’allume… C’est un pyjama. Le pyjama combinaison de Maman, sur son cintre. Ton cœur redescend tout doucement.');
      } else if (outcome === 'heart') {
        api.sfx('ouch'); api.shake(18);
        api.end(false, 'Ton cœur s’est emballé et tu t’es effondré au milieu de la chambre. Maman allume la lampe : « Mais qu’est-ce que tu fais par terre ? »… juste devant son pyjama.');
      } else {
        api.end(false, 'Tu n’as jamais atteint l’interrupteur : nuit blanche face à « l’intrus »… le pyjama de Maman, au petit matin.');
      }
    }

    /* ───────── dessins ───────── */
    /* ───────── dessins ───────── */
    function drawCoat(g, sh) {
      const x = 60, C = (c) => (sh ? SH : c);
      g.fillStyle = C('#6b4a32'); g.fillRect(x - 4, 118, 8, 320); g.fillRect(x - 24, 156, 48, 5);
      if (sh) { g.fillStyle = SH; g.beginPath(); g.ellipse(x, 152, 15, 16, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = C('#4d5a78');
      g.beginPath(); g.moveTo(x - 16, 158); g.quadraticCurveTo(x - 38, 166, x - 35, 204); g.lineTo(x - 40, 322);
      g.quadraticCurveTo(x, 332, x + 40, 322); g.lineTo(x + 35, 204); g.quadraticCurveTo(x + 38, 166, x + 16, 158); g.closePath(); g.fill();
      if (!sh) {
        g.strokeStyle = '#38425c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 166); g.lineTo(x, 320); g.stroke();
        g.fillStyle = '#c9b27a'; for (const y of [196, 232, 268]) { g.beginPath(); g.arc(x + 5, y, 2.5, 0, Math.PI * 2); g.fill(); }
      }
      g.fillStyle = C('#c8486b'); g.fillRect(x - 15, 158, 30, 11); g.fillRect(x + 5, 166, 10, 74);
      g.fillStyle = C('#3b302a'); g.beginPath(); g.ellipse(x, 140, 31, 7, 0, 0, Math.PI * 2); g.fill(); g.fillRect(x - 18, 114, 36, 26);
      if (!sh) { g.fillStyle = '#8a5a3a'; g.fillRect(x - 18, 131, 36, 5); }
      if (sh) {
        g.strokeStyle = SH; g.lineWidth = 7; g.lineCap = 'round';
        for (const d of [-1, 1]) {
          g.beginPath(); g.moveTo(x + d * 30, 180); g.quadraticCurveTo(x + d * 56, 246, x + d * 48, 306); g.stroke();
          g.lineWidth = 3;
          for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + d * 48, 306); g.lineTo(x + d * (50 + k * 6), 320); g.stroke(); }
          g.lineWidth = 7;
        }
      }
    }
    function drawCurtain(g, sh) {
      const C = (c) => (sh ? SH : c);
      const off = Math.sin(s.t * 1.2) * 3 + s.curtainGust * 22 * Math.sin(s.t * 6);
      g.fillStyle = C('#8fb3d9');
      g.beginPath(); g.moveTo(258, 62); g.lineTo(308, 62);
      g.bezierCurveTo(300 + off * 0.3, 150, 316 + off * 0.7, 260, 308 + off, 360);
      if (sh) { for (let k = 0; k < 5; k++) g.lineTo(300 + off - k * 9, 360 + (k % 2 ? -14 : 8)); }
      g.lineTo(262 + off * 0.5, 360);
      g.bezierCurveTo(256 + off * 0.3, 260, 266, 150, 258, 62); g.closePath(); g.fill();
      if (!sh) {
        g.strokeStyle = '#7397c0'; g.lineWidth = 3;
        for (const k of [0.3, 0.6]) { g.beginPath(); g.moveTo(258 + k * 50, 66); g.quadraticCurveTo(262 + k * 44 + off * 0.4, 220, 262 + k * 46 + off * 0.8, 356); g.stroke(); }
      }
    }
    function drawChair(g, sh) {
      const x = 525, C = (c) => (sh ? SH : c);
      g.strokeStyle = C('#7a4e30'); g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 30, 390); g.lineTo(x - 32, FLOOR); g.moveTo(x + 30, 390); g.lineTo(x + 32, FLOOR);
      g.moveTo(x - 22, 390); g.lineTo(x - 22, FLOOR - 10); g.moveTo(x + 22, 390); g.lineTo(x + 22, FLOOR - 10);
      g.moveTo(x - 30, 390); g.lineTo(x - 30, 304); g.moveTo(x + 30, 390); g.lineTo(x + 30, 304); g.stroke();
      g.fillStyle = C('#8a5a3a'); g.fillRect(x - 38, 382, 76, 10); g.fillRect(x - 34, 300, 68, 12);
      if (sh) {
        g.fillStyle = SH; g.beginPath(); g.ellipse(x, 290, 19, 17, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(x - 16, 282); g.lineTo(x - 22, 258); g.lineTo(x - 6, 276); g.moveTo(x + 16, 282); g.lineTo(x + 22, 258); g.lineTo(x + 6, 276); g.fill();
      }
      // veste sur le dossier
      g.fillStyle = C('#7a6248');
      g.beginPath(); g.moveTo(x - 36, 306); g.quadraticCurveTo(x - 44, 300, x - 48, 330); g.lineTo(x - 46, 376); g.lineTo(x - 26, 378);
      g.lineTo(x - 22, 316); g.lineTo(x + 22, 316); g.lineTo(x + 26, 378); g.lineTo(x + 46, 376); g.lineTo(x + 48, 330); g.quadraticCurveTo(x + 44, 300, x + 36, 306); g.closePath(); g.fill();
      if (!sh) { g.fillStyle = '#655038'; g.fillRect(x - 46, 360, 20, 6); g.fillRect(x + 26, 360, 20, 6); }
      // jean plié sur l'assise
      g.fillStyle = C('#3f5f8f'); g.fillRect(x - 28, 376, 50, 10); g.fillRect(x - 6, 384, 22, 44);
      if (!sh) { g.strokeStyle = '#d0a050'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 5, 386); g.lineTo(x + 5, 426); g.stroke(); }
    }
    function drawPlant(g, sh) {
      const x = 912, C = (c) => (sh ? SH : c);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.3 + Math.sin(s.t * 0.8 + i) * 0.03;
        const L = 100 + (i % 3) * 26;
        const tx = x + Math.cos(a) * L, ty = 408 + Math.sin(a) * L;
        const nx = -Math.sin(a) * 9, ny = Math.cos(a) * 9;
        g.fillStyle = C(i % 2 ? '#4f8a4a' : '#3f7a3c');
        g.beginPath(); g.moveTo(x - nx * 0.4, 408 - ny * 0.4);
        g.quadraticCurveTo((x + tx) / 2 + nx, (408 + ty) / 2 + ny, tx, ty);
        g.quadraticCurveTo((x + tx) / 2 - nx, (408 + ty) / 2 - ny, x + nx * 0.4, 408 + ny * 0.4); g.fill();
        if (sh) { g.strokeStyle = SH; g.lineWidth = 3; g.beginPath(); g.arc(tx + Math.cos(a + 1.6) * 6, ty + Math.sin(a + 1.6) * 6, 6, a - 1.5, a + 1.5); g.stroke(); }
      }
      g.fillStyle = C('#b5653a');
      g.beginPath(); g.moveTo(x - 32, 404); g.lineTo(x + 32, 404); g.lineTo(x + 25, FLOOR); g.lineTo(x - 25, FLOOR); g.closePath(); g.fill();
      if (!sh) { g.fillStyle = '#c97a4a'; g.fillRect(x - 34, 400, 68, 9); }
    }
    // le pyjama combinaison (origine = crochet), sh = silhouette noire
    function pjShape(g, sh, flat) {
      const C = (c) => (flat ? flat : sh ? SH : c);
      g.strokeStyle = C('#c9c9d2'); g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.arc(-4, 4, 5, -Math.PI, 0.4, false); g.moveTo(0, 8); g.lineTo(0, 18); g.stroke();
      for (const d of [-1, 1]) {
        g.fillStyle = C('#9f86c9');
        g.beginPath(); g.moveTo(d * 4, 176); g.lineTo(d * 34, 176); g.lineTo(d * 30, 292); g.lineTo(d * 8, 292); g.closePath(); g.fill();
        g.fillStyle = C('#f1e6ff'); g.beginPath(); g.ellipse(d * 19, 296, 15, 8, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = C('#a88fd2'); g.lineWidth = 17;
        g.beginPath(); g.moveTo(d * 34, 64); g.quadraticCurveTo(d * 50, 120, d * 44, 168); g.stroke();
        g.fillStyle = C('#f1e6ff'); g.beginPath(); g.arc(d * 44, 172, 9, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = C('#b49ad8');
      g.beginPath(); g.moveTo(-34, 56); g.quadraticCurveTo(0, 48, 34, 56); g.quadraticCurveTo(44, 64, 40, 90); g.lineTo(37, 182);
      g.quadraticCurveTo(0, 190, -37, 182); g.lineTo(-40, 90); g.quadraticCurveTo(-44, 64, -34, 56); g.fill();
      // capuche à oreilles d'ourson (la « tête »)
      for (const d of [-1, 1]) {
        g.fillStyle = C('#b49ad8'); g.beginPath(); g.arc(d * 15, 20, 8, 0, Math.PI * 2); g.fill();
        if (!sh && !flat) { g.fillStyle = '#f0b8d0'; g.beginPath(); g.arc(d * 15, 20, 4, 0, Math.PI * 2); g.fill(); }
      }
      g.fillStyle = C('#b49ad8'); g.beginPath(); g.arc(0, 36, 21, 0, Math.PI * 2); g.fill();
      if (!sh && !flat) {
        g.fillStyle = '#e8ddf6'; g.beginPath(); g.ellipse(0, 39, 13, 12, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3a2a4a'; g.beginPath(); g.arc(-6, 35, 2.5, 0, Math.PI * 2); g.arc(6, 35, 2.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#d8c8ee'; g.beginPath(); g.ellipse(0, 43, 5, 3.5, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#8a72b4'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 60); g.lineTo(0, 178); g.stroke();
        g.fillStyle = '#fff6c8';
        for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(-28 + (i * 23) % 56, 72 + (i * 41) % 200, 2.4, 0, Math.PI * 2); g.fill(); }
      }
    }
    function drawPyjama(g, vis) {
      g.save(); g.translate(HOOK.x, HOOK.y); g.rotate(s.pjAng);
      pjShape(g, false);
      if (vis < 1) { g.globalAlpha = 1 - vis; pjShape(g, true); g.globalAlpha = 1; }
      g.restore();
    }
    const eyeGlow = (g, x, y, a, blink) => {
      if (a <= 0.02) return;
      g.globalAlpha = a;
      g.fillStyle = 'rgba(255, 220, 110, 0.25)'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe680'; g.beginPath(); g.ellipse(x, y, 3, blink ? 0.6 : 2.6, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    };
    function drawSwitch(g) {
      g.fillStyle = '#efe7da'; api.roundRect(g, SW.x - 11, SW.y - 16, 22, 32, 4); g.fill();
      g.strokeStyle = '#b8ab94'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#ddd4c2'; g.fillRect(SW.x - 5, SW.y - (s.outcome === 'win' ? 9 : 2), 10, 11);
    }

    /* ───────── boucle ───────── */
    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.curtainGust = Math.max(0, s.curtainGust - dt * 0.9);
        s.gust = Math.max(0, s.gust - dt * 1.1);
        s.pjAng = 0.04 * Math.sin(s.t * 1.4) + s.gust * 0.24 * Math.sin(s.t * 7);
        s.ph += dt * s.bpm / 60;

        if (api.ended) {
          s.endT += dt;
          if (s.endT > (s.outcome === 'heart' ? 0.7 : 0.05)) s.lightK = Math.min(1, s.lightK + dt * 3);
          if (s.outcome === 'win') s.bpm = Math.max(80, s.bpm - dt * 50);
          return;
        }

        // ── le rideau frémit (alerte), puis la silhouette « bouge »
        if (s.warn > 0) {
          s.warn -= dt;
          if (s.warn <= 0) { s.sway = 0.9; s.gust = 1; s.hitThis = false; s.bpm += 5; api.sfx('whoosh'); }
        } else if (s.sway > 0) {
          s.sway -= dt;
        } else {
          s.nextEv -= dt;
          if (s.nextEv <= 0) {
            s.warn = 0.55; s.curtainGust = 1; s.nextEv = rand(1.4, 2.4);
            api.sfx('grain'); say('Le rideau frémit…', 0.7, '#cfe0ff', true);
          }
        }

        // ── avancer (le cœur s'emballe) ou se figer et respirer
        const go = input.held('action') || input.held('right');
        s.moving = go;
        const pr = prox();
        if (go) {
          s.p = Math.min(1, s.p + dt / TRIP);
          s.walkT += dt;
          s.bpm += (8 + 20 * pr) * dt;
          if (s.sway > 0) {
            s.bpm += 10 * dt;
            if (!s.hitThis) { s.hitThis = true; s.bpm += 26; api.shake(10); api.sfx('ouch'); say('IL A BOUGÉ !!', 1, '#ffb0b0', true); }
          } else if (s.p < OUT) say('Tu te glisses hors du lit…', 0.3, '#e8eaff');
        } else {
          s.bpm -= (24 - 10 * pr) * dt;
          if (s.sway > 0) say('Ne bouge plus…', 0.4, '#ffe0c0');
          else say('Respire…', 0.3, '#d8ffd0');
        }
        s.bpm = Math.max(80 + 3 * s.t, s.bpm);
        if (s.p >= 1) { finish('win'); return; }
        if (s.bpm >= MAXBPM) { s.bpm = MAXBPM; finish('heart'); }
      },
      timeout() { finish('dawn'); return false; },
      draw(g) {
        const L = s.lightK;
        const bpm = s.bpm;
        // ── la chambre
        g.drawImage(bg, 0, 0);
        drawSwitch(g);
        drawCoat(g, false); drawCurtain(g, false); drawChair(g, false);
        drawPyjama(g, L);
        g.drawImage(bedBack, 0, 0);

        // ── Papa
        const px = papaX();
        const lost = s.outcome === 'heart' || s.outcome === 'dawn';
        const expr = s.outcome === 'win' ? (s.endT > 0.5 ? 'laugh' : 'surprised')
          : s.outcome === 'heart' ? 'ouch' : s.outcome === 'dawn' ? 'worried'
          : bpm > 165 ? 'panic' : bpm > 125 ? 'surprised' : 'worried';
        const shiver = api.ended ? 0 : clamp((bpm - 90) / 110, 0, 1);
        const look = { lookX: clamp((HOOK.x - px) / 250, -1, 1), lookY: -0.3 };
        if (s.p < OUT) {
          api.avatar(g, { x: px + Math.sin(s.t * 47) * shiver * 1.5, y: PY, size: 66, pose: 'sit', t: s.t, expression: expr, sweat: bpm > 130 || lost, ...look });
        }
        g.drawImage(quilt, 0, 0);
        // Maman (endormie… ou réveillée par la chute)
        const up = s.outcome === 'heart' ? clamp((s.endT - 0.5) / 0.25, 0, 1) : 0;
        g.save();
        g.translate(MAMAN.x + up * 14, MAMAN.y - up * 52); g.rotate(-0.42 * (1 - up));
        drawPerson(g, { ...PEOPLE.maman, body: false, x: 0, y: 0, size: 48, expression: up > 0 ? 'surprised' : 'sleep', t: s.t });
        g.restore();
        g.fillStyle = '#d77e6c';
        g.beginPath(); g.moveTo(78, H); g.quadraticCurveTo(92, 494 - up * 30, 130, 490); g.lineTo(150, H); g.closePath(); g.fill();

        if (s.p >= OUT) {
          const fall = s.outcome === 'heart' ? clamp(s.endT / 0.45, 0, 1) : 0;
          const cheer = s.outcome === 'win' && s.endT > 0.6;
          const reach = (s.outcome === 'win' || s.p > 0.93) && !cheer && !fall;
          g.save(); g.translate(px, FEET); g.rotate(-1.45 * fall * fall);
          const info = api.avatar(g, {
            x: Math.sin(s.t * 47) * shiver * 1.4, y: 0, size: 66, t: s.walkT * 0.5, expression: expr,
            pose: s.moving && !api.ended ? 'run' : cheer ? 'cheer' : 'stand',
            hands: reach ? { l: { x: -30, y: -110 }, r: { x: SW.x - px, y: SW.y - FEET } } : undefined,
            tilt: Math.sin(s.t * 41) * 0.03 * shiver, sweat: bpm > 130 || lost, ...look,
          });
          if (fall >= 1) {
            for (let i = 0; i < 4; i++) {
              const a = s.t * 4 + i * Math.PI / 2;
              api.text(g, '★', info.hx + Math.cos(a) * 34, info.hy - 30 + Math.sin(a) * 10, { size: 16, color: '#ffe680' });
            }
          }
          g.restore();
        }

        // ── l'obscurité (lueur de lune autour de Papa)
        if (L < 1) {
          sg.clearRect(0, 0, shade.width, shade.height);
          sg.drawImage(mask, 0, 0);
          sg.globalCompositeOperation = 'destination-out';
          const hole = (x, y, r, a) => {
            const gr = sg.createRadialGradient(x + PAD, y + PAD, 0, x + PAD, y + PAD, r);
            gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
            sg.fillStyle = gr; sg.beginPath(); sg.arc(x + PAD, y + PAD, r, 0, Math.PI * 2); sg.fill();
          };
          hole(px, s.p < OUT ? 360 : 400, 170, 0.6);
          hole(SW.x, SW.y, 46, 0.55);
          sg.globalCompositeOperation = 'source-over';
          g.globalAlpha = 1 - L;
          g.drawImage(shade, -PAD, -PAD);
          g.globalAlpha = 1;
        }

        // ── les « yeux » de la silhouette, plus vifs quand elle bouge
        {
          const a = (1 - L) * (s.sway > 0 ? 1 : 0.7);
          const blink = Math.sin(s.t * 0.9) > 0.96;
          for (const d of [-6, 6]) {
            const ly = 35;
            eyeGlow(g, HOOK.x + d * Math.cos(s.pjAng) - ly * Math.sin(s.pjAng), HOOK.y + d * Math.sin(s.pjAng) + ly * Math.cos(s.pjAng), a, blink);
          }
        }
        // ── interrupteur phosphorescent
        if (L < 1) {
          const k = 0.5 + 0.3 * Math.sin(s.t * 3);
          g.fillStyle = `rgba(150, 255, 170, ${k * (1 - L)})`; g.beginPath(); g.arc(SW.x, SW.y + 4, 3.5, 0, Math.PI * 2); g.fill();
          if (s.t < 3 && !api.ended) api.text(g, 'interrupteur ↓', SW.x - 34, SW.y - 44, { size: 16, color: `rgba(200, 255, 210, ${1 - s.t / 3})`, stroke: '#000a', strokeWidth: 4 });
        }

        // ── le cœur bat dans les bords de l'écran
        const ph = s.ph % 1;
        const beat = Math.exp(-ph * 9) + (ph > 0.22 ? 0.6 * Math.exp(-(ph - 0.22) * 12) : 0);
        if (bpm > 130 && !api.ended) { g.globalAlpha = clamp((bpm - 130) / 70, 0, 1) * (0.35 + 0.4 * beat); g.drawImage(vign, 0, 0); g.globalAlpha = 1; }

        // ── conclusions
        if (s.outcome === 'win') {
          api.text(g, '… C’est un pyjama.', W / 2, 250, { size: 40, color: '#fff', stroke: '#4a2a6a', strokeWidth: 8 });
          api.text(g, 'z', MAMAN.x + 34, MAMAN.y - 40, { size: 18, color: '#7a8ab0' });
        } else if (s.outcome === 'heart') {
          api.text(g, 'BOUM… BOUM… BOUM !', W / 2 + 40, 200 - Math.min(1, s.endT * 3) * 20, { size: 40, color: '#ffe0e0', stroke: '#7a1020', strokeWidth: 8 });
          if (up > 0.6) {
            api.roundRect(g, 140, 352, 96, 40, 12); g.fillStyle = '#fffaf0'; g.fill();
            api.text(g, 'Quoi ?!', 188, 372, { size: 22, color: '#c8486b' });
          }
          if (L > 0.5) api.text(g, '… c’était un pyjama.', W / 2 + 60, 262, { size: 30, color: '#fff', stroke: '#4a2a6a', strokeWidth: 8 });
        } else if (s.outcome === 'dawn') {
          if (L > 0.5) api.text(g, 'Le jour se lève… sur un pyjama.', W / 2 + 40, 250, { size: 32, color: '#fff', stroke: '#4a2a6a', strokeWidth: 8 });
        } else {
          const zz = (s.t * 0.6) % 1;
          api.text(g, 'z', MAMAN.x + 30 + zz * 20, MAMAN.y - 30 - zz * 40, { size: 14 + zz * 10, color: `rgba(220, 230, 255, ${0.8 * (1 - zz)})` });
        }
        if (s.msgT > 0 && !api.ended) api.text(g, s.msg, 640, 120, { size: 26, color: s.msgCol, stroke: '#000c' });

        // ── HUD : battements du cœur
        api.roundRect(g, 20, 22, 380, 44, 14); g.fillStyle = 'rgba(10, 8, 25, 0.75)'; g.fill();
        const hs = 1 + 0.25 * beat;
        g.save(); g.translate(44, 44); g.scale(hs, hs);
        g.fillStyle = '#e8504a';
        g.beginPath(); g.moveTo(0, 9); g.bezierCurveTo(-16, -2, -9, -15, 0, -6); g.bezierCurveTo(9, -15, 16, -2, 0, 9); g.fill();
        g.restore();
        api.text(g, `${Math.round(bpm)} BPM`, 104, 44, { size: 17, color: '#ffe7e0' });
        g.fillStyle = '#2a2238'; g.fillRect(146, 36, 240, 16);
        const k = clamp((bpm - 60) / (MAXBPM - 60), 0, 1);
        g.fillStyle = bpm < 130 ? '#7fd18b' : bpm < 170 ? '#f2b33d' : '#e8504a';
        g.fillRect(146, 36, 240 * k, 16);
      },
    };
  },
};

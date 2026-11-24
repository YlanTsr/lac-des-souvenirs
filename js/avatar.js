/**
 * ═══════════════════════════════════════════════════════════
 *  L'avatar de Papa — deux versions qui partagent la même « fiche » :
 *   • Avatar3D      : low-poly (≈ 25 petits meshes, aucune lumière ajoutée) assis dans la barque.
 *   • drawAvatar2D  : dessin vectoriel Canvas 2D pour l'interface et les mini-jeux.
 *   • avatarPortrait: portrait PNG (dataURL, mis en cache) pour les cartes HTML.
 *
 *  Traits : ~55 ans, tête un peu ronde, cheveux très très courts en « fer à cheval »
 *  (calvitie sur le crâne et le front), visage rasé de près (léger duvet à peine visible).
 *  ✏️ Pour ajuster la ressemblance, modifie seulement l'objet LOOK ci-dessous.
 * ═══════════════════════════════════════════════════════════
 */
import * as THREE from 'three';

export const LOOK = {
  skin: '#efc29e',        // carnation
  skinLight: '#f8d6ba',   // reflet (front, joues)
  skinShade: '#d49a76',   // ombre
  skinLine: '#b27657',    // traits (nez, rides)
  hair: '#6c635d',        // cheveux très courts (gris-brun)
  hairDark: '#4e4641',    // sourcils
  shirt: '#4f7cac',       // polo
  shirtDark: '#3d6390',
  collar: '#e9eef5',
  pants: '#3c415e',
  shoes: '#2a2522',
  lips: '#a65a4a',
};

/* ═══════════════════════════ VERSION 2D ═══════════════════════════ */

const hash = (i) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Dessine Papa sur un contexte Canvas 2D.
 *
 * @param {CanvasRenderingContext2D} g
 * @param {object} o
 *  - x, y        : avec body=true → position des PIEDS au sol ; avec body=false → centre de la tête
 *  - size        : diamètre de la tête en px (le corps est proportionnel)
 *  - expression  : 'smile' | 'happy' | 'laugh' | 'surprised' | 'ouch' | 'worried' | 'focus' | 'panic'
 *                  | 'blow' (joues gonflées, yeux fermés, bouche en « o » — gonflement réglé par puff 0..1)
 *  - pose        : 'stand' | 'run' | 'duck' | 'sit' | 'cheer'
 *  - t           : temps (s) pour les animations de pose (course…)
 *  - hands       : { l:{x,y}, r:{x,y} } positions absolues des mains (sinon pose par défaut)
 *  - lookX/lookY : direction du regard (-1..1)
 *  - tilt        : inclinaison de la tête (rad) ; flipX : miroir horizontal
 *  - scratches, blush (0..1), sweat (bool), tears (bool), stains (nb de taches de yaourt sur le pantalon)
 * @returns {{hx:number, hy:number, r:number, shoulders:{l:{x,y}, r:{x,y}}}}
 */
export function drawAvatar2D(g, o = {}) {
  const r = (o.size ?? 80) / 2;
  const x = o.x ?? 0, y = o.y ?? 0;
  let info;
  g.save();
  if (o.flipX) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
  if (o.body !== false) {
    info = drawBody(g, x, y, r, o);
  } else {
    info = { hx: x, hy: y, r, headTilt: 0, shoulders: null };
  }
  drawHead(g, info.hx, info.hy, r, { ...o, tilt: (o.tilt || 0) + (info.headTilt || 0) });
  g.restore();
  return info;
}

function limb(g, ax, ay, bx, by, cx, cy, w, colorA, colorB) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = w;
  g.strokeStyle = colorA;
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
  g.strokeStyle = colorB ?? colorA;
  g.beginPath(); g.moveTo(bx, by); g.lineTo(cx, cy); g.stroke();
}

/** Coude / genou : point milieu décalé perpendiculairement (bend > 0 = vers l'extérieur). */
function joint(ax, ay, cx, cy, len, bend) {
  const mx = (ax + cx) / 2, my = (ay + cy) / 2;
  const dx = cx - ax, dy = cy - ay;
  const d = Math.hypot(dx, dy) || 1;
  const h = Math.sqrt(Math.max(0, (len / 2) ** 2 - (d / 2) ** 2)) * Math.sign(bend || 1);
  return [mx + (-dy / d) * h, my + (dx / d) * h];
}

function drawBody(g, x, y, r, o) {
  const pose = o.pose || 'stand';
  const t = o.t || 0;
  const L = LOOK;
  const legLen = 2.0 * r;
  const armLen = 1.9 * r;
  let hipY = y - 1.9 * r;
  let lean = 0;          // décalage horizontal des épaules (penché en avant)
  let torsoH = 2.05 * r;
  let feet = [[x - 0.42 * r, y], [x + 0.42 * r, y]];
  let headTilt = 0;
  let bob = 0;

  if (pose === 'run') {
    const s = Math.sin(t * 13);
    bob = -Math.abs(Math.cos(t * 13)) * 0.22 * r;
    feet = [[x + s * 0.9 * r, y - Math.max(0, -s) * 0.5 * r], [x - s * 0.9 * r, y - Math.max(0, s) * 0.5 * r]];
    lean = 0.25 * r;
  } else if (pose === 'duck') {
    hipY = y - 0.95 * r;
    lean = 1.2 * r;
    torsoH = 1.45 * r;
    feet = [[x - 0.5 * r, y], [x + 0.55 * r, y]];
    headTilt = 0.35;
  } else if (pose === 'sit') {
    hipY = y;
    feet = [[x + 1.4 * r, y + 0.2 * r], [x + 1.6 * r, y + 0.25 * r]];
  }
  hipY += bob;

  // ── jambes
  for (let i = 0; i < 2; i++) {
    const hx = x + (i ? 0.3 : -0.3) * r;
    const [fx, fy] = feet[i];
    const [kx, ky] = joint(hx, hipY, fx, fy, legLen, pose === 'duck' || pose === 'sit' ? -1 : (i ? -0.4 : -0.4));
    limb(g, hx, hipY, kx, ky, fx, fy - 0.12 * r, 0.56 * r, L.pants);
    g.fillStyle = L.shoes;
    g.beginPath(); g.ellipse(fx + 0.12 * r, fy - 0.1 * r, 0.34 * r, 0.16 * r, 0, 0, Math.PI * 2); g.fill();
  }
  // taches de yaourt (mini-jeu du métro)
  if (o.stains) {
    g.fillStyle = '#fff6ee';
    for (let i = 0; i < o.stains * 5; i++) {
      g.beginPath();
      g.arc(x + (hash(i + 3) - 0.5) * 1.2 * r, hipY + hash(i + 9) * 1.0 * r, (0.08 + hash(i) * 0.12) * r, 0, Math.PI * 2);
      g.fill();
    }
  }

  // ── torse (polo, petit ventre de 55 ans assumé)
  const sx = x + lean, sy = hipY - torsoH;
  g.fillStyle = L.shirt;
  g.beginPath();
  g.moveTo(sx - 1.05 * r, sy + 0.2 * r);
  g.quadraticCurveTo(sx - 1.1 * r, sy - 0.05 * r, sx - 0.7 * r, sy - 0.08 * r);
  g.lineTo(sx + 0.7 * r, sy - 0.08 * r);
  g.quadraticCurveTo(sx + 1.1 * r, sy - 0.05 * r, sx + 1.05 * r, sy + 0.2 * r);
  g.quadraticCurveTo(x + 1.25 * r + lean * 0.4, hipY - 0.8 * r, x + 0.95 * r, hipY + 0.05 * r);
  g.lineTo(x - 0.95 * r, hipY + 0.05 * r);
  g.quadraticCurveTo(x - 1.2 * r + lean * 0.4, hipY - 0.8 * r, sx - 1.05 * r, sy + 0.2 * r);
  g.closePath();
  g.fill();
  // ceinture
  g.fillStyle = L.pants;
  g.fillRect(x - 0.95 * r, hipY - 0.12 * r, 1.9 * r, 0.2 * r);
  // col de polo
  g.fillStyle = L.collar;
  g.beginPath();
  g.moveTo(sx - 0.42 * r, sy - 0.1 * r); g.lineTo(sx, sy + 0.45 * r); g.lineTo(sx + 0.42 * r, sy - 0.1 * r);
  g.lineTo(sx + 0.22 * r, sy - 0.1 * r); g.lineTo(sx, sy + 0.2 * r); g.lineTo(sx - 0.22 * r, sy - 0.1 * r);
  g.closePath(); g.fill();
  g.fillStyle = L.shirtDark;
  g.beginPath(); g.arc(sx, sy + 0.62 * r, 0.06 * r, 0, Math.PI * 2); g.arc(sx, sy + 0.85 * r, 0.06 * r, 0, Math.PI * 2); g.fill();

  // ── bras (manches courtes : haut du bras = polo, avant-bras = peau)
  const shoulders = { l: { x: sx - 0.9 * r, y: sy + 0.18 * r }, r: { x: sx + 0.9 * r, y: sy + 0.18 * r } };
  let hands = o.hands;
  if (!hands) {
    if (pose === 'cheer') {
      const w = Math.sin(t * 8) * 0.15 * r;
      hands = { l: { x: sx - 1.3 * r + w, y: sy - 1.6 * r }, r: { x: sx + 1.3 * r - w, y: sy - 1.6 * r } };
    } else if (pose === 'run') {
      const s = Math.sin(t * 13);
      hands = { l: { x: sx - 0.7 * r - s * 0.7 * r, y: sy + 1.5 * r }, r: { x: sx + 0.7 * r + s * 0.7 * r, y: sy + 1.5 * r } };
    } else if (pose === 'duck') {
      hands = { l: { x: sx - 0.5 * r, y: sy + 1.6 * r }, r: { x: sx + 1.2 * r, y: sy + 1.5 * r } };
    } else {
      hands = { l: { x: sx - 1.15 * r, y: sy + 1.85 * r }, r: { x: sx + 1.15 * r, y: sy + 1.85 * r } };
    }
  }
  const reached = {};
  for (const side of ['l', 'r']) {
    const s = shoulders[side];
    let h = hands[side];
    // portée maximale du bras : si la cible est trop loin, la main s'arrête au bout du bras
    const d = Math.hypot(h.x - s.x, h.y - s.y);
    if (d > armLen * 0.98) h = { x: s.x + ((h.x - s.x) * armLen * 0.98) / d, y: s.y + ((h.y - s.y) * armLen * 0.98) / d };
    reached[side] = h;
    const [ex, ey] = joint(s.x, s.y, h.x, h.y, armLen, side === 'l' ? 1 : -1);
    // haut du bras (manche) puis avant-bras
    g.lineCap = 'round';
    g.lineWidth = 0.46 * r;
    g.strokeStyle = L.shirt;
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + (ex - s.x) * 0.6, s.y + (ey - s.y) * 0.6); g.stroke();
    g.lineWidth = 0.34 * r;
    g.strokeStyle = L.skin;
    g.beginPath(); g.moveTo(s.x + (ex - s.x) * 0.55, s.y + (ey - s.y) * 0.55); g.lineTo(ex, ey); g.lineTo(h.x, h.y); g.stroke();
    g.fillStyle = L.skin;
    g.beginPath(); g.arc(h.x, h.y, 0.22 * r, 0, Math.PI * 2); g.fill();
  }

  // ── cou
  g.fillStyle = L.skinShade;
  g.fillRect(sx - 0.25 * r, sy - 0.45 * r, 0.5 * r, 0.45 * r);

  return { hx: sx + (pose === 'duck' ? 0.35 * r : 0), hy: sy - 1.0 * r, r, headTilt, shoulders, hands: reached };
}

function drawHead(g, x, y, r, o) {
  const L = LOOK;
  const ex = o.expression || 'smile';
  const lx = (o.lookX || 0) * 0.05 * r, ly = (o.lookY || 0) * 0.04 * r;
  g.save();
  g.translate(x, y);
  g.rotate(o.tilt || 0);

  // oreilles
  for (const s of [-1, 1]) {
    g.fillStyle = L.skin;
    g.beginPath(); g.ellipse(s * 0.97 * r, 0.06 * r, 0.17 * r, 0.25 * r, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = L.skinShade;
    g.beginPath(); g.ellipse(s * 0.99 * r, 0.07 * r, 0.08 * r, 0.15 * r, 0, 0, Math.PI * 2); g.fill();
  }

  // tête un peu ronde (légèrement plus large en bas : bonne bouille)
  const headPath = new Path2D();
  headPath.ellipse(0, 0, r, r * 1.03, 0, 0, Math.PI * 2);
  const grd = g.createRadialGradient(-0.3 * r, -0.45 * r, 0.1 * r, 0, 0.1 * r, 1.15 * r);
  grd.addColorStop(0, L.skinLight);
  grd.addColorStop(0.55, L.skin);
  grd.addColorStop(1, L.skinShade);
  g.fillStyle = grd;
  g.fill(headPath);

  // cheveux très très courts en « fer à cheval » : seulement sur les côtés (calvitie dessus + front)
  g.save();
  g.clip(headPath);
  g.fillStyle = 'rgba(98, 88, 82, 0.5)';
  for (const s of [-1, 1]) {
    g.beginPath(); g.ellipse(s * 1.02 * r, -0.04 * r, 0.33 * r, 0.52 * r, s * 0.15, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(70, 62, 58, 0.45)'; // texture « tondeuse »
  for (let i = 0; i < 40; i++) {
    const s = i % 2 ? 1 : -1;
    const px = s * (0.74 * r + hash(i) * 0.28 * r);
    const py = -0.46 * r + hash(i + 50) * 0.82 * r;
    g.beginPath(); g.arc(px, py, 0.022 * r, 0, Math.PI * 2); g.fill();
  }
  // très léger duvet sur la mâchoire (quasi invisible : rasé de près)
  g.fillStyle = 'rgba(90, 80, 75, 0.09)';
  for (let i = 0; i < 34; i++) {
    const px = (hash(i + 200) - 0.5) * 1.2 * r;
    const py = 0.5 * r + hash(i + 300) * 0.48 * r;
    g.beginPath(); g.arc(px, py, 0.02 * r, 0, Math.PI * 2); g.fill();
  }
  g.restore();

  // joues gonflées (souffler les bougies) : elles débordent un peu de la silhouette
  if (ex === 'blow') {
    const k = 0.55 + 0.45 * (o.puff ?? 1);
    for (const s of [-1, 1]) {
      const cg = g.createRadialGradient(s * 0.56 * r, 0.22 * r, 0.02 * r, s * 0.64 * r, 0.3 * r, 0.44 * r * k);
      cg.addColorStop(0, L.skinLight);
      cg.addColorStop(0.7, L.skin);
      cg.addColorStop(1, L.skinShade);
      g.fillStyle = cg;
      g.beginPath(); g.ellipse(s * 0.64 * r, 0.3 * r, 0.4 * r * k, 0.32 * r * k, 0, 0, Math.PI * 2); g.fill();
    }
  }

  // reflet sur le crâne
  g.fillStyle = 'rgba(255, 255, 255, 0.38)';
  g.beginPath(); g.ellipse(-0.3 * r, -0.68 * r, 0.27 * r, 0.11 * r, -0.45, 0, Math.PI * 2); g.fill();

  // rides du front (55 ans, sagesse incluse)
  g.strokeStyle = 'rgba(178, 118, 87, 0.42)';
  g.lineWidth = 0.032 * r;
  g.lineCap = 'round';
  const browLift = ex === 'surprised' || ex === 'panic' ? -0.07 * r : 0;
  for (const [yy, w] of [[-0.44, 0.32], [-0.34, 0.24]]) {
    g.beginPath(); g.moveTo(-w * r, yy * r + browLift); g.quadraticCurveTo(0, (yy - 0.05) * r + browLift, w * r, yy * r + browLift); g.stroke();
  }

  // sourcils
  g.strokeStyle = L.hairDark;
  g.lineWidth = 0.075 * r;
  const brows = {
    smile: [-0.24, -0.25], happy: [-0.27, -0.26], laugh: [-0.27, -0.26], surprised: [-0.38, -0.36], panic: [-0.38, -0.34],
    ouch: [-0.17, -0.31], worried: [-0.32, -0.22], focus: [-0.17, -0.25], blow: [-0.21, -0.29],
  }[ex] || [-0.24, -0.25];
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * 0.17 * r, brows[0] * r);
    g.quadraticCurveTo(s * 0.33 * r, (Math.min(brows[0], brows[1]) - 0.04) * r, s * 0.5 * r, brows[1] * r);
    g.stroke();
  }

  // yeux
  const eyeY = -0.04 * r;
  g.fillStyle = '#2b211d';
  g.strokeStyle = '#2b211d';
  g.lineWidth = 0.055 * r;
  for (const s of [-1, 1]) {
    const cx = s * 0.34 * r;
    if (ex === 'happy' || ex === 'laugh') {
      g.beginPath(); g.arc(cx, eyeY + 0.04 * r, 0.09 * r, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    } else if (ex === 'blow') {
      // yeux plissés par l'effort
      g.beginPath(); g.moveTo(cx - 0.1 * r, eyeY - 0.01 * r); g.quadraticCurveTo(cx, eyeY + 0.05 * r, cx + 0.1 * r, eyeY - 0.01 * r); g.stroke();
    } else if (ex === 'ouch') {
      g.beginPath();
      g.moveTo(cx - s * 0.1 * r, eyeY - 0.07 * r); g.lineTo(cx + s * 0.06 * r, eyeY); g.lineTo(cx - s * 0.1 * r, eyeY + 0.07 * r);
      g.stroke();
    } else if (ex === 'surprised' || ex === 'panic') {
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(cx, eyeY, 0.12 * r, 0.14 * r, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2b211d';
      g.beginPath(); g.arc(cx + lx, eyeY + ly, 0.06 * r, 0, Math.PI * 2); g.fill();
    } else {
      const h = ex === 'focus' ? 0.06 : 0.09;
      g.beginPath(); g.ellipse(cx + lx, eyeY + ly, 0.07 * r, h * r, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath(); g.arc(cx + lx - 0.025 * r, eyeY + ly - 0.03 * r, 0.022 * r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2b211d';
    }
    // pattes d'oie quand il sourit
    if (ex === 'smile' || ex === 'happy' || ex === 'laugh') {
      g.strokeStyle = 'rgba(178, 118, 87, 0.5)';
      g.lineWidth = 0.025 * r;
      g.beginPath();
      g.moveTo(s * 0.5 * r, eyeY - 0.04 * r); g.lineTo(s * 0.58 * r, eyeY - 0.08 * r);
      g.moveTo(s * 0.51 * r, eyeY + 0.03 * r); g.lineTo(s * 0.59 * r, eyeY + 0.05 * r);
      g.stroke();
      g.strokeStyle = '#2b211d';
      g.lineWidth = 0.055 * r;
    }
  }

  // nez
  g.strokeStyle = L.skinLine;
  g.lineWidth = 0.045 * r;
  g.beginPath();
  g.moveTo(0.03 * r, 0.0);
  g.quadraticCurveTo(0.16 * r, 0.2 * r, 0.0, 0.25 * r);
  g.stroke();
  g.fillStyle = 'rgba(178, 118, 87, 0.35)';
  g.beginPath(); g.ellipse(-0.06 * r, 0.24 * r, 0.05 * r, 0.03 * r, 0, 0, Math.PI * 2); g.fill();

  // joues
  const blush = 0.18 + (o.blush || 0) * 0.45 + (ex === 'blow' ? 0.22 * (o.puff ?? 1) : 0);
  g.fillStyle = `rgba(230, 120, 110, ${blush})`;
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 0.55 * r, 0.25 * r, 0.16 * r, 0.1 * r, 0, 0, Math.PI * 2); g.fill(); }

  // bouche
  const my = 0.47 * r;
  g.strokeStyle = L.lips;
  g.fillStyle = '#6e2a25';
  g.lineWidth = 0.055 * r;
  switch (ex) {
    case 'happy':
    case 'laugh': {
      const w = ex === 'laugh' ? 0.34 : 0.28, d = ex === 'laugh' ? 0.36 : 0.26;
      g.beginPath(); g.moveTo(-w * r, my - 0.06 * r); g.quadraticCurveTo(0, my + d * r * 1.6, w * r, my - 0.06 * r); g.closePath(); g.fill();
      g.fillStyle = '#fff';
      g.fillRect(-w * 0.75 * r, my - 0.05 * r, w * 1.5 * r, 0.07 * r);
      g.fillStyle = '#d9726a';
      g.beginPath(); g.ellipse(0, my + d * 0.55 * r, w * 0.45 * r, 0.06 * r, 0, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'surprised':
      g.beginPath(); g.ellipse(0, my + 0.02 * r, 0.09 * r, 0.13 * r, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'panic':
      g.beginPath(); g.ellipse(0, my + 0.04 * r, 0.2 * r, 0.16 * r, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.fillRect(-0.14 * r, my - 0.1 * r, 0.28 * r, 0.06 * r);
      break;
    case 'ouch':
      g.beginPath(); g.ellipse(0, my + 0.02 * r, 0.27 * r, 0.12 * r, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 0.04 * r;
      g.beginPath();
      for (let i = 0; i <= 6; i++) { const px = -0.22 * r + i * 0.073 * r; const py = my + (i % 2 ? 0.05 : -0.04) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
      break;
    case 'worried':
      g.beginPath();
      g.moveTo(-0.18 * r, my + 0.04 * r);
      g.bezierCurveTo(-0.08 * r, my - 0.04 * r, 0.06 * r, my + 0.1 * r, 0.18 * r, my + 0.02 * r);
      g.stroke();
      break;
    case 'blow': // lèvres en « o » (on souffle)
      g.fillStyle = L.lips;
      g.beginPath(); g.ellipse(0.02 * r, my + 0.02 * r, 0.12 * r, 0.1 * r, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a201c';
      g.beginPath(); g.ellipse(0.03 * r, my + 0.02 * r, 0.055 * r, 0.045 * r, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'focus':
      g.beginPath(); g.moveTo(-0.14 * r, my); g.lineTo(0.14 * r, my); g.stroke();
      g.fillStyle = '#d9726a';
      g.beginPath(); g.ellipse(0.13 * r, my + 0.05 * r, 0.06 * r, 0.05 * r, 0.4, 0, Math.PI * 2); g.fill();
      break;
    default: // smile
      g.beginPath(); g.moveTo(-0.24 * r, my - 0.03 * r); g.quadraticCurveTo(0, my + 0.17 * r, 0.24 * r, my - 0.03 * r); g.stroke();
  }

  // griffures (fil barbelé)
  if (o.scratches) {
    g.strokeStyle = 'rgba(200, 40, 40, 0.75)';
    g.lineWidth = 0.03 * r;
    for (let i = 0; i < Math.min(5, o.scratches); i++) {
      const sx = (hash(i + 7) - 0.5) * 1.1 * r, sy = (-0.55 + hash(i + 17) * 0.9) * r;
      g.beginPath(); g.moveTo(sx - 0.15 * r, sy - 0.05 * r); g.lineTo(sx + 0.15 * r, sy + 0.05 * r); g.stroke();
      g.beginPath(); g.moveTo(sx - 0.1 * r, sy + 0.03 * r); g.lineTo(sx + 0.1 * r, sy + 0.1 * r); g.stroke();
    }
  }
  // goutte de sueur
  if (o.sweat) {
    g.fillStyle = 'rgba(150, 210, 255, 0.9)';
    g.beginPath();
    g.moveTo(0.78 * r, -0.5 * r);
    g.quadraticCurveTo(0.9 * r, -0.28 * r, 0.78 * r, -0.24 * r);
    g.quadraticCurveTo(0.66 * r, -0.28 * r, 0.78 * r, -0.5 * r);
    g.fill();
  }
  // larmes (de douleur ou de rire)
  if (o.tears) {
    g.fillStyle = 'rgba(140, 200, 255, 0.85)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 0.42 * r, 0.12 * r, 0.04 * r, 0.08 * r, 0, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
}

/** Portrait buste (PNG en dataURL, mis en cache par expression) pour les cartes HTML. */
const portraitCache = new Map();
export function avatarPortrait(expression = 'smile', size = 240) {
  const key = `${expression}:${size}`;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const head = size * 0.54;
  // buste : on dessine le corps debout et on cadre sur le haut (tête centrée à 42 % de la hauteur)
  drawAvatar2D(g, { x: size / 2, y: size * 0.42 + head * 2.475, size: head, expression, pose: 'stand' });
  const url = c.toDataURL('image/png');
  portraitCache.set(key, url);
  return url;
}

/* ═══════════════════════════ VERSION 3D ═══════════════════════════ */

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Papa en low-poly, assis face à l'arrière de la barque (comme un vrai rameur),
 * donc face à la caméra qui suit la barque.
 * Repère local : l'avatar regarde vers +z, origine = surface du banc.
 */
export class Avatar3D {
  constructor() {
    this.group = new THREE.Group();
    this.cheer = 0;        // 0..1 : bras levés (allumage d'une lanterne)
    this._cheerTimer = 0;
    this.lookUp = 0;       // 0..1 : regarde vers le ciel
    this._tmpA = new THREE.Vector3();
    this._tmpB = new THREE.Vector3();
    this._build();
  }

  _build() {
    const L = LOOK;
    // Légère émission : le visage reste lisible la nuit (la lanterne l'éclaire de dos) sans lumière en plus
    const skin = new THREE.MeshLambertMaterial({ color: L.skin, emissive: '#5a3524' });
    const hair = new THREE.MeshLambertMaterial({ color: L.hair, emissive: '#1c1816' });
    const dark = new THREE.MeshBasicMaterial({ color: '#2b211d' });
    const shirt = new THREE.MeshLambertMaterial({ color: L.shirt, flatShading: true, emissive: '#16283f' });
    const pants = new THREE.MeshLambertMaterial({ color: L.pants, flatShading: true });
    const collar = new THREE.MeshLambertMaterial({ color: L.collar, flatShading: true });
    const lips = new THREE.MeshBasicMaterial({ color: L.lips });
    this.mats = { skin, shirt };

    // Jambes assises
    const thighGeo = new THREE.BoxGeometry(0.15, 0.14, 0.42);
    const shinGeo = new THREE.BoxGeometry(0.13, 0.42, 0.13);
    for (const s of [-1, 1]) {
      const th = new THREE.Mesh(thighGeo, pants); th.position.set(s * 0.11, 0.07, 0.19);
      const sh = new THREE.Mesh(shinGeo, pants); sh.position.set(s * 0.11, -0.12, 0.4);
      this.group.add(th, sh);
    }

    // Torse (pivot au bassin pour se pencher en ramant)
    this.torso = new THREE.Group();
    this.group.add(this.torso);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.5, 8), shirt);
    body.position.y = 0.28;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), shirt);
    belly.scale.set(1, 0.85, 0.8);
    belly.position.set(0, 0.18, 0.06);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.06, 8), collar);
    col.position.y = 0.54;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.1, 6), skin);
    neck.position.y = 0.6;
    this.torso.add(body, belly, col, neck);

    // Tête
    this.head = new THREE.Group();
    this.head.position.y = 0.8;
    this.torso.add(this.head);
    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), skin);
    skull.scale.set(1, 1.03, 0.98);
    // Cheveux « fer à cheval » : bande sphérique tout autour SAUF devant (calvitie front + crâne)
    const gap = 0.95;
    const band = new THREE.Mesh(
      new THREE.SphereGeometry(0.207, 20, 6, Math.PI / 2 + gap, Math.PI * 2 - gap * 2, 1.02, 0.72),
      hair,
    );
    band.scale.copy(skull.scale);
    const ears = [-1, 1].map((s) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), skin);
      e.scale.set(0.45, 1, 0.75);
      e.position.set(s * 0.2, -0.01, -0.005);
      return e;
    });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.08, 5), skin);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.025, 0.215);
    const eyeGeo = new THREE.SphereGeometry(0.021, 6, 4);
    const browGeo = new THREE.BoxGeometry(0.07, 0.014, 0.02);
    const browMat = new THREE.MeshBasicMaterial({ color: L.hairDark });
    this.head.add(skull, band, ...ears, nose);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, dark); eye.position.set(s * 0.07, 0.03, 0.182);
      const brow = new THREE.Mesh(browGeo, browMat); brow.position.set(s * 0.072, 0.083, 0.185); brow.rotation.z = s * -0.12;
      this.head.add(eye, brow);
    }
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.014, 0.01), lips);
    this.mouth.position.set(0, -0.095, 0.183);
    this.head.add(this.mouth);

    // Bras : 2 segments orientés chaque frame (mini-IK à deux os)
    const upperGeo = new THREE.CylinderGeometry(0.055, 0.06, 1, 6);
    const foreGeo = new THREE.CylinderGeometry(0.042, 0.05, 1, 6);
    const handGeo = new THREE.SphereGeometry(0.05, 6, 4);
    this.arms = [-1, 1].map((s) => {
      const upper = new THREE.Mesh(upperGeo, shirt);
      const fore = new THREE.Mesh(foreGeo, skin);
      const hand = new THREE.Mesh(handGeo, skin);
      this.torso.add(upper, fore, hand);
      return { s, upper, fore, hand, shoulder: new THREE.Vector3(s * 0.235, 0.47, 0), target: new THREE.Vector3(s * 0.2, 0.25, 0.3) };
    });
  }

  /** Bras levés de joie pendant ~2,5 s (allumage d'une lanterne). */
  celebrate() { this._cheerTimer = 2.6; }

  /**
   * @param {object} s
   *  - handsWorld : [Vector3 gauche, Vector3 droite] poignées des rames (monde) ou null
   *  - rowPhase, rowing (0..1) : cycle de rame
   *  - roll, pitch : tangage de la barque (pour compenser la tête)
   *  - lookUp (0..1)
   *  - spread (0..1) : bras écartés (chute dans le tunnel de l'intro)
   */
  update(dt, t, s) {
    this._cheerTimer = Math.max(0, this._cheerTimer - dt);
    const cheerTarget = this._cheerTimer > 0 ? 1 : 0;
    this.cheer += (cheerTarget - this.cheer) * (1 - Math.exp(-dt * 5));
    this.lookUp += ((s.lookUp || this.cheer > 0.3 ? 1 : 0) - this.lookUp) * (1 - Math.exp(-dt * 2.5));

    // Le torse suit le geste de rame et compense le roulis
    const row = s.rowing || 0;
    this.torso.rotation.x = -Math.cos(s.rowPhase || 0) * 0.16 * row - this.cheer * 0.1;
    this.torso.rotation.z = -(s.roll || 0) * 0.5;
    // La tête reste à peu près droite (réflexe naturel) et regarde parfois le ciel
    this.head.rotation.z = -(s.roll || 0) * 0.6 + Math.sin(t * 0.7) * 0.04;
    this.head.rotation.x = -(s.pitch || 0) * 0.5 - this.lookUp * 0.55 + Math.sin(t * 0.5) * 0.03;
    this.head.rotation.y = Math.sin(t * 0.31) * 0.25 * (1 - row) * (1 - this.cheer);
    this.mouth.scale.y = 1 + this.cheer * 3.5;

    // Cibles des mains : poignées des rames (converties dans le repère du torse) ou bras levés
    this.torso.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      const a = this.arms[i];
      if (s.handsWorld && s.handsWorld[i]) {
        this._tmpA.copy(s.handsWorld[i]);
        this.torso.worldToLocal(this._tmpA);
      } else {
        this._tmpA.set(a.s * 0.18, 0.12, 0.25);
      }
      this._tmpB.set(a.s * (0.3 + Math.sin(t * 9) * 0.03), 1.08, 0.08); // bras en l'air
      a.target.lerpVectors(this._tmpA, this._tmpB, this.cheer);
      if (s.spread) {
        // bras grands ouverts, qui ondulent un peu (comme en chute libre)
        this._tmpB.set(a.s * 0.72, 0.56 + Math.sin(t * 3 + a.s) * 0.06, 0.06);
        a.target.lerp(this._tmpB, s.spread);
      }
      this._solveArm(a);
    }
  }

  _solveArm(a) {
    const S = a.shoulder, H = a.target;
    const len = 0.25; // longueur de chaque os
    const dir = this._tmpA.subVectors(H, S);
    let d = dir.length();
    if (d > len * 2 - 0.001) { dir.multiplyScalar((len * 2 - 0.001) / d); d = len * 2 - 0.001; }
    const hand = this._tmpB.copy(S).add(dir);
    // pôle du coude : vers l'extérieur et vers le bas
    const pole = new THREE.Vector3(a.s, -0.8, -0.3).normalize();
    const n = dir.clone().normalize();
    pole.addScaledVector(n, -pole.dot(n)).normalize();
    const h = Math.sqrt(Math.max(0, len * len - (d / 2) ** 2));
    const elbow = S.clone().addScaledVector(dir, 0.5).addScaledVector(pole, h);
    this._place(a.upper, S, elbow);
    this._place(a.fore, elbow, hand);
    a.hand.position.copy(hand);
  }

  _place(mesh, from, to) {
    const v = new THREE.Vector3().subVectors(to, from);
    const l = v.length() || 0.001;
    mesh.position.copy(from).addScaledVector(v, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, v.divideScalar(l));
    mesh.scale.set(1, l, 1);
  }
}

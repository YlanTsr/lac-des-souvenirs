/**
 * ═══════════════════════════════════════════════════════════
 *  Les autres personnages des anecdotes (Canvas 2D), dans le même style que Papa
 *  (grosse tête ronde, ~3 têtes de haut). Utilisé par les mini-jeux.
 *
 *  import { drawPerson, PEOPLE } from './people.js';
 *  drawPerson(g, { ...PEOPLE.mami, x: 300, y: 470, size: 70, expression: 'laugh', pose: 'run', t });
 *
 *  ✏️ Les couleurs / coiffures de chacun se changent dans PEOPLE ci-dessous.
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Personnages récurrents. `kind` : 'adult' | 'child' | 'baby'.
 * hair : 'short' | 'long' | 'bun' | 'pigtails' | 'curly' | 'bald' | 'cap' | 'ponytail'
 */
export const PEOPLE = {
  mami:     { skin: '#f1c8a8', hair: 'bun',      hairColor: '#d9d4cf', shirt: '#b5577a', pants: '#5b4a6a', glasses: true },
  papi:     { skin: '#efc4a0', hair: 'bald',     hairColor: '#e4e1dc', shirt: '#7d8f69', pants: '#4a4a52', mustache: true, glasses: true },
  pilou:    { skin: '#efc29e', hair: 'short',    hairColor: '#5a3e2b', shirt: '#e07b39', pants: '#4b5a7a', kind: 'child' },
  maman:    { skin: '#f3cfb3', hair: 'long',     hairColor: '#3b2a22', shirt: '#c8486b', pants: '#2f3550' },
  selena:   { skin: '#f3cfb3', hair: 'long',     hairColor: '#4a3226', shirt: '#e88fb4', pants: '#5a4a8a', kind: 'child', crown: true },
  ylan:     { skin: '#efc6a6', hair: 'short',    hairColor: '#3d2b21', shirt: '#4fa36b', pants: '#34405e', kind: 'child' },
  iordan:   { skin: '#efc6a6', hair: 'curly',    hairColor: '#4a3326', shirt: '#f2b33d', pants: '#34405e', kind: 'child' },
  michel:   { skin: '#e9b994', hair: 'cap',      hairColor: '#7a6f66', shirt: '#5d7a3e', pants: '#4d4a3a', capColor: '#3f5a2a', mustache: true },
  jose:     { skin: '#d9a47e', hair: 'short',    hairColor: '#2b2420', shirt: '#3a6fb0', pants: '#2c3a55', mustache: true },
  mamina:   { skin: '#f0c9aa', hair: 'bun',      hairColor: '#8a6a55', shirt: '#9a3d3d', pants: '#3a3340' },
  diado:    { skin: '#ecc19c', hair: 'short',    hairColor: '#cfcac4', shirt: '#5a6a8a', pants: '#3a3a44', mustache: true },
  cousine:  { skin: '#f3cfb3', hair: 'pigtails', hairColor: '#6b4a32', shirt: '#9fd0f0', pants: '#e88fb4', kind: 'child' },
  boy:      { skin: '#7a4a2e', hair: 'short',    hairColor: '#1c1512', shirt: '#f4f1ea', pants: '#6a5a46' },
  gardien:  { skin: '#6e4329', hair: 'cap',      hairColor: '#1c1512', shirt: '#4a5a3a', pants: '#3a3a2e', capColor: '#2f3a24' },
  voleur:   { skin: '#c99a74', hair: 'cap',      hairColor: '#222', shirt: '#2a2a33', pants: '#1f1f26', capColor: '#111', mask: true },
  infirmier:{ skin: '#5e3a24', hair: 'bald',     hairColor: '#1c1512', shirt: '#7fc8c0', pants: '#7fc8c0', big: true },
  policier: { skin: '#e9bf9c', hair: 'cap',      hairColor: '#3a2a20', shirt: '#2c3e6b', pants: '#1e2a48', capColor: '#1e2a48' },
  passant:  { skin: '#e4b896', hair: 'short',    hairColor: '#4a3a30', shirt: '#8a8a9a', pants: '#3a3a48' },
};

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
};

/**
 * Dessine un personnage.
 * @param {CanvasRenderingContext2D} g
 * @param {object} o  — un preset de PEOPLE + :
 *  x, y (pieds au sol ; avec body:false → centre de la tête), size (diamètre de la tête),
 *  expression : 'smile' | 'laugh' | 'surprised' | 'angry' | 'sleep' | 'scared' | 'love' | 'worried'
 *  pose : 'stand' | 'run' | 'sit' | 'arms_up' | 'point' | 'hug' ; t (s) pour animer ; flipX ; body (true)
 *  holding : 'left' | 'right' → renvoie la position de cette main pour y dessiner un objet
 * @returns {{hx, hy, r, handL:{x,y}, handR:{x,y}}}
 */
export function drawPerson(g, o = {}) {
  const kind = o.kind || 'adult';
  const scale = kind === 'child' ? 0.8 : kind === 'baby' ? 0.55 : 1;
  const r = ((o.size ?? 70) / 2);
  const x = o.x ?? 0, y = o.y ?? 0;
  const t = o.t ?? 0;
  const pose = o.pose || 'stand';
  const big = o.big ? 1.35 : 1;
  g.save();
  if (o.flipX) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
  let hx = x, hy = y, handL = { x, y }, handR = { x, y };

  if (o.body !== false) {
    const leg = 1.85 * r * scale, torso = 2.0 * r * scale * (kind === 'baby' ? 0.8 : 1);
    let bob = 0, lean = 0;
    let feet = [[x - 0.4 * r, y], [x + 0.4 * r, y]];
    let hipY = y - leg;
    if (pose === 'run') {
      const s = Math.sin(t * 13);
      bob = -Math.abs(Math.cos(t * 13)) * 0.2 * r;
      feet = [[x + s * 0.9 * r, y - Math.max(0, -s) * 0.5 * r], [x - s * 0.9 * r, y - Math.max(0, s) * 0.5 * r]];
      lean = 0.25 * r;
    } else if (pose === 'sit') {
      hipY = y - 0.15 * r;
      feet = [[x + 1.3 * r, y], [x + 1.5 * r, y]];
    }
    hipY += bob;
    const shY = hipY - torso, shX = x + lean;
    const tw = 1.05 * r * scale * big;
    // jambes
    g.lineCap = 'round';
    g.strokeStyle = o.pants || '#3a3a48';
    g.lineWidth = 0.52 * r * scale * big;
    for (let i = 0; i < 2; i++) {
      const hx0 = x + (i ? 0.28 : -0.28) * r * big;
      const [fx, fy] = feet[i];
      const kx = (hx0 + fx) / 2 + (pose === 'sit' ? 0 : 0.15 * r), ky = pose === 'sit' ? hipY : (hipY + fy) / 2;
      g.beginPath(); g.moveTo(hx0, hipY); g.quadraticCurveTo(kx, ky, fx, fy - 0.12 * r); g.stroke();
      g.fillStyle = '#2a2522';
      g.beginPath(); g.ellipse(fx + 0.12 * r, fy - 0.1 * r, 0.32 * r * scale, 0.15 * r * scale, 0, 0, Math.PI * 2); g.fill();
    }
    // torse (robe pour 'long'/'bun'/'pigtails' si o.dress)
    g.fillStyle = o.shirt || '#888';
    g.beginPath();
    if (o.dress) {
      g.moveTo(shX - tw * 0.8, shY + 0.1 * r); g.lineTo(x - tw * 1.25, hipY + 0.5 * r); g.lineTo(x + tw * 1.25, hipY + 0.5 * r); g.lineTo(shX + tw * 0.8, shY + 0.1 * r);
    } else {
      g.moveTo(shX - tw, shY + 0.2 * r); g.quadraticCurveTo(shX - tw, shY - 0.05 * r, shX - tw * 0.5, shY - 0.05 * r);
      g.lineTo(shX + tw * 0.5, shY - 0.05 * r); g.quadraticCurveTo(shX + tw, shY - 0.05 * r, shX + tw, shY + 0.2 * r);
      g.lineTo(x + tw * 0.85, hipY + 0.15 * r); g.lineTo(x - tw * 0.85, hipY + 0.15 * r);
    }
    g.closePath(); g.fill();
    // bras
    const aLen = 1.75 * r * scale;
    const sL = { x: shX - tw * 0.85, y: shY + 0.25 * r }, sR = { x: shX + tw * 0.85, y: shY + 0.25 * r };
    if (pose === 'arms_up') {
      const w = Math.sin(t * 9) * 0.25 * r;
      handL = { x: sL.x - 0.5 * r + w, y: sL.y - aLen }; handR = { x: sR.x + 0.5 * r - w, y: sR.y - aLen };
    } else if (pose === 'point') {
      handL = { x: sL.x - 0.15 * r, y: sL.y + aLen * 0.95 }; handR = { x: sR.x + aLen, y: sR.y - 0.25 * r };
    } else if (pose === 'hug') {
      handL = { x: sL.x + 1.4 * r, y: sL.y + 0.5 * r }; handR = { x: sR.x + 1.6 * r, y: sR.y + 0.3 * r };
    } else if (pose === 'run') {
      const s = Math.sin(t * 13);
      handL = { x: sL.x - s * 0.7 * r, y: sL.y + aLen * 0.75 }; handR = { x: sR.x + s * 0.7 * r, y: sR.y + aLen * 0.75 };
    } else {
      handL = { x: sL.x - 0.2 * r, y: sL.y + aLen * 0.95 }; handR = { x: sR.x + 0.2 * r, y: sR.y + aLen * 0.95 };
    }
    if (o.hands?.l) handL = o.hands.l;
    if (o.hands?.r) handR = o.hands.r;
    g.strokeStyle = shade(o.shirt || '#888888', 0.85);
    g.lineWidth = 0.42 * r * scale * big;
    for (const [s0, h] of [[sL, handL], [sR, handR]]) {
      g.beginPath(); g.moveTo(s0.x, s0.y); g.quadraticCurveTo((s0.x + h.x) / 2 - 0.2 * r, (s0.y + h.y) / 2 + 0.2 * r, h.x, h.y); g.stroke();
      g.fillStyle = o.skin || '#efc29e';
      g.beginPath(); g.arc(h.x, h.y, 0.24 * r * scale * big, 0, Math.PI * 2); g.fill();
    }
    hx = shX + 0.05 * r; hy = shY - 0.85 * r * (kind === 'child' ? 0.95 : 1);
  }
  drawHeadP(g, hx, hy, r * (kind === 'child' ? 0.92 : kind === 'baby' ? 0.85 : 1), o, t);
  g.restore();
  const flip = (p) => (o.flipX ? { x: 2 * x - p.x, y: p.y } : p);
  return { hx: o.flipX ? 2 * x - hx : hx, hy, r, handL: flip(handL), handR: flip(handR) };
}

function drawHeadP(g, x, y, r, o, t) {
  const skin = o.skin || '#efc29e', hc = o.hairColor || '#4a3a30';
  // cheveux arrière (longs)
  g.fillStyle = hc;
  if (o.hair === 'long' || o.hair === 'ponytail') {
    // calotte + deux mèches qui tombent sur les épaules (pas sous le menton)
    g.beginPath();
    g.moveTo(x - 1.12 * r, y); g.arc(x, y, 1.12 * r, Math.PI, 0);
    g.lineTo(x + 1.14 * r, y + 1.05 * r); g.quadraticCurveTo(x + 0.95 * r, y + 1.25 * r, x + 0.66 * r, y + 0.95 * r);
    g.lineTo(x + 0.66 * r, y + 0.2 * r); g.lineTo(x - 0.66 * r, y + 0.2 * r); g.lineTo(x - 0.66 * r, y + 0.95 * r);
    g.quadraticCurveTo(x - 0.95 * r, y + 1.25 * r, x - 1.14 * r, y + 1.05 * r); g.closePath(); g.fill();
  }
  if (o.hair === 'pigtails') {
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 1.15 * r, y + 0.25 * r + Math.sin(t * 8 + s) * 0.05 * r, 0.32 * r, 0.6 * r, s * 0.4, 0, Math.PI * 2); g.fill(); }
  }
  if (o.hair === 'bun') { g.beginPath(); g.arc(x, y - 1.05 * r, 0.42 * r, 0, Math.PI * 2); g.fill(); }
  // oreilles + visage
  g.fillStyle = shade(skin, 0.92);
  g.beginPath(); g.ellipse(x - 0.98 * r, y + 0.08 * r, 0.18 * r, 0.26 * r, 0, 0, Math.PI * 2); g.ellipse(x + 0.98 * r, y + 0.08 * r, 0.18 * r, 0.26 * r, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = skin;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  // cheveux avant
  g.fillStyle = hc;
  const top = (a0, a1, k = 1) => { g.beginPath(); g.arc(x, y, r * 1.03, a0, a1); g.quadraticCurveTo(x, y - r * (0.35 * k), x + Math.cos(a0) * r, y + Math.sin(a0) * r); g.fill(); };
  switch (o.hair) {
    case 'short': top(Math.PI * 1.05, Math.PI * 1.95, 0.9); break;
    case 'long': case 'ponytail': case 'pigtails': top(Math.PI * 0.95, Math.PI * 2.05, 1.2); break;
    case 'bun': top(Math.PI * 1.02, Math.PI * 1.98, 0.8); break;
    case 'curly':
      for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.1); g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.3 * r, 0, Math.PI * 2); g.fill(); }
      break;
    case 'bald':
      g.globalAlpha = 0.5; g.beginPath(); g.arc(x, y, r * 1.0, Math.PI * 0.85, Math.PI * 1.05); g.arc(x, y, r * 0.9, Math.PI * 1.05, Math.PI * 0.85, true); g.fill();
      g.beginPath(); g.arc(x, y, r * 1.0, Math.PI * 1.95, Math.PI * 2.15); g.arc(x, y, r * 0.9, Math.PI * 2.15, Math.PI * 1.95, true); g.fill(); g.globalAlpha = 1;
      break;
    case 'cap': {
      g.fillStyle = o.capColor || '#333';
      g.beginPath(); g.arc(x, y - 0.1 * r, r * 1.04, Math.PI, 0); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(x + 0.65 * r, y - 0.12 * r, 0.75 * r, 0.16 * r, 0, 0, Math.PI * 2); g.fill();
      break;
    }
  }
  if (o.crown) {
    g.fillStyle = '#ffd34d';
    g.beginPath(); g.moveTo(x - 0.5 * r, y - 0.85 * r);
    for (let i = 0; i <= 4; i++) g.lineTo(x - 0.5 * r + i * 0.25 * r, y - (i % 2 ? 1.15 : 1.45) * r);
    g.lineTo(x + 0.5 * r, y - 0.85 * r); g.closePath(); g.fill();
  }
  if (o.mask) { g.fillStyle = '#111'; g.fillRect(x - 0.95 * r, y - 0.3 * r, 1.9 * r, 0.4 * r); }
  // yeux
  const ex = 0.36 * r, ey = y - 0.05 * r, expr = o.expression || 'smile';
  g.strokeStyle = '#2a201b'; g.fillStyle = o.mask ? '#fff' : '#2a201b'; g.lineWidth = Math.max(1.5, 0.08 * r); g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const cx = x + s * ex;
    if (expr === 'sleep' || expr === 'laugh') { g.beginPath(); g.arc(cx, ey + (expr === 'sleep' ? 0 : 0.05 * r), 0.13 * r, Math.PI * (expr === 'sleep' ? 0.1 : 1.1), Math.PI * (expr === 'sleep' ? 0.9 : 1.9)); g.stroke(); }
    else if (expr === 'love') { g.fillStyle = '#e0405f'; g.font = `${0.4 * r}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♥', cx, ey); g.fillStyle = '#2a201b'; }
    else { const big = expr === 'surprised' || expr === 'scared' ? 0.13 : 0.09; g.beginPath(); g.arc(cx, ey, big * r, 0, Math.PI * 2); g.fill(); }
    if (expr === 'angry') { g.beginPath(); g.moveTo(cx - s * 0.2 * r, ey - 0.3 * r); g.lineTo(cx + s * 0.12 * r, ey - 0.18 * r); g.stroke(); }
    if (expr === 'worried' || expr === 'scared') { g.beginPath(); g.moveTo(cx - s * 0.2 * r, ey - 0.2 * r); g.lineTo(cx + s * 0.12 * r, ey - 0.3 * r); g.stroke(); }
  }
  if (o.glasses) {
    g.strokeStyle = '#3a3030'; g.lineWidth = Math.max(1.2, 0.06 * r);
    for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * ex, ey, 0.22 * r, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(x - ex + 0.22 * r, ey); g.lineTo(x + ex - 0.22 * r, ey); g.stroke();
  }
  // joues
  g.fillStyle = 'rgba(230, 110, 110, 0.28)';
  g.beginPath(); g.arc(x - 0.55 * r, y + 0.28 * r, 0.16 * r, 0, Math.PI * 2); g.arc(x + 0.55 * r, y + 0.28 * r, 0.16 * r, 0, Math.PI * 2); g.fill();
  // moustache
  if (o.mustache) { g.fillStyle = o.hairColor === '#e4e1dc' ? '#cfcac4' : shade(o.hairColor || '#444444', 1); g.beginPath(); g.ellipse(x - 0.14 * r, y + 0.33 * r, 0.2 * r, 0.07 * r, 0.2, 0, Math.PI * 2); g.ellipse(x + 0.14 * r, y + 0.33 * r, 0.2 * r, 0.07 * r, -0.2, 0, Math.PI * 2); g.fill(); }
  // bouche
  const my = y + 0.48 * r;
  g.strokeStyle = '#7a3a30'; g.fillStyle = '#7a3a30'; g.lineWidth = Math.max(1.5, 0.07 * r);
  if (expr === 'laugh' || expr === 'surprised' || expr === 'scared') {
    g.beginPath();
    if (expr === 'laugh') { g.arc(x, my - 0.05 * r, 0.25 * r, 0, Math.PI); }
    else g.ellipse(x, my, 0.14 * r, (expr === 'scared' ? 0.2 : 0.17) * r, 0, 0, Math.PI * 2);
    g.fill();
  } else if (expr === 'angry' || expr === 'worried') {
    g.beginPath(); g.arc(x, my + 0.15 * r, 0.18 * r, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
  } else if (expr === 'sleep') {
    g.beginPath(); g.arc(x, my, 0.07 * r, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `700 ${0.5 * r}px sans-serif`; g.textAlign = 'left';
    g.fillText('z', x + 0.9 * r, y - 0.9 * r - Math.sin(t * 2) * 0.1 * r); g.fillText('z', x + 1.25 * r, y - 1.35 * r - Math.sin(t * 2 + 1) * 0.1 * r);
  } else {
    g.beginPath(); g.arc(x, my - 0.12 * r, 0.2 * r, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  }
}

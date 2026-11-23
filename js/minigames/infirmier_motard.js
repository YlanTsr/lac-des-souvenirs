/**
 * « Le motard et l'infirmier » (infirmier_motard)
 * Avant une opération, Papa arrive en blouson de moto, très frimeur, en espérant voir
 * des infirmières… c'est un grand infirmier baraqué qui entre : « Tout nu, on vous prépare ! »
 * Mécanique : reproduire vite une suite de flèches (poses de frime) pour remplir la jauge
 * « Classe » avant que la porte s'ouvre. Mauvaise flèche = la classe retombe.
 */
import { drawPerson, PEOPLE } from './people.js';
import { LOOK } from '../avatar.js';

const POSES = {
  up: { arrow: '↑', label: 'Lunettes' },
  left: { arrow: '←', label: 'Mèche' },
  right: { arrow: '→', label: 'Blouson' },
  down: { arrow: '↓', label: 'Pouce' },
};
const DIRS = ['left', 'up', 'down', 'right'];

export default {
  id: 'infirmier_motard',
  title: 'Le motard et l’infirmier',
  instructions: 'Avant l’opération, tu frimes en blouson de moto : enchaîne vite les poses demandées pour remplir la jauge « Classe » avant que la porte s’ouvre.',
  controls: '← ↑ ↓ → ou clic sur les boutons : prendre la pose',
  duration: 10,
  introExpression: 'happy',
  successTitle: 'La classe absolue !',
  failTitle: 'Pas très classe…',
  successText: 'Lunettes, mèche, blouson : la classe totale ! La porte s’ouvre… « Tout nu, on vous prépare ! » Le blouson n’a pas fait le poids.',
  failText: 'La porte s’ouvre au milieu d’une pose ratée… « Tout nu, on vous prépare ! » Au moins, la blouse d’hôpital, c’est aéré.',

  create(api) {
    const { W, H, rand, clamp, lerp } = api;
    const FLOOR = 470;
    const PX = 470, PSIZE = 80, R = PSIZE / 2;
    const HY = FLOOR - 4.95 * R, SY = FLOOR - 3.95 * R; // tête / épaules de Papa (pose debout)
    const BTN = DIRS.map((d, i) => ({ d, x: 300 + i * 92, y: 482, w: 84, h: 50 }));
    const newSeq = (n) => Array.from({ length: n }, () => DIRS[Math.floor(rand(0, 4))]);
    const s = {
      classe: 0, seq: newSeq(3), idx: 0, round: 0, pose: null, poseT: 0, wrongT: 0,
      glasses: false, curl: false, collar: false, result: null, endT: 0, msg: '', msgT: 0,
    };

    // ── chambre d'hôpital pré-rendue
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    {
      const g = bg.getContext('2d');
      g.fillStyle = '#d9ece4'; g.fillRect(0, 0, W, FLOOR);
      g.fillStyle = '#c4ddd2'; g.fillRect(0, FLOOR - 120, W, 6);
      g.fillStyle = '#e8e2d4'; g.fillRect(0, FLOOR, W, H - FLOOR);
      g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 2;
      for (let x = 0; x < W; x += 60) { g.beginPath(); g.moveTo(x, FLOOR); g.lineTo(x - 30, H); g.stroke(); }
      // fenêtre
      g.fillStyle = '#a9d4f0'; g.fillRect(560, 120, 160, 130);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(600, 160, 18, 0, Math.PI * 2); g.arc(624, 156, 22, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 8; g.strokeRect(560, 120, 160, 130);
      g.beginPath(); g.moveTo(640, 120); g.lineTo(640, 250); g.stroke();
      // lit
      g.fillStyle = '#9aa6b2'; g.fillRect(40, 300, 12, 170); g.fillRect(270, 340, 10, 130);
      g.fillStyle = '#ffffff'; api.roundRect(g, 40, 350, 240, 50, 10); g.fill();
      g.fillStyle = '#8fc6e8'; api.roundRect(g, 120, 345, 160, 55, 10); g.fill();
      g.fillStyle = '#f7f7f7'; api.roundRect(g, 54, 330, 70, 30, 12); g.fill();
      g.fillStyle = '#7a8692'; g.fillRect(40, 400, 240, 10);
      // perfusion
      g.strokeStyle = '#9aa6b2'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(320, 160); g.lineTo(320, FLOOR); g.moveTo(296, FLOOR); g.lineTo(344, FLOOR); g.stroke();
      g.fillStyle = 'rgba(200, 230, 255, 0.8)'; api.roundRect(g, 306, 166, 28, 42, 6); g.fill();
      // panneau
      api.roundRect(g, 40, 120, 220, 70, 8); g.fillStyle = '#fff'; g.fill();
      api.text(g, 'BLOC OPÉRATOIRE', 150, 142, { size: 15, color: '#2c7a6a', weight: 800 });
      api.text(g, 'Patient : à jeun, en blouse', 150, 168, { size: 13, color: '#5a6a66', weight: 600 });
    }

    function newRound() {
      s.round++;
      s.seq = newSeq(Math.min(5, 3 + s.round));
      s.idx = 0;
    }

    function strike(d) {
      if (d === s.seq[s.idx]) {
        s.idx++;
        s.pose = d; s.poseT = 0.6;
        if (d === 'up') s.glasses = true;
        if (d === 'left') s.curl = true;
        if (d === 'right') s.collar = true;
        s.classe += 7;
        api.sfx('pop');
        api.burst(PX, HY - 20, { n: 8, shape: 'star', color: ['#ffd34d', '#fff'], speed: 170, gravity: 120, size: 6 });
        if (s.idx >= s.seq.length) {
          s.classe += 12;
          s.msg = ['Trop classe !', 'Easy Rider !', 'Le roi de la route !', 'Irrésistible !'][s.round % 4]; s.msgT = 0.9;
          api.sfx('catch');
          newRound();
        }
      } else {
        s.classe = Math.max(0, s.classe - 10);
        s.idx = 0;
        s.wrongT = 0.5;
        s.msg = 'Pas classe…'; s.msgT = 0.7;
        api.sfx('boing'); api.shake(6);
      }
      if (s.classe >= 100) {
        s.classe = 100;
        s.result = 'win';
        api.end(true);
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.poseT = Math.max(0, s.poseT - dt);
        s.wrongT = Math.max(0, s.wrongT - dt);
        s.msgT = Math.max(0, s.msgT - dt);
        if (api.ended) { s.endT += dt; return; }
        s.classe = Math.max(0, s.classe - 3.5 * dt);
        for (const d of DIRS) if (input.pressed(d)) { strike(d); if (api.ended) return; }
        const p = input.pointer;
        if (p.pressed) {
          const b = BTN.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y - 6 && p.y <= b.y + b.h);
          if (b) strike(b.d);
        }
      },
      timeout() { s.result = 'fail'; return false; },
      draw(g) {
        g.drawImage(bg, 0, 0);
        const open = s.result ? clamp(s.endT / 0.4, 0, 1) : api.timeLeft < 2.5 ? 0.06 * (Math.sin(api.t * 30) > 0 ? 1 : 0) : 0;
        // porte
        const DX = 790, DY = 150, DW = 120, DH = FLOOR - 150;
        g.fillStyle = '#3a4a48'; g.fillRect(DX - 8, DY - 8, DW + 16, DH + 8);
        g.fillStyle = '#2a3332'; g.fillRect(DX, DY, DW, DH);
        if (s.result) {
          g.fillStyle = '#e2e8ea'; g.fillRect(DX, DY, DW * (1 - open * 0.85), DH);
          if (open > 0.5) {
            const ix = lerp(DX + 60, DX - 10, clamp((s.endT - 0.2) / 0.5, 0, 1));
            const info = drawPerson(g, { ...PEOPLE.infirmier, x: ix, y: FLOOR, size: 70, expression: 'smile', hands: { l: { x: ix - 70, y: FLOOR - 170 }, r: { x: ix + 40, y: FLOOR - 120 } } });
            // blouse d'hôpital tendue
            const hx = info.handL.x, hy = info.handL.y;
            g.fillStyle = '#b8d8f0'; g.beginPath(); g.moveTo(hx - 30, hy); g.lineTo(hx + 26, hy); g.lineTo(hx + 34, hy + 90); g.lineTo(hx - 38, hy + 90); g.closePath(); g.fill();
            g.fillStyle = '#7fa8cc';
            for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(hx - 22 + (i % 3) * 22, hy + 24 + Math.floor(i / 3) * 34, 3, 0, Math.PI * 2); g.fill(); }
          }
        } else {
          g.fillStyle = '#e2e8ea'; g.fillRect(DX, DY, DW, DH);
          g.fillStyle = '#b9d3e0'; g.fillRect(DX + 30, DY + 30, 60, 70);
          // silhouette qui approche derrière la vitre
          const k = clamp((api.t - 5) / 5, 0, 1);
          if (k > 0) { g.fillStyle = `rgba(60, 50, 50, ${0.15 + 0.5 * k})`; g.beginPath(); g.arc(DX + 60, DY + 70, 12 + 16 * k, 0, Math.PI * 2); g.fill(); }
          g.fillStyle = '#9aa6b2'; g.fillRect(DX + 12, DY + 170, 22, 8);
          if (api.timeLeft < 2.5) api.text(g, 'TOC TOC', DX + 60, DY - 30, { size: 24 + open * 30, color: '#fff', stroke: '#000a' });
        }

        // Papa en blouson de cuir (le temps d'un dessin, le polo devient blouson)
        const pose = s.result ? null : s.pose && s.poseT > 0 ? s.pose : null;
        let hands;
        if (s.result) hands = { l: { x: PX - 1.3 * R, y: SY - 0.6 * R }, r: { x: PX + 1.3 * R, y: SY - 0.6 * R } };
        else if (pose === 'up') hands = { l: { x: PX - 1.15 * R, y: SY + 1.85 * R }, r: { x: PX + 0.95 * R, y: HY } };
        else if (pose === 'left') hands = { l: { x: PX - 0.5 * R, y: HY - 0.9 * R }, r: { x: PX + 1.15 * R, y: SY + 1.85 * R } };
        else if (pose === 'right') hands = { l: { x: PX - 0.45 * R, y: SY + 0.1 * R }, r: { x: PX + 0.45 * R, y: SY + 0.1 * R } };
        else if (pose === 'down') hands = { l: { x: PX - 1.15 * R, y: SY + 1.85 * R }, r: { x: PX + 1.6 * R, y: SY + 0.9 * R } };
        else hands = { l: { x: PX - 0.9 * R, y: SY + 1.6 * R }, r: { x: PX + 0.9 * R, y: SY + 1.6 * R } };
        const saved = { shirt: LOOK.shirt, shirtDark: LOOK.shirtDark, collar: LOOK.collar };
        let info;
        try {
          LOOK.shirt = '#2b2a2e'; LOOK.shirtDark = '#8a8a90'; LOOK.collar = '#d8d4cc';
          info = api.avatar(g, {
            x: PX, y: FLOOR, size: PSIZE, pose: 'stand', hands,
            expression: s.result === 'win' ? 'surprised' : s.result === 'fail' ? 'panic' : s.wrongT > 0 ? 'ouch' : pose ? 'happy' : 'smile',
            sweat: !!s.result || s.wrongT > 0, blush: s.result ? 1 : 0, tilt: pose === 'down' ? 0.12 : 0,
          });
        } finally { Object.assign(LOOK, saved); }
        // détails du blouson : fermeture éclair, col relevé
        g.strokeStyle = '#c9c9cf'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(PX, SY + 0.5 * R); g.lineTo(PX, FLOOR - 1.9 * R); g.stroke();
        if (s.collar) {
          g.fillStyle = '#1e1d21';
          for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(PX + sd * 0.15 * R, SY); g.lineTo(PX + sd * 0.75 * R, SY - 0.55 * R); g.lineTo(PX + sd * 0.8 * R, SY + 0.1 * R); g.closePath(); g.fill(); }
        }
        const hx = info.hx, hy = info.hy;
        if (s.curl) { // LA mèche
          g.strokeStyle = '#6c635d'; g.lineWidth = 4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(hx - 4, hy - R * 0.95); g.quadraticCurveTo(hx + 14, hy - R * 0.75, hx + 2, hy - R * 0.55); g.quadraticCurveTo(hx - 8, hy - R * 0.45, hx + 4, hy - R * 0.38); g.stroke();
        }
        if (s.glasses) {
          const gy = hy - 0.04 * R + (s.result ? clamp(s.endT / 0.5, 0, 1) * 0.3 * R : 0);
          g.fillStyle = '#121216';
          for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(hx + sd * 0.34 * R, gy, 0.26 * R, 0.17 * R, 0, 0, Math.PI * 2); g.fill(); }
          g.fillRect(hx - 0.12 * R, gy - 0.06 * R, 0.24 * R, 0.06 * R);
          g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(hx - 0.48 * R, gy - 0.1 * R, 0.1 * R, 0.05 * R);
        }
        if (pose === 'left') { // peigne
          const hl = info.hands.l;
          g.fillStyle = '#e0405f'; g.fillRect(hl.x - 4, hl.y - 22, 8, 28);
        }
        if (pose === 'down') {
          const hr = info.hands.r;
          g.fillStyle = LOOK.skin; g.fillRect(hr.x - 3, hr.y - 16, 7, 14);
          api.text(g, '✦', hr.x + 14, hr.y - 20, { size: 18, color: '#ffd34d' });
        }

        if (s.result) {
          const a = clamp((s.endT - 0.35) / 0.2, 0, 1);
          if (a > 0) {
            g.globalAlpha = a;
            api.roundRect(g, 520, 92, 300, 56, 16); g.fillStyle = '#fff'; g.fill();
            g.beginPath(); g.moveTo(740, 146); g.lineTo(770, 146); g.lineTo(790, 176); g.closePath(); g.fill();
            api.text(g, 'Tout nu, on vous prépare !', 670, 120, { size: 22, color: '#2c4a48', weight: 800 });
            g.globalAlpha = 1;
          }
          return;
        }

        // séquence demandée
        const n = s.seq.length, cw = 78, x0 = PX - (n * cw) / 2;
        for (let i = 0; i < n; i++) {
          const d = s.seq[i], x = x0 + i * cw, done = i < s.idx, cur = i === s.idx;
          api.roundRect(g, x + 4, 92, cw - 8, 66, 12);
          g.fillStyle = done ? '#4fa36b' : cur ? '#ffd34d' : 'rgba(255,255,255,0.85)'; g.fill();
          if (cur) { g.strokeStyle = '#c0392b'; g.lineWidth = 3; g.stroke(); }
          api.text(g, POSES[d].arrow, x + cw / 2, 116, { size: 30, color: done ? '#fff' : '#2a2a30', weight: 800 });
          api.text(g, POSES[d].label, x + cw / 2, 145, { size: 13, color: done ? '#fff' : '#3a3a44' });
        }
        // boutons (souris / tactile)
        for (const b of BTN) {
          api.roundRect(g, b.x, b.y, b.w, b.h, 10);
          g.fillStyle = b.d === s.seq[s.idx] && api.t < 2 ? '#ffe9a8' : 'rgba(40, 60, 58, 0.8)'; g.fill();
          api.text(g, POSES[b.d].arrow, b.x + 20, b.y + b.h / 2, { size: 24, color: b.d === s.seq[s.idx] && api.t < 2 ? '#2a2a30' : '#fff' });
          api.text(g, POSES[b.d].label, b.x + 54, b.y + b.h / 2, { size: 12, color: b.d === s.seq[s.idx] && api.t < 2 ? '#2a2a30' : '#fff' });
        }
        // jauge « Classe »
        api.text(g, 'CLASSE', 30, 40, { size: 22, color: '#fff', stroke: '#000a', align: 'left' });
        api.roundRect(g, 130, 28, 300, 24, 12); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
        const cv = clamp(s.classe / 100, 0, 1);
        if (cv > 0) { api.roundRect(g, 132, 30, 296 * cv, 20, 10); g.fillStyle = cv > 0.75 ? '#e8453c' : '#f2b33d'; g.fill(); }
        api.text(g, `${Math.round(s.classe)} %`, 470, 40, { size: 20, color: '#fff', stroke: '#000a' });
        if (s.msgT > 0) api.text(g, s.msg, PX - 260, 250, { size: 28, color: '#fff', stroke: s.wrongT > 0 ? '#7a1e1e' : '#2c4a48' });
      },
    };
  },
};

/**
 * Chapitre I — « Le fantôme du placard » (fantome_placard)
 * Déguisé pour Halloween, Papa se cachait la nuit dans les placards et faisait
 * grincer la porte pour terrifier sa petite cousine.
 * Mécanique de timing : la cousine passe dans le couloir avec sa bougie (allers-retours,
 * vitesse variable, petites pauses) ; appuyer quand elle est pile devant le placard.
 * 3 frayeurs = victoire ; repéré 3 fois (trop tôt / trop tard) = échec.
 */
import { drawPerson, PEOPLE } from './people.js';

const FLOOR = 470;
const DOOR_X = 600;         // centre du placard
const ZONE = 52;            // demi-largeur de la zone de frayeur
const GOAL = 3;
const MAX_MISS = 3;

let BG = null;
function background(W, H) {
  if (BG) return BG;
  const c = document.createElement('canvas');
  c.width = W * 2; c.height = H * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  // papier peint nocturne
  g.fillStyle = '#1d2140'; g.fillRect(0, 0, W, FLOOR);
  g.fillStyle = '#232850';
  for (let x = 0; x < W; x += 48) g.fillRect(x, 0, 22, FLOOR);
  g.fillStyle = 'rgba(160, 170, 230, 0.08)';
  for (let x = 24; x < W; x += 48) for (let y = 30; y < FLOOR - 60; y += 60) { g.beginPath(); g.arc(x + 11, y, 5, 0, Math.PI * 2); g.fill(); }
  // plinthe
  g.fillStyle = '#2b2236'; g.fillRect(0, FLOOR - 22, W, 22);
  // fenêtre et lune
  g.fillStyle = '#2f4a7a'; g.fillRect(70, 110, 150, 170);
  g.fillStyle = '#eef0d0'; g.beginPath(); g.arc(165, 160, 26, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2f4a7a'; g.beginPath(); g.arc(178, 152, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [x, y] of [[95, 140], [120, 230], [200, 250], [105, 190]]) { g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#4a3a2e'; g.lineWidth = 8; g.strokeRect(70, 110, 150, 170);
  g.lineWidth = 5; g.beginPath(); g.moveTo(145, 110); g.lineTo(145, 280); g.moveTo(70, 195); g.lineTo(220, 195); g.stroke();
  // rayon de lune au sol
  g.fillStyle = 'rgba(200, 210, 255, 0.07)';
  g.beginPath(); g.moveTo(70, 280); g.lineTo(220, 280); g.lineTo(330, FLOOR + 60); g.lineTo(120, FLOOR + 60); g.closePath(); g.fill();
  // cadre au mur
  g.fillStyle = '#5a4430'; g.fillRect(330, 150, 110, 80);
  g.fillStyle = '#3a4a3a'; g.fillRect(338, 158, 94, 64);
  g.fillStyle = '#4f6a4a'; g.beginPath(); g.moveTo(338, 222); g.lineTo(380, 180); g.lineTo(432, 222); g.fill();
  // le placard (encadrement + intérieur sombre)
  g.fillStyle = '#4a3324'; g.fillRect(DOOR_X - 66, 236, 132, FLOOR - 236);
  g.fillStyle = '#0b0a12'; g.fillRect(DOOR_X - 56, 246, 112, FLOOR - 246);
  // commode à droite
  g.fillStyle = '#3d2c22'; g.fillRect(790, 360, 140, FLOOR - 360);
  g.fillStyle = '#4e392b'; g.fillRect(798, 370, 124, 40); g.fillRect(798, 418, 124, 40);
  g.fillStyle = '#c9a556'; g.fillRect(852, 386, 16, 5); g.fillRect(852, 434, 16, 5);
  // parquet
  g.fillStyle = '#3a2a22'; g.fillRect(0, FLOOR, W, H - FLOOR);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
  for (let y = FLOOR + 14; y < H; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let i = 0; i < 30; i++) { const x = (i * 137) % W, y = FLOOR + ((i * 3) % 4) * 18; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 18); g.stroke(); }
  BG = c;
  return c;
}

export default {
  id: 'fantome_placard',
  title: 'Le fantôme du placard',
  instructions: 'Caché dans le placard sous ton drap de fantôme, fais grincer la porte quand ta petite cousine passe pile devant… pas trop tôt, pas trop tard !',
  controls: 'Espace / clic / tap : faire grincer la porte',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Bouh ! Mission frayeur réussie',
  failTitle: 'Démasqué !',
  successText: 'Trois grincements, trois sursauts : ta cousine a dormi avec la lumière allumée pendant un mois.',
  failText: 'Repéré trois fois ! Ta cousine rit tellement qu’elle en oublie d’avoir peur. Le fantôme retourne bouder dans son placard.',

  create(api) {
    const { W, H, rand, clamp } = api;
    const bg = background(W, H);
    const s = {
      t: 0, scared: 0, misses: 0, cool: 0, open: 0, creakT: 0,
      // la cousine
      cx: 320, dir: 1, speed: 240, state: 'walk', stateT: 0, pauseAt: null, hop: 0,
      say: '', sayT: 0, eyesBlink: 0,
    };
    const visible = () => s.cx > 30 && s.cx < W - 30;
    function newPass() {
      s.speed = rand(210, 330);
      s.pauseAt = Math.random() < 0.4 ? rand(300, 900) : null;
    }
    newPass();
    s.pauseAt = null;

    function creak() {
      s.cool = 0.5;
      s.creakT = 0.6;
      api.sfx('whoosh');
      if (!visible() || s.state === 'scared' || s.state === 'laugh' || s.state === 'away') {
        s.open = 0.35;
        return;
      }
      if (Math.abs(s.cx - DOOR_X) < ZONE) {
        s.scared++;
        s.open = 1;
        s.state = 'scared'; s.stateT = 0; s.hop = 0.4;
        s.say = 'AAAAH !'; s.sayT = 1;
        api.sfx('boing');
        api.shake(10);
        api.burst(s.cx, FLOOR - 120, { n: 10, shape: 'star', color: ['#fff6c0', '#ffffff'], speed: 220, gravity: 200, size: 7 });
        if (s.scared >= GOAL) api.end(true);
      } else {
        s.misses++;
        s.open = 0.6;
        s.state = 'laugh'; s.stateT = 0;
        s.say = Math.abs(s.cx - DOOR_X) > 200 ? 'Hi hi, je t’ai vu !' : 'Raté, je t’ai vu !';
        s.sayT = 1.1;
        api.sfx('pop');
        if (s.misses >= MAX_MISS) api.end(false);
      }
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.cool = Math.max(0, s.cool - dt);
        s.creakT = Math.max(0, s.creakT - dt);
        s.sayT = Math.max(0, s.sayT - dt);
        s.hop = Math.max(0, s.hop - dt);
        s.open = Math.max(0, s.open - dt * (s.state === 'scared' ? 0.6 : 1.4));
        if (!api.ended && s.cool <= 0 && input.pressed()) creak();

        // ── la cousine
        s.stateT += dt;
        if (s.state === 'walk') {
          const v = s.speed * (0.8 + 0.3 * Math.sin(s.t * 2.3 + s.dir));
          const nx = s.cx + s.dir * v * dt;
          if (s.pauseAt != null && (s.cx - s.pauseAt) * (nx - s.pauseAt) <= 0) { s.state = 'look'; s.stateT = 0; s.pauseAt = null; }
          s.cx = nx;
          if (s.cx > W + 60 || s.cx < -60) { s.state = 'away'; s.stateT = 0; }
        } else if (s.state === 'look') {
          if (s.stateT > 0.55) { s.state = 'walk'; s.stateT = 0; }
        } else if (s.state === 'laugh') {
          if (s.stateT > 0.9) { s.state = 'walk'; s.stateT = 0; }
        } else if (s.state === 'scared') {
          if (s.stateT > 0.35) s.cx += s.dir * 560 * dt;
          if (s.cx > W + 60 || s.cx < -60) { s.state = 'away'; s.stateT = 0; }
        } else if (s.state === 'away') {
          if (s.stateT > 0.45) {
            s.dir = s.cx > W / 2 ? -1 : 1;
            s.cx = s.dir > 0 ? -50 : W + 50;
            s.state = 'walk'; s.stateT = 0;
            newPass();
          }
        }
      },
      timeout() {
        if (s.scared < GOAL) api.end(false, s.scared
          ? `Seulement ${s.scared} frayeur${s.scared > 1 ? 's' : ''} : ta cousine finit son tour de couloir, rassurée. Le fantôme reviendra demain soir…`
          : 'Pas un seul sursaut : ta cousine traverse le couloir tranquille, et le fantôme s’endort dans le placard.');
        return s.scared >= GOAL;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);

        // repère discret de la zone devant le placard
        g.strokeStyle = 'rgba(255, 240, 200, 0.22)'; g.lineWidth = 2; g.setLineDash([6, 8]);
        g.beginPath(); g.ellipse(DOOR_X, FLOOR + 22, ZONE + 10, 12, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);

        // Papa fantôme dans le placard (visible quand la porte s'ouvre)
        const ended = api.ended;
        const reveal = Math.max(s.open, ended && s.scared < GOAL ? 1 : 0, ended && s.scared >= GOAL ? 1 : 0);
        if (reveal > 0.15) {
          const r = 32, hy = FLOOR - 4.95 * r;
          const arms = 0.3 + reveal * 0.7;
          const info = api.avatar(g, {
            x: DOOR_X, y: FLOOR - 4, size: 64, t: s.t,
            expression: ended && s.scared < GOAL ? 'laugh' : s.state === 'laugh' ? 'worried' : 'laugh',
            hands: { l: { x: DOOR_X - 60 * arms, y: hy - 6 * arms }, r: { x: DOOR_X + 60 * arms, y: hy - 6 * arms } },
          });
          // le drap blanc (trou pour le visage)
          const hx = info.hx, top = info.hy - r * 1.3, hem = FLOOR - 14;
          const p = new Path2D();
          p.moveTo(hx - r * 1.1, info.hy);
          p.quadraticCurveTo(hx - r * 1.2, top, hx, top);
          p.quadraticCurveTo(hx + r * 1.2, top, hx + r * 1.1, info.hy);
          p.lineTo(DOOR_X + 62 * arms + 8, info.hy + 4);
          p.lineTo(DOOR_X + 50, hem);
          for (let k = 0; k <= 6; k++) p.quadraticCurveTo(DOOR_X + 50 - k * 16.6 - 8, hem + (k % 2 ? -10 : 10) + Math.sin(s.t * 6 + k) * 3, DOOR_X + 50 - (k + 1) * 16.6, hem);
          p.lineTo(DOOR_X - 62 * arms - 8, info.hy + 4);
          p.closePath();
          p.ellipse(hx, info.hy + r * 0.1, r * 0.72, r * 0.78, 0, 0, Math.PI * 2);
          g.fillStyle = '#eceef6';
          g.fill(p, 'evenodd');
          g.strokeStyle = 'rgba(150, 155, 190, 0.6)'; g.lineWidth = 2; g.stroke(p);
          if (s.open > 0.8 && !ended) api.text(g, 'BOUH !', DOOR_X, 200, { size: 44, color: '#fff', stroke: '#3a2a6a', weight: 900, strokeWidth: 8 });
        }
        // la porte du placard (charnière à gauche) qui pivote
        const ang = Math.min(1, reveal) * 1.25 + 0.06 + (s.creakT > 0 ? Math.sin(s.t * 60) * 0.02 : 0);
        const dw = 112 * Math.cos(ang);
        g.fillStyle = '#6b4a34';
        g.beginPath();
        g.moveTo(DOOR_X - 56, 246); g.lineTo(DOOR_X - 56 + dw, 246 + Math.sin(ang) * 10);
        g.lineTo(DOOR_X - 56 + dw, FLOOR - Math.sin(ang) * 10); g.lineTo(DOOR_X - 56, FLOOR); g.closePath(); g.fill();
        g.strokeStyle = '#4a3324'; g.lineWidth = 3;
        g.strokeRect(DOOR_X - 56 + dw * 0.15, 268, dw * 0.7, 80); g.strokeRect(DOOR_X - 56 + dw * 0.15, 368, dw * 0.7, 80);
        g.fillStyle = '#c9a556'; g.beginPath(); g.arc(DOOR_X - 56 + dw * 0.88, 360, 4, 0, Math.PI * 2); g.fill();
        // les yeux qui brillent dans l'entrebâillement
        if (reveal <= 0.15) {
          const blink = Math.sin(s.t * 1.7) > 0.96;
          g.fillStyle = '#fff8d0';
          for (const ex of [-7, 7]) { g.beginPath(); g.ellipse(DOOR_X + 58 + ex * 0.6 - 4, 320, 3, blink ? 0.6 : 3.4, 0, 0, Math.PI * 2); g.fill(); }
        }
        if (s.creakT > 0) api.text(g, 'IIIIIHHH…', DOOR_X + 80, 236 - (0.6 - s.creakT) * 30, { size: 24, color: `rgba(230, 225, 255, ${s.creakT / 0.6})`, stroke: 'rgba(20,10,40,0.6)', strokeWidth: 4 });

        // la cousine et sa bougie
        if (s.cx > -50 && s.cx < W + 50) {
          const hop = s.hop > 0 ? -Math.sin((1 - s.hop / 0.4) * Math.PI) * 40 : 0;
          const moving = s.state === 'walk' || (s.state === 'scared' && s.stateT > 0.35);
          const flip = s.dir < 0;
          const pose = s.state === 'scared' ? (s.stateT < 0.35 ? 'arms_up' : 'run') : s.state === 'laugh' ? 'point' : moving ? 'run' : 'stand';
          const info = drawPerson(g, {
            ...PEOPLE.cousine, x: s.cx, y: FLOOR + hop, size: 56, t: s.state === 'scared' ? s.t : s.t * 0.55,
            pose, flipX: s.state === 'laugh' ? s.cx > DOOR_X : flip,
            expression: s.state === 'scared' ? 'scared' : s.state === 'laugh' ? 'laugh' : s.state === 'look' ? 'worried' : 'worried',
          });
          // bougie dans la main (celle du côté où elle marche)
          const hand = s.state === 'laugh' ? info.handL : flip ? info.handL : info.handR;
          const cxp = hand.x, cyp = hand.y;
          const fl = 1 + 0.15 * Math.sin(s.t * 23) + 0.1 * Math.sin(s.t * 37);
          g.save();
          g.globalCompositeOperation = 'lighter';
          const glow = g.createRadialGradient(cxp, cyp - 22, 4, cxp, cyp - 22, 190 * fl);
          glow.addColorStop(0, 'rgba(255, 200, 110, 0.45)');
          glow.addColorStop(0.4, 'rgba(255, 150, 60, 0.14)');
          glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
          g.fillStyle = glow;
          g.fillRect(cxp - 200, cyp - 220, 400, 420);
          g.restore();
          g.fillStyle = '#f4ecd8'; g.fillRect(cxp - 4, cyp - 18, 8, 18);
          g.fillStyle = '#c9a556'; g.beginPath(); g.ellipse(cxp, cyp, 10, 3, 0, 0, Math.PI * 2); g.fill();
          if (s.state !== 'scared') {
            g.fillStyle = '#ffd36b';
            g.beginPath(); g.ellipse(cxp, cyp - 25, 4 * fl, 8 * fl, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(cxp, cyp - 23, 2, 4, 0, 0, Math.PI * 2); g.fill();
          } else {
            g.strokeStyle = 'rgba(200,200,200,0.6)'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(cxp, cyp - 20); g.quadraticCurveTo(cxp + 6, cyp - 34, cxp - 2, cyp - 46); g.stroke();
          }
          if (s.sayT > 0) {
            const bx = clamp(info.hx, 120, W - 120), by = info.hy - 70;
            api.roundRect(g, bx - 110, by - 22, 220, 40, 14); g.fillStyle = 'rgba(255, 255, 255, 0.92)'; g.fill();
            api.text(g, s.say, bx, by - 2, { size: 20, color: s.state === 'scared' ? '#b0303a' : '#3a2a6a' });
          }
        }

        // HUD
        api.text(g, `Frayeurs : ${s.scared} / ${GOAL}`, 40, 42, { size: 26, align: 'left', color: '#fff6dc', stroke: '#000a' });
        api.text(g, `Repéré : ${'●'.repeat(s.misses)}${'○'.repeat(Math.max(0, MAX_MISS - s.misses))}`, 40, 76, { size: 20, align: 'left', color: s.misses ? '#ffb0a0' : '#fff6dc', stroke: '#000a', strokeWidth: 5 });
      },
    };
  },
};

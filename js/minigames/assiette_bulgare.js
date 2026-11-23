/**
 * Anecdote — « L'assiette sans fond » (assiette_bulgare)
 * Papa demande la main de Maman à Diado… et Mamina le ressert sans arrêt :
 * en Bulgarie, une assiette vide, c'est un invité qui a encore faim !
 * Mécanique : chaque appui = une bouchée (politesse +1, estomac +) ; l'estomac digère doucement.
 * Si l'assiette devient VIDE, Mamina la remplit à ras bord et ajoute une louche (gros + estomac).
 * Astuce : manger régulièrement mais toujours laisser une bouchée. Estomac plein = raté.
 */
import { drawPerson, PEOPLE } from './people.js';
import { LOOK } from '../avatar.js';

export default {
  id: 'assiette_bulgare',
  title: "L'assiette sans fond",
  instructions: 'Fais honneur à la cuisine de Mamina, mais attention : chez les Bulgares, une assiette vide est aussitôt resservie !',
  controls: 'Espace / clic / tap : prendre une bouchée',
  duration: 13,
  introExpression: 'happy',
  successTitle: 'Gendre approuvé !',
  failTitle: 'Plein comme une banitsa !',
  successText: 'Tu as tout goûté sans jamais vider l’assiette : Mamina est ravie, et Diado t’a accordé la main de sa fille.',
  failText: 'Le ventre a dit stop… Mamina, elle, n’a jamais dit stop. Diado a quand même dit oui !',

  create(api) {
    const { W, H, clamp, rand } = api;
    const TABLE_Y = 400;
    const PX = 360, PY = 440;            // Papa assis (pieds cachés sous la table)
    const PLATE_X = 360, PLATE_Y = 452;
    const TARGET = 12;                   // bouchées de politesse
    const FULL = 6, BRIM = 7;            // assiette normale / « à ras bord »
    const BITE = 5, DIGEST = 2.5, REFILL = 28, START = 25;
    const TOPUP = 1.0;                   // Mamina rajoute une cuillerée chaque seconde si l'assiette n'est pas pleine
    const SLOTS = [[-38, 2], [-13, 5], [13, 5], [38, 2], [-25, -9], [25, -9], [0, -19]];

    const s = {
      t: 0, bites: FULL, polite: 0, stomach: START, fork: 0, topT: 0, ladle: 0, refill: 0, refills: 0,
      lastBite: 0, msg: '', msgT: 0, burst: false, won: false, endT: 0, pop: 0, steam: 0,
      floats: [],
    };

    /* ───── décor pré-rendu (×2 pour rester net) ───── */
    const SC = 2;
    const mk = () => { const c = document.createElement('canvas'); c.width = W * SC; c.height = H * SC; const b = c.getContext('2d'); b.scale(SC, SC); return [c, b]; };
    const [bg, b] = mk();
    {
      // mur chaulé, poutres
      const wall = b.createLinearGradient(0, 0, 0, TABLE_Y);
      wall.addColorStop(0, '#f6ead2'); wall.addColorStop(1, '#ead3ad');
      b.fillStyle = wall; b.fillRect(0, 0, W, TABLE_Y + 10);
      b.fillStyle = '#7a4e2c'; b.fillRect(0, 0, W, 26);
      for (let x = 30; x < W; x += 150) { b.fillStyle = '#6a4224'; b.fillRect(x, 0, 22, 34); }
      // fenêtre (soir d'été)
      b.fillStyle = '#7a4e2c'; b.fillRect(36, 70, 170, 160);
      const win = b.createLinearGradient(0, 80, 0, 220);
      win.addColorStop(0, '#f6a96b'); win.addColorStop(1, '#fbd99a');
      b.fillStyle = win; b.fillRect(46, 80, 150, 140);
      b.fillStyle = '#e88a5a'; b.beginPath(); b.arc(150, 190, 22, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#8a6a4a'; b.beginPath(); b.moveTo(46, 220); b.quadraticCurveTo(110, 170, 196, 205); b.lineTo(196, 220); b.fill();
      b.fillStyle = '#7a4e2c'; b.fillRect(117, 80, 8, 140); b.fillRect(46, 146, 150, 8);
      // rideaux brodés
      for (const x of [28, 192]) {
        b.fillStyle = '#fffaf0'; b.fillRect(x, 64, 22, 176);
        b.fillStyle = '#c0392b';
        for (let y = 74; y < 236; y += 16) { b.beginPath(); b.moveTo(x + 11, y); b.lineTo(x + 17, y + 6); b.lineTo(x + 11, y + 12); b.lineTo(x + 5, y + 6); b.fill(); }
      }
      // tresse de piments rouges et d'ail
      b.strokeStyle = '#b08a50'; b.lineWidth = 3; b.beginPath(); b.moveTo(300, 30); b.lineTo(300, 210); b.stroke();
      for (let i = 0; i < 11; i++) {
        const y = 48 + i * 15, sd = i % 2 ? 1 : -1;
        b.fillStyle = i % 4 === 3 ? '#f4efe4' : '#c8261d';
        b.save(); b.translate(300 + sd * 6, y); b.rotate(sd * 0.5);
        b.beginPath(); b.ellipse(0, 6, 5, 12, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#3d7a2a'; b.fillRect(-2, -8, 4, 5);
        b.restore();
      }
      // assiettes peintes de Troyan au mur
      for (const [x, y, rr] of [[640, 110, 40], [745, 150, 30], [540, 160, 28]]) {
        b.fillStyle = '#b5652b'; b.beginPath(); b.arc(x, y, rr, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#e9d2a2'; b.beginPath(); b.arc(x, y, rr * 0.8, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#2f6a8f'; b.beginPath(); b.arc(x, y, rr * 0.55, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#e9d2a2';
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.beginPath(); b.arc(x + Math.cos(a) * rr * 0.35, y + Math.sin(a) * rr * 0.35, rr * 0.09, 0, Math.PI * 2); b.fill(); }
        b.fillStyle = '#c0392b'; b.beginPath(); b.arc(x, y, rr * 0.14, 0, Math.PI * 2); b.fill();
      }
      // serviette brodée accrochée
      b.fillStyle = '#fffaf0'; b.fillRect(440, 60, 50, 120);
      b.fillStyle = '#c0392b'; b.fillRect(440, 150, 50, 8); b.fillRect(440, 164, 50, 4);
      for (let k = 0; k < 3; k++) { b.beginPath(); b.moveTo(452 + k * 13, 75); b.lineTo(458 + k * 13, 85); b.lineTo(452 + k * 13, 95); b.lineTo(446 + k * 13, 85); b.fill(); }
    }

    // table (nappe brodée + plats) dessinée par-dessus les personnages
    const [fg, f] = mk();
    {
      f.fillStyle = '#fffaf2'; f.fillRect(0, TABLE_Y, W, 82);
      f.fillStyle = 'rgba(180, 150, 110, 0.12)';
      for (let x = 0; x < W; x += 24) f.fillRect(x, TABLE_Y, 12, 82);
      // pan de nappe qui tombe, frise rouge et noire (motif de chevitsa)
      f.fillStyle = '#f7efe2'; f.fillRect(0, TABLE_Y + 82, W, H - TABLE_Y - 82);
      f.fillStyle = '#c0392b'; f.fillRect(0, TABLE_Y + 90, W, 4); f.fillRect(0, H - 14, W, 4);
      for (let x = 10; x < W; x += 34) {
        f.fillStyle = '#c0392b';
        f.beginPath(); f.moveTo(x + 12, TABLE_Y + 100); f.lineTo(x + 24, TABLE_Y + 114); f.lineTo(x + 12, TABLE_Y + 128); f.lineTo(x, TABLE_Y + 114); f.fill();
        f.fillStyle = '#2a2020';
        f.beginPath(); f.moveTo(x + 12, TABLE_Y + 108); f.lineTo(x + 18, TABLE_Y + 114); f.lineTo(x + 12, TABLE_Y + 120); f.lineTo(x + 6, TABLE_Y + 114); f.fill();
      }
      f.strokeStyle = 'rgba(120, 90, 60, 0.25)'; f.lineWidth = 2;
      f.beginPath(); f.moveTo(0, TABLE_Y + 82); f.lineTo(W, TABLE_Y + 82); f.stroke();
      // salade chopska (tomates, concombre, sirene râpé)
      const sx = 190, sy = 444;
      f.fillStyle = '#d9e4ea'; f.beginPath(); f.ellipse(sx, sy, 58, 20, 0, 0, Math.PI * 2); f.fill();
      f.fillStyle = '#9fb0bb'; f.beginPath(); f.ellipse(sx, sy + 4, 50, 14, 0, 0, Math.PI); f.fill();
      for (let i = 0; i < 16; i++) {
        f.fillStyle = i % 2 ? '#d8402e' : '#6aa84a';
        const a = i * 2.4, rr = 8 + (i % 4) * 8;
        f.fillRect(sx + Math.cos(a) * rr * 1.4 - 5, sy - 8 + Math.sin(a) * rr * 0.35 - 4, 10, 8);
      }
      f.fillStyle = '#fbfbf5'; f.beginPath(); f.ellipse(sx, sy - 14, 32, 12, 0, 0, Math.PI * 2); f.fill();
      f.fillStyle = 'rgba(220, 220, 210, 0.9)';
      for (let i = 0; i < 18; i++) f.fillRect(sx - 28 + (i * 37) % 56, sy - 22 + (i * 13) % 14, 3, 3);
      // pain rond (pogatcha)
      f.fillStyle = '#c98a45'; f.beginPath(); f.ellipse(78, 446, 44, 22, 0, 0, Math.PI * 2); f.fill();
      f.fillStyle = '#e0a55c'; f.beginPath(); f.ellipse(78, 440, 36, 16, 0, 0, Math.PI * 2); f.fill();
      f.strokeStyle = '#b07432'; f.lineWidth = 2;
      for (const a of [0, 1.05, 2.1]) { f.beginPath(); f.moveTo(78 - Math.cos(a) * 32, 440 - Math.sin(a) * 13); f.lineTo(78 + Math.cos(a) * 32, 440 + Math.sin(a) * 13); f.stroke(); }
      // banitsa en spirale dans son plat
      const bx = 742, by = 446;
      f.fillStyle = '#7a3e1e'; f.beginPath(); f.ellipse(bx, by, 86, 30, 0, 0, Math.PI * 2); f.fill();
      f.fillStyle = '#e6b25c'; f.beginPath(); f.ellipse(bx, by - 3, 76, 25, 0, 0, Math.PI * 2); f.fill();
      f.strokeStyle = '#b97a2e'; f.lineWidth = 3; f.beginPath();
      for (let a = 0; a < Math.PI * 7; a += 0.2) { const rr = a * 3.3; f.lineTo(bx + Math.cos(a) * rr, by - 3 + Math.sin(a) * rr * 0.32); }
      f.stroke();
      f.fillStyle = 'rgba(255, 240, 200, 0.5)'; f.beginPath(); f.ellipse(bx - 20, by - 12, 26, 6, 0, 0, Math.PI * 2); f.fill();
      // marmite de terre (gyuvech) de Mamina
      const px = 590, py = 428;
      f.fillStyle = '#8f4a26'; f.beginPath(); f.ellipse(px, py + 4, 46, 30, 0, 0, Math.PI * 2); f.fill();
      f.fillStyle = '#a95a2e'; f.beginPath(); f.ellipse(px, py - 18, 40, 11, 0, 0, Math.PI * 2); f.fill();
      f.fillStyle = '#6b2e14'; f.beginPath(); f.ellipse(px, py - 18, 32, 7, 0, 0, Math.PI * 2); f.fill();
      f.fillStyle = '#e9d2a2';
      for (let k = 0; k < 6; k++) { f.beginPath(); f.arc(px - 30 + k * 12, py + 6, 3, 0, Math.PI * 2); f.fill(); }
      // verre de rakia de Diado
      f.fillStyle = 'rgba(230, 240, 250, 0.8)'; f.fillRect(262, 414, 16, 22);
      f.fillStyle = 'rgba(250, 225, 150, 0.8)'; f.fillRect(264, 424, 12, 10);
      // l'assiette de Papa
      f.fillStyle = '#d8d2c6'; f.beginPath(); f.ellipse(PLATE_X, PLATE_Y + 4, 86, 26, 0, 0, Math.PI * 2); f.fill();
      f.fillStyle = '#fbf8f2'; f.beginPath(); f.ellipse(PLATE_X, PLATE_Y, 84, 24, 0, 0, Math.PI * 2); f.fill();
      f.strokeStyle = '#2f6a8f'; f.lineWidth = 2.5; f.beginPath(); f.ellipse(PLATE_X, PLATE_Y, 74, 20, 0, 0, Math.PI * 2); f.stroke();
      f.fillStyle = '#efe8dc'; f.beginPath(); f.ellipse(PLATE_X, PLATE_Y + 2, 56, 14, 0, 0, Math.PI * 2); f.fill();
    }

    const floatText = (str, x, y, color) => s.floats.push({ str, x, y, color, life: 1.3 });

    function eat() {
      s.bites--;
      s.polite++;
      s.stomach += BITE;
      s.fork = 1;
      s.lastBite = s.t;
      api.sfx('pop');
      const [ox, oy] = SLOTS[s.bites] || [0, 0];
      api.burst(PLATE_X + ox, PLATE_Y + oy - 6, { n: 5, color: ['#b5572a', '#e08a4a'], speed: 110, gravity: 380, size: 4 });
      floatText('+1 ♥', PX + 70, 300, '#e0405f');
      if (s.bites <= 0) {
        // assiette vide → Mamina ressert à ras bord… et une louche de plus « pour goûter »
        s.bites = BRIM;
        s.refills++;
        s.refill = 1;
        s.stomach += REFILL;
        s.msg = 'Assiette vide ? Mamina ressert à ras bord !';
        s.msgT = 2;
        api.sfx('splat');
        api.shake(8);
        api.burst(PLATE_X, PLATE_Y - 20, { n: 18, color: ['#b5572a', '#e08a4a', '#f4c27a'], speed: 260, gravity: 520, size: 6 });
        floatText(`+${REFILL} estomac !`, 870, 96, '#e8453c');
      } else if (s.bites === 1) {
        s.msg = 'Dernière bouchée… garde-la !';
        s.msgT = 1.2;
      }
      if (s.stomach >= 100) {
        s.burst = true;
        s.stomach = 100;
        api.sfx('boing');
        api.shake(16);
        api.burst(PX, 372, { n: 8, color: ['#2a3550', '#f4f1ea'], speed: 380, gravity: 600, size: 4 });
        api.end(false, s.refills >= 2
          ? 'Deux assiettes « vides », deux assiettes pleines… Ton ventre a déclaré forfait. Mamina : « Encore un peu ? »'
          : 'Le ventre est plein à craquer, Papa a le teint d’une salade chopska… Mamina : « Tu reprendras bien un peu ? »');
      } else if (s.polite >= TARGET) {
        s.won = true;
        api.end(true, s.refills === 0
          ? 'Douze bouchées et toujours une dans l’assiette : la technique bulgare parfaite ! Diado : « Accordée ! »'
          : 'Un peu trop rempli, mais tu as fait honneur à chaque plat. Mamina rayonne, Diado t’accorde la main d’Eleonora !');
      }
    }

    function bubble(g, x, y, str, tailDx = 0, size = 19) {
      g.font = `800 ${size}px "Nunito Sans", system-ui, sans-serif`;
      const w = g.measureText(str).width + 28, h = size + 18;
      g.fillStyle = '#fffdf6'; g.strokeStyle = '#5a3a2a'; g.lineWidth = 2.5;
      api.roundRect(g, x - w / 2, y - h / 2, w, h, 12); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x + tailDx - 8, y + h / 2 - 1); g.lineTo(x + tailDx + 4, y + h / 2 + 16); g.lineTo(x + tailDx + 8, y + h / 2 - 1); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x + tailDx - 8, y + h / 2); g.lineTo(x + tailDx + 4, y + h / 2 + 16); g.lineTo(x + tailDx + 8, y + h / 2); g.stroke();
      api.text(g, str, x, y + 1, { size, color: '#5a3a2a', weight: 800 });
    }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.fork = Math.max(0, s.fork - dt * 3.2);
        s.refill = Math.max(0, s.refill - dt * 1.2);
        s.msgT = Math.max(0, s.msgT - dt);
        s.steam += dt;
        for (let i = s.floats.length - 1; i >= 0; i--) { const p = s.floats[i]; p.life -= dt; p.y -= 40 * dt; if (p.life <= 0) s.floats.splice(i, 1); }
        if (api.ended) {
          s.endT += dt;
          s.pop = Math.min(1, s.pop + dt * 3);
          return;
        }
        // digestion + Mamina qui rajoute une cuillerée régulièrement
        s.stomach = Math.max(0, s.stomach - DIGEST * dt);
        s.topT += dt;
        if (s.topT >= TOPUP) {
          s.topT -= TOPUP;
          if (s.bites < FULL) { s.bites++; s.ladle = 1; api.sfx('grain'); }
        }
        s.ladle = Math.max(0, s.ladle - dt * 2.5);
        if (input.pressed()) eat();
      },
      timeout() {
        api.end(false, s.polite === 0
          ? 'Tu n’as pas touché à ton assiette ! Mamina s’inquiète : « Tu n’aimes pas ma cuisine ? »'
          : `Seulement ${s.polite} bouchées… Mamina te trouve bien maigre pour un futur gendre. Elle te prépare un panier pour la route !`);
        return false;
      },
      draw(g) {
        g.drawImage(bg, 0, 0, W, H);
        const k = s.stomach / 100;
        const idle = s.t - s.lastBite;

        // Diado, au bout de la table
        drawPerson(g, {
          ...PEOPLE.diado, x: 120, y: 472, size: 66, t: s.t,
          expression: s.burst ? 'surprised' : s.won ? 'laugh' : 'smile',
          hands: { l: { x: 90, y: 404 }, r: { x: 158, y: 404 } },
        });
        // Mamina, louche à la main, juste à côté de l'assiette
        const serve = Math.max(s.ladle, s.refill);
        const handL = { x: 482 - serve * 18, y: 360 + serve * 26 };
        drawPerson(g, {
          ...PEOPLE.mamina, x: 530, y: 472, size: 74, t: s.t,
          expression: s.burst ? 'surprised' : s.won ? 'love' : idle > 2.5 ? 'worried' : 'smile',
          hands: { l: handL, r: { x: 572, y: 396 } },
        });

        // Papa assis, fourchette à la main
        const mouth = { x: PX + 4, y: 342 };
        const f1 = Math.sin(Math.min(1, s.fork) * Math.PI); // aller-retour assiette → bouche
        const hr = { x: api.lerp(PX + 62, mouth.x + 22, f1), y: api.lerp(404, mouth.y + 14, f1) };
        const sick = clamp((k - 0.55) / 0.45, 0, 1);
        const expr = s.burst ? 'ouch' : s.won ? 'happy' : s.fork > 0.4 ? 'focus' : k > 0.8 ? 'worried' : k > 0.6 ? 'surprised' : 'smile';
        const info = api.avatar(g, {
          x: PX, y: PY, size: 78, pose: 'sit', t: s.t, expression: expr,
          hands: { l: { x: PX - 60, y: 402 }, r: hr },
          sweat: k > 0.7 && !s.won, blush: s.won ? 0.6 : 0, lookY: 0.5,
        });
        // teint vert quand l'estomac déborde
        if (sick > 0 || s.burst) {
          g.fillStyle = `rgba(110, 190, 80, ${s.burst ? 0.55 : sick * 0.5})`;
          g.beginPath(); g.ellipse(info.hx, info.hy, info.r * 0.98, info.r * 1.01, 0, 0, Math.PI * 2); g.fill();
        }
        // joues pleines pendant la bouchée
        if (s.fork > 0.2 && !api.ended) {
          g.fillStyle = 'rgba(239, 194, 158, 0.95)';
          for (const sd of [-1, 1]) { g.beginPath(); g.arc(info.hx + sd * info.r * 0.6, info.hy + info.r * 0.35, info.r * 0.24, 0, Math.PI * 2); g.fill(); }
        }
        // le ventre qui s'arrondit
        const bk = s.burst ? 1.15 + s.pop * 0.2 : k;
        g.fillStyle = LOOK.shirt;
        g.beginPath(); g.ellipse(PX + 2, TABLE_Y - 4, 34 + bk * 34, 14 + bk * 26, 0, Math.PI, Math.PI * 2); g.fill();
        if (!s.burst) {
          g.fillStyle = LOOK.shirtDark;
          g.beginPath(); g.arc(PX + 2, TABLE_Y - 10 - bk * 8, 3, 0, Math.PI * 2); g.fill();
        }

        g.drawImage(fg, 0, 0, W, H);

        // vapeur de la marmite
        g.strokeStyle = 'rgba(255, 255, 255, 0.55)'; g.lineWidth = 4; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const ph = (s.steam * 0.6 + i / 3) % 1;
          const x0 = 572 + i * 18, y0 = 400 - ph * 60;
          g.globalAlpha = 1 - ph;
          g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 10 * Math.sin(ph * 6), y0 - 12, x0, y0 - 24); g.stroke();
        }
        g.globalAlpha = 1;

        // le plat dans l'assiette (sauce + boulettes kyufteta)
        const n = s.bites;
        if (n > 0) {
          g.fillStyle = '#c8642a';
          g.beginPath(); g.ellipse(PLATE_X, PLATE_Y + 1, 30 + n * 6, 8 + n * 1.4, 0, 0, Math.PI * 2); g.fill();
        }
        for (let i = 0; i < n; i++) {
          const [ox, oy] = SLOTS[i];
          const x = PLATE_X + ox, y = PLATE_Y + oy - 4 - (n >= BRIM ? 3 : 0);
          g.fillStyle = '#7f3f1c'; g.beginPath(); g.ellipse(x, y + 2, 13, 10, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#a3532a'; g.beginPath(); g.ellipse(x, y, 12, 9, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255, 220, 170, 0.5)'; g.beginPath(); g.ellipse(x - 4, y - 3, 4, 2.5, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#4f8a3a'; g.fillRect(x + 2, y - 6, 3, 2);
        }
        if (n === 1 && !api.ended) {
          g.strokeStyle = `rgba(255, 170, 40, ${0.6 + 0.4 * Math.sin(s.t * 10)})`; g.lineWidth = 3;
          g.beginPath(); g.arc(PLATE_X + SLOTS[0][0], PLATE_Y + SLOTS[0][1] - 4, 19, 0, Math.PI * 2); g.stroke();
        }

        // la louche de Mamina (par-dessus la table, au-dessus de l'assiette)
        const bowl = { x: handL.x - 52, y: handL.y + 44 };
        g.strokeStyle = '#9aa3ad'; g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(handL.x, handL.y); g.lineTo(bowl.x + 8, bowl.y - 8); g.stroke();
        g.fillStyle = '#b9c1ca'; g.beginPath(); g.arc(bowl.x, bowl.y, 13, 0, Math.PI); g.fill();
        if (serve > 0.4) { g.fillStyle = '#a3532a'; g.beginPath(); g.ellipse(bowl.x, bowl.y + 1, 11, 4, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = PEOPLE.mamina.skin; g.beginPath(); g.arc(handL.x, handL.y, 7, 0, Math.PI * 2); g.fill();

        // les mains et la fourchette de Papa, par-dessus la nappe
        const hand = info.hands?.r || hr;
        // fourchette : pointée vers l'assiette au repos, vers la bouche pendant la bouchée
        const dx = api.lerp(-22, -20, f1), dy = api.lerp(26, -18, f1);
        const dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl;
        const tip = { x: hand.x + dx, y: hand.y + dy };
        g.strokeStyle = '#c6ccd4'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(hand.x - ux * 8, hand.y - uy * 8); g.lineTo(tip.x, tip.y); g.stroke();
        g.lineWidth = 2;
        for (let d = -4; d <= 4; d += 4) { g.beginPath(); g.moveTo(tip.x - uy * d, tip.y + ux * d); g.lineTo(tip.x - uy * d + ux * 10, tip.y + ux * d + uy * 10); g.stroke(); }
        if (s.fork > 0.3) { g.fillStyle = '#a3532a'; g.beginPath(); g.arc(tip.x + ux * 9, tip.y + uy * 9, 7, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = LOOK.skin;
        for (const h of [info.hands?.l || { x: PX - 60, y: 402 }, hand]) { g.beginPath(); g.arc(h.x, h.y, 8.5, 0, Math.PI * 2); g.fill(); }

        // bulles
        if (s.burst) bubble(g, 540, 205, s.endT > 0.5 ? '« Encore un peu ? »' : '« Oh ! »', -12);
        else if (s.won) bubble(g, 140, 238, '« Accordée ! »', -8);
        else if (s.refill > 0.2) bubble(g, 540, 205, '« Яж, яж ! Mange ! »', -12);
        else if (idle > 2.5) bubble(g, 540, 205, '« Tu n’aimes pas ? »', -12);

        // HUD : politesse
        api.roundRect(g, W / 2 - 170, 26, 340, 46, 14); g.fillStyle = 'rgba(60, 30, 20, 0.55)'; g.fill();
        api.text(g, `Politesse ♥ ${Math.min(s.polite, TARGET)} / ${TARGET}`, W / 2, 50, { size: 26, color: '#ffe3e8', weight: 800 });
        // HUD : estomac (jauge verticale)
        const gx = 852, gy = 108, gh = 240;
        api.text(g, 'Estomac', gx + 18, gy - 18, { size: 18, color: '#5a3a2a', weight: 800, stroke: 'rgba(255,255,255,0.7)', strokeWidth: 4 });
        api.roundRect(g, gx, gy, 36, gh, 12); g.fillStyle = 'rgba(60, 30, 20, 0.55)'; g.fill();
        const fill = clamp(k, 0, 1) * (gh - 8);
        g.fillStyle = k > 0.8 ? '#e8453c' : k > 0.55 ? '#f0a83a' : '#7cc26a';
        api.roundRect(g, gx + 4, gy + gh - 4 - fill, 28, fill, 9); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([5, 4]);
        g.beginPath(); g.moveTo(gx - 4, gy + 4); g.lineTo(gx + 40, gy + 4); g.stroke(); g.setLineDash([]);

        // messages
        if (s.msgT > 0 && !api.ended) api.text(g, s.msg, PLATE_X + 40, 112, { size: 26, color: '#fff3d6', stroke: '#8a3a1a', strokeWidth: 7, weight: 800 });
        for (const p of s.floats) {
          g.globalAlpha = Math.min(1, p.life * 1.5);
          api.text(g, p.str, p.x, p.y, { size: 20, color: p.color, stroke: '#fff', strokeWidth: 4, weight: 800 });
        }
        g.globalAlpha = 1;
        if (s.burst) api.text(g, 'PLEIN !', PX, 170, { size: 64, color: '#d6f0b0', stroke: '#3f7a2a', strokeWidth: 10, weight: 900 });
      },
    };
  },
};

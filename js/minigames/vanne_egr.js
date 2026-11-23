/**
 * « The nouvelle vanne EGR » (vanne_egr)
 * En route vers la Bulgarie, la voiture tombe en panne en Allemagne. Au garage,
 * Papa cherche ses mots en anglais… « The nouvelle vanne EGR ».
 * Mécanique : des mots tombent ; se déplacer (← → ou souris) pour attraper dans l'ordre
 * THE · NEW · EGR · VALVE. Un mot anglais hors d'ordre rebondit ; un mot français
 * s'ajoute à la phrase… 3 mots français = échec.
 */
import { drawPerson, PEOPLE } from './people.js';

const TARGET = ['THE', 'NEW', 'EGR', 'VALVE'];
const FRENCH = ['NOUVELLE', 'VANNE', 'LE', 'BIDULE', 'TRUC', 'MACHIN'];
const MECA = { ...PEOPLE.passant, hair: 'cap', capColor: '#24508f', shirt: '#2f5d9a', pants: '#2a4f86', mustache: true };

export default {
  id: 'vanne_egr',
  title: '« The nouvelle vanne EGR »',
  instructions: 'Panne en Allemagne ! Attrape les mots dans l’ordre pour dire au garagiste « THE NEW EGR VALVE »… sans laisser le français s’en mêler.',
  controls: '← → / souris / tap : se déplacer',
  duration: 13,
  introExpression: 'worried',
  successTitle: 'Perfect English !',
  failTitle: 'The nouvelle vanne EGR !',
  successText: '« The new EGR valve, please. » Le garagiste a compris du premier coup. Shakespeare serait fier (et la voiture aussi).',
  failText: '« The nouvelle vanne EGR. » Le garagiste a hoché la tête très lentement… mais la voiture a fini par repartir !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const FLOOR = 486, CATCH_Y = 292, PAPA_MIN = 70, PAPA_MAX = 700;
    const s = {
      t: 0, x: 330, vx: 0, words: [], phrase: [], next: 0, french: 0,
      spawnT: 0.5, sinceNeeded: 0, msg: '', msgT: 0, catchT: 0, lastGood: true,
    };

    // ── décor pré-rendu : garage allemand
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    {
      const b = bg.getContext('2d');
      b.fillStyle = '#c9ccd1'; b.fillRect(0, 0, W, H);
      // mur en briques claires
      b.fillStyle = '#b9bcc2';
      for (let y = 0, k = 0; y < 420; y += 22, k++) for (let x = (k % 2) * 30 - 30; x < W; x += 60) b.fillRect(x + 2, y + 2, 56, 18);
      // porte de garage relevée (fenêtre sur l'extérieur)
      b.fillStyle = '#7d8590'; b.fillRect(560, 130, 330, 260);
      const out = b.createLinearGradient(0, 150, 0, 390);
      out.addColorStop(0, '#a9d4f2'); out.addColorStop(1, '#e9f1e0');
      b.fillStyle = out; b.fillRect(574, 150, 302, 240);
      b.fillStyle = '#7fae6a'; b.beginPath(); b.moveTo(574, 330); b.quadraticCurveTo(700, 290, 876, 320); b.lineTo(876, 390); b.lineTo(574, 390); b.fill();
      b.fillStyle = '#8f9399'; b.fillRect(574, 360, 302, 30); // route
      b.fillStyle = '#fff'; for (let x = 590; x < 870; x += 50) b.fillRect(x, 373, 26, 4);
      b.fillStyle = '#5c636d'; for (let y = 134; y < 150; y += 5) b.fillRect(560, y, 330, 3);
      // enseigne KFZ-WERKSTATT
      b.fillStyle = '#f2c230'; b.fillRect(575, 76, 300, 46);
      b.strokeStyle = '#2a2a2a'; b.lineWidth = 4; b.strokeRect(575, 76, 300, 46);
      b.font = '900 28px "Nunito Sans", system-ui, sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle';
      b.fillStyle = '#2a2a2a'; b.fillText('KFZ-WERKSTATT', 725, 100);
      // panneau à outils
      b.fillStyle = '#8a6a4a'; b.fillRect(40, 168, 300, 150);
      b.fillStyle = '#9c7a56'; for (let y = 176; y < 318; y += 14) for (let x = 48; x < 336; x += 14) { b.beginPath(); b.arc(x, y, 1.6, 0, Math.PI * 2); b.fill(); }
      b.strokeStyle = '#3c4048'; b.lineWidth = 7; b.lineCap = 'round';
      for (let i = 0; i < 5; i++) { b.beginPath(); b.moveTo(70 + i * 22, 190); b.lineTo(70 + i * 22, 250 + i * 8); b.stroke(); }
      b.fillStyle = '#c0392b'; b.fillRect(200, 186, 40, 18); b.fillStyle = '#3c4048'; b.fillRect(216, 204, 8, 60);
      b.strokeStyle = '#3c4048'; b.lineWidth = 6;
      b.beginPath(); b.arc(290, 230, 22, 0, Math.PI * 2); b.stroke();
      // sol en béton + taches d'huile
      b.fillStyle = '#9da1a7'; b.fillRect(0, 420, W, H - 420);
      b.fillStyle = '#8b9096'; b.fillRect(0, 420, W, 6);
      b.fillStyle = 'rgba(40, 40, 50, 0.25)';
      b.beginPath(); b.ellipse(240, 500, 60, 12, 0, 0, Math.PI * 2); b.ellipse(620, 470, 40, 9, 0, 0, Math.PI * 2); b.fill();
      // la voiture en panne, capot ouvert (au fond à gauche)
      b.fillStyle = '#d8d2c4'; b.beginPath(); b.moveTo(380, 410); b.lineTo(390, 360); b.lineTo(440, 330); b.lineTo(520, 330); b.lineTo(550, 360); b.lineTo(552, 410); b.closePath(); b.fill();
      b.fillStyle = '#9fc4dc'; b.fillRect(448, 338, 64, 22);
      b.fillStyle = '#c4bdae'; b.beginPath(); b.moveTo(380, 362); b.lineTo(330, 300); b.lineTo(346, 296); b.lineTo(392, 360); b.closePath(); b.fill(); // capot levé
      b.fillStyle = '#2a2a2a'; b.beginPath(); b.arc(410, 412, 18, 0, Math.PI * 2); b.arc(526, 412, 18, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#888'; b.beginPath(); b.arc(410, 412, 7, 0, Math.PI * 2); b.arc(526, 412, 7, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#ffd34d'; b.fillRect(536, 372, 14, 8);
    }

    const papaY = FLOOR;
    function spawn() {
      // garantit qu'un mot utile tombe régulièrement
      let txt, kind;
      const needed = TARGET[s.next];
      const r = Math.random();
      if (needed && (s.sinceNeeded >= 2 || r < 0.38)) { txt = needed; kind = 'need'; }
      else if (r < 0.52) { txt = TARGET[Math.floor(Math.random() * 4)]; kind = 'en'; }
      else { txt = FRENCH[Math.floor(Math.random() * FRENCH.length)]; kind = 'fr'; }
      s.sinceNeeded = txt === needed ? 0 : s.sinceNeeded + 1;
      // évite de lâcher deux mots au même endroit
      let x, tries = 0;
      // un mot utile ne tombe jamais pile sur Papa : il faut bouger
    do { x = rand(70, 700); tries++; } while (tries < 12 && (s.words.some((w) => w.y < 120 && Math.abs(w.x - x) < 130) || (kind === 'need' && Math.abs(x - s.x) < 150)));
      s.words.push({ txt, x, y: -24, vy: rand(150, 200) + s.t * 6, rot: rand(-0.15, 0.15), done: false, bounce: 0 });
    }

    function say(m, d = 0.9) { s.msg = m; s.msgT = d; }

    return {
      state: s,
      update(dt, input) {
        s.t += dt;
        s.msgT = Math.max(0, s.msgT - dt);
        s.catchT = Math.max(0, s.catchT - dt);
        // déplacement : clavier ou souris/tap (input.cursor suit les deux)
        if (!api.ended) {
          const ax = input.axis('x');
          let target = s.x;
          if (ax) target = s.x + ax * 400;
          else if (input.pointer.active) target = input.pointer.x;
          const v = clamp((target - s.x) * 9, -520, 520);
          s.vx = v;
          s.x = clamp(s.x + v * dt, PAPA_MIN, PAPA_MAX);
        } else s.vx = 0;

        if (!api.ended) {
          s.spawnT -= dt;
          if (s.spawnT <= 0) { spawn(); s.spawnT = Math.max(0.42, 0.62 - s.t * 0.012); }
        }
        for (const w of s.words) {
          if (w.bounce) { w.vy += 900 * dt; w.x += w.bounce * dt; }
          w.y += w.vy * dt;
          if (w.done || api.ended) continue;
          if (w.y > CATCH_Y - 14 && w.y < CATCH_Y + 22 && Math.abs(w.x - s.x) < 62) {
            const needed = TARGET[s.next];
            if (w.txt === needed) {
              w.done = true; w.y = 2000;
              s.phrase.push({ txt: w.txt, fr: false });
              s.next++;
              s.catchT = 0.4; s.lastGood = true;
              api.sfx('catch');
              api.burst(s.x, CATCH_Y, { n: 12, color: ['#7fd0ff', '#ffffff'], speed: 220, gravity: 300, size: 5 });
              say(['Good !', 'Yes !', 'Super !', 'Perfect !'][s.next - 1]);
              if (s.next >= TARGET.length) api.end(true);
            } else if (FRENCH.includes(w.txt)) {
              w.done = true; w.y = 2000;
              s.phrase.push({ txt: w.txt.toLowerCase(), fr: true });
              s.french++;
              s.catchT = 0.4; s.lastGood = false;
              api.sfx('boing');
              api.shake(6);
              say(['Oups, du français…', 'Encore du français !', 'Mayday…'][Math.min(2, s.french - 1)], 1);
              if (s.french >= 3) api.end(false);
            } else {
              // mot anglais, mais pas le bon : il rebondit
              w.done = true; w.vy = -320; w.bounce = w.x < s.x ? -260 : 260;
              api.sfx('pop');
              say('Pas encore celui-là !', 0.7);
            }
          }
        }
        s.words = s.words.filter((w) => w.y < H + 40);
      },
      timeout() { return s.next >= TARGET.length; },
      draw(g) {
        g.drawImage(bg, 0, 0);

        // le garagiste, bras croisés… il attend
        const mecaHappy = api.ended && s.next >= TARGET.length;
        drawPerson(g, { ...MECA, x: 840, y: FLOOR, size: 66, flipX: true, t: s.t, pose: mecaHappy ? 'arms_up' : 'stand',
          expression: mecaHappy ? 'laugh' : api.ended ? 'surprised' : s.french ? 'worried' : 'smile' });
        g.fillStyle = '#fff'; g.strokeStyle = '#2a2a2a'; g.lineWidth = 2.5;
        api.roundRect(g, 742, 188, 196, 56, 14); g.fill(); g.stroke();
        const mecaTxt = mecaHappy ? 'Ah, ja ! Gut !' : api.ended ? '… Was ?' : 'Yes ? What part ?';
        api.text(g, mecaTxt, 840, 216, { size: 21, color: '#2a2a2a' });

        // mots qui tombent
        for (const w of s.words) {
          if (w.y > H + 30) continue;
          g.save(); g.translate(w.x, w.y); g.rotate(w.rot + (w.bounce ? s.t * 6 : 0));
          g.font = '900 24px "Nunito Sans", system-ui, sans-serif';
          const tw = Math.max(54, g.measureText(w.txt).width + 26);
          g.fillStyle = '#fffbe9'; g.strokeStyle = '#5a4a3a'; g.lineWidth = 3;
          api.roundRect(g, -tw / 2, -20, tw, 40, 10); g.fill(); g.stroke();
          api.text(g, w.txt, 0, 1, { size: 24, color: '#2b2b38', weight: 900 });
          g.restore();
        }

        // Papa, mains en l'air pour attraper
        const happy = s.catchT > 0 && s.lastGood;
        const ex = api.ended ? (s.next >= TARGET.length ? 'happy' : 'laugh') : s.catchT > 0 ? (s.lastGood ? 'happy' : 'surprised') : 'focus';
        api.avatar(g, {
          x: s.x, y: papaY, size: 62, t: s.t, pose: Math.abs(s.vx) > 60 && !api.ended ? 'run' : happy || (api.ended && s.next >= 4) ? 'cheer' : 'stand',
          flipX: s.vx < -60, expression: ex, sweat: s.french >= 2 && !api.ended, blush: s.french >= 3 ? 1 : 0,
          hands: Math.abs(s.vx) > 60 || happy || api.ended ? undefined : { l: { x: s.x - 38, y: CATCH_Y + 14 }, r: { x: s.x + 38, y: CATCH_Y + 14 } },
        });

        // phrase en construction (HUD)
        g.fillStyle = 'rgba(255, 255, 255, 0.92)'; g.strokeStyle = '#2a2a2a'; g.lineWidth = 3;
        api.roundRect(g, 40, 22, 660, 52, 14); g.fill(); g.stroke();
        g.font = '900 24px "Nunito Sans", system-ui, sans-serif';
        let px = 60;
        api.text(g, 'Papa :', px, 49, { size: 20, color: '#666', align: 'left' });
        px += 74;
        const parts = s.phrase.map((p) => ({ ...p }));
        for (let i = s.next; i < TARGET.length; i++) parts.push({ txt: '___', fr: false, empty: true });
        for (const p of parts) {
          g.font = '900 24px "Nunito Sans", system-ui, sans-serif';
          const w = g.measureText(p.txt + ' ').width;
          if (px + w > 690) break;
          api.text(g, p.txt, px, 49, { size: 24, weight: 900, align: 'left', color: p.empty ? '#aaa' : p.fr ? '#d0453a' : '#2a6fc0' });
          px += w;
        }
        api.text(g, `Mots français : ${'✘'.repeat(s.french)}${'·'.repeat(Math.max(0, 3 - s.french))}`, 44, 100, { size: 20, color: '#fff', stroke: '#000a', align: 'left' });
        if (!api.ended && s.next < 4) api.text(g, `Cherche : ${TARGET[s.next]}`, 370, 100, { size: 20, color: '#ffe27a', stroke: '#000a', align: 'left' });

        if (s.msgT > 0 && !api.ended) api.text(g, s.msg, clamp(s.x, 130, 640), 252, { size: 24, color: '#fff', stroke: '#000a' });

        // bulle finale
        if (api.ended) {
          const ok = s.next >= TARGET.length;
          const txt = ok ? '« The new EGR valve, please ! »' : '« The nouvelle vanne EGR ! »';
          const bx = clamp(s.x, 230, 520);
          g.fillStyle = '#fff'; g.strokeStyle = '#2a2a2a'; g.lineWidth = 3;
          api.roundRect(g, bx - 200, 160, 400, 60, 18); g.fill(); g.stroke();
          api.text(g, txt, bx, 191, { size: 26, color: ok ? '#2a6fc0' : '#d0453a', weight: 900 });
        }
      },
    };
  },
};

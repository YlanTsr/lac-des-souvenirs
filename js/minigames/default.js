/**
 * Mini-jeu de SECOURS (« default ») : utilisé pour toute anecdote qui n'a pas
 * encore son mini-jeu personnalisé. Papa, dans sa barque, attrape des lucioles
 * avec un bocal pour rallumer la lanterne du souvenir.
 */
export default {
  id: 'default',
  title: 'Les lucioles du souvenir',
  instructions: 'Ce souvenir attend encore son propre mini-jeu… En attendant, aide Papa à attraper 7 lucioles dans son bocal pour rallumer la lanterne !',
  controls: 'Souris / doigt, ou ← →  pour déplacer la barque',
  duration: 11,
  introExpression: 'happy',
  successTitle: 'Le bocal brille !',
  failTitle: 'Lucioles taquines !',
  successText: 'Le bocal brille assez pour rallumer la lanterne !',
  failText: 'Les lucioles étaient taquines ce soir… mais Papa en a attrapé assez pour que la lanterne s’allume quand même !',

  create(api) {
    const { W, H, rand, clamp } = api;
    const GOAL = 7;
    const s = {
      x: W / 2, vx: 0, caught: 0, flies: [], spawn: 0, glow: 0,
      stars: Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(0, 300), p: rand(0, 6) })),
      t: 0,
    };
    const deckY = H - 92;
    const jar = () => ({ x: s.x + 58, y: deckY - 150 });

    return {
      update(dt, input) {
        s.t += dt;
        s.glow = Math.max(0, s.glow - dt * 1.5);
        if (!api.ended) {
          const target = input.pointer.active ? input.pointer.x : s.x + input.axis('x') * 520 * dt;
          const nx = clamp(s.x + (clamp(target, 90, W - 150) - s.x) * Math.min(1, dt * 9), 90, W - 150);
          s.vx = (nx - s.x) / Math.max(dt, 1e-3);
          s.x = nx;
        }
        // apparition des lucioles
        s.spawn -= dt;
        if (s.spawn <= 0 && !api.ended) {
          s.spawn = 0.42;
          s.flies.push({ x: rand(70, W - 70), y: -20, vy: rand(55, 95), ph: rand(0, 6), amp: rand(40, 110), gold: Math.random() < 0.15 });
        }
        const j = jar();
        for (let i = s.flies.length - 1; i >= 0; i--) {
          const f = s.flies[i];
          f.y += f.vy * dt;
          f.x += Math.sin(s.t * 2.2 + f.ph) * f.amp * dt;
          if (!api.ended && Math.hypot(f.x - j.x, f.y - j.y) < 52) {
            s.caught += f.gold ? 2 : 1;
            s.glow = 1;
            api.sfx('catch');
            api.burst(f.x, f.y, { color: ['#eaff9a', '#ffe58a'], n: 10, speed: 140, gravity: -60, size: 3 });
            s.flies.splice(i, 1);
            if (s.caught >= GOAL) api.end(true, `${s.caught} lucioles dans le bocal : la lanterne est prête à s'envoler !`);
            continue;
          }
          if (f.y > H + 20) s.flies.splice(i, 1);
        }
      },
      timeout() {
        if (s.caught >= 4) api.end(true, `${s.caught} lucioles dans le bocal : c’est suffisant pour rallumer la lanterne !`);
        return s.caught >= 4;
      },
      draw(g) {
        // ciel et lac nocturnes
        const sky = g.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#0b0f2a'); sky.addColorStop(0.62, '#2b2556'); sky.addColorStop(0.63, '#141a40'); sky.addColorStop(1, '#0a0d24');
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        for (const st of s.stars) {
          g.globalAlpha = 0.4 + 0.4 * Math.sin(s.t * 2 + st.p);
          g.fillStyle = '#fff'; g.fillRect(st.x, st.y, 2, 2);
        }
        g.globalAlpha = 1;
        // îles au loin
        g.fillStyle = '#18213a';
        g.beginPath(); g.moveTo(0, 336); g.quadraticCurveTo(160, 270, 330, 336); g.quadraticCurveTo(620, 290, 760, 336); g.quadraticCurveTo(870, 300, W, 336); g.lineTo(W, 340); g.lineTo(0, 340); g.fill();
        // reflets
        g.fillStyle = 'rgba(255, 200, 140, 0.08)';
        for (let i = 0; i < 9; i++) g.fillRect(((i * 113 + s.t * 18) % (W + 100)) - 50, 380 + i * 16, 90 - i * 4, 2);

        // lucioles
        for (const f of s.flies) {
          const a = 0.6 + 0.4 * Math.sin(s.t * 8 + f.ph);
          const rg = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.gold ? 22 : 16);
          rg.addColorStop(0, f.gold ? `rgba(255,220,120,${a})` : `rgba(220,255,140,${a})`);
          rg.addColorStop(1, 'rgba(220,255,140,0)');
          g.fillStyle = rg;
          g.beginPath(); g.arc(f.x, f.y, f.gold ? 22 : 16, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fbffd8';
          g.beginPath(); g.arc(f.x, f.y, f.gold ? 4 : 3, 0, Math.PI * 2); g.fill();
        }

        // Papa assis dans la barque, bocal levé
        const j = jar();
        const lean = clamp(s.vx / 900, -0.25, 0.25);
        api.avatar(g, {
          x: s.x - 10, y: deckY, size: 64, pose: 'sit',
          expression: api.ended ? (s.caught >= 4 ? 'happy' : 'laugh') : s.glow > 0.2 ? 'happy' : 'focus',
          lookX: 0.6, lookY: -1, tilt: lean,
          hands: { l: { x: s.x - 70, y: deckY - 40 }, r: { x: j.x - 8, y: j.y + 34 } },
        });
        // bocal lumineux
        const glowR = 40 + s.caught * 5 + s.glow * 20;
        const jg = g.createRadialGradient(j.x, j.y, 0, j.x, j.y, glowR);
        jg.addColorStop(0, `rgba(230,255,150,${0.35 + s.caught * 0.06})`);
        jg.addColorStop(1, 'rgba(230,255,150,0)');
        g.fillStyle = jg; g.beginPath(); g.arc(j.x, j.y, glowR, 0, Math.PI * 2); g.fill();
        api.roundRect(g, j.x - 24, j.y - 30, 48, 62, 12);
        g.fillStyle = 'rgba(200,230,255,0.25)'; g.fill();
        g.strokeStyle = 'rgba(230,240,255,0.8)'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#8a6a4a'; g.fillRect(j.x - 20, j.y - 38, 40, 10);
        for (let k = 0; k < Math.min(s.caught, 9); k++) {
          g.fillStyle = '#f4ffb0';
          g.beginPath(); g.arc(j.x - 12 + ((k * 11) % 26), j.y + 16 - Math.floor(k / 3) * 14 + Math.sin(s.t * 5 + k) * 2, 3, 0, Math.PI * 2); g.fill();
        }
        // la barque (par-dessus les jambes)
        g.fillStyle = '#7a5236';
        g.beginPath();
        g.moveTo(s.x - 150, deckY - 18); g.lineTo(s.x + 150, deckY - 18);
        g.quadraticCurveTo(s.x + 130, deckY + 40, s.x + 70, deckY + 44);
        g.lineTo(s.x - 80, deckY + 44); g.quadraticCurveTo(s.x - 135, deckY + 40, s.x - 150, deckY - 18);
        g.fill();
        g.fillStyle = '#5b3c27'; g.fillRect(s.x - 150, deckY - 22, 300, 8);
        // lanterne de proue
        g.strokeStyle = '#4a3020'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(s.x + 135, deckY - 18); g.lineTo(s.x + 150, deckY - 110); g.stroke();
        const lg = g.createRadialGradient(s.x + 152, deckY - 96, 0, s.x + 152, deckY - 96, 34);
        lg.addColorStop(0, 'rgba(255,200,120,0.9)'); lg.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = lg; g.beginPath(); g.arc(s.x + 152, deckY - 96, 34, 0, Math.PI * 2); g.fill();

        // compteur
        api.text(g, `Lucioles : ${Math.min(s.caught, GOAL)} / ${GOAL}`, W / 2, 46, { size: 30, color: '#eaff9a', stroke: 'rgba(0,0,0,0.5)' });
        if (api.memory?.title) api.text(g, `« ${api.memory.title} »`, W / 2, 84, { size: 20, weight: 600, color: 'rgba(255,240,220,0.7)', font: '"Cormorant Garamond", Georgia, serif' });
      },
    };
  },
};

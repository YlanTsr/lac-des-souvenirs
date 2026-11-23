/**
 * Anecdote #1 — « Les yaourts dans les poches du métro » (yaourt_metro)
 * Un pot de yaourt dans chaque poche… et les portes du métro qui se referment.
 * Mécanique : appuyer au bon moment pour foncer dans la rame pendant que les portes
 * sont ouvertes. Trop tôt : bonk contre la porte. Trop tard : SPLATCH.
 */
export default {
  id: 'yaourt_metro',
  title: 'Les yaourts dans les poches du métro',
  instructions: 'Un yaourt dans chaque poche, le métro arrive… Fonce dans la rame quand les portes sont grandes ouvertes, sans te faire coincer (ni faire gicler les yaourts) !',
  controls: 'Espace / clic / tap : foncer',
  duration: 13,
  introExpression: 'smile',
  successTitle: 'Yaourts sauvés !',
  failTitle: 'SPLATCH !',
  successText: 'Il est monté dans la rame, digne, les deux yaourts intacts. Ce jour-là, l’histoire aurait été bien moins drôle…',
  failText: 'Les portes ont refermé leurs mâchoires sur les poches : yaourt sur le pantalon, sur les portes, sur les voisins. Exactement comme le vrai jour !',

  create(api) {
    const { W, H } = api;
    const DOOR_X = 600, DOOR_W = 170, MAX_GAP = 150;
    const PLATFORM_Y = 404; // seuil de la porte
    const START_FEET = 505;
    const OPEN_TIMES = [1.45, 1.15, 0.95, 0.85];
    const s = {
      phase: 'closed', phaseT: 0, cycle: 0, open: 0,
      dash: 0, dashing: false, bounce: 0,
      state: 'wait', // wait | dash | inside | squeezed
      squeezeT: 0, beepT: 0, stains: 0, potsOk: 2,
      expression: 'smile', bonks: 0, t: 0,
      tiles: [],
    };
    // carrelage de station (précalculé)
    for (let y = 0; y < 400; y += 26) for (let x = 0; x < W; x += 40) s.tiles.push([x + ((y / 26) % 2 ? 20 : 0), y]);

    const doorTimes = () => ({ closed: s.cycle === 0 ? 0.9 : 1.1, opening: 0.38, open: OPEN_TIMES[Math.min(s.cycle, 3)], closing: 0.42 });
    const gap = () => s.open * MAX_GAP;
    const scale = () => 1 - s.dash * 0.18;
    const bodyW = () => 62 * scale();

    function squeeze() {
      s.state = 'squeezed';
      s.squeezeT = 0;
      s.stains = 2;
      s.potsOk = 0;
      s.expression = 'surprised';
      api.sfx('splat');
      api.shake(16);
      const hipY = feetY() - 54 * scale();
      for (const side of [-1, 1]) {
        api.burst(DOOR_X + side * 34, hipY, { n: 34, color: ['#fffaf2', '#fff1e4', '#ffc2cf', '#ffffff'], speed: 420, gravity: 700, size: 7, life: 1.3 });
      }
      api.end(false);
    }
    const feetY = () => START_FEET - (START_FEET - PLATFORM_Y) * s.dash + Math.sin(s.bounce * Math.PI) * -18;

    return {
      update(dt, input) {
        s.t += dt;
        // ── cycle des portes
        s.phaseT += dt;
        const T = doorTimes();
        if (s.state !== 'squeezed') {
          if (s.phase === 'closed' && s.phaseT > T.closed) { s.phase = 'opening'; s.phaseT = 0; api.sfx('whoosh'); }
          else if (s.phase === 'opening') { s.open = Math.min(1, s.phaseT / T.opening); if (s.phaseT > T.opening) { s.phase = 'open'; s.phaseT = 0; } }
          else if (s.phase === 'open') {
            s.open = 1;
            if (s.phaseT > T.open - 0.75) { s.beepT -= dt; if (s.beepT <= 0) { s.beepT = 0.19; api.sfx('beep'); } }
            if (s.phaseT > T.open) { s.phase = 'closing'; s.phaseT = 0; }
          } else if (s.phase === 'closing') {
            s.open = Math.max(0, 1 - s.phaseT / T.closing);
            if (s.phaseT > T.closing) { s.phase = 'closed'; s.phaseT = 0; s.open = 0; s.cycle++; }
          }
        }

        // ── Papa
        if (s.state === 'wait') {
          s.bounce = Math.max(0, s.bounce - dt * 2.5);
          if (s.bounce === 0 && s.expression === 'ouch') s.expression = 'worried';
          if (!api.ended && input.pressed()) { s.state = 'dash'; s.expression = 'focus'; api.sfx('whoosh'); }
        } else if (s.state === 'dash') {
          s.dash = Math.min(1, s.dash + dt / 0.55);
          // dans l'encadrement de la porte : vérifier l'ouverture
          if (s.dash > 0.72) {
            const g = gap();
            if (g < 18) {
              // portes fermées : BONK, on recule
              s.state = 'wait'; s.dash = 0; s.bounce = 1; s.bonks++; s.expression = 'ouch';
              api.sfx('boing'); api.shake(8);
            } else if (g < bodyW()) {
              squeeze();
            } else if (s.dash >= 1) {
              s.state = 'inside'; s.expression = 'happy';
              api.end(true);
            }
          }
        } else if (s.state === 'inside') {
          // les portes se referment derrière lui
          if (s.phase === 'open') s.phaseT = Math.max(s.phaseT, doorTimes().open - 0.2);
        } else if (s.state === 'squeezed') {
          s.squeezeT += dt;
          s.open = Math.max(bodyW() / MAX_GAP * 0.9, s.open - dt * 2);
        }
      },
      timeout() { return false; },
      draw(g) {
        // ── mur de station
        g.fillStyle = '#efe7d6'; g.fillRect(0, 0, W, 404);
        g.strokeStyle = 'rgba(160,140,110,0.25)'; g.lineWidth = 1;
        for (const [x, y] of s.tiles) { api.roundRect(g, x + 1, y + 1, 38, 24, 5); g.stroke(); }
        // panneau de station
        api.roundRect(g, 60, 40, 300, 64, 10); g.fillStyle = '#1f3f73'; g.fill();
        api.text(g, 'Station Souvenirs', 210, 72, { size: 28, color: '#fff' });
        api.roundRect(g, 380, 48, 46, 46, 23); g.fillStyle = '#f0c400'; g.fill();
        api.text(g, 'M', 403, 72, { size: 28, color: '#1f3f73', weight: 800 });

        // ── rame de métro
        const top = 120, bottom = PLATFORM_Y;
        g.fillStyle = '#2f6d8f'; api.roundRect(g, 380, top, W - 360, bottom - top + 8, 24); g.fill();
        g.fillStyle = '#e9eef2'; g.fillRect(380, top + 158, W - 380, 16);
        // fenêtres
        g.fillStyle = '#9fc4dc';
        for (const wx of [410, 800]) { api.roundRect(g, wx, top + 30, 120, 90, 14); g.fill(); }
        // intérieur visible par la porte
        const gp = gap();
        g.fillStyle = '#ffeec6'; g.fillRect(DOOR_X - DOOR_W / 2, top + 22, DOOR_W, bottom - top - 22);
        g.fillStyle = '#d7b98a'; g.fillRect(DOOR_X - DOOR_W / 2, top + 150, DOOR_W, 20);
        g.strokeStyle = '#b8b8b8'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(DOOR_X, top + 22); g.lineTo(DOOR_X, bottom); g.stroke();

        const drawPapa = () => {
          const sc = scale();
          const fy = feetY();
          api.avatar(g, {
            x: DOOR_X, y: fy, size: 58 * sc, expression: api.ended && !s.potsOk ? 'laugh' : s.expression,
            pose: s.state === 'dash' ? 'run' : 'stand', t: s.t, stains: s.stains, sweat: s.phase === 'open' && s.phaseT > 0.5 && s.state === 'wait',
          });
          // les deux pots de yaourt qui dépassent des poches
          if (s.potsOk) {
            const r = 29 * sc, hipY = fy - 1.9 * r;
            for (const side of [-1, 1]) {
              const px = DOOR_X + side * 0.98 * r, py = hipY + 0.15 * r;
              g.fillStyle = '#fffaf2'; g.fillRect(px - 0.25 * r, py - 0.35 * r, 0.5 * r, 0.55 * r);
              g.fillStyle = '#f37fa0'; g.fillRect(px - 0.3 * r, py - 0.45 * r, 0.6 * r, 0.14 * r);
            }
          }
        };
        const inDoor = s.dash > 0.6;
        if (inDoor) drawPapa();

        // battants de porte
        const half = DOOR_W / 2;
        g.fillStyle = '#3a7da3';
        g.fillRect(DOOR_X - half, top + 22, half - gp / 2, bottom - top - 22);
        g.fillRect(DOOR_X + gp / 2, top + 22, half - gp / 2, bottom - top - 22);
        g.fillStyle = '#b9dcef';
        g.fillRect(DOOR_X - half + 12, top + 40, Math.max(0, half - gp / 2 - 24), 80);
        g.fillRect(DOOR_X + gp / 2 + 12, top + 40, Math.max(0, half - gp / 2 - 24), 80);
        g.fillStyle = '#1f4f6c';
        g.fillRect(DOOR_X - gp / 2 - 4, top + 22, 4, bottom - top - 22);
        g.fillRect(DOOR_X + gp / 2, top + 22, 4, bottom - top - 22);
        // voyant
        g.fillStyle = s.phase === 'open' && s.phaseT > doorTimes().open - 0.75 ? (Math.sin(s.t * 30) > 0 ? '#ff4d4d' : '#7a2020') : '#3cbf6a';
        g.beginPath(); g.arc(DOOR_X, top + 10, 8, 0, Math.PI * 2); g.fill();

        // ── quai
        g.fillStyle = '#8d8f98'; g.fillRect(0, PLATFORM_Y, W, H - PLATFORM_Y);
        g.fillStyle = '#f0c400'; g.fillRect(0, PLATFORM_Y + 6, W, 8);
        g.fillStyle = 'rgba(0,0,0,0.12)';
        for (let x = 0; x < W; x += 60) g.fillRect(x, PLATFORM_Y + 20, 2, H);
        // yaourt étalé sur le quai et les portes
        if (s.state === 'squeezed') {
          g.fillStyle = 'rgba(255,250,242,0.95)';
          for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(DOOR_X - 140 + i * 35, PLATFORM_Y + 26 + (i % 3) * 14, 18, 6, 0, 0, Math.PI * 2); g.fill(); }
          g.fillStyle = 'rgba(255,230,236,0.95)';
          g.beginPath(); g.ellipse(DOOR_X - 40, PLATFORM_Y - 80, 22, 40, 0.2, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.ellipse(DOOR_X + 46, PLATFORM_Y - 60, 18, 34, -0.3, 0, Math.PI * 2); g.fill();
        }
        if (!inDoor) drawPapa();

        // annonce
        if (s.phase === 'open' && s.phaseT > doorTimes().open - 0.75 && s.state !== 'inside') {
          api.roundRect(g, 250, 440, 460, 44, 22); g.fillStyle = 'rgba(30,20,20,0.75)'; g.fill();
          api.text(g, '🔔 Attention à la fermeture des portes !', 480, 462, { size: 20, color: '#ffd7a0' });
        } else if (s.state === 'wait' && s.bonks && s.bounce > 0) {
          api.text(g, 'BONK !', DOOR_X + 120, 300, { size: 36, color: '#ff8a5c', stroke: '#fff' });
        }
        if (s.state === 'squeezed') api.text(g, 'SPLATCH !', W / 2, 230, { size: 64, color: '#fff', stroke: '#f37fa0', strokeWidth: 10 });
        if (s.state === 'inside') api.text(g, 'Ouf !', DOOR_X, 90, { size: 46, color: '#fff', stroke: '#2f6d8f', strokeWidth: 8 });
      },
    };
  },
};

/**
 * Anecdote #2 — « La semoule sur la nappe » (semoule_nappe)
 * La sauce s'est renversée sur la nappe… la solution de Papa : la recouvrir de semoule !
 * Mécanique : maintenir le clic (ou Espace) pour verser la semoule et camoufler
 * au moins 85 % de la tache avant que les invités arrivent à table.
 */
export default {
  id: 'semoule_nappe',
  title: 'La semoule sur la nappe',
  instructions: 'Catastrophe : la sauce s’est renversée sur la nappe ! Les invités arrivent… Verse la semoule pour camoufler la tache avant qu’ils passent à table.',
  controls: 'Maintenir clic / doigt pour verser · ou flèches + Espace',
  duration: 13,
  introExpression: 'worried',
  successTitle: 'Camouflage parfait !',
  failTitle: 'Démasqué !',

  create(api) {
    const { W, H, rand } = api;
    const GOAL = 0.85;
    const CX = 470, CY = 268;
    const stainR = (a) => 112 + 22 * Math.sin(3 * a + 1) + 14 * Math.sin(5 * a) + 9 * Math.sin(2 * a + 2);
    const inStain = (x, y) => {
      const dx = x - CX, dy = (y - CY) * 1.25;
      return Math.hypot(dx, dy) < stainR(Math.atan2(dy, dx));
    };

    // grille de couverture (cellules de 12 px) — seules les cellules « sauce » comptent
    const CELL = 12;
    const gx0 = CX - 160, gy0 = CY - 130, cols = Math.ceil(320 / CELL), rows = Math.ceil(260 / CELL);
    const cells = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = gx0 + i * CELL + CELL / 2, y = gy0 + j * CELL + CELL / 2;
      if (inStain(x, y)) cells.push({ x, y, v: 0 });
    }

    // calques précalculés (dessinés une seule fois)
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const cloth = mk(), sauce = mk(), grains = mk();
    {
      const g = cloth.getContext('2d');
      g.fillStyle = '#fbf6ee'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(205, 60, 60, 0.32)';
      for (let x = 0; x < W; x += 40) g.fillRect(x, 0, 20, H);
      for (let y = 0; y < H; y += 40) g.fillRect(0, y, W, 20);
      // assiettes, verres, couverts
      const plate = (x, y) => {
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 52, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#d9d2c4'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 38, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#b9b9c2'; g.fillRect(x - 70, y - 30, 6, 60); g.fillRect(x + 64, y - 30, 6, 60);
      };
      plate(120, 110); plate(830, 110); plate(830, 430); plate(820, 270);
      g.fillStyle = 'rgba(170, 210, 240, 0.6)';
      for (const [x, y] of [[200, 60], [740, 60], [740, 480]]) { g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fill(); }
      const s = sauce.getContext('2d');
      s.fillStyle = '#9a4a1f';
      s.beginPath();
      for (let k = 0; k <= 64; k++) {
        const a = (k / 64) * Math.PI * 2, r = stainR(a);
        const x = CX + Math.cos(a) * r, y = CY + (Math.sin(a) * r) / 1.25;
        k ? s.lineTo(x, y) : s.moveTo(x, y);
      }
      s.fill();
      s.fillStyle = 'rgba(255, 190, 120, 0.35)';
      s.beginPath(); s.ellipse(CX - 40, CY - 30, 40, 18, -0.3, 0, Math.PI * 2); s.fill();
      // éclaboussures
      s.fillStyle = '#9a4a1f';
      for (let i = 0; i < 10; i++) {
        const a = rand(0, 6.28), r = stainR(a) + rand(10, 36);
        s.beginPath(); s.arc(CX + Math.cos(a) * r, CY + Math.sin(a) * r / 1.25, rand(3, 8), 0, Math.PI * 2); s.fill();
      }
    }
    const gg = grains.getContext('2d');
    const GRAIN_COLORS = ['#f2d48a', '#e8c46e', '#f7e2a8', '#d9b35b'];

    const s = { coverage: 0, pouring: false, grainT: 0, t: 0, falling: [] };
    const RADIUS = 36;

    function pour(x, y, dt) {
      for (let i = 0; i < 26; i++) {
        const a = rand(0, 6.28), r = Math.sqrt(Math.random()) * RADIUS;
        gg.fillStyle = GRAIN_COLORS[i % 4];
        gg.beginPath(); gg.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, rand(1.4, 2.6), rand(1, 1.8), a, 0, Math.PI * 2); gg.fill();
      }
      let covered = 0;
      for (const c of cells) {
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < RADIUS) c.v = Math.min(1.5, c.v + dt * 4.2 * (1 - d / RADIUS / 1.4));
        if (c.v >= 1) covered++;
      }
      s.coverage = covered / cells.length;
      // grains qui tombent du paquet (décor)
      if (s.falling.length < 60) s.falling.push({ x: x + 14 + rand(-6, 6), y: y - 70, vy: rand(250, 380) });
    }

    return {
      update(dt, input) {
        s.t += dt;
        s.pouring = !api.ended && input.held();
        if (s.pouring) {
          pour(input.cursor.x, input.cursor.y, dt);
          s.grainT -= dt;
          if (s.grainT <= 0) { s.grainT = 0.09; api.sfx('grain'); }
          if (s.coverage >= GOAL) api.end(true, `Tache camouflée à ${Math.round(s.coverage * 100)} % : personne n’a rien vu… à part un couscous très généreux sur la nappe.`);
        }
        for (let i = s.falling.length - 1; i >= 0; i--) {
          const f = s.falling[i];
          f.y += f.vy * dt;
          if (f.y > input.cursor.y + 30 || !s.pouring) s.falling.splice(i, 1);
        }
        this._cursor = input.cursor;
      },
      timeout() {
        this._fail = true;
        api.end(false, `Tache camouflée à ${Math.round(s.coverage * 100)} % seulement… Les invités ont trouvé le couscous un peu « saucé » par en dessous. Fou rire général, et c’était délicieux quand même !`);
        return false;
      },
      draw(g) {
        g.drawImage(cloth, 0, 0);
        g.drawImage(sauce, 0, 0);
        g.drawImage(grains, 0, 0);

        // paquet de semoule au curseur
        const c = this._cursor || { x: CX + 120, y: CY - 60 };
        for (const f of s.falling) { g.fillStyle = '#f2d48a'; g.fillRect(f.x, f.y, 3, 3); }
        g.save();
        g.translate(c.x + 18, c.y - 84);
        g.rotate(s.pouring ? 0.9 : 0.3);
        api.roundRect(g, -26, -44, 52, 84, 6); g.fillStyle = '#2d6db5'; g.fill();
        api.roundRect(g, -20, -20, 40, 30, 4); g.fillStyle = '#ffd84a'; g.fill();
        api.text(g, 'SEMOULE', 0, -5, { size: 9, color: '#2d6db5', weight: 800 });
        g.restore();
        g.strokeStyle = 'rgba(120,80,40,0.35)'; g.lineWidth = 2; g.setLineDash([4, 5]);
        g.beginPath(); g.arc(c.x, c.y, RADIUS, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);

        // Papa qui surveille, en bas à gauche
        const pct = s.coverage;
        api.avatar(g, {
          x: 120, y: H + 150, size: 120, pose: 'stand',
          expression: api.ended ? (pct >= GOAL ? 'happy' : 'laugh') : s.pouring ? 'focus' : pct > 0.6 ? 'smile' : 'worried',
          sweat: api.timeLeft < 4 && !api.ended, lookX: 1, lookY: -0.5,
        });

        // jauge
        api.roundRect(g, 640, 50, 300, 56, 14); g.fillStyle = 'rgba(30,20,10,0.72)'; g.fill();
        api.text(g, `Tache camouflée : ${Math.round(pct * 100)} %`, 790, 68, { size: 18, color: '#ffe7b0' });
        api.roundRect(g, 660, 84, 260, 10, 5); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fill();
        api.roundRect(g, 660, 84, 260 * Math.min(1, pct / GOAL), 10, 5); g.fillStyle = pct >= GOAL ? '#8fe07a' : '#f2c14e'; g.fill();
        if (api.timeLeft < 4 && !api.ended) api.text(g, '👣 Les invités arrivent !', W / 2, 500, { size: 26, color: '#fff', stroke: '#9a4a1f' });
        if (this._fail) api.text(g, `« Tiens, il y a du couscous sur la nappe ? »`, W / 2, 500, { size: 24, color: '#fff', stroke: '#9a4a1f' });
      },
    };
  },
};

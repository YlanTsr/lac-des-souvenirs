/**
 * ═══════════════════════════════════════════════════════════
 *  Séquence d'introduction (jouée après « Commencer le voyage »)
 *
 *   1. « cake »    : Canvas 2D plein écran — Papa souffle les bougies du gâteau
 *                    (maintenir Espace / clic / doigt). Le lac 3D n'est PAS rendu.
 *      « joy » → « tip » : Papa jubile, puis bascule (fermeture en iris).
 *   2. « tunnel »  : petite scène Three.js dédiée (anneaux instanciés, LineSegments,
 *                    Points, sprites de texte) — sa vie défile de 1971 à 2026.
 *                    Seule cette scène est rendue ; elle est libérée (dispose) à la fin.
 *   3. « arrival » : retour au lac ; Papa descend du ciel et atterrit dans la barque.
 *
 *  Branchement (main.js, état « introSeq ») :
 *    update(dt, t)     → true si le lac doit être rendu cette image (phase d'arrivée)
 *    lateUpdate(dt, t) → après boat.update() : pose de l'avatar + caméra
 *    skip()            → bouton « Passer l'intro » / Échap
 *  Tests console : __lanternes.intro._step(1/60, 60), _hold(true), stats()
 * ═══════════════════════════════════════════════════════════
 */
import * as THREE from 'three';
import { drawAvatar2D, Avatar3D } from './avatar.js';
import { clamp, lerp, damp, easeInOut } from './utils.js';

const DW = 760, DH = 560;       // zone utile du décor du gâteau (repère de dessin, centrée à l'écran)
const DCX = 475, DCY = 285;     // point du repère placé au centre de l'écran
const CAKE_X = 600;             // centre du gâteau (repère de dessin)
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (i) => { const s = Math.sin(i * 91.345 + 12.9898) * 43758.5453; return s - Math.floor(s); };
const rand = (a, b) => a + Math.random() * (b - a);

const CANDLE_COLORS = ['#ffe08a', '#9fe3ff', '#ff9fb4', '#b9a8ff'];
const FLAG_COLORS = ['#ffc685', '#ff9fb4', '#b9a8ff', '#9fe3ff', '#ffb08a'];
const CONFETTI = ['#ffc685', '#ff9fb4', '#b9a8ff', '#9fe3ff', '#b9f5a6', '#fff3df'];

export class IntroSequence {
  /**
   * @param {object} o
   *  - config : INTRO_SEQUENCE (config.js)
   *  - renderer, scene (lac), camera, boat, rig (CameraRig), audio, glowTex
   *  - fade(fn)  : fondu au noir → fn → retour (ui.fadeThrough)
   *  - step(dt)  : exécute une image complète de la boucle principale (tests)
   *  - onDone({skipped}) : fin de l'intro → main passe en mode « play »
   */
  constructor({ config, renderer, scene, camera, boat, rig, audio, glowTex, fade, step, onDone }) {
    this.cfg = config || {};
    Object.assign(this, { renderer, scene, camera, boat, rig, audio, glowTex });
    this.hooks = { fade, step, onDone };
    this.active = false;
    this.phase = 'idle';
    this.phaseT = 0;
    this.tunnel = null;
    this.cake = null;
    this._stats = {};
    this._keyHold = false;
    this._pointers = new Set();
    this._testHold = false;
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._q1 = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._e = new THREE.Euler();

    const $ = (id) => document.getElementById(id);
    this.el = {
      root: $('introseq'), canvas: $('introseq-canvas'), hint: $('introseq-hint'), candles: $('introseq-candles'),
      year: $('introseq-year'), veil: $('introseq-veil'), skip: $('introseq-skip'),
    };
    this.g = this.el.canvas.getContext('2d');
    this._bind();
    // polices des textures du tunnel (chargées en tâche de fond)
    try {
      document.fonts?.load('italic 500 64px "Cormorant Garamond"');
      document.fonts?.load('800 64px "Nunito Sans"');
    } catch { /* ignore */ }
  }

  /* ─────────────────────────── Entrées ─────────────────────────── */
  _bind() {
    const { root, skip } = this.el;
    skip.addEventListener('pointerdown', (e) => e.stopPropagation());
    skip.addEventListener('click', (e) => { e.stopPropagation(); this.skip(); });
    root.addEventListener('pointerdown', (e) => {
      if (!this.active || e.target.closest('button')) return;
      e.preventDefault();
      this._pointers.add(e.pointerId);
    });
    const up = (e) => this._pointers.delete(e.pointerId);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => {
      if (!this.active || e.code !== 'Space') return;
      e.preventDefault(); // pas de « clic » clavier sur un bouton, pas de défilement
      this._keyHold = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code !== 'Space') return;
      this._keyHold = false;
      if (this.active) e.preventDefault();
    });
    window.addEventListener('blur', () => { this._keyHold = false; this._pointers.clear(); });
    window.addEventListener('resize', () => { if (this.active) this._resize(); });
  }

  get blowing() { return this._keyHold || this._pointers.size > 0 || this._testHold; }

  /* ─────────────────────────── Cycle de vie ─────────────────────────── */
  start() {
    if (this.active) return;
    this.active = true;
    this._skipping = false;
    this._keyHold = false;
    this._pointers.clear();
    this._testHold = false;
    document.activeElement?.blur?.();
    this.rig.enabled = false;      // pas de « regarder autour » pendant l'intro
    this.rig.cinematic = null;
    this.boat.cancelAutopilot();
    this.boat.speed = 0;
    this._stats = {};

    const el = this.el;
    el.root.hidden = false;
    el.veil.style.opacity = '0';
    this._veilColor = '';
    this._resize();
    this._initCake();
    this._setPhase('cake');
    // Le tunnel est construit dès maintenant : textures et shaders sont prêts
    // avant la chute (pas d'à-coup au moment de basculer).
    this.tunnel = new LifeTunnel(this.renderer, this.cfg, this.glowTex);
    this.tunnel.precompile();
  }

  /** Bouton « Passer l'intro » / Échap : fondu → barque sur le lac, état propre. */
  skip() {
    if (!this.active || this._skipping) return;
    this._skipping = true;
    const go = () => this._finish(true);
    if (this.hooks.fade) this.hooks.fade(go); else go();
  }

  _finish(skipped) {
    if (!this.active) return;
    this.active = false;
    this._cleanup();
    if (skipped) this.rig.snap(this.boat);
    this.hooks.onDone?.({ skipped });
  }

  /** Remet tout en ordre (idempotent) : avatar dans la barque, caméra libre, scène tunnel libérée. */
  _cleanup() {
    this.phase = 'idle';
    this._breathStop();
    this.tunnel?.dispose();
    this.tunnel = null;
    const { boat, rig, camera } = this;
    const av = boat.avatar;
    if (av.group.parent !== boat.model) boat.model.add(av.group);
    av.group.position.set(0, 0.3, 0.6);
    av.group.rotation.set(0, Math.PI, 0);
    boat.avatarFree = false;
    if (this._glow) {
      this._glow.removeFromParent();
      this._glow.material.dispose();
      this._glow = null;
    }
    rig.cinematic = null;
    rig.enabled = true;
    camera.fov = 55;
    camera.updateProjectionMatrix();
    const el = this.el;
    el.root.hidden = true;
    el.veil.style.opacity = '0';
    el.year.hidden = true;
    el.canvas.style.display = '';
    el.hint.classList.remove('nudge');
    this.cake = null;
    this._pointers.clear();
    this._keyHold = false;
    this._testHold = false;
  }

  _setPhase(p) {
    this.phase = p;
    this.phaseT = 0;
    const el = this.el;
    if (p === 'cake') {
      el.canvas.style.display = '';
      el.hint.hidden = false;
      el.candles.hidden = false;
      el.year.hidden = true;
      el.hint.innerHTML = 'Maintiens <kbd>Espace</kbd> &mdash; ou le clic, ou ton doigt &mdash; pour souffler les bougies&nbsp;!';
    } else if (p === 'joy') {
      el.hint.textContent = 'Bravo ! Et maintenant… fais un vœu.';
      el.hint.classList.remove('nudge');
      this._breath(0);
      this.audio.sfx('win');
      for (let i = 0; i < 90; i++) {
        this.cake.confetti.push({
          x: rand(DCX - 480, DCX + 480), y: rand(-120, -10), vx: rand(-30, 30), vy: rand(70, 160),
          rot: rand(0, 6), vr: rand(-6, 6), c: CONFETTI[i % CONFETTI.length], life: 1,
        });
      }
    } else if (p === 'tip') {
      el.hint.hidden = true;
      el.candles.hidden = true;
    } else if (p === 'tunnel') {
      this._breathStop();
      this._veil('#05061a', 1); // noir tant que le tunnel n'a pas été rendu
      el.canvas.style.display = 'none';
      el.hint.hidden = true;
      el.candles.hidden = true;
      el.year.hidden = false;
      this._lastYear = null;
      this.tunnel ??= new LifeTunnel(this.renderer, this.cfg, this.glowTex);
      this.audio.sfx('whoosh');
    } else if (p === 'arrival') {
      el.year.hidden = true;
      this.tunnel?.dispose();
      this.tunnel = null;
      this._beginArrival();
    }
  }

  /* ─────────────────────────── Boucle ─────────────────────────── */
  /** @returns {boolean} true si main.js doit mettre à jour et rendre le lac cette image. */
  update(dt, t) {
    if (!this.active) return true;
    this.phaseT += dt;
    switch (this.phase) {
      case 'cake':
      case 'joy':
      case 'tip': {
        const t0 = performance.now();
        this._updateCake(dt);
        if (this.phase === 'tunnel') return false; // on vient de basculer
        this._drawCake();
        this._acc('cake', performance.now() - t0);
        return false;
      }
      case 'tunnel': {
        const T = this.tunnel;
        const t0 = performance.now();
        T.update(dt, this.phaseT);
        T.render();
        if (this.syncTiming) this._gpuSync();
        this._acc('tunnel', performance.now() - t0);
        // grand compteur d'années (HTML), mis à jour seulement quand il change
        const y = T.currentYear(this.phaseT);
        if (y !== this._lastYear) { this._lastYear = y; this.el.year.textContent = String(y); }
        const D = T.duration;
        if (this.phaseT < 0.6) this._veil('#05061a', 1 - smooth(0, 0.6, this.phaseT));
        else this._veil('#fff1d6', smooth(D - 0.75, D, this.phaseT)); // le tunnel s'ouvre : flash doux
        this.el.year.style.opacity = String(smooth(0.2, 0.8, this.phaseT) * (1 - smooth(D - 1.1, D - 0.5, this.phaseT)));
        if (this.phaseT >= D) this._setPhase('arrival');
        return false;
      }
      case 'arrival':
        this._veil('#fff1d6', 1 - smooth(0, 1.2, this.phaseT));
        return true;
      default:
        return true;
    }
  }

  /** Appelé par main.js après boat.update() pendant l'état « introSeq ». */
  lateUpdate(dt, t) {
    if (!this.active || this.phase !== 'arrival') return;
    this._updateArrival(dt, t);
  }

  _veil(color, opacity) {
    const v = this.el.veil;
    if (color !== this._veilColor) { v.style.background = color; this._veilColor = color; }
    v.style.opacity = opacity.toFixed(3);
  }

  /* ═════════════════════ 1. LE GÂTEAU (Canvas 2D) ═════════════════════ */
  _resize() {
    const c = this.el.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const s = Math.min(W / DW, H / DH);
    this.view = { W, H, s, ox: W / 2 - DCX * s, oy: H / 2 - DCY * s };
  }

  _initCake() {
    const cx = CAKE_X;
    const candles = [];
    // deux bougies chiffres « 5 » « 5 » sur l'étage du haut
    for (const dx of [-34, 34]) candles.push({ num: true, x: cx + dx, base: 246, wick: 246 - 70, front: true });
    // petites bougies sur le rebord de l'étage du bas (ellipse), de derrière-droite à derrière-gauche
    const n = Math.max(0, Math.round(this.cfg.smallCandles ?? 8));
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (-0.12 + (1.24 * i) / Math.max(1, n - 1));
      const x = cx + Math.cos(a) * 109;
      const base = 306 + Math.sin(a) * 13 + 2;
      candles.push({ num: false, x, base, wick: base - 42, front: Math.sin(a) >= 0, color: CANDLE_COLORS[i % CANDLE_COLORS.length] });
    }
    // facilité d'extinction : les plus proches de Papa partent en premier (« une à une »)
    const mouth = { x: 262, y: 262 };
    const ds = candles.map((c) => Math.hypot(c.x - mouth.x, c.wick - mouth.y));
    const dmin = Math.min(...ds), dmax = Math.max(...ds);
    candles.forEach((c, i) => {
      c.f = lerp(2.4, 1, (ds[i] - dmin) / (dmax - dmin || 1)) * (0.9 + hash(i + 3) * 0.2) * (c.num ? 0.9 : 1);
    });
    const fmin = Math.min(...candles.map((c) => c.f));
    candles.forEach((c, i) => {
      c.f /= fmin;           // la plus coriace s'éteint en ≈ blowTime secondes de souffle
      c.health = 1;
      c.lit = true;
      c.flick = hash(i) * 10;
      c.smoke = 0;
      c.smokeAcc = 0;
      c.ember = 0;
    });
    // éléments du gâteau dessinés derrière l'étage du haut / devant
    this.cake = {
      candles, b: 0, light: 1, time: 0, idle: 0, wasBlowing: false,
      mouth: { ...mouth }, head: { x: 250, y: 233 }, spawn: 0,
      breath: [], smoke: [], confetti: [], litCount: candles.length,
    };
    this._renderCandleDots();
  }

  _renderCandleDots() {
    const C = this.cake;
    const box = this.el.candles;
    if (box.childElementCount !== C.candles.length) {
      box.innerHTML = '';
      for (let i = 0; i < C.candles.length; i++) box.appendChild(document.createElement('span'));
    }
    // ordre d'affichage : de gauche à droite
    const order = C.candles.map((c, i) => [c.x, i]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
    order.forEach((idx, k) => box.children[k].classList.toggle('out', !C.candles[idx].lit));
    box.setAttribute('aria-label', `Bougies encore allumées : ${C.litCount} sur ${C.candles.length}`);
  }

  _updateCake(dt) {
    const C = this.cake;
    const ph = this.phase;
    const blowing = ph === 'cake' && this.blowing;
    C.time += dt;
    C.b += ((blowing ? 1 : 0) - C.b) * damp(blowing ? 7 : 5, dt);
    if (blowing && !C.wasBlowing) this.audio.sfx('whoosh');
    C.wasBlowing = blowing;

    // petit coup de pouce si personne ne souffle
    C.idle = blowing ? 0 : C.idle + dt;
    this.el.hint.classList.toggle('nudge', ph === 'cake' && C.idle > 5);

    const blowTime = Math.max(0.5, this.cfg.blowTime ?? 3.2);
    let lit = 0, light = 0;
    for (const c of C.candles) {
      c.flick += dt * (7 + 12 * C.b);
      if (c.lit) {
        if (ph === 'cake') {
          c.health -= (dt * C.b * c.f) / blowTime;
          if (!blowing) c.health = Math.min(1, c.health + dt * 0.22); // relâché trop tôt : ça se ravive
        }
        if (c.health <= 0) {
          c.lit = false;
          c.health = 0;
          c.smoke = 1.8;
          c.ember = 1;
          this._puff();
        } else { lit++; light += c.health; }
      } else {
        c.ember = Math.max(0, c.ember - dt * 0.7);
        if (c.smoke > 0) {
          c.smoke -= dt;
          c.smokeAcc += dt * 12 * Math.min(1, c.smoke);
          while (c.smokeAcc >= 1) {
            c.smokeAcc -= 1;
            C.smoke.push({ x: c.x + rand(-1.5, 1.5), y: c.wick - 2, vx: rand(-7, 7) + C.b * 20, vy: rand(-42, -26), r: rand(2.5, 4), life: 1, max: rand(1.4, 2.1) });
          }
        }
      }
    }
    C.light += (light / C.candles.length - C.light) * damp(4, dt);
    if (lit !== C.litCount) { C.litCount = lit; this._renderCandleDots(); }

    // souffle visible : petites traînées d'air de la bouche vers les bougies
    if (ph === 'cake' && C.b > 0.05) {
      C.spawn += dt * 60 * C.b;
      while (C.spawn >= 1) {
        C.spawn -= 1;
        const tx = CAKE_X + rand(-110, 120), ty = rand(170, 300);
        const dx = tx - C.mouth.x, dy = ty - C.mouth.y, d = Math.hypot(dx, dy) || 1;
        const sp = rand(460, 600);
        C.breath.push({ x: C.mouth.x + 6, y: C.mouth.y, vx: (dx / d) * sp, vy: (dy / d) * sp, life: 1, max: (d / sp) * rand(0.8, 1.05) });
      }
    }
    stepParticles(C.breath, dt, 0);
    stepParticles(C.smoke, dt, 0, (p) => { p.r += dt * 9; p.vx *= 1 - dt * 0.5; });
    stepParticles(C.confetti, dt, 0.35, (p) => { p.rot += p.vr * dt; p.vx += Math.sin(C.time * 3 + p.rot) * 20 * dt; });

    this._breath(ph === 'cake' ? C.b : 0);

    if (ph === 'cake' && lit === 0) this._setPhase('joy');
    else if (ph === 'joy' && this.phaseT > 1.7) this._setPhase('tip');
    else if (ph === 'tip' && this.phaseT > 1.05) this._setPhase('tunnel');
  }

  _drawCake() {
    const g = this.g, C = this.cake, V = this.view;
    const ph = this.phase;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    // fond : pièce de nuit, réchauffée par les bougies
    g.fillStyle = '#0b0d22';
    g.fillRect(0, 0, V.W, V.H);
    const cxs = V.ox + CAKE_X * V.s, cys = V.oy + 250 * V.s;
    const R = Math.max(V.W, V.H);
    let grd = g.createRadialGradient(cxs, cys, 0, cxs, cys, R * 0.75);
    grd.addColorStop(0, `rgba(130, 66, 42, ${0.2 + 0.65 * C.light})`);
    grd.addColorStop(0.45, 'rgba(52, 32, 62, 0.55)');
    grd.addColorStop(1, 'rgba(11, 13, 34, 0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, V.W, V.H);

    g.setTransform(V.s, 0, 0, V.s, V.ox, V.oy);
    this._drawWall(g, C);
    this._drawPapa(g, C);
    drawTable(g);
    this._drawCakeBody(g, C);

    // pénombre : la pièce s'assombrit à mesure que les bougies s'éteignent
    g.setTransform(1, 0, 0, 1, 0, 0);
    const dark = 1 - C.light;
    grd = g.createRadialGradient(cxs, cys, 40 * V.s, cxs, cys, R * 0.7);
    grd.addColorStop(0, `rgba(5, 6, 26, ${0.6 * dark})`);
    grd.addColorStop(1, `rgba(5, 6, 26, ${0.3 + 0.45 * dark})`);
    g.fillStyle = grd;
    g.fillRect(0, 0, V.W, V.H);

    g.setTransform(V.s, 0, 0, V.s, V.ox, V.oy);
    // lueurs additives : guirlande, bougies
    g.globalCompositeOperation = 'lighter';
    for (const b of this._bulbs || []) {
      const a = 0.35 + 0.25 * Math.sin(C.time * 2 + b.i * 1.7);
      glow(g, b.x, b.y, 16, b.c, a);
    }
    for (const c of C.candles) {
      if (c.lit) {
        const s = (c.num ? 1.3 : 0.95) * (0.45 + 0.55 * c.health);
        glow(g, c.x, c.wick - 12 * s, 52 * s, '#ffb35c', 0.55 * (0.4 + 0.6 * c.health));
      } else if (c.ember > 0) glow(g, c.x, c.wick, 6, '#ff7a30', c.ember * 0.8);
    }
    g.globalCompositeOperation = 'source-over';
    // flammes : elles se couchent sous le souffle et vacillent de plus en plus
    for (const c of C.candles) {
      if (!c.lit) {
        if (c.ember > 0) { g.fillStyle = `rgba(255, 120, 50, ${c.ember})`; g.beginPath(); g.arc(c.x, c.wick, 1.8, 0, Math.PI * 2); g.fill(); }
        continue;
      }
      const weak = 1 - c.health;
      const lean = C.b * (0.45 + 0.75 * weak) + Math.sin(c.flick) * (0.04 + 0.4 * C.b * (0.3 + weak)) + Math.sin(c.flick * 2.3) * 0.03;
      const s = (c.num ? 1.3 : 0.95) * (0.45 + 0.55 * c.health) * (1 + Math.sin(c.flick * 3.1) * 0.06 * (1 + C.b * 2));
      drawFlame(g, c.x, c.wick + 3, s, lean, c.flick);
    }
    // fumée, souffle, confettis
    for (const p of C.smoke) {
      g.fillStyle = `rgba(200, 200, 215, ${0.13 * p.life})`;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
    }
    g.lineCap = 'round';
    g.lineWidth = 3.5;
    for (const p of C.breath) {
      g.strokeStyle = `rgba(225, 238, 255, ${0.3 * p.life})`;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); g.stroke();
    }
    for (const p of C.confetti) {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.globalAlpha = Math.min(1, p.life * 2);
      g.fillStyle = p.c;
      g.fillRect(-4, -2, 8, 4);
      g.restore();
    }
    g.globalAlpha = 1;

    // bascule : l'iris se referme sur Papa
    if (ph === 'tip') {
      const k = clamp(this.phaseT / 1.0, 0, 1);
      g.setTransform(1, 0, 0, 1, 0, 0);
      const ic = C.iris || C.head0;
      const hx = V.ox + ic.x * V.s, hy = V.oy + ic.y * V.s;
      const r = Math.max(0, (1 - k) * (1 - k) * R * 0.9 + (1 - k) * 90 * V.s);
      g.fillStyle = '#05061a';
      g.beginPath();
      g.rect(0, 0, V.W, V.H);
      if (r > 0.5) g.arc(hx, hy, r, 0, Math.PI * 2, true);
      g.fill('evenodd');
    }
  }

  _drawWall(g, C) {
    // guirlande lumineuse + fanions
    if (!this._bulbs) {
      this._bulbs = [];
      const N = 16;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        this._bulbs.push({ i, x: lerp(-60, 1010, u), y: 30 + Math.sin(u * Math.PI) * 44, c: FLAG_COLORS[i % FLAG_COLORS.length] });
      }
    }
    const B = this._bulbs;
    g.strokeStyle = 'rgba(30, 22, 40, 0.9)';
    g.lineWidth = 2;
    g.beginPath();
    B.forEach((b, i) => (i ? g.lineTo(b.x, b.y) : g.moveTo(b.x, b.y)));
    g.stroke();
    for (let i = 0; i < B.length - 1; i++) {
      const a = B[i], b = B[i + 1];
      g.fillStyle = FLAG_COLORS[(i + 2) % FLAG_COLORS.length];
      g.globalAlpha = 0.75;
      g.beginPath();
      g.moveTo(a.x + 8, a.y + 2); g.lineTo(b.x - 8, b.y + 2); g.lineTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 30);
      g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
    for (const b of B) {
      g.fillStyle = b.c;
      g.beginPath(); g.arc(b.x, b.y + 4, 4.5, 0, Math.PI * 2); g.fill();
    }
    // titre
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = '600 46px "Cormorant Garamond", Georgia, serif';
    g.fillStyle = 'rgba(255, 190, 120, 0.25)';
    g.fillText(this.cfg.cakeTitle || 'Joyeux anniversaire !', DCX + 1, 162);
    g.fillStyle = '#ffd9a0';
    g.fillText(this.cfg.cakeTitle || 'Joyeux anniversaire !', DCX, 160);
  }

  _drawPapa(g, C) {
    const ph = this.phase;
    const b = C.b;
    const lean = b * 16;
    const x = 250 + lean;
    const o = { x, y: 520, size: 116, t: C.time, lookX: 0.7, lookY: -0.2 };
    if (ph === 'joy' || ph === 'tip') {
      o.pose = 'cheer';
      o.expression = 'laugh';
    } else {
      o.pose = 'stand';
      o.hands = { l: { x: 196 + lean * 0.5, y: 386 }, r: { x: 312 + lean * 0.7, y: 388 } };
      o.expression = b > 0.08 ? 'blow' : 'smile';
      o.puff = b;
      o.tilt = 0.13 * b;
      o.blush = b * 0.5;
    }
    let info;
    if (ph === 'tip') {
      // Papa bascule en arrière et disparaît derrière la table
      const k = clamp(this.phaseT / 1.0, 0, 1);
      const a = -1.1 * k * k, sink = 90 * k * k;
      g.save();
      g.translate(x, 410 + sink);
      g.rotate(a);
      g.translate(-x, -410);
      info = drawAvatar2D(g, o);
      g.restore();
      // l'iris suit la tête (même rotation autour du bassin)
      const dx = C.head0.x - x, dy = C.head0.y - 410;
      C.iris = { x: x + dx * Math.cos(a) - dy * Math.sin(a), y: 410 + sink + dx * Math.sin(a) + dy * Math.cos(a) };
    } else {
      info = drawAvatar2D(g, o);
      C.mouth.x = info.hx + 0.05 * info.r;
      C.mouth.y = info.hy + 0.5 * info.r;
      C.head0 = { x: info.hx, y: info.hy };
    }
  }

  _drawCakeBody(g, C) {
    const cx = CAKE_X;
    // assiette
    g.fillStyle = '#bdb6cc';
    g.beginPath(); g.ellipse(cx, 396, 176, 25, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ece7f5';
    g.beginPath(); g.ellipse(cx, 393, 164, 20, 0, 0, Math.PI * 2); g.fill();
    // étage du bas : chocolat, nappage crème
    drawTier(g, cx, 306, 390, 128, 18, ['#2e170c', '#7b4a2c', '#5a3320', '#24120a'], '#fbe9d0', '#fff6e8', 1);
    // perles de crème à la base
    g.fillStyle = '#fbe9d0';
    for (let i = 0; i <= 16; i++) {
      const a = (Math.PI * i) / 16;
      g.beginPath(); g.arc(cx + Math.cos(a) * 124, 388 + Math.sin(a) * 16, 5.5, 0, Math.PI * 2); g.fill();
    }
    // framboises
    for (let i = 0; i < 5; i++) {
      const x = cx - 92 + i * 46, y = 356 + Math.sin(i * 1.3) * 3;
      g.fillStyle = '#d8344a';
      g.beginPath(); g.arc(x, y, 7.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255, 255, 255, 0.55)';
      g.beginPath(); g.arc(x - 2.5, y - 2.5, 2.2, 0, Math.PI * 2); g.fill();
    }
    // bougies de derrière, étage du haut, bougies de devant
    for (const c of C.candles) if (!c.num && !c.front) drawSmallCandle(g, c);
    drawTier(g, cx, 238, 306, 90, 14, ['#a84866', '#ffb3c6', '#f08aa6', '#8f3a56'], '#ffd6e0', '#fff3f6', 2);
    // vermicelles
    for (let i = 0; i < 26; i++) {
      const x = cx - 80 + hash(i) * 160, y = 262 + hash(i + 40) * 36;
      g.strokeStyle = CONFETTI[i % CONFETTI.length];
      g.lineWidth = 2.4;
      g.lineCap = 'round';
      const a = hash(i + 80) * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); g.stroke();
    }
    for (const c of C.candles) if (!c.num && c.front) drawSmallCandle(g, c);
    for (const c of C.candles) if (c.num) drawNumberCandle(g, c, '5');
  }

  /* ─────────── Sons (Web Audio, seulement si l'audio tourne) ─────────── */
  _breath(level) {
    const a = this.audio, ctx = a.ctx;
    if (!ctx || ctx.state !== 'running' || !a.fxBus) return;
    if (!this._br) {
      if (level < 0.02) return;
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 600;
      bp.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(bp).connect(gain).connect(a.fxBus);
      src.start();
      this._br = { src, bp, gain, level: 0 };
    }
    const br = this._br;
    if (Math.abs(level - br.level) < 0.02) return;
    br.level = level;
    const now = ctx.currentTime;
    br.gain.gain.setTargetAtTime(level * 0.3, now, 0.06);
    br.bp.frequency.setTargetAtTime(450 + level * 900, now, 0.1);
  }

  _breathStop() {
    const br = this._br;
    if (!br) return;
    this._br = null;
    try {
      const now = this.audio.ctx.currentTime;
      br.gain.gain.setTargetAtTime(0, now, 0.05);
      br.src.stop(now + 0.4);
    } catch { /* ignore */ }
  }

  /** « Pfft » d'une flamme qui s'éteint. */
  _puff() {
    const a = this.audio;
    if (a.ctx && a.ctx.state === 'running' && typeof a._noise === 'function') a._noise(0.25, 0.12, 1600, 1.2, 380);
  }

  /* ═════════════════════ 3. ARRIVÉE SUR LE LAC ═════════════════════ */
  _beginArrival() {
    const { boat, scene, camera } = this;
    boat.cancelAutopilot();
    boat.speed = 0;
    boat.avatarFree = true;           // la barque ne pilote plus l'avatar pendant la chute
    scene.add(boat.avatar.group);     // détaché de la barque (coordonnées monde)
    this._glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color: '#ffcf8f', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0,
    }));
    scene.add(this._glow);
    this.arr = { landed: false, cheered: false, look: new THREE.Vector3(), from: null };
    camera.fov = 55;
    camera.updateProjectionMatrix();
    this.audio.chime?.(55);
  }

  _updateArrival(dt, t) {
    const { boat, camera, rig } = this;
    const av = boat.avatar;
    const A = this.arr;
    const D = Math.max(1, this.cfg.fallDuration ?? 4.8);
    const u = clamp(this.phaseT / D, 0, 1);

    if (!A.landed) {
      const seat = boat.model.localToWorld(this._v1.set(0, 0.3, 0.6));
      // descente rapide puis de plus en plus douce, en légère spirale
      const h = 34 * Math.pow(1 - u, 2.2);
      const sr = 3 * Math.pow(1 - u, 2), sa = u * 6;
      const pos = this._v2.set(seat.x + Math.cos(sa) * sr, seat.y + h, seat.z + Math.sin(sa) * sr);
      av.group.position.copy(pos);
      // allongé face au ciel (comme dans le tunnel) → redressé, assis face à l'arrière de la barque
      const k = smooth(0.1, 0.92, u);
      this._q1.setFromAxisAngle(Y_AXIS, boat.heading + Math.PI + 3.2 * Math.pow(1 - u, 2));
      this._e.set((-Math.PI / 2) * (1 - k), 0, Math.sin(this.phaseT * 2.2) * 0.25 * (1 - k));
      this._q2.setFromEuler(this._e);
      av.group.quaternion.copy(this._q1).multiply(this._q2);
      av.update(dt, t, { spread: 1 - smooth(0.7, 0.97, u), lookUp: 0.25 * (1 - k) });
      // halo doré autour de lui
      this._glow.position.copy(pos).y += 0.5;
      this._glow.scale.setScalar(1.6 + 5 * (1 - u));
      this._glow.material.opacity = 0.85 * smooth(0, 0.08, u) * (1 - smooth(0.8, 1, u));
      // caméra : haute dans le ciel, elle descend avec Papa (un peu au-dessus, derrière)
      // puis rejoint en douceur la position de suivi normale de la barque
      rig._computeFollow(boat);
      if (!A.from) {
        const back = new THREE.Vector3(-Math.sin(boat.heading), 0, -Math.cos(boat.heading)); // derrière la barque
        const side = new THREE.Vector3(-back.z, 0, back.x);
        A.from = back.multiplyScalar(9).addScaledVector(side, 2.5).add(new THREE.Vector3(0, 3.2, 0)); // relatif à Papa
        A.rel = new THREE.Vector3();
        A.center = new THREE.Vector3();
      }
      A.center.set(seat.x, seat.y + h, seat.z);
      A.rel.subVectors(rig._desired, seat);                       // décalage de suivi final
      A.rel.lerpVectors(A.from, A.rel, easeInOut(smooth(0.3, 1, u)));
      camera.position.copy(A.center).add(A.rel);
      A.look.copy(pos).lerp(rig._look, smooth(0.6, 1, u));
      camera.lookAt(A.look);
      if (u >= 1) this._land();
      return;
    }

    // après l'atterrissage : petit rebond de Papa, la barque tangue, la caméra reprend le suivi
    const tau = this.phaseT - D;
    av.group.position.y = 0.3 + 0.26 * Math.exp(-5 * tau) * Math.abs(Math.sin(9 * tau));
    const e = Math.exp(-2.3 * tau);
    boat.model.rotation.x += 0.13 * e * Math.sin(8 * tau);
    boat.model.rotation.z += 0.09 * e * Math.sin(6.5 * tau + 0.6);
    boat.group.position.y -= 0.16 * Math.exp(-3 * tau) * Math.sin(7 * tau);
    if (!A.cheered && tau > 0.45) { A.cheered = true; av.celebrate(); }
    rig.update(dt, boat);
    if (tau > 1.9) this._finish(false);
  }

  _land() {
    const { boat, rig } = this;
    const av = boat.avatar;
    this.arr.landed = true;
    boat.model.add(av.group);
    av.group.position.set(0, 0.3, 0.6);
    av.group.rotation.set(0, Math.PI, 0);
    boat.avatarFree = false;
    if (this._glow) { this._glow.removeFromParent(); this._glow.material.dispose(); this._glow = null; }
    // éclaboussure : quelques anneaux du sillage
    if (boat.wake) {
      for (let i = 0; i < 3; i++) {
        const m = boat.wake[boat.wakeIndex++ % boat.wake.length];
        m.position.set(boat.position.x, 0.04, boat.position.z);
        m.userData.life = 1 - i * 0.2;
        m.userData.strength = 1;
        m.visible = true;
      }
    }
    // passage de relais à la caméra de suivi, sans à-coup
    rig.lookAt.copy(this.arr.look);
    rig.cinematic = null;
    rig.userYaw = 0;
    rig.userPitch = 0;
    this.audio.sfx('boing');
  }

  /* ─────────────────────────── Mesures / tests ─────────────────────────── */
  _acc(name, ms) {
    const s = (this._stats[name] ??= { frames: 0, total: 0, max: 0 });
    s.frames++;
    s.total += ms;
    if (ms > s.max) s.max = ms;
  }
  _gpuSync() {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, (this._px ??= new Uint8Array(4)));
  }
  /** Temps moyen / max par image (ms, CPU + soumission ; GPU inclus si syncTiming = true). */
  stats() {
    const out = {};
    for (const [k, s] of Object.entries(this._stats)) out[k] = { frames: s.frames, avgMs: +(s.total / s.frames).toFixed(2), maxMs: +s.max.toFixed(2) };
    if (this.tunnel) out.tunnelDrawCalls = this.renderer.info.render.calls;
    return out;
  }
  /** Avance l'intro de n images de dt secondes (boucle principale complète). */
  _step(dt = 1 / 60, n = 1) {
    for (let i = 0; i < n && this.active; i++) this.hooks.step(dt);
    return { active: this.active, phase: this.phase, phaseT: +this.phaseT.toFixed(2), stats: this.stats() };
  }
  /** Simule « maintenir pour souffler » (tests console). */
  _hold(on = true) { this._testHold = !!on; }
}

/* ─────────────────────────── Dessin 2D (helpers) ─────────────────────────── */
function stepParticles(list, dt, gravity, extra) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt / (p.max ?? 3);
    if (p.life <= 0 || p.y > 700) { list[i] = list[list.length - 1]; list.pop(); continue; }
    p.vy += gravity * 100 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    extra?.(p);
  }
}

function glow(g, x, y, r, color, a) {
  if (a <= 0.01) return;
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = Math.min(1, a);
  g.fillStyle = grd;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

function drawFlame(g, x, y, size, lean, flick) {
  const h = 30 * size * (1 + 0.1 * Math.sin(flick * 1.7));
  const w = 8.5 * size;
  g.save();
  g.translate(x, y);
  g.rotate(lean);
  const grd = g.createLinearGradient(0, 0, 0, -h);
  grd.addColorStop(0, 'rgba(90, 140, 255, 0.85)');
  grd.addColorStop(0.18, '#fff7dc');
  grd.addColorStop(0.55, '#ffd37a');
  grd.addColorStop(1, 'rgba(255, 130, 40, 0.2)');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(w, -h * 0.12, w * 0.7, -h * 0.62, Math.sin(flick) * w * 0.18, -h);
  g.bezierCurveTo(-w * 0.7, -h * 0.62, -w, -h * 0.12, 0, 0);
  g.fill();
  g.fillStyle = 'rgba(255, 255, 255, 0.7)';
  g.beginPath(); g.ellipse(0, -h * 0.3, w * 0.28, h * 0.2, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

function drawTable(g) {
  g.fillStyle = '#5b2a3a';
  g.beginPath();
  g.moveTo(-400, 382); g.lineTo(1400, 382); g.lineTo(1400, 406); g.lineTo(-400, 406);
  g.closePath(); g.fill();
  const grd = g.createLinearGradient(0, 406, 0, 600);
  grd.addColorStop(0, '#4a1f2e');
  grd.addColorStop(1, '#1a0b15');
  g.fillStyle = grd;
  g.fillRect(-400, 406, 1800, 1200); // assez haut pour les écrans en portrait
  g.strokeStyle = 'rgba(255, 198, 133, 0.28)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(-400, 415); g.lineTo(1400, 415); g.stroke();
}

/** Étage de gâteau cylindrique : flanc dégradé, nappage qui coule, dessus. */
function drawTier(g, cx, top, bottom, rx, ry, side, frosting, topColor, seed) {
  const grd = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
  grd.addColorStop(0, side[0]);
  grd.addColorStop(0.3, side[1]);
  grd.addColorStop(0.7, side[2]);
  grd.addColorStop(1, side[3]);
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(cx - rx, top);
  g.lineTo(cx - rx, bottom);
  g.ellipse(cx, bottom, rx, ry, 0, Math.PI, 0, true);
  g.lineTo(cx + rx, top);
  g.closePath();
  g.fill();
  // nappage : bord avant ondulé avec des coulures
  g.fillStyle = frosting;
  g.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (Math.PI * i) / 48;
    const drip = 5 + 17 * Math.pow(Math.max(0, Math.sin(a * 7 + seed * 1.7)), 4);
    const x = cx + Math.cos(a) * rx, y = top + Math.sin(a) * ry + drip;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.ellipse(cx, top, rx, ry, 0, Math.PI, Math.PI * 2, false);
  g.closePath();
  g.fill();
  // dessus
  g.fillStyle = topColor;
  g.beginPath(); g.ellipse(cx, top, rx - 3, ry - 2, 0, 0, Math.PI * 2); g.fill();
}

function drawSmallCandle(g, c) {
  const h = 36, w = 9, x = c.x - w / 2, y = c.base - h;
  g.fillStyle = c.color;
  g.fillRect(x, y, w, h);
  // rayures torsadées
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  g.lineWidth = 2.5;
  for (let k = -1; k < 6; k++) { g.beginPath(); g.moveTo(x - 2, y + k * 8 + 10); g.lineTo(x + w + 2, y + k * 8); g.stroke(); }
  g.restore();
  g.strokeStyle = '#3a2a20';
  g.lineWidth = 1.8;
  g.beginPath(); g.moveTo(c.x, y); g.lineTo(c.x, c.wick); g.stroke();
}

function drawNumberCandle(g, c, digit) {
  g.font = '800 90px "Nunito Sans", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const grd = g.createLinearGradient(0, c.base - 64, 0, c.base);
  grd.addColorStop(0, '#fff0bf');
  grd.addColorStop(0.5, '#ffc685');
  grd.addColorStop(1, '#ff9a4d');
  g.lineJoin = 'round';
  g.lineWidth = 5;
  g.strokeStyle = '#a8571c';
  g.strokeText(digit, c.x, c.base);
  g.fillStyle = grd;
  g.fillText(digit, c.x, c.base);
  g.strokeStyle = '#3a2a20';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(c.x, c.wick + 7); g.lineTo(c.x, c.wick); g.stroke();
}

/* ═════════════════════ 2. LE TUNNEL « SA VIE QUI DÉFILE » ═════════════════════ */

// Couleurs chaudes (enfance) → nuit (aujourd'hui)
const RING_PALETTE = ['#ffd38a', '#ffa25e', '#ff7a8a', '#d77bff', '#8a7dff', '#5aa0ff', '#9fe3ff'].map((c) => new THREE.Color(c));
const BG_PALETTE = ['#3a1a0c', '#2c1020', '#180c32', '#0a0b26', '#05061a'].map((c) => new THREE.Color(c));
function paletteAt(pal, p, out) {
  const x = clamp(p, 0, 1) * (pal.length - 1);
  const i = Math.floor(x);
  return out.copy(pal[i]).lerp(pal[Math.min(i + 1, pal.length - 1)], x - i);
}

const RING_N = 34, RING_SP = 2.3, RING_R = 4.2;
const LINE_N = 150, DUST_N = 360;
const FAR_Z = -66;
const LABEL_DIST = 24;   // distance de vol d'un libellé avant d'atteindre Papa

/**
 * Scène dédiée, très légère : 2 InstancedMesh (anneaux + halo), 1 LineSegments, 1 Points,
 * ~30 sprites de texte (texture Canvas générée une seule fois par libellé), l'avatar 3D
 * et 2 lumières bon marché (hémisphérique + directionnelle, aucune PointLight).
 */
class LifeTunnel {
  constructor(renderer, cfg, glowTex) {
    this.renderer = renderer;
    this.cfg = cfg;
    this.glowTex = glowTex;
    this.duration = Math.max(2.5, cfg.tunnelDuration ?? 6);
    this.y0 = cfg.startYear ?? 1971;
    this.y1 = cfg.endYear ?? 2026;
    const scene = (this.scene = new THREE.Scene());
    this.bg = new THREE.Color().copy(BG_PALETTE[0]);
    scene.background = this.bg;
    scene.fog = new THREE.Fog(this.bg.getHex(), 8, 62);
    this.camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 120);
    this.camera.position.set(0, 0, 4.6);
    this.hemi = new THREE.HemisphereLight('#ffe2c4', '#2a1840', 1.8);
    this.dir = new THREE.DirectionalLight('#fff0dd', 1.5);
    this.dir.position.set(1.5, 2, 6);
    scene.add(this.hemi, this.dir);
    this._c = new THREE.Color();
    this._c2 = new THREE.Color();
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this.t = 0;
    this.speed = 16;
    this.open = 0;
    this._buildRings();
    this._buildLines();
    this._buildDust();
    this._buildLabels();
    this._buildAvatar();
    this.update(0, 0);
  }

  /** Décalage du centre du tunnel (il serpente un peu au loin). */
  _off(z, out) {
    const k = Math.pow(clamp(-z / 40, 0, 1), 1.5);
    return out.set(Math.sin(this.t * 0.9 + z * 0.05) * 2.2 * k, Math.cos(this.t * 0.7 + z * 0.04) * 1.6 * k, 0);
  }

  _buildRings() {
    const geo = new THREE.TorusGeometry(RING_R, 0.05, 5, 64);
    this.rings = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), RING_N);
    // halo additif (tube plus épais), atténué en profondeur via la couleur d'instance
    const glowGeo = new THREE.TorusGeometry(RING_R, 0.22, 5, 64);
    this.ringGlow = new THREE.InstancedMesh(glowGeo, new THREE.MeshBasicMaterial({
      color: '#ffffff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }), RING_N);
    for (const m of [this.rings, this.ringGlow]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      for (let i = 0; i < RING_N; i++) m.setColorAt(i, this._c.set('#ffffff'));
      this.scene.add(m);
    }
    this.ringZ = new Float32Array(RING_N);
    for (let i = 0; i < RING_N; i++) this.ringZ[i] = 4 - i * RING_SP;
  }

  _buildLines() {
    const pos = new Float32Array(LINE_N * 6), col = new Float32Array(LINE_N * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    this.lines.frustumCulled = false;
    this.lineData = Array.from({ length: LINE_N }, () => ({ a: rand(0, Math.PI * 2), r: rand(1.4, 4.0), z: rand(FAR_Z, 4), len: rand(1.2, 3.2) }));
    this.scene.add(this.lines);
  }

  _buildDust() {
    const pos = new Float32Array(DUST_N * 3), col = new Float32Array(DUST_N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.22, map: this.glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, fog: false, sizeAttenuation: true,
    }));
    this.dust.frustumCulled = false;
    this.dustData = Array.from({ length: DUST_N }, () => ({ a: rand(0, Math.PI * 2), r: 0.8 + Math.pow(Math.random(), 0.7) * 6.5, z: rand(FAR_Z, 4), b: rand(0.4, 1) }));
    this.scene.add(this.dust);
  }

  /** Années (tous les yearStep ans) + mots-clés, triés chronologiquement, texture générée une fois. */
  _buildLabels() {
    const { y0, y1, cfg } = this;
    const step = Math.max(1, Math.round(cfg.yearStep ?? 5));
    const items = [];
    for (let y = y0; y <= y1; y += step) items.push({ text: String(y), year: y, kind: 'year' });
    if ((y1 - y0) % step) items.push({ text: String(y1), year: y1, kind: 'year' });
    // mots-clés : année donnée, sinon interpolée entre les ancres connues
    const kws = (cfg.keywords || []).map((k) => (typeof k === 'string' ? { text: k } : { text: String(k.text ?? ''), year: k.year }))
      .filter((k) => k.text);
    const anchors = [{ i: -1, year: y0 }];
    kws.forEach((k, i) => { if (Number.isFinite(k.year)) anchors.push({ i, year: k.year }); });
    anchors.push({ i: kws.length, year: y1 + 0.5 });
    kws.forEach((k, i) => {
      if (!Number.isFinite(k.year)) {
        let a = anchors[0], b = anchors[anchors.length - 1];
        for (const an of anchors) { if (an.i < i) a = an; else if (an.i > i) { b = an; break; } }
        k.year = lerp(a.year, b.year, (i - a.i) / (b.i - a.i));
      }
      items.push({ text: k.text, year: k.year + 0.01, kind: 'word' });
    });
    items.sort((a, b) => a.year - b.year);
    // Chaque libellé passe à hauteur de Papa (z = 0) à un instant proportionnel à son année :
    // le grand compteur HTML (currentYear) reste ainsi synchrone avec ce qui défile.
    const D = this.duration;
    this.arrive0 = Math.min(0.9, D * 0.15);
    this.arrive1 = Math.max(this.arrive0 + 1, D - 1.0);
    this.labels = items.map((it, i) => {
      const arrive = lerp(this.arrive0, this.arrive1, clamp((it.year - y0) / (y1 - y0 || 1), 0, 1));
      // instant de départ : on remonte la distance LABEL_DIST avec la vitesse du tunnel
      const sArr = this._dist(arrive);
      const spawnAt = sArr >= LABEL_DIST ? this._timeAtDist(sArr - LABEL_DIST) : 0;
      return {
        sprite: this._makeLabel(it.text, it.kind), kind: it.kind, spawnAt,
        zStart: -Math.min(LABEL_DIST, sArr),
        angle: i * 2.39996 + 0.6,
        radius: it.kind === 'year' ? 2.5 : 2.95,
        z: -LABEL_DIST, state: 0, // 0 = en attente, 1 = en vol, 2 = passé
      };
    });
  }

  /** Vitesse du tunnel (unités/s) et distance parcourue depuis le début (hors ouverture finale). */
  _speedAt(time) { return lerp(15, 30, clamp(time / this.duration, 0, 1)); }
  _dist(time) { const D = this.duration; return 15 * time + (15 / (2 * D)) * time * time; }
  _timeAtDist(s) { const D = this.duration, a = 15 / (2 * D); return (-15 + Math.sqrt(225 + 4 * a * s)) / (2 * a); }

  _makeLabel(text, kind) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const fs = kind === 'year' ? 92 : 70;
    const font = kind === 'year' ? `800 ${fs}px "Nunito Sans", system-ui, sans-serif` : `italic 500 ${fs}px "Cormorant Garamond", Georgia, serif`;
    g.font = font;
    const w = Math.ceil(g.measureText(text).width) + 64, h = Math.ceil(fs * 1.55);
    c.width = w;
    c.height = h;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = kind === 'year' ? 'rgba(255, 180, 100, 0.95)' : 'rgba(255, 220, 180, 0.85)';
    g.shadowBlur = 20;
    g.fillStyle = kind === 'year' ? '#ffd9a0' : '#fff3df';
    g.fillText(text, w / 2, h / 2 + fs * 0.04);
    g.shadowBlur = 0;
    g.fillText(text, w / 2, h / 2 + fs * 0.04);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    const hh = kind === 'year' ? 1.15 : 0.85;
    sp.scale.set((hh * w) / h, hh, 1);
    sp.visible = false;
    this.scene.add(sp);
    return sp;
  }

  _buildAvatar() {
    this.avatar = new Avatar3D();
    this.pivot = new THREE.Group();
    this.avatar.group.position.set(0, -0.42, 0); // pivote autour de son centre
    this.pivot.add(this.avatar.group);
    this.pivot.scale.setScalar(1.2);
    this.scene.add(this.pivot);
  }

  /** Compile les shaders et envoie les textures au GPU (pendant le gâteau). */
  precompile() {
    try {
      this.renderer.compile(this.scene, this.camera);
      for (const l of this.labels) this.renderer.initTexture?.(l.sprite.material.map);
    } catch (err) { console.warn('[intro] précompilation du tunnel', err); }
  }

  /** Année affichée par le grand compteur (synchrone avec les libellés qui passent près de Papa). */
  currentYear(time) {
    const k = clamp((time - this.arrive0) / (this.arrive1 - this.arrive0), 0, 1);
    return Math.round(lerp(this.y0, this.y1, k));
  }

  update(dt, time) {
    this.t = time;
    const D = this.duration;
    const prog = clamp(time / D, 0, 1);
    this.open = smooth(D - 1.1, D, time);                   // le tunnel s'ouvre à la fin
    this.speed = this._speedAt(time) + this.open * 30;
    const v = this.speed;
    const off = this._p;

    // fond + brouillard : chaud → nuit
    paletteAt(BG_PALETTE, prog * 1.05, this.bg);
    this.scene.fog.color.copy(this.bg);
    paletteAt(RING_PALETTE, prog, this.hemi.color).lerp(this._c2.set('#ffffff'), 0.5);

    // caméra : le champ s'élargit avec la vitesse, léger tremblement
    const cam = this.camera;
    const aspect = window.innerWidth / window.innerHeight;
    const fov = 62 + 14 * prog + 18 * this.open;
    if (Math.abs(cam.aspect - aspect) > 1e-3 || Math.abs(cam.fov - fov) > 0.01) {
      cam.aspect = aspect;
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    cam.position.set(Math.sin(time * 13) * 0.02, Math.cos(time * 11) * 0.02, 4.6);
    cam.lookAt(0, 0, -10);

    // anneaux lumineux (recyclés)
    for (let i = 0; i < RING_N; i++) {
      let z = this.ringZ[i] + v * dt;
      if (z > 5) z -= RING_N * RING_SP;
      this.ringZ[i] = z;
      this._off(z, off);
      this._e.set(Math.sin(time * 0.7 + i) * 0.08, Math.cos(time * 0.6 + i) * 0.08, i * 0.35 + time * 0.5);
      this._q.setFromEuler(this._e);
      this._p.set(off.x, off.y, z);
      this._s.setScalar(1 + this.open * 2.8);
      this._m.compose(this._p, this._q, this._s);
      this.rings.setMatrixAt(i, this._m);
      if (z > 2.5) { this._s.setScalar(0); this._m.compose(this._p, this._q, this._s); } // pas de halo collé à l'objectif
      this.ringGlow.setMatrixAt(i, this._m);
      const age = prog + (-z / (RING_N * RING_SP)) * 0.25;
      paletteAt(RING_PALETTE, age, this._c);
      this.rings.setColorAt(i, this._c);
      // halo atténué au loin ET tout près de la caméra (moins de surdessin plein écran)
      const fade = smooth(FAR_Z, FAR_Z + 30, z) * (1 - smooth(-2, 3.5, z) * 0.85) * (1 - this.open * 0.8);
      this.ringGlow.setColorAt(i, this._c2.copy(this._c).multiplyScalar(fade));
    }
    for (const m of [this.rings, this.ringGlow]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }

    // lignes de vitesse (tête brillante, queue éteinte)
    const lp = this.lines.geometry.attributes.position.array, lc = this.lines.geometry.attributes.color.array;
    const lineCol = paletteAt(RING_PALETTE, prog + 0.1, this._c).lerp(this._c2.set('#ffffff'), 0.35);
    const stretch = v / 20;
    for (let i = 0; i < LINE_N; i++) {
      const L = this.lineData[i];
      L.z += v * 1.5 * dt;
      if (L.z > 5) { L.z -= 70; L.a = rand(0, Math.PI * 2); L.r = rand(1.4, 4.0); }
      this._off(L.z, off);
      const x = off.x + Math.cos(L.a) * L.r * (1 + this.open), y = off.y + Math.sin(L.a) * L.r * (1 + this.open);
      const o = i * 6;
      lp[o] = x; lp[o + 1] = y; lp[o + 2] = L.z;
      lp[o + 3] = x; lp[o + 4] = y; lp[o + 5] = L.z - L.len * stretch;
      const f = smooth(FAR_Z, FAR_Z + 28, L.z) * (1 - smooth(1, 4.5, L.z)) * 0.9;
      lc[o] = lineCol.r * f; lc[o + 1] = lineCol.g * f; lc[o + 2] = lineCol.b * f;
      lc[o + 3] = 0; lc[o + 4] = 0; lc[o + 5] = 0;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.geometry.attributes.color.needsUpdate = true;

    // poussière d'étoiles
    const dp = this.dust.geometry.attributes.position.array, dc = this.dust.geometry.attributes.color.array;
    const dustCol = paletteAt(RING_PALETTE, prog * 0.8 + 0.15, this._c).lerp(this._c2.set('#ffffff'), 0.55);
    for (let i = 0; i < DUST_N; i++) {
      const P = this.dustData[i];
      P.z += v * 0.85 * dt;
      if (P.z > 5) P.z -= 70;
      this._off(P.z, off);
      const o = i * 3;
      dp[o] = off.x + Math.cos(P.a + time * 0.2) * P.r;
      dp[o + 1] = off.y + Math.sin(P.a + time * 0.2) * P.r;
      dp[o + 2] = P.z;
      const f = smooth(FAR_Z, FAR_Z + 25, P.z) * (1 - smooth(2, 4.6, P.z)) * P.b;
      dc[o] = dustCol.r * f; dc[o + 1] = dustCol.g * f; dc[o + 2] = dustCol.b * f;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.dust.geometry.attributes.color.needsUpdate = true;

    // années et mots-clés qui défilent autour de lui
    for (const L of this.labels) {
      if (L.state === 2) continue;
      if (L.state === 0) {
        if (time < L.spawnAt) continue;
        L.state = 1;
        L.z = L.zStart;
        L.age = 0;
        L.sprite.visible = true;
      } else L.z += v * dt;
      L.age += dt;
      L.angle += dt * 0.25;
      if (L.z > 4.4) { L.state = 2; L.sprite.visible = false; continue; }
      this._off(L.z, off);
      L.sprite.position.set(off.x + Math.cos(L.angle) * L.radius, off.y + Math.sin(L.angle) * L.radius * 0.8, L.z);
      L.sprite.material.opacity = smooth(0, 0.35, L.age) * smooth(-LABEL_DIST, -LABEL_DIST + 8, L.z)
        * (1 - smooth(0.8, 3.4, L.z)) * (1 - this.open);
    }

    // Papa : bascule à l'entrée, puis tourne doucement, bras écartés
    const tumble = 1 - smooth(0, 1.4, time);
    this.pivot.rotation.set(-1.3 * tumble + Math.sin(time * 0.8) * 0.18, Math.sin(time * 0.55) * 0.35, time * 0.45 + tumble * 0.8);
    this.pivot.position.set(Math.sin(time * 0.9) * 0.2, Math.cos(time * 0.7) * 0.15 - 0.05, 0);
    this.avatar.update(dt, time, { spread: smooth(0.15, 1.0, time), lookUp: 0 });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Libère géométries, matériaux et textures (la texture de halo partagée est conservée). */
  dispose() {
    this.scene.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      if (o.geometry && !o.isSprite) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        if (m.map && m.map !== this.glowTex) m.map.dispose();
        m.dispose();
      }
    });
    this.scene.clear();
    this.labels = [];
  }
}

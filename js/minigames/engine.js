/**
 * ═══════════════════════════════════════════════════════════
 *  Moteur des mini-jeux d'anecdotes (Canvas 2D, très léger).
 *
 *  Pendant un mini-jeu, la scène 3D est mise en PAUSE (main.js ne rend plus) :
 *  le GPU intégré ne travaille que pour ce petit canvas 2D.
 *
 *  Déroulé :  intro (HTML)  →  jeu (canvas, 5 à 15 s)  →  résultat (HTML)
 *  On peut toujours « Passer » : la progression n'est JAMAIS bloquée.
 *
 *  ── Écrire un mini-jeu : voir js/minigames/_template.js
 *  Un mini-jeu est un objet :
 *   {
 *     id, title, instructions, controls, duration (s),
 *     create(api) → { update(dt, input), draw(g), timeout?() → boolean }
 *   }
 *  et l'api fournit : W, H, t, timeLeft, memory, end(success, text), sfx(name),
 *  avatar(g, opts), burst(x, y, opts), shake(px), text(g, str, x, y, opts),
 *  rand(a, b), clamp, lerp, roundRect(g, x, y, w, h, r).
 * ═══════════════════════════════════════════════════════════
 */
import { drawAvatar2D, avatarPortrait } from '../avatar.js';

export const W = 960;
export const H = 540;

const ACTION_KEYS = ['Space', 'Enter', 'KeyE', 'NumpadEnter'];
const DIR_KEYS = {
  left: ['ArrowLeft', 'KeyA'],    // KeyA = Q sur AZERTY
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],        // KeyW = Z sur AZERTY
  down: ['ArrowDown', 'KeyS'],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/** Entrées unifiées : clavier + souris + tactile. */
class Input {
  constructor() {
    this.keys = new Set();
    this._pressed = new Set();
    this.pointer = { x: W / 2, y: H / 2, down: false, pressed: false, released: false, active: false };
    this.cursor = { x: W / 2, y: H / 2 }; // suit la souris, ou se déplace aux flèches
  }
  /** true pendant la frame où l'action vient d'être déclenchée (Espace / Entrée / E / clic). */
  pressed(name = 'action') { return this._pressed.has(name); }
  /** true tant que l'action est maintenue. */
  held(name = 'action') {
    if (name === 'action') return ACTION_KEYS.some((k) => this.keys.has(k)) || this.pointer.down;
    return (DIR_KEYS[name] || []).some((k) => this.keys.has(k));
  }
  /** Axe horizontal / vertical (-1..1) depuis le clavier. */
  axis(which = 'x') {
    return which === 'x'
      ? (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0)
      : (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0);
  }
  _endFrame() {
    this._pressed.clear();
    this.pointer.pressed = false;
    this.pointer.released = false;
  }
}

export class MiniGameRunner {
  /**
   * @param {object} deps { audio }
   */
  constructor({ audio }) {
    this.audio = audio;
    this.el = {
      root: document.getElementById('minigame'),
      canvas: document.getElementById('mg-canvas'),
      intro: document.getElementById('mg-intro'),
      outro: document.getElementById('mg-outro'),
      hud: document.getElementById('mg-hud'),
      timer: document.getElementById('mg-timer'),
      kicker: document.getElementById('mg-kicker'),
      title: document.getElementById('mg-title'),
      instructions: document.getElementById('mg-instructions'),
      controls: document.getElementById('mg-controls'),
      portrait: document.getElementById('mg-portrait'),
      play: document.getElementById('mg-play'),
      skip: document.getElementById('mg-skip'),
      skipPlay: document.getElementById('mg-skip-play'),
      outTitle: document.getElementById('mg-out-title'),
      outText: document.getElementById('mg-out-text'),
      outPortrait: document.getElementById('mg-out-portrait'),
      outContinue: document.getElementById('mg-continue'),
      outReplay: document.getElementById('mg-replay'),
    };
    this.g = this.el.canvas.getContext('2d');
    this.active = false;
    this.input = new Input();
    this._raf = 0;
    this._bindInput();
    window.addEventListener('resize', () => {
      if (!this.active) return;
      this._fit();
      if (this.game) this._render(); // redessine l'aperçu (intro / résultat) après redimensionnement
    });
  }

  /* ─────────── Entrées ─────────── */
  _bindInput() {
    const inp = this.input;
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Escape') { e.preventDefault(); this._skip(); return; }
      if (this.phase !== 'play') return;
      if (ACTION_KEYS.includes(e.code) || Object.values(DIR_KEYS).flat().includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        if (ACTION_KEYS.includes(e.code)) inp._pressed.add('action');
        for (const [n, ks] of Object.entries(DIR_KEYS)) if (ks.includes(e.code)) inp._pressed.add(n);
      }
      inp.keys.add(e.code);
    }, true);
    window.addEventListener('keyup', (e) => inp.keys.delete(e.code), true);
    window.addEventListener('blur', () => { inp.keys.clear(); inp.pointer.down = false; });

    const c = this.el.canvas;
    const toLogical = (e) => {
      const r = c.getBoundingClientRect();
      inp.pointer.x = ((e.clientX - r.left) / r.width) * W;
      inp.pointer.y = ((e.clientY - r.top) / r.height) * H;
      inp.cursor.x = inp.pointer.x;
      inp.cursor.y = inp.pointer.y;
      inp.pointer.active = true;
    };
    c.addEventListener('pointerdown', (e) => {
      if (this.phase !== 'play') return;
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      toLogical(e);
      inp.pointer.down = true;
      inp.pointer.pressed = true;
      inp._pressed.add('action');
    });
    c.addEventListener('pointermove', (e) => { if (this.phase === 'play') toLogical(e); });
    const up = () => { if (inp.pointer.down) inp.pointer.released = true; inp.pointer.down = false; };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    this.el.play.addEventListener('click', () => this._startPlay());
    this.el.skip.addEventListener('click', () => this._skip());
    this.el.skipPlay.addEventListener('click', () => this._skip());
    this.el.outContinue.addEventListener('click', () => this._finish());
    this.el.outReplay.addEventListener('click', () => this._replay());
  }

  /** Canvas net mais économe : résolution interne plafonnée à 1,5× la taille affichée. */
  _fit() {
    const c = this.el.canvas;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(320, Math.round(r.width * dpr));
    c.width = w;
    c.height = Math.round((w * H) / W);
    this.scale = c.width / W;
  }

  /* ─────────── Cycle de vie ─────────── */
  /**
   * Lance un mini-jeu. Résout une promesse quand le joueur clique « Continuer ».
   * @returns {Promise<{result:'success'|'fail'|'skipped', text:string}>}
   */
  run(def, memory, { replay = false, number = memory?.id, fallback = false } = {}) {
    this.def = def;
    this.memory = memory;
    this.fallback = fallback; // mini-jeu de secours : on n'utilise pas l'outcomeText prévu pour l'anecdote
    this.replayMode = replay;
    this.active = true;
    this.el.root.hidden = false;
    this._fit();
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._showIntro(number);
    });
  }

  _showIntro(number) {
    const { el, def, memory } = this;
    this.phase = 'intro';
    el.kicker.textContent = `Anecdote ${number} / 55${memory?.date ? ' · ' + memory.date : ''}`;
    el.title.textContent = memory?.title || def.title;
    el.instructions.textContent = def.instructions;
    el.controls.textContent = def.controls || '';
    el.portrait.src = avatarPortrait(def.introExpression || 'smile');
    el.intro.hidden = false;
    el.outro.hidden = true;
    el.hud.hidden = true;
    // aperçu figé du décor derrière l'intro
    this._createGame();
    this._render(0);
    setTimeout(() => el.play.focus({ preventScroll: true }), 60);
  }

  _createGame() {
    this.particles = [];
    this.shakeAmt = 0;
    this.t = 0;
    this.ended = null;
    const api = this._api();
    this.game = this.def.create(api);
  }

  _startPlay() {
    if (this.phase !== 'intro') return;
    document.activeElement?.blur?.();
    this._createGame();
    this.input.keys.clear();
    this.input._endFrame();
    this.phase = 'play';
    this.el.intro.hidden = true;
    this.el.hud.hidden = false;
    this.audio?.sfx?.('whoosh');
    this._last = performance.now();
    this._graceUntil = this._last + 150; // ignore le clic qui a lancé le jeu
    cancelAnimationFrame(this._raf);
    const loop = (now) => {
      if (this.phase !== 'play' && this.phase !== 'ending') return;
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this._tick(dt, now);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _tick(dt, now) {
    const inp = this.input;
    if (now < this._graceUntil) inp._endFrame();
    // curseur au clavier (pour les jeux qui visent)
    const ax = inp.axis('x'), ay = inp.axis('y');
    if (ax || ay) {
      inp.cursor.x = clamp(inp.cursor.x + ax * 520 * dt, 0, W);
      inp.cursor.y = clamp(inp.cursor.y + ay * 520 * dt, 0, H);
    }
    if (this.phase === 'play') {
      this.t += dt;
      this.game.update(dt, inp);
      const dur = this.def.duration || 10;
      if (!this.ended && this.t >= dur) {
        const ok = this.game.timeout ? !!this.game.timeout() : false;
        if (!this.ended) this._end(ok, null);
      }
      this.el.timer.style.transform = `scaleX(${clamp(1 - this.t / dur, 0, 1)})`;
    } else {
      // petite fin d'animation (1,4 s) avant l'écran de résultat
      this.endT += dt;
      this.game.update(dt, { ...inp, pressed: () => false, held: () => false, axis: () => 0, pointer: { ...inp.pointer, down: false, pressed: false } });
      if (this.endT > 1.4) this._showOutro();
    }
    inp._endFrame();
    this._updateParticles(dt);
    this._render(dt);
  }

  _end(success, text) {
    if (this.ended) return;
    this.ended = { success, text };
    this.phase = 'ending';
    this.endT = 0;
    this.audio?.sfx?.(success ? 'win' : 'lose');
  }

  _showOutro() {
    cancelAnimationFrame(this._raf);
    this.phase = 'outro';
    const { el, ended, memory, def } = this;
    const ot = this.fallback ? null : memory?.outcomeText;
    const custom = typeof ot === 'string' ? ot : ended.success ? ot?.success : ot?.fail;
    const text = custom || ended.text || (ended.success ? def.successText : def.failText) ||
      (ended.success ? 'Bravo ! Une anecdote de plus dans la lumière.' : 'Raté… mais c’est exactement comme ça que l’histoire s’est passée !');
    this.result = { result: ended.success ? 'success' : 'fail', text };
    el.outTitle.textContent = ended.success ? (def.successTitle || 'Bien joué !') : (def.failTitle || 'Oups… quelle histoire !');
    el.outText.textContent = text;
    el.outPortrait.src = avatarPortrait(ended.success ? 'happy' : 'laugh');
    el.outContinue.textContent = this.replayMode ? 'Retour au souvenir' : 'Allumer la lanterne ✨';
    el.hud.hidden = true;
    el.outro.hidden = false;
    setTimeout(() => el.outContinue.focus({ preventScroll: true }), 60);
  }

  _replay() {
    this.el.outro.hidden = true;
    this.phase = 'intro';
    this._startPlay();
  }

  _skip() {
    if (!this.active) return;
    cancelAnimationFrame(this._raf);
    this.result = { result: 'skipped', text: '' };
    this._finish();
  }

  _finish() {
    if (!this.active) return;
    cancelAnimationFrame(this._raf);
    this.active = false;
    this.phase = 'idle';
    this.el.root.hidden = true;
    this.input.keys.clear();
    this.input.pointer.down = false;
    const r = this.result || { result: 'skipped', text: '' };
    this.result = null;
    this._resolve?.(r);
  }

  /* ─────────── Rendu ─────────── */
  _render() {
    const g = this.g;
    const s = this.scale || 1;
    g.setTransform(s, 0, 0, s, 0, 0);
    g.clearRect(0, 0, W, H);
    g.save();
    if (this.shakeAmt > 0.2) {
      g.translate((Math.random() - 0.5) * this.shakeAmt, (Math.random() - 0.5) * this.shakeAmt);
      this.shakeAmt *= 0.86;
    }
    this.game.draw(g);
    this._drawParticles(g);
    g.restore();
  }

  _updateParticles(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  _drawParticles(g) {
    for (const p of this.particles) {
      const a = Math.min(1, p.life / p.maxLife * 1.5);
      g.globalAlpha = a;
      g.fillStyle = p.color;
      if (p.shape === 'star') {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 ? p.size * 0.45 : p.size;
          const an = (k / 10) * Math.PI * 2;
          k ? g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : g.moveTo(Math.cos(an) * rr, Math.sin(an) * rr);
        }
        g.closePath(); g.fill(); g.restore();
      } else {
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  /* ─────────── API donnée aux mini-jeux ─────────── */
  _api() {
    const runner = this;
    return {
      W, H,
      get t() { return runner.t; },
      get timeLeft() { return Math.max(0, (runner.def.duration || 10) - runner.t); },
      get ended() { return !!runner.ended; },
      memory: this.memory,
      /** Termine la partie (une seule fois). text = message optionnel de résultat. */
      end: (success, text) => runner._end(success, text),
      sfx: (name) => runner.audio?.sfx?.(name),
      avatar: (g, opts) => drawAvatar2D(g, opts),
      shake: (px = 10) => { runner.shakeAmt = Math.max(runner.shakeAmt, px); },
      /** Gerbe de particules (max 300 à l'écran). */
      burst: (x, y, o = {}) => {
        const n = o.n ?? 14;
        for (let i = 0; i < n && runner.particles.length < 300; i++) {
          const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
          const sp = (o.speed ?? 220) * (0.4 + Math.random() * 0.8);
          const life = (o.life ?? 0.9) * (0.6 + Math.random() * 0.6);
          runner.particles.push({
            x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, gravity: o.gravity ?? 600,
            size: (o.size ?? 5) * (0.6 + Math.random() * 0.8), color: Array.isArray(o.color) ? o.color[i % o.color.length] : (o.color ?? '#fff'),
            life, maxLife: life, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 8, shape: o.shape || 'dot',
          });
        }
      },
      text: (g, str, x, y, o = {}) => {
        g.font = `${o.weight ?? 700} ${o.size ?? 28}px ${o.font ?? '"Nunito Sans", system-ui, sans-serif'}`;
        g.textAlign = o.align ?? 'center';
        g.textBaseline = o.baseline ?? 'middle';
        if (o.stroke) { g.lineWidth = o.strokeWidth ?? 6; g.strokeStyle = o.stroke; g.lineJoin = 'round'; g.strokeText(str, x, y); }
        g.fillStyle = o.color ?? '#fff';
        g.fillText(str, x, y);
      },
      roundRect: (g, x, y, w, h, r = 12) => {
        g.beginPath();
        g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
      },
      rand: (a = 0, b = 1) => a + Math.random() * (b - a),
      clamp, lerp,
    };
  }
}

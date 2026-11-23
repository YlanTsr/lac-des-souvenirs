/**
 * Musique générative (Web Audio API), 100 % synthétisée : aucun fichier audio.
 *
 *  - Nappe : 6 voix douces (sinus / triangle) qui glissent lentement entre 4 accords.
 *    Les voix aiguës se dévoilent à mesure que les lanternes s'allument,
 *    et le filtre s'ouvre : la musique « s'éclaire » avec le lac.
 *  - Notes de célesta aléatoires (gamme pentatonique de ré), de plus en plus fréquentes.
 *  - Clapotis : bruit filtré très discret.
 *  - Carillon (lanterne), note pincée (anneau), et grand accord final.
 *  - Réverbération par convolution (réponse impulsionnelle générée, ~3 s).
 */

// Ré majeur pentatonique sur 3 octaves (Hz)
const PENTA = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0, 987.77, 1174.66];

// 4 accords (6 voix chacun), du grave à l'aigu
const CHORDS = [
  [73.42, 110.0, 185.0, 220.0, 329.63, 440.0],    // Ré add9
  [61.74, 92.5, 146.83, 220.0, 293.66, 369.99],   // Si m7
  [98.0, 146.83, 185.0, 246.94, 293.66, 493.88],  // Sol maj7
  [110.0, 164.81, 220.0, 246.94, 329.63, 440.0],  // La sus
];
// Seuil de progression (0..1) à partir duquel chaque voix apparaît
const VOICE_UNLOCK = [0, 0, 0.0, 0.18, 0.4, 0.65];
const VOICE_GAIN = [0.16, 0.1, 0.06, 0.05, 0.035, 0.03];

export class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.volume = 0.7;
    this.muted = false;
    this.progress = 0;
    this.chordIndex = 0;
    this._nextChord = 0;
    this._nextNote = 0;
    this._ducked = false;
  }

  /** Doit être appelé suite à un geste utilisateur (politique autoplay des navigateurs). */
  async start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(3.2, 2.6);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.55;
    this.reverb.connect(this.reverbGain).connect(this.master);

    // bus de la nappe : filtre passe-bas qui s'ouvre avec la progression
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 700;
    this.padFilter.Q.value = 0.4;
    this.padBus = ctx.createGain();
    this.padBus.gain.value = 1;
    this.padFilter.connect(this.padBus);
    this.padBus.connect(this.master);
    this.padBus.connect(this.reverb);

    // bus des effets (carillons, notes)
    this.fxBus = ctx.createGain();
    this.fxBus.gain.value = 0.9;
    this.fxBus.connect(this.master);
    this.fxBus.connect(this.reverb);

    this._buildPad();
    this._buildWater();
    this.setProgress(this.progress);
    this._applyVolume(2.5);

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _buildPad() {
    const ctx = this.ctx;
    this.voices = CHORDS[0].map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (Math.random() - 0.5) * 8;
      const g = ctx.createGain(); // niveau de la voix (0 tant qu'elle n'est pas « débloquée »)
      g.gain.value = 0;
      // LFO lent sur un 2e étage de gain (0.3..1) : la nappe « respire »
      const swell = ctx.createGain();
      swell.gain.value = 0.65;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.35;
      lfo.connect(lfoGain).connect(swell.gain);
      osc.connect(g).connect(swell).connect(this.padFilter);
      osc.start();
      lfo.start();
      return { osc, g };
    });
  }

  _buildWater() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.018;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lg = ctx.createGain();
    lg.gain.value = 0.01;
    lfo.connect(lg).connect(g.gain);
    src.connect(bp).connect(g).connect(this.master);
    src.start();
    lfo.start();
  }

  /** 0..1 — nombre de lanternes allumées / 55. */
  setProgress(p) {
    this.progress = p;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.voices.forEach((v, i) => {
      const on = p >= VOICE_UNLOCK[i] ? 1 : 0;
      v.g.gain.setTargetAtTime(VOICE_GAIN[i] * on, now, 3);
    });
    this.padFilter.frequency.setTargetAtTime(700 + p * 2300, now, 4);
  }

  setVolume(v) { this.volume = v; this._applyVolume(0.2); }
  setMuted(m) { this.muted = m; this._applyVolume(0.3); }
  /** Baisse la musique pendant la lecture d'une vidéo souvenir. */
  duck(on) { this._ducked = on; this._applyVolume(0.6); }

  _applyVolume(tau) {
    if (!this.ctx) return;
    const v = this.muted ? 0 : this.volume * (this._ducked ? 0.15 : 1);
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, tau);
  }

  /** À appeler à chaque frame (planification légère). */
  update(time) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now >= this._nextChord) {
      this.chordIndex = (this.chordIndex + 1) % CHORDS.length;
      const chord = CHORDS[this.chordIndex];
      this.voices.forEach((v, i) => v.osc.frequency.setTargetAtTime(chord[i], now, 2.2));
      this._nextChord = now + 14;
    }
    if (now >= this._nextNote) {
      const p = this.progress;
      const idx = 5 + Math.floor(Math.random() * 9);
      this._bell(PENTA[idx], now + 0.05, 0.025 + p * 0.025, 2.5);
      this._nextNote = now + (7 - p * 4.5) * (0.6 + Math.random() * 0.8);
    }
  }

  /** Cloche douce : quelques partiels sinusoïdaux à décroissance exponentielle. */
  _bell(freq, t0, vol, dur = 4) {
    const ctx = this.ctx;
    const partials = [[1, 1], [2, 0.32], [2.76, 0.22], [5.4, 0.06]];
    for (const [ratio, amp] of partials) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      const g = ctx.createGain();
      const d = dur / Math.sqrt(ratio);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol * amp, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g).connect(this.fxBus);
      o.start(t0);
      o.stop(t0 + d + 0.05);
    }
  }

  /** Carillon d'une lanterne : petite arpège montante, propre à chaque numéro. */
  chime(id) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    const base = (id * 3) % 8;
    this._bell(PENTA[base + 3], t, 0.14, 5);
    this._bell(PENTA[base + 5], t + 0.18, 0.1, 5);
    this._bell(PENTA[base + 7], t + 0.38, 0.08, 6);
  }

  /** Note pincée + souffle quand on traverse un anneau-guide. */
  ringNote(step) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const f = PENTA[Math.min(PENTA.length - 1, 6 + step * 2)];
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4000, t);
    lp.frequency.exponentialRampToValueAtTime(600, t + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(lp).connect(g).connect(this.fxBus);
    o.start(t);
    o.stop(t + 2);
    this._bell(f * 2, t + 0.08, 0.04, 2.5);
  }

  /* ─────────── Bruitages des mini-jeux (tous synthétisés, très courts) ─────────── */

  _tone(type, f0, f1, dur, vol, t0 = this.ctx.currentTime + 0.005, filter = 0) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o.connect(g);
    if (filter) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = filter;
      node = g.connect(lp);
    }
    node.connect(this.fxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  _noise(dur, vol, freq, q = 1, sweepTo = 0) {
    const ctx = this.ctx;
    if (!this._noiseBuf) {
      const len = ctx.sampleRate;
      this._noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + 0.005;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(freq, t0);
    if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(this.fxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  /**
   * Bruitage nommé : pop, catch, splat, boing, clang, ouch, beep, whoosh, grain, win, lose.
   * Silencieux si l'audio n'a pas encore été démarré.
   */
  sfx(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'pop': this._tone('sine', 520, 980, 0.09, 0.12); break;
      case 'catch': this._bell(PENTA[10 + Math.floor(Math.random() * 5)], t, 0.09, 1.2); break;
      case 'splat': this._noise(0.35, 0.5, 700, 0.8, 200); this._tone('sine', 160, 60, 0.25, 0.25); break;
      case 'boing': this._tone('sine', 180, 420, 0.22, 0.16); this._tone('sine', 420, 260, 0.2, 0.08, t + 0.18); break;
      case 'clang': this._tone('square', 1250, 1180, 0.16, 0.05, t, 4000); this._bell(1760, t, 0.06, 0.5); break;
      case 'ouch': this._tone('sawtooth', 620, 170, 0.32, 0.09, t, 1800); break;
      case 'beep': this._tone('square', 880, 880, 0.09, 0.05, t, 3000); break;
      case 'whoosh': this._noise(0.28, 0.18, 400, 1.2, 2200); break;
      case 'grain': this._noise(0.06, 0.05, 3500, 2); break;
      case 'win': [5, 7, 9, 12].forEach((k, i) => this._bell(PENTA[k], t + i * 0.11, 0.1, 2.5)); break;
      case 'lose': this._tone('triangle', 392, 370, 0.3, 0.12, t, 1500); this._tone('triangle', 330, 290, 0.5, 0.12, t + 0.32, 1500); break;
      default: break;
    }
  }

  /** Grand accord final + arpège ascendant sur toute la gamme. */
  finale() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    this.setProgress(1);
    PENTA.forEach((f, i) => this._bell(f, t + i * 0.22, 0.09, 7));
    [73.42, 146.83, 220, 293.66, 369.99].forEach((f) => this._bell(f, t + PENTA.length * 0.22, 0.12, 10));
  }
}

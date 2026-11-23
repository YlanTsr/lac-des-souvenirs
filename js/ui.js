/**
 * Interface HTML par-dessus le canvas : accueil, HUD, carte souvenir (avec
 * chargement paresseux des médias), journal + carte du lac, finale, fondus.
 * Ce module ne connaît pas Three.js : il reçoit des données et émet des callbacks.
 */
import { CHAPTERS, WORLD, INTRO, FINALE, TOTAL_LANTERNS } from './config.js';
import { avatarPortrait } from './avatar.js';
import { hasMiniGame } from './minigames.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.el = {
      intro: $('intro'), start: $('start-btn'), introError: $('intro-error'),
      hud: $('hud'), count: $('lit-count'), total: $('lit-total'), counter: document.querySelector('.counter'),
      banner: $('chapter-banner'), compass: $('compass'), compassArrow: $('compass-arrow'), compassText: $('compass-text'),
      prompt: $('prompt'), promptText: $('prompt-text'), help: $('help'),
      mute: $('mute-btn'), volume: $('volume'),
      memory: $('memory'), memoryCard: $('memory-card'), media: $('memory-media'),
      mNumber: $('memory-number'), mChapter: $('memory-chapter'), mTitle: $('memory-title'),
      mDate: $('memory-date'), mCaption: $('memory-caption'),
      mResult: $('memory-result'), mNote: $('memory-note'), mReplay: $('memory-replay'),
      mPrev: $('memory-prev'), mNext: $('memory-next'), mContinue: $('memory-continue'),
      journal: $('journal'), jList: $('journal-list'), jProgress: $('journal-progress'), map: $('map'),
      replay: $('replay-finale'), finale: $('finale'), fade: $('fade'), toast: $('toast'),
      debug: $('debug-bar'),
    };
    this._mediaToken = 0;
    this._prefetched = new Set();
    this._bannerTimer = null;
    this._toastTimer = null;

    $('intro-title').textContent = INTRO.title;
    $('intro-subtitle').textContent = INTRO.subtitle;
    $('intro-dedication').textContent = INTRO.dedication;
    this.el.total.textContent = TOTAL_LANTERNS;
    this._bind();
  }

  _bind() {
    const { el, h } = this;
    el.start.addEventListener('click', () => h.onStart());
    $('journal-btn').addEventListener('click', () => h.onToggleJournal());
    $('help-btn').addEventListener('click', () => this.toggleHelp());
    $('help-close').addEventListener('click', () => this.toggleHelp(false));
    el.mute.addEventListener('click', () => h.onToggleMute());
    el.volume.addEventListener('input', () => h.onVolume(parseFloat(el.volume.value)));
    el.prompt.addEventListener('click', () => h.onPrompt());
    $('memory-close').addEventListener('click', () => h.onCloseMemory());
    el.mContinue.addEventListener('click', () => h.onCloseMemory());
    el.mReplay.addEventListener('click', () => h.onReplayMiniGame());
    el.mPrev.addEventListener('click', () => h.onNavMemory(-1));
    el.mNext.addEventListener('click', () => h.onNavMemory(1));
    el.memory.addEventListener('click', (e) => { if (e.target === el.memory) h.onCloseMemory(); });
    $('journal-close').addEventListener('click', () => h.onToggleJournal(false));
    el.journal.addEventListener('click', (e) => { if (e.target === el.journal) h.onToggleJournal(false); });
    $('reset-btn').addEventListener('click', () => {
      if (confirm('Éteindre toutes les lanternes et recommencer le voyage ?')) h.onReset();
    });
    el.replay.addEventListener('click', () => h.onReplayFinale());
    $('finale-close').addEventListener('click', () => h.onCloseFinale());
    $('debug-next').addEventListener('click', () => h.onDebugNext());
    $('debug-all').addEventListener('click', () => h.onDebugAll());
    el.map.addEventListener('click', (e) => {
      const r = el.map.getBoundingClientRect();
      const p = this._mapToWorld(((e.clientX - r.left) / r.width) * el.map.width, ((e.clientY - r.top) / r.height) * el.map.height);
      h.onMapClick(p.x, p.z);
    });
  }

  /* ─────────── Accueil ─────────── */
  ready(litCount) {
    this.el.start.disabled = false;
    this.el.start.textContent = litCount > 0 && litCount < TOTAL_LANTERNS
      ? `Reprendre le voyage (${litCount} / ${TOTAL_LANTERNS})`
      : 'Commencer le voyage';
  }
  showError(html) {
    this.el.introError.hidden = false;
    this.el.introError.innerHTML = html;
  }
  hideIntro() {
    this.el.intro.classList.add('leaving');
    this.el.hud.hidden = false;
    setTimeout(() => (this.el.intro.hidden = true), 1700);
  }

  /* ─────────── HUD ─────────── */
  setCount(n, animate = false) {
    this.el.count.textContent = n;
    if (animate) {
      this.el.counter.classList.remove('bump');
      void this.el.counter.offsetWidth; // relance l'animation CSS
      this.el.counter.classList.add('bump');
    }
  }
  setMuted(m) {
    this.el.mute.classList.toggle('muted', m);
    this.el.mute.setAttribute('aria-label', m ? 'Rétablir le son (M)' : 'Couper le son (M)');
  }
  showPrompt(text) {
    if (!text) { this.el.prompt.hidden = true; return; }
    if (this.el.promptText.textContent !== text) this.el.promptText.textContent = text;
    this.el.prompt.hidden = false;
  }
  toggleHelp(force) {
    const show = force ?? this.el.help.hidden;
    this.el.help.hidden = !show;
  }
  chapterBanner(ch) {
    const b = this.el.banner;
    b.style.setProperty('--accent', ch.color);
    b.innerHTML = `<span class="kicker">Chapitre ${ch.roman}</span><span class="name"></span><span class="sub"></span>`;
    b.querySelector('.name').textContent = ch.name;
    b.querySelector('.sub').textContent = ch.subtitle;
    b.classList.add('show');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => b.classList.remove('show'), 4200);
  }
  /** angle : radians, 0 = droit devant (vers le haut de l'écran). */
  compass(angle, dist, visible) {
    this.el.compass.hidden = !visible;
    if (!visible) return;
    this.el.compassArrow.style.transform = `rotate(${angle}rad)`;
    this.el.compassText.textContent = `Lanterne la plus proche · ${Math.round(dist)} m`;
  }
  toast(msg, ms = 2600) {
    const t = this.el.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }
  showDebug() { this.el.debug.hidden = false; }

  /* ─────────── Carte souvenir ─────────── */
  /**
   * @param {object} m souvenir
   * @param {{mode:'new'|'read', hasPrev:boolean, hasNext:boolean, result?:'success'|'fail'|'skipped', outcome?:string}} opts
   */
  openMemory(m, opts) {
    this._openMemoryBase(m, opts);
    const el = this.el;
    // résultat du mini-jeu
    const res = opts.result;
    el.mResult.hidden = !res || res === 'skipped';
    if (res === 'success') { el.mResult.className = 'memory-result success'; el.mResult.textContent = '⭐ Anecdote réussie'; }
    else if (res === 'fail') { el.mResult.className = 'memory-result fail'; el.mResult.textContent = '😄 Raté… mais quelle histoire !'; }
    // « mot de la fin » : funnyNote du JSON, sinon le texte de résultat du mini-jeu
    const note = m.funnyNote || opts.outcome || '';
    el.mNote.hidden = !note;
    el.mNote.textContent = note;
    el.mReplay.textContent = hasMiniGame(m.minigame) ? '▶ Rejouer l’anecdote' : '▶ Rejouer le mini-jeu';
  }

  _openMemoryBase(m, opts) {
    this._lastResult = opts.result;
    const ch = CHAPTERS[m.chapter - 1] || CHAPTERS[0];
    const el = this.el;
    el.memory.style.setProperty('--accent', ch.color);
    el.mNumber.textContent = `Lanterne ${m.id} / ${TOTAL_LANTERNS}`;
    el.mChapter.textContent = `Chapitre ${ch.roman} · ${ch.name}`;
    el.mTitle.textContent = m.title || `Souvenir n°${m.id}`;
    el.mDate.textContent = m.date || '';
    el.mDate.hidden = !m.date;
    el.mCaption.textContent = m.caption || '';
    el.mPrev.hidden = el.mNext.hidden = opts.mode !== 'read';
    el.mPrev.disabled = !opts.hasPrev;
    el.mNext.disabled = !opts.hasNext;
    el.mContinue.textContent = opts.mode === 'read' ? 'Fermer' : 'Continuer le voyage';
    el.memory.hidden = false;
    // relance l'animation d'entrée
    el.memoryCard.style.animation = 'none';
    void el.memoryCard.offsetWidth;
    el.memoryCard.style.animation = '';
    el.memoryCard.scrollTop = 0;
    this._loadMedia(m, ch);
    setTimeout(() => el.mContinue.focus({ preventScroll: true }), 50);
  }

  closeMemory() {
    this._unloadMedia();
    this.el.memory.hidden = true;
  }

  get memoryOpen() { return !this.el.memory.hidden; }

  /**
   * Chargement PARESSEUX : le fichier n'est demandé qu'à l'ouverture de la carte.
   * En cas d'absence (404) ou d'erreur → joli visuel de remplacement.
   */
  _loadMedia(m, ch) {
    const box = this.el.media;
    const token = ++this._mediaToken;
    this._unloadMedia(false);
    box.innerHTML = '';
    box.classList.add('media-loading');
    const fail = () => {
      if (token !== this._mediaToken) return;
      box.classList.remove('media-loading');
      box.innerHTML = '';
      box.appendChild(this._fallback(m));
    };
    if (!m.media) { fail(); return; }

    if (m.type === 'video') {
      const v = document.createElement('video');
      v.controls = true;
      v.playsInline = true;
      v.preload = 'metadata';
      if (m.poster) v.poster = m.poster;
      v.addEventListener('loadedmetadata', () => { if (token === this._mediaToken) box.classList.remove('media-loading'); }, { once: true });
      v.addEventListener('error', fail, { once: true });
      v.addEventListener('play', () => this.h.onVideoPlaying(true));
      v.addEventListener('pause', () => this.h.onVideoPlaying(false));
      v.addEventListener('ended', () => this.h.onVideoPlaying(false));
      v.src = m.media;
      box.appendChild(v);
    } else {
      const img = new Image();
      img.decoding = 'async';
      img.alt = m.title || '';
      img.onload = () => {
        if (token !== this._mediaToken) return;
        box.classList.remove('media-loading');
        box.appendChild(img);
      };
      img.onerror = fail;
      img.src = m.media;
    }
  }

  /** Libère la vidéo (mémoire + réseau) quand on ferme la carte. */
  _unloadMedia(bumpToken = true) {
    if (bumpToken) this._mediaToken++;
    const v = this.el.media.querySelector('video');
    if (v) {
      v.pause();
      v.removeAttribute('src');
      v.load();
      this.h.onVideoPlaying(false);
    }
  }

  /** Pas de photo : Papa en illustration (expression selon le résultat du mini-jeu). */
  _fallback(m) {
    const res = this._lastResult;
    const d = document.createElement('div');
    d.className = 'media-avatar';
    const img = new Image();
    img.alt = 'Papa';
    img.src = avatarPortrait(res === 'fail' ? 'laugh' : res === 'success' ? 'happy' : 'smile', 360);
    d.innerHTML = `<span class="mf-num">${m.id}</span><span class="mf-tag">${m.media ? (m.type === 'video' ? 'vidéo à venir' : 'photo à venir') : 'souvenir'}</span>`;
    d.appendChild(img);
    if (m.media) d.title = `Fichier attendu : ${m.media}`;
    return d;
  }

  /** Ancien visuel de remplacement (lanterne dessinée) — gardé si tu préfères ce style. */
  _fallbackLantern(m) {
    const d = document.createElement('div');
    d.className = 'media-fallback';
    const label = m.type === 'video' ? 'Vidéo à venir' : 'Photo à venir';
    d.innerHTML = `
      <svg width="46" height="60" viewBox="0 0 46 60" aria-hidden="true">
        <defs><radialGradient id="lg${m.id}" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#fff4d0"/><stop offset=".55" stop-color="#ffc685"/><stop offset="1" stop-color="#e98a3c"/></radialGradient></defs>
        <rect x="15" y="0" width="16" height="6" rx="2" fill="#5b4231"/>
        <path d="M23 6C10 6 4 18 4 31s6 25 19 25 19-12 19-25S36 6 23 6z" fill="url(#lg${m.id})"/>
        <rect x="15" y="54" width="16" height="6" rx="2" fill="#5b4231"/>
      </svg>
      <span class="mf-num">${m.id}</span>
      <span class="mf-label">${label}</span>
      <code></code>`;
    d.querySelector('code').textContent = m.media || 'aucun média défini';
    return d;
  }

  /** Pré-chargement discret d'une image quand on approche d'une lanterne (jamais les vidéos). */
  prefetch(m) {
    if (!m || m.type !== 'image' || !m.media || this._prefetched.has(m.id)) return;
    this._prefetched.add(m.id);
    const img = new Image();
    img.decoding = 'async';
    img.src = m.media;
  }

  /* ─────────── Journal ─────────── */
  get journalOpen() { return !this.el.journal.hidden; }

  openJournal(memories, litSet, finaleSeen, results = {}) {
    this.renderJournal(memories, litSet, results);
    this.el.replay.hidden = !finaleSeen;
    this.el.journal.hidden = false;
  }
  closeJournal() { this.el.journal.hidden = true; }

  renderJournal(memories, litSet, results = {}) {
    const list = this.el.jList;
    list.innerHTML = '';
    this.el.jProgress.textContent = `${litSet.size} / ${TOTAL_LANTERNS} souvenirs retrouvés`;
    for (const ch of CHAPTERS) {
      const items = memories.filter((m) => m.chapter === ch.id);
      const lit = items.filter((m) => litSet.has(m.id)).length;
      const block = document.createElement('section');
      block.className = 'chapter-block';
      block.style.setProperty('--accent', ch.color);
      block.innerHTML = `
        <div class="chapter-head">
          <h3><span class="roman">${ch.roman}</span><span class="cname"></span><span class="count">${lit} / ${items.length}</span></h3>
          <button class="btn btn-ghost chapter-go">Y aller</button>
        </div>
        <div class="slots"></div>`;
      block.querySelector('.cname').textContent = ch.name;
      block.querySelector('.chapter-go').addEventListener('click', () => this.h.onTeleportChapter(ch.id));
      const slots = block.querySelector('.slots');
      for (const m of items) {
        const isLit = litSet.has(m.id);
        const b = document.createElement('button');
        b.className = 'slot' + (isLit ? ' lit' : '');
        const star = isLit && results[m.id] === 'success' ? '<span class="star" title="Anecdote réussie">★</span>' : '';
        b.innerHTML = `<span class="n">${m.id}</span><span class="t"></span>${star}`;
        b.querySelector('.t').textContent = isLit ? m.title : hasMiniGame(m.minigame) ? 'Anecdote à jouer — y naviguer' : 'Encore éteinte — y naviguer';
        b.title = isLit ? `Relire « ${m.title} » (et rejouer son mini-jeu)` : `Guider la barque vers la lanterne ${m.id}`;
        b.addEventListener('click', () => (isLit ? this.h.onReadMemory(m.id) : this.h.onSailToLantern(m.id)));
        slots.appendChild(b);
      }
      list.appendChild(block);
    }
  }

  /* Carte du lac (canvas 2D, redessinée seulement quand le journal est ouvert) */
  _mapScale() {
    const W = this.el.map.width;
    return { W, s: (W * 0.5) / (WORLD.lakeRadius + 12) };
  }
  _worldToMap(x, z) {
    const { W, s } = this._mapScale();
    return [(x - WORLD.lakeCenter.x) * s + W / 2, (z - WORLD.lakeCenter.z) * s + W / 2];
  }
  _mapToWorld(mx, my) {
    const { W, s } = this._mapScale();
    return { x: (mx - W / 2) / s + WORLD.lakeCenter.x, z: (my - W / 2) / s + WORLD.lakeCenter.z };
  }

  drawMap({ islands, lanterns, boat, rings }) {
    const c = this.el.map;
    const g = c.getContext('2d');
    const { W, s } = this._mapScale();
    g.clearRect(0, 0, W, W);
    // lac
    const [cx, cy] = this._worldToMap(WORLD.lakeCenter.x, WORLD.lakeCenter.z);
    g.fillStyle = 'rgba(40, 50, 110, 0.35)';
    g.beginPath(); g.arc(cx, cy, WORLD.lakeRadius * s, 0, Math.PI * 2); g.fill();
    // chemin des anneaux
    g.strokeStyle = 'rgba(159, 227, 255, 0.35)';
    g.setLineDash([3, 6]);
    g.lineWidth = 1.5;
    g.beginPath();
    rings.forEach((r, i) => { const [x, y] = this._worldToMap(r.x, r.z); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
    g.setLineDash([]);
    // îles
    for (const isl of islands) {
      const [x, y] = this._worldToMap(isl.x, isl.z);
      g.fillStyle = isl.radius > 8 ? '#3b5b4a' : '#2c4438';
      g.beginPath(); g.arc(x, y, Math.max(2, isl.radius * s), 0, Math.PI * 2); g.fill();
    }
    // noms des chapitres
    g.font = '600 15px "Cormorant Garamond", Georgia, serif';
    g.textAlign = 'center';
    for (const ch of CHAPTERS) {
      const [x, y] = this._worldToMap(ch.center.x, ch.center.z);
      g.fillStyle = ch.color;
      g.fillText(ch.roman, x, y + 5);
    }
    // lanternes
    for (const l of lanterns) {
      const [x, y] = this._worldToMap(l.x, l.z);
      if (l.lit) {
        g.fillStyle = 'rgba(255, 190, 110, 0.25)';
        g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffc685';
      } else g.fillStyle = 'rgba(200, 195, 220, 0.45)';
      g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill();
    }
    // barque
    const [bx, by] = this._worldToMap(boat.x, boat.z);
    g.save();
    g.translate(bx, by);
    g.rotate(-boat.heading + Math.PI); // heading PI (vers -z) = pointe vers le haut
    g.fillStyle = '#fff3df';
    g.shadowColor = '#ffb36b';
    g.shadowBlur = 12;
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 4); g.lineTo(-6, 7); g.closePath(); g.fill();
    g.restore();
  }

  /* ─────────── Finale & fondus ─────────── */
  showFinale() {
    $('finale-title').textContent = FINALE.title;
    $('finale-subtitle').textContent = FINALE.subtitle;
    $('finale-message').textContent = FINALE.message;
    $('finale-signature').textContent = FINALE.signature;
    this.el.finale.hidden = false;
    const inner = this.el.finale.querySelector('.finale-inner');
    inner.style.animation = 'none';
    void inner.offsetWidth;
    inner.style.animation = '';
  }
  hideFinale() { this.el.finale.hidden = true; }
  get finaleOpen() { return !this.el.finale.hidden; }

  /** Fondu au noir → action → retour. */
  async fadeThrough(action) {
    this.el.fade.classList.add('on');
    await new Promise((r) => setTimeout(r, 750));
    action();
    await new Promise((r) => setTimeout(r, 250));
    this.el.fade.classList.remove('on');
  }
}

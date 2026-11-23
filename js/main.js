/**
 * ═══════════════════════════════════════════════════════════
 *  Les 55 Lanternes — point d'entrée
 *  Orchestration : chargement des souvenirs, scène Three.js,
 *  boucle de jeu, entrées clavier/souris, états du jeu, sauvegarde.
 * ═══════════════════════════════════════════════════════════
 *
 *  États (state.mode) :
 *    loading → intro → play → minigame → lighting → card → play … → finale → play
 *                         ⇄ journal (→ card → minigame « rejouer » → card)
 *
 *  Pendant « minigame », la scène 3D n'est plus rendue : le GPU ne dessine
 *  que le petit canvas 2D du mini-jeu.
 */
import * as THREE from 'three';
import { CHAPTERS, WORLD, TOTAL_LANTERNS, SAVE_KEY } from './config.js';
import { computeLanternPositions, chapterForIndex, ringRadius } from './layout.js';
import { clamp, angleDiff, makeGlowTexture } from './utils.js';
import { World, MAX_WATER_GLOWS } from './world.js';
import { Boat } from './boat.js';
import { CameraRig } from './camera.js';
import { LanternField, digitTargets } from './lanterns.js';
import { GuideRings } from './rings.js';
import { AmbientAudio } from './audio.js';
import { UI } from './ui.js';
import { MiniGameRunner } from './minigames/engine.js';
import { loadMiniGame } from './minigames.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const INTERACT_RADIUS = 6;     // distance pour allumer une lanterne
const PREFETCH_RADIUS = 22;    // distance de pré-chargement de la photo

const state = {
  mode: 'loading',
  lit: new Set(),
  results: {},        // id → 'success' | 'fail' | 'skipped' (meilleur résultat obtenu)
  outcomes: {},       // id → dernier texte de résultat du mini-jeu (session en cours)
  cardMemory: null,   // souvenir affiché sur la carte
  finaleSeen: false,
  volume: 0.7,
  muted: false,
  lastChapter: 0,
  focusItem: null,
  pendingLight: null,
  readList: [],
  readIndex: 0,
  readFromJournal: false,
};

/* ───────────────────── Sauvegarde locale ───────────────────── */
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s) return;
    (s.lit || []).forEach((id) => state.lit.add(id));
    if (s.results && typeof s.results === 'object') state.results = s.results;
    state.finaleSeen = !!s.finaleSeen;
    if (typeof s.volume === 'number') state.volume = s.volume;
    state.muted = !!s.muted;
  } catch { /* stockage indisponible (navigation privée…) : on joue sans sauvegarde */ }
}
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      lit: [...state.lit], results: state.results, finaleSeen: state.finaleSeen, volume: state.volume, muted: state.muted,
    }));
  } catch { /* ignore */ }
}

/* ───────────────────── Chargement des souvenirs ───────────────────── */
/** Complète / corrige chaque entrée pour que le jeu ne casse jamais sur une faute de frappe. */
function normalizeMemories(list) {
  const positions = computeLanternPositions();
  const byId = new Map((list || []).map((m) => [Number(m.id), m]));
  const out = [];
  for (let id = 1; id <= TOTAL_LANTERNS; id++) {
    const m = byId.get(id) || {};
    const p = positions[id - 1];
    const hasPos = m.position && Number.isFinite(+m.position.x) && Number.isFinite(+m.position.z);
    out.push({
      id,
      chapter: clamp(Number(m.chapter) || chapterForIndex(id - 1), 1, CHAPTERS.length),
      title: m.title || `Souvenir n°${id}`,
      date: m.date || '',
      type: m.type === 'video' ? 'video' : 'image',
      media: m.media || '',
      poster: m.poster || '',
      caption: m.caption || '',
      minigame: typeof m.minigame === 'string' && m.minigame.trim() ? m.minigame.trim() : 'default',
      outcomeText: m.outcomeText || null,   // texte ou { success, fail }
      funnyNote: m.funnyNote || '',
      position: hasPos ? { x: +m.position.x, z: +m.position.z } : { x: p.x, z: p.z },
    });
  }
  return out;
}

async function loadMemories(ui) {
  try {
    const res = await fetch('./data/memories.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return normalizeMemories(Array.isArray(data) ? data : data.memories);
  } catch (err) {
    console.error(err);
    if (location.protocol !== 'file:') {
      ui.showError(`Impossible de lire <code>data/memories.json</code> (${String(err.message || err)}).<br>` +
        'Vérifie la syntaxe JSON (virgules, guillemets). Le jeu démarre avec des souvenirs d’exemple.');
    }
    return normalizeMemories([]);
  }
}

/* ───────────────────── Initialisation ───────────────────── */
async function init() {
  loadSave();

  const audio = new AmbientAudio();
  audio.volume = state.volume;
  audio.muted = state.muted;

  let game = null; // rempli plus bas, utilisé par les callbacks de l'UI
  const ui = new UI({
    onStart: () => game?.start(),
    onToggleJournal: (force) => game?.toggleJournal(force),
    onToggleMute: () => game?.toggleMute(),
    onVolume: (v) => { state.volume = v; audio.setVolume(v); if (state.muted && v > 0) game?.toggleMute(); save(); },
    onPrompt: () => game?.interact(),
    onCloseMemory: () => game?.closeMemory(),
    onNavMemory: (d) => game?.navMemory(d),
    onReadMemory: (id) => game?.readMemory(id),
    onSailToLantern: (id) => game?.sailToLantern(id),
    onTeleportChapter: (id) => game?.teleportToChapter(id),
    onMapClick: (x, z) => game?.teleportTo(x, z),
    onReset: () => game?.reset(),
    onReplayFinale: () => game?.replayFinale(),
    onCloseFinale: () => game?.closeFinale(),
    onVideoPlaying: (on) => audio.duck(on),
    onReplayMiniGame: () => game?.replayMiniGame(),
    onDebugNext: () => game?.debugNext(),
    onDebugAll: () => game?.debugAll(),
  });
  ui.setMuted(state.muted);
  document.getElementById('volume').value = String(state.volume);

  const memories = await loadMemories(ui);
  const runner = new MiniGameRunner({ audio });

  /* Rendu : pixel ratio plafonné (gros gain sur écrans HiDPI + iGPU), pas d'ombres */
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 9, 45);

  const glowTex = makeGlowTexture();
  const world = new World(scene, { lanternPositions: memories.map((m) => m.position) });
  world.setPixelRatio(pixelRatio);
  const boat = new Boat(scene, glowTex);
  const lanterns = new LanternField(scene, memories, glowTex);
  const rings = new GuideRings(scene, glowTex);

  // Marqueur de destination (clic sur l'eau)
  const markerGeo = new THREE.RingGeometry(0.7, 0.9, 28);
  markerGeo.rotateX(-Math.PI / 2);
  const marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({
    color: '#ffd9a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  marker.position.y = 0.06;
  scene.add(marker);

  // Restaurer la progression
  for (const it of lanterns.items) if (state.lit.has(it.memory.id)) lanterns.setLitInstant(it);
  const allLitAtLoad = lanterns.litCount === TOTAL_LANTERNS;
  if (allLitAtLoad) world.skyMat.uniforms.uFinale.value = 1;
  ui.setCount(lanterns.litCount);
  audio.progress = lanterns.litCount / TOTAL_LANTERNS;

  /* ───── Raycasting (clic / survol) ───── */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  const setNdc = (x, y) => ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  const pickLantern = () => {
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(lanterns.pickables, false)[0];
    return hit ? hit.object.userData.item : null;
  };

  const rig = new CameraRig(camera, canvas, {
    onTap: (x, y) => {
      if (state.mode !== 'play') return;
      setNdc(x, y);
      const item = pickLantern();
      if (item) {
        if (item.lit) { game.readMemory(item.memory.id, false); return; }
        const d = Math.hypot(item.root.position.x - boat.position.x, item.root.position.z - boat.position.z);
        if (d < INTERACT_RADIUS + 3) game.activate(item);
        else {
          boat.sailTo(item.root.position.x, item.root.position.z, 3.5);
          state.pendingLight = item;
          ui.toast(`Cap sur la lanterne n°${item.memory.id}`);
        }
        return;
      }
      if (raycaster.ray.intersectPlane(waterPlane, hitPoint)) {
        boat.sailTo(hitPoint.x, hitPoint.z, 1.2);
        state.pendingLight = null;
        marker.position.set(hitPoint.x, 0.06, hitPoint.z);
        marker.userData.life = 1;
      }
    },
  });
  // Curseur « main » au survol d'une lanterne
  let hoverThrottle = 0;
  canvas.addEventListener('pointermove', (e) => {
    if (state.mode !== 'play' || e.pointerType !== 'mouse' || performance.now() - hoverThrottle < 60) return;
    hoverThrottle = performance.now();
    setNdc(e.clientX, e.clientY);
    canvas.classList.toggle('hovering', !!pickLantern());
  });

  /* ───── Clavier ───── */
  const keys = new Set();
  const MOVE = {
    forward: ['KeyW', 'ArrowUp'],      // e.code = position physique : Z sur AZERTY = KeyW
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],       // Q sur AZERTY = KeyA
    right: ['KeyD', 'ArrowRight'],
  };
  const pressed = (list) => list.some((k) => keys.has(k));
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (runner.active) return; // le mini-jeu gère ses propres touches (Échap = passer)
    const k = e.key.toLowerCase();
    if (e.code === 'Escape' || k === 'escape') {
      if (ui.memoryOpen) game.closeMemory();
      else if (ui.journalOpen) game.toggleJournal(false);
      else if (ui.finaleOpen) game.closeFinale();
      else ui.toggleHelp(false);
      return;
    }
    if (state.mode === 'card' && (k === 'arrowleft' || k === 'arrowright') && state.readFromJournal) {
      game.navMemory(k === 'arrowleft' ? -1 : 1);
      return;
    }
    if (state.mode !== 'play') return;
    if (Object.values(MOVE).flat().includes(e.code)) { keys.add(e.code); e.preventDefault(); }
    if (k === 'e' || e.code === 'Space' || (e.code === 'Enter' && !(document.activeElement instanceof HTMLButtonElement))) {
      e.preventDefault();
      document.activeElement?.blur?.();
      game.interact();
    } else if (k === 'j') game.toggleJournal();
    else if (k === 'm') game.toggleMute();
    else if (k === 'h' || k === '?') ui.toggleHelp();
    else if (DEBUG && k === 'l') game.debugNext();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  const vol = document.getElementById('volume');
  vol.addEventListener('change', () => vol.blur());

  /* ───── Redimensionnement ───── */
  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);

  /* ───────────────────── Logique de jeu ───────────────────── */
  const chapterProgress = () => CHAPTERS.map((ch) => {
    const items = memories.filter((m) => m.chapter === ch.id);
    return items.every((m) => state.lit.has(m.id));
  });
  const activeSegment = () => {
    const done = chapterProgress();
    const i = done.findIndex((d) => !d);
    return i; // segment i mène au chapitre i+1 ; -1 = tout est allumé
  };
  let finaleTimers = [];

  game = {
    start() {
      if (state.mode !== 'intro') return;
      audio.start().then(() => audio.setProgress(lanterns.litCount / TOTAL_LANTERNS));
      ui.hideIntro();
      state.mode = 'play';
      rig.cinematic = null;
      if (state.lit.size === 0) {
        ui.toggleHelp(true);
        setTimeout(() => ui.toggleHelp(false), 16000);
      }
      if (DEBUG) ui.showDebug();
    },

    /** Touche E / bouton d'invite : joue l'anecdote de la lanterne la plus proche. */
    interact() {
      if (state.mode !== 'play') return;
      const { item, dist } = lanterns.nearestUnlit(boat.position);
      if (item && dist < INTERACT_RADIUS) this.activate(item);
    },

    /**
     * Lance le mini-jeu d'une lanterne (personnalisé ou de secours) et résout
     * { result, text }. Ne rejette jamais : en cas de pépin, on allume quand même.
     */
    async playMiniGame(memory, replay = false) {
      try {
        const { def, fallback } = await loadMiniGame(memory.minigame);
        return await runner.run(def, memory, { replay, fallback });
      } catch (err) {
        console.error('[mini-jeux] erreur pendant le mini-jeu', err);
        return { result: 'skipped', text: '' };
      }
    },

    _recordResult(id, outcome) {
      const rank = { success: 3, fail: 2, skipped: 1 };
      const prev = state.results[id];
      if (!prev || rank[outcome.result] > rank[prev]) state.results[id] = outcome.result;
      if (outcome.text) state.outcomes[id] = outcome.text;
      save();
    },

    /** Lanterne éteinte activée : mini-jeu → allumage → envol → carte récapitulative. */
    async activate(item) {
      if (item.lit || state.mode !== 'play') return;
      state.mode = 'minigame';
      state.pendingLight = null;
      boat.cancelAutopilot();
      ui.showPrompt(null);
      ui.compass(0, 0, false);
      const outcome = await this.playMiniGame(item.memory, false);
      this._recordResult(item.memory.id, outcome);
      state.mode = 'play';
      this.light(item);
    },

    light(item) {
      if (item.lit || state.mode !== 'play') return;
      lanterns.ignite(item);
      state.lit.add(item.memory.id);
      state.pendingLight = null;
      save();
      const n = lanterns.litCount;
      ui.setCount(n, true);
      ui.showPrompt(null);
      audio.chime(item.memory.id);
      audio.setProgress(n / TOTAL_LANTERNS);
      boat.cancelAutopilot();
      boat.celebrate();
      state.mode = 'lighting';
      state.focusItem = item;
      setTimeout(() => {
        if (state.mode !== 'lighting') return;
        state.readFromJournal = false;
        state.mode = 'card';
        this._openCard(item.memory, { mode: 'new', hasPrev: false, hasNext: false });
      }, 1500);
    },

    _openCard(m, opts) {
      state.cardMemory = m;
      state.cardOpts = opts;
      ui.openMemory(m, { ...opts, result: state.results[m.id], outcome: state.outcomes[m.id] });
    },

    /** Bouton « Rejouer l'anecdote » de la carte souvenir. */
    async replayMiniGame() {
      const m = state.cardMemory;
      if (!m || state.mode !== 'card') return;
      ui.closeMemory();
      state.mode = 'minigame';
      const outcome = await this.playMiniGame(m, true);
      if (outcome.result !== 'skipped') this._recordResult(m.id, outcome);
      state.mode = 'card';
      this._openCard(m, state.cardOpts || { mode: 'new', hasPrev: false, hasNext: false });
    },

    /** Test rapide depuis la console : __lanternes.game.testMiniGame('semoule_nappe') */
    async testMiniGame(id) {
      const m = memories.find((x) => x.minigame === id) || { ...memories[0], minigame: id };
      const prev = state.mode;
      state.mode = 'minigame';
      const r = await this.playMiniGame(m, true);
      state.mode = prev;
      return r;
    },

    closeMemory() {
      if (!ui.memoryOpen) return;
      ui.closeMemory();
      state.focusItem = null;
      state.cardMemory = null;
      if (state.readFromJournal) {
        state.mode = 'play';
        this.toggleJournal(true);
        return;
      }
      state.mode = 'play';
      if (lanterns.litCount === TOTAL_LANTERNS && !state.finaleSeen) setTimeout(() => this.startFinale(), 1200);
    },

    readMemory(id, fromJournal = true) {
      const lit = memories.filter((m) => state.lit.has(m.id));
      const idx = lit.findIndex((m) => m.id === id);
      if (idx < 0) return;
      if (ui.journalOpen) ui.closeJournal();
      state.readList = lit;
      state.readIndex = idx;
      state.readFromJournal = fromJournal;
      state.mode = 'card';
      this._showRead();
    },
    _showRead() {
      const m = state.readList[state.readIndex];
      this._openCard(m, { mode: 'read', hasPrev: state.readIndex > 0, hasNext: state.readIndex < state.readList.length - 1 });
    },
    navMemory(d) {
      const i = state.readIndex + d;
      if (i < 0 || i >= state.readList.length) return;
      state.readIndex = i;
      this._showRead();
    },

    toggleJournal(force) {
      const open = force ?? !ui.journalOpen;
      if (open) {
        if (state.mode !== 'play') return;
        state.mode = 'journal';
        ui.openJournal(memories, state.lit, state.finaleSeen, state.results);
        drawMap();
      } else if (ui.journalOpen) {
        ui.closeJournal();
        state.mode = 'play';
      }
    },

    toggleMute() {
      state.muted = !state.muted;
      audio.setMuted(state.muted);
      ui.setMuted(state.muted);
      save();
    },

    sailToLantern(id) {
      const it = lanterns.items[id - 1];
      this.toggleJournal(false);
      boat.sailTo(it.root.position.x, it.root.position.z, 3.5);
      state.pendingLight = it;
      ui.toast(`Cap sur la lanterne n°${id}`);
    },

    /** Téléportation douce (fondu) vers un point du lac. */
    teleportTo(x, z, heading) {
      // si on vise une île, on se pose sur son rivage
      for (const c of world.colliders) {
        const d = Math.hypot(x - c.x, z - c.z);
        if (d < c.r + 2) { const k = (c.r + 3) / (d || 1); x = c.x + (x - c.x) * k; z = c.z + (z - c.z) * k; }
      }
      if (heading === undefined) {
        const { item } = lanterns.nearestUnlit({ x, z });
        heading = item ? Math.atan2(item.root.position.x - x, item.root.position.z - z) : boat.heading;
      }
      this.toggleJournal(false);
      state.mode = 'teleport';
      ui.fadeThrough(() => {
        boat.teleport(x, z, heading);
        rig.snap(boat);
        state.mode = 'play';
      });
    },

    teleportToChapter(chId) {
      const ch = CHAPTERS[chId - 1];
      const its = lanterns.items.filter((it) => it.memory.chapter === chId);
      const target = its.find((it) => !it.lit) || its[0];
      const lp = target.root.position;
      const ox = lp.x - ch.center.x, oz = lp.z - ch.center.z;
      const ol = Math.hypot(ox, oz) || 1;
      const x = lp.x + (ox / ol) * 7, z = lp.z + (oz / ol) * 7;
      this.teleportTo(x, z, Math.atan2(lp.x - x, lp.z - z));
    },

    startFinale() {
      if (state.mode === 'finale') return;
      finaleTimers.forEach(clearTimeout);
      state.mode = 'finale';
      state.finaleSeen = true;
      save();
      ui.showPrompt(null);
      ui.compass(0, 0, false);
      boat.cancelAutopilot();
      const f = boat.forward;
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3(-f.z, 0, f.x);
      const center = boat.position.clone().addScaledVector(f, 75).addScaledVector(up, 36);
      lanterns.startFormation(digitTargets(center, right, 10));
      rig.cinematic = {
        pos: boat.position.clone().addScaledVector(f, -9).addScaledVector(up, 3.2),
        look: center.clone().addScaledVector(up, -6),
        speed: 0.55,
      };
      audio.setProgress(1);
      finaleTimers = [
        setTimeout(() => audio.finale(), 2500),
        setTimeout(() => ui.showFinale(), 8500),
      ];
    },
    replayFinale() {
      this.toggleJournal(false);
      setTimeout(() => this.startFinale(), 400);
    },
    closeFinale() {
      if (!ui.finaleOpen) return;
      ui.hideFinale();
      rig.cinematic = null;
      state.mode = 'play';
    },

    reset() {
      finaleTimers.forEach(clearTimeout);
      lanterns.items.forEach((it) => lanterns.reset(it));
      state.lit.clear();
      state.results = {};
      state.outcomes = {};
      state.finaleSeen = false;
      state.lastChapter = 0;
      save();
      ui.setCount(0);
      audio.setProgress(0);
      world.skyMat.uniforms.uFinale.value = 0;
      this.toggleJournal(false);
      this.teleportTo(WORLD.start.x, WORLD.start.z, WORLD.start.heading);
    },

    // Outils de test : ajoute ?debug à l'URL
    debugNext() {
      if (state.mode !== 'play') return;
      const { item } = lanterns.nearestUnlit(boat.position);
      if (item) this.light(item);
    },
    debugAll() {
      if (state.mode !== 'play') return;
      for (const it of lanterns.items) if (!it.lit) { lanterns.setLitInstant(it); state.lit.add(it.memory.id); }
      save();
      ui.setCount(TOTAL_LANTERNS, true);
      this.startFinale();
    },
  };

  function drawMap() {
    ui.drawMap({
      islands: world.islands,
      lanterns: lanterns.items.map((it) => ({ x: it.root.position.x, z: it.root.position.z, lit: it.lit })),
      boat: { x: boat.position.x, z: boat.position.z, heading: boat.heading },
      rings: rings.rings,
    });
  }

  /* ───────────────────── Boucle principale ───────────────────── */
  const clock = new THREE.Clock();
  const noInput = { throttle: 0, steer: 0 };
  const input = { throttle: 0, steer: 0 };
  let t = 0;
  let perf = { acc: 0, n: 0, warm: 0 };
  let mapTick = 0;

  function frame() {
    requestAnimationFrame(frame);
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    const mode = state.mode;
    // Mini-jeu en cours : la 3D est en pause (le dernier rendu reste affiché sous le voile)
    if (mode === 'minigame') { audio.update(t); return; }
    t += dt;

    // Entrées
    input.throttle = (pressed(MOVE.forward) ? 1 : 0) - (pressed(MOVE.back) ? 1 : 0);
    input.steer = (pressed(MOVE.right) ? 1 : 0) - (pressed(MOVE.left) ? 1 : 0);
    const frozen = mode !== 'play';
    boat.lookUp = mode === 'lighting' || mode === 'card' || mode === 'finale' ? 1 : 0;
    boat.update(dt, t, mode === 'play' ? input : noInput, world.colliders, frozen && mode !== 'teleport');

    // Caméra
    if (mode === 'intro' || mode === 'loading') {
      const a = t * 0.05;
      rig.cinematic = {
        pos: new THREE.Vector3(WORLD.start.x + Math.sin(a) * 18, 7 + Math.sin(t * 0.2) * 1.5, WORLD.start.z + 14 + Math.cos(a) * 6),
        look: new THREE.Vector3(0, 4, -30),
        speed: 0.6,
      };
    }
    rig.focus = (mode === 'lighting' || mode === 'card') && state.focusItem ? lanterns.worldPosition(state.focusItem) : null;
    rig.update(dt, boat);

    // Lanternes, anneaux, monde
    lanterns.update(dt, t);
    const crossed = rings.update(dt, t, boat.position, activeSegment());
    if (crossed && mode === 'play') {
      boat.boost(5);
      audio.ringNote(crossed.order);
    }
    world.update(t, camera.position, boat.position, 0.9, lanterns.waterGlows(camera.position, MAX_WATER_GLOWS, t));
    if (state.finaleSeen && world.skyMat.uniforms.uFinale.value < 1) {
      world.skyMat.uniforms.uFinale.value = Math.min(1, world.skyMat.uniforms.uFinale.value + dt * 0.12);
    }
    world.starMat.uniforms.uBoost.value = mode === 'finale' ? Math.min(1, world.starMat.uniforms.uBoost.value + dt * 0.3)
      : Math.max(0, world.starMat.uniforms.uBoost.value - dt * 0.3);

    // Marqueur de destination
    if (marker.userData.life > 0) {
      marker.userData.life = boat.target ? Math.max(0.35, marker.userData.life - dt * 0.4) : marker.userData.life - dt * 1.5;
      marker.material.opacity = Math.max(0, marker.userData.life) * 0.6;
      marker.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
    }

    // Interactions de proximité (mode exploration)
    if (mode === 'play') {
      const { item, dist } = lanterns.nearestUnlit(boat.position);
      ui.showPrompt(item && dist < INTERACT_RADIUS ? `Jouer l'anecdote n°${item.memory.id}` : null);
      if (item && dist < PREFETCH_RADIUS) ui.prefetch(item.memory);
      // pilote automatique arrivé à une lanterne cliquée → on l'allume
      if (state.pendingLight && !boat.target) {
        const p = state.pendingLight.root.position;
        const d = Math.hypot(p.x - boat.position.x, p.z - boat.position.z);
        if (d < INTERACT_RADIUS && !state.pendingLight.lit) game.activate(state.pendingLight);
        state.pendingLight = null;
      }
      // Boussole vers la lanterne éteinte la plus proche
      if (item && dist > 16) {
        const target = Math.atan2(item.root.position.x - camera.position.x, item.root.position.z - camera.position.z);
        ui.compass(angleDiff(target, rig.yaw), dist, true);
      } else ui.compass(0, 0, false);
      // Entrée dans un chapitre → bannière
      let inside = 0;
      for (const ch of CHAPTERS) {
        if (Math.hypot(boat.position.x - ch.center.x, boat.position.z - ch.center.z) < ringRadius(ch) + 9) inside = ch.id;
      }
      if (inside && inside !== state.lastChapter) ui.chapterBanner(CHAPTERS[inside - 1]);
      if (inside) state.lastChapter = inside;
    } else if (mode !== 'journal') {
      ui.showPrompt(null);
      ui.compass(0, 0, false);
    }

    if (mode === 'journal' && ++mapTick % 4 === 0) drawMap();

    audio.update(t);
    renderer.render(scene, camera);

    // Qualité adaptative : si on passe durablement sous ~40 i/s, on baisse la résolution interne
    // (on ignore les frames > 200 ms : onglet en arrière-plan / navigateur qui bride l'animation)
    if (mode !== 'intro' && mode !== 'loading' && raw < 0.2) {
      perf.warm += raw;
      if (perf.warm > 4) {
        perf.acc += raw;
        perf.n++;
        if (perf.acc > 3) {
          const avg = perf.acc / perf.n;
          if (avg > 0.025 && pixelRatio > 0.75) {
            pixelRatio = Math.max(0.75, pixelRatio - 0.25);
            renderer.setPixelRatio(pixelRatio);
            world.setPixelRatio(pixelRatio);
            console.info(`[55 lanternes] qualité adaptée : pixelRatio = ${pixelRatio}`);
          }
          perf.acc = 0;
          perf.n = 0;
        }
      }
    }
  }

  rig.snap(boat);
  state.mode = 'intro';
  ui.ready(lanterns.litCount);
  frame();

  // Accès console pour bidouiller : window.__lanternes
  window.__lanternes = { state, boat, lanterns, world, rings, audio, game, camera, renderer, runner, memories };
}

init().catch((err) => {
  console.error(err);
  const e = document.getElementById('intro-error');
  if (e) {
    e.hidden = false;
    e.textContent = 'Le jeu n’a pas pu démarrer : ' + (err?.message || err) + ' (WebGL est-il activé dans le navigateur ?)';
  }
});

/**
 * Banc de test des mini-jeux, sans navigateur (Node ≥ 20).
 *
 *   node tools/test-minigames.mjs                 → teste tous les mini-jeux du registre
 *   node tools/test-minigames.mjs fil_barbele …   → seulement ceux-là
 *   node tools/test-minigames.mjs --verbose       → détail par stratégie
 *
 * Chaque jeu est joué des centaines de fois par des « joueurs robots » (ne rien faire,
 * marteler, maintenir, jouer au hasard, cliquer partout…) avec un faux canvas qui
 * signale les exceptions et les coordonnées NaN/Infinity.
 * Un robot dédié peut être écrit dans tools/bots/<id>.mjs :
 *   export default function bot(state, t, api) → { press, hold, left, right, up, down, pointer: {x, y, down} }
 * (state = objet `state` renvoyé par create(), si le jeu l'expose).
 *
 * Critères : aucune erreur, aucun NaN, le jeu se termine, on peut GAGNER et PERDRE.
 */
import { register } from 'node:module';
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

// three.js n'est pas nécessaire ici : on le remplace par un module vide.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return { url: 'data:text/javascript,' + encodeURIComponent(
    'class S { constructor(){} set(){return this} copy(){return this} };' +
    'export const Vector3=S, Group=S, Color=S, Mesh=S, MeshLambertMaterial=S, MeshBasicMaterial=S, Object3D=S, Quaternion=S, Euler=S, Matrix4=S;' +
    'export const SphereGeometry=S, BoxGeometry=S, CylinderGeometry=S, ConeGeometry=S, BufferGeometry=S, CapsuleGeometry=S, TorusGeometry=S, DoubleSide=2, MathUtils={};'), shortCircuit: true };
  return next(spec, ctx);
}`));

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 960, H = 540, DT = 1 / 60;

/* ───── faux canvas ───── */
let bad = [];
function fakeCtx(label) {
  const grad = { addColorStop() {} };
  const special = {
    measureText: (s) => ({ width: String(s).length * 12, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }),
    createLinearGradient: () => grad, createRadialGradient: () => grad, createConicGradient: () => grad,
    createPattern: () => ({}), getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    isPointInPath: () => false, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), getLineDash: () => [],
  };
  const props = { canvas: null };
  return new Proxy(props, {
    get(o, k) {
      if (k in special) return special[k];
      if (k in o) return o[k];
      if (typeof k === 'symbol') return undefined;
      return (...args) => {
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) { bad.push(`${label}.${k}(${args.map(String).join(', ')})`); break; }
      };
    },
    set(o, k, v) { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(`${label}.${String(k)} = ${v}`); o[k] = v; return true; },
  });
}
function fakeCanvas() { const c = { width: W, height: H, style: {} }; const g = fakeCtx('offscreen'); c.getContext = () => g; g.canvas = c; return c; }
globalThis.document ??= { createElement: () => fakeCanvas() };
globalThis.window ??= globalThis;
globalThis.Path2D ??= class { constructor() { return new Proxy(this, { get: (o, k) => (k in o ? o[k] : () => {}) }); } };
globalThis.performance ??= { now: () => Date.now() };

const { drawAvatar2D } = await import(pathToFileURL(path.join(ROOT, 'js/avatar.js')).href);
const { listMiniGames } = await import(pathToFileURL(path.join(ROOT, 'js/minigames.js')).href);

/* ───── entrées simulées (même interface que engine.js) ───── */
class SimInput {
  constructor() { this.keys = new Set(); this._pressed = new Set(); this.pointer = { x: W / 2, y: H / 2, down: false, pressed: false, released: false, active: false }; this.cursor = { x: W / 2, y: H / 2 }; this._held = {}; }
  pressed(n = 'action') { return this._pressed.has(n); }
  held(n = 'action') { return n === 'action' ? !!this._held.action || this.pointer.down : !!this._held[n]; }
  axis(w = 'x') { return w === 'x' ? (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0) : (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0); }
  apply(c) {
    // c = { press, hold, left, right, up, down, pointer:{x,y,down} }
    for (const d of ['left', 'right', 'up', 'down']) { if (c[d] && !this._held[d]) this._pressed.add(d); this._held[d] = !!c[d]; }
    const wasHeld = !!this._held.action;
    this._held.action = !!c.hold;
    if (c.press || (c.hold && !wasHeld)) this._pressed.add('action');
    if (c.pointer) {
      const p = this.pointer;
      p.x = c.pointer.x; p.y = c.pointer.y; p.active = true; this.cursor.x = p.x; this.cursor.y = p.y;
      if (c.pointer.down && !p.down) { p.pressed = true; this._pressed.add('action'); }
      if (!c.pointer.down && p.down) p.released = true;
      p.down = !!c.pointer.down;
    }
  }
  endFrame() { this._pressed.clear(); this.pointer.pressed = false; this.pointer.released = false; }
}

/* ───── stratégies ───── */
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const STRATEGIES = {
  idle: () => () => ({}),
  mash: () => (s, t, f) => ({ press: f % 6 === 0 }),
  hold: () => () => ({ hold: true }),
  pulse: (r) => { const p = 0.3 + r() * 1.2; return (s, t) => ({ hold: (t % p) < p / 2 }); },
  random: (r) => { let c = {}; return () => { if (r() < 0.12) c = { press: r() < 0.5, hold: r() < 0.4, left: r() < 0.3, right: r() < 0.3, up: r() < 0.25, down: r() < 0.25 }; else c = { ...c, press: false }; return c; }; },
  arrows: (r) => { let c = {}; return () => { if (r() < 0.05) c = { left: r() < 0.5, right: r() < 0.5, up: r() < 0.4, down: r() < 0.4, hold: r() < 0.3 }; return { ...c, press: r() < 0.05 }; }; },
  clicker: (r) => { let x = r() * W, y = r() * H, d = false; return () => { if (r() < 0.08) { x = r() * W; y = r() * H; } d = r() < 0.15 ? !d : d; return { pointer: { x, y, down: d } }; }; },
  dragger: (r) => { let x = W / 2, y = H / 2, tx = r() * W, ty = r() * H; return () => { if (r() < 0.03) { tx = r() * W; ty = r() * H; } x += (tx - x) * 0.08; y += (ty - y) * 0.08; return { pointer: { x, y, down: true } }; }; },
};

function playOnce(def, makePolicy, seed, bot) {
  const r = rng(seed);
  const policy = bot ? null : makePolicy(r);
  let ended = null, t = 0;
  bad = [];
  const g = fakeCtx('g');
  const api = {
    W, H, get t() { return t; }, get timeLeft() { return Math.max(0, (def.duration || 10) - t); }, get ended() { return !!ended; },
    memory: { id: 0, title: def.title, caption: '', minigame: def.id },
    end: (success, text) => { if (!ended) ended = { success: !!success, text, at: t, by: 'end' }; },
    sfx: () => {}, avatar: (gg, o) => drawAvatar2D(gg, o), shake: () => {}, burst: (x, y) => { if (!Number.isFinite(x) || !Number.isFinite(y)) bad.push(`burst(${x}, ${y})`); },
    text: (gg, str, x, y) => { gg.fillText(str, x, y); }, roundRect: (gg, x, y, w, h) => { gg.rect(x, y, w, h); },
    rand: (a = 0, b = 1) => a + Math.random() * (b - a), clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, k) => a + (b - a) * k,
  };
  const game = def.create(api);
  game.draw(g); // aperçu de l'écran d'intro
  t = 0; ended = null;
  const game2 = def.create(api); // le moteur recrée le jeu au lancement
  const inp = new SimInput();
  const dur = def.duration || 10;
  let f = 0, endT = 0;
  for (;;) {
    if (!ended) {
      inp.apply(bot ? bot(game2.state, t, api) || {} : policy(game2.state, t, f));
      t += DT;
      game2.update(DT, inp);
      if (!ended && t >= dur) { const ok = game2.timeout ? !!game2.timeout() : false; if (!ended) ended = { success: ok, at: t, by: 'timeout' }; }
    } else {
      endT += DT;
      game2.update(DT, { ...inp, pressed: () => false, held: () => false, axis: () => 0, pointer: { ...inp.pointer, down: false, pressed: false } });
      if (endT > 1.4) break;
    }
    const ax = inp.axis('x'), ay = inp.axis('y');
    if (ax || ay) { inp.cursor.x = Math.max(0, Math.min(W, inp.cursor.x + ax * 520 * DT)); inp.cursor.y = Math.max(0, Math.min(H, inp.cursor.y + ay * 520 * DT)); }
    inp.endFrame();
    if (f % 2 === 0 || ended) game2.draw(g);
    f++;
    if (t > dur + 5) throw new Error('le jeu ne se termine pas');
  }
  return { ...ended, bad: bad.slice(0, 3) };
}

async function testGame(id, verbose) {
  const mod = await import(pathToFileURL(path.join(ROOT, `js/minigames/${id}.js`)).href);
  const def = mod.default;
  const problems = [];
  for (const k of ['id', 'title', 'instructions', 'controls', 'duration', 'create']) if (def[k] == null) problems.push(`champ « ${k} » manquant`);
  if (def.id !== id) problems.push(`id « ${def.id} » ≠ nom de fichier « ${id} »`);
  if (def.duration < 5 || def.duration > 15) problems.push(`durée ${def.duration}s hors de 5–15 s`);
  const botFile = path.join(ROOT, 'tools/bots', `${id}.mjs`);
  const bot = existsSync(botFile) ? (await import(pathToFileURL(botFile).href)).default : null;

  const tally = {};
  let wins = 0, fails = 0, runs = 0, errs = new Map(), nan = new Set(), times = [];
  const record = (name, res) => {
    runs++; res.success ? wins++ : fails++; times.push(res.at);
    (tally[name] ??= { w: 0, l: 0 })[res.success ? 'w' : 'l']++;
    res.bad.forEach((b) => nan.add(b));
  };
  const runs_per = { idle: 2, mash: 3, hold: 3, pulse: 25, random: 40, arrows: 25, clicker: 40, dragger: 20 };
  for (const [name, n] of Object.entries(runs_per)) {
    for (let i = 0; i < n; i++) {
      try { record(name, playOnce(def, STRATEGIES[name], i * 7919 + name.length, null)); }
      catch (e) { const k = `${name}: ${e.message}`; if (!errs.has(k)) errs.set(k, e.stack.split('\n').slice(0, 3).join(' | ')); }
    }
  }
  if (bot) for (let i = 0; i < 10; i++) {
    try { record('bot', playOnce(def, null, i, bot)); }
    catch (e) { const k = `bot: ${e.message}`; if (!errs.has(k)) errs.set(k, e.stack.split('\n').slice(0, 3).join(' | ')); }
  }
  if (errs.size) problems.push(...[...new Set(errs.values())].slice(0, 2).map((e) => 'ERREUR ' + e));
  if (nan.size) problems.push(...[...nan].slice(0, 4).map((b) => 'NaN ' + b));
  if (!wins) problems.push('aucune victoire trouvée (ajoute un robot dans tools/bots/' + id + '.mjs)');
  if (!fails) problems.push('aucune défaite trouvée');
  const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : '-';
  const ok = problems.length === 0;
  console.log(`${ok ? '✔' : '✘'} ${id.padEnd(22)} ${runs} parties · ${wins} gagnées / ${fails} perdues · fin moyenne ${avg}s${bot ? ' · robot' : ''}`);
  if (verbose) for (const [n, v] of Object.entries(tally)) console.log(`    ${n.padEnd(8)} ${v.w} G / ${v.l} P`);
  for (const p of problems) console.log('    → ' + p);
  return ok;
}

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const ids = args.filter((a) => !a.startsWith('--'));
const list = ids.length ? ids : listMiniGames();
let allOk = true;
for (const id of list) allOk = (await testGame(id, verbose)) && allOk;
process.exit(allOk ? 0 : 1);

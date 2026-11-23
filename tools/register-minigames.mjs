/**
 * Met à jour le REGISTRE de js/minigames.js à partir des ids passés en argument (ajout, sans doublon),
 * dans l'ordre des anecdotes de data/memories.json.
 *   node tools/register-minigames.mjs id1 id2 …     |   --all : tous les fichiers de js/minigames/ qui passent le format
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const file = 'js/minigames.js';
let src = readFileSync(file, 'utf8');
const m = src.match(/const REGISTRY = \{\n([\s\S]*?)\n\};/);
const current = [...m[1].matchAll(/^\s*([a-z0-9_]+):/gm)].map((x) => x[1]);
let add = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (process.argv.includes('--all')) add = readdirSync('js/minigames').filter((f) => /^[a-z0-9_]+\.js$/.test(f) && !['engine.js', 'people.js'].includes(f)).map((f) => f.slice(0, -3));
const order = JSON.parse(readFileSync('data/memories.json', 'utf8')).map((x) => x.minigame);
const ids = [...new Set([...current, ...add])].sort((a, b) => (a === 'default' ? -1 : b === 'default' ? 1 : order.indexOf(a) - order.indexOf(b)));
const body = ids.map((id) => `  ${id}: () => import('./minigames/${id}.js'),`).join('\n');
src = src.replace(m[0], `const REGISTRY = {\n${body}\n};`);
writeFileSync(file, src);
console.log(`${ids.length - 1} mini-jeux au registre (+ default).`);

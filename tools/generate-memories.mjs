#!/usr/bin/env node
/**
 * Génère (ou met à jour) data/memories.json.
 *
 *   node tools/generate-memories.mjs --positions-only  → garde tes textes, recalcule seulement les positions
 *   node tools/generate-memories.mjs --migrate         → garde tes textes, ajoute les champs manquants
 *                                                        (minigame, outcomeText, funnyNote)
 *
 * Les positions viennent de js/layout.js (le même code que le jeu) :
 * si tu changes les îles dans js/config.js, relance --positions-only.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeLanternPositions } from '../js/layout.js';
import { TOTAL_LANTERNS } from '../js/config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'data/memories.json');
const args = new Set(process.argv.slice(2));
const positions = computeLanternPositions();

const readList = () => {
  if (!existsSync(file)) throw new Error('data/memories.json introuvable');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return { data, list: Array.isArray(data) ? data : data.memories };
};

if (args.has('--positions-only')) {
  const { data, list } = readList();
  list.forEach((m) => {
    const p = positions[m.id - 1];
    if (p) { m.position = { x: p.x, z: p.z }; m.chapter = p.chapter; }
  });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`✔ Positions recalculées pour ${list.length} souvenirs.`);
  process.exit(0);
}

if (args.has('--migrate')) {
  const { data, list } = readList();
  let n = 0;
  list.forEach((m) => {
    if (m.minigame === undefined) { m.minigame = 'default'; n++; }
    if (m.outcomeText === undefined) m.outcomeText = null;
    if (m.funnyNote === undefined) m.funnyNote = '';
  });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`✔ Champs ajoutés (${n} souvenirs passés en mini-jeu « default »). Tes textes n’ont pas été modifiés.`);
  process.exit(0);
}

if (existsSync(file) && !args.has('--i-really-want-to-erase')) {
  console.log('data/memories.json contient les 55 vraies anecdotes : on ne le régénère plus.');
  console.log('Utilise --positions-only ou --migrate (ils gardent tes textes).');
  process.exit(1);
}

/* ─── Les anecdotes déjà écrites (avec leur mini-jeu) ─── */
const ANECDOTES = {
  1: {
    title: 'Les yaourts dans les poches du métro',
    minigame: 'yaourt_metro',
    caption: 'Ce jour-là, Papa est entré dans le métro avec un pot de yaourt dans chaque poche. Les portes se sont refermées pile sur lui… et sur les deux yaourts. Résultat : du yaourt partout, sur lui, sur les portes, et sans doute sur quelques voyageurs !',
    funnyNote: 'Depuis, les yaourts voyagent dans un sac. Ou directement dans le ventre.',
    outcomeText: {
      success: 'Il est monté dans la rame, digne, les deux yaourts intacts. Ce jour-là, l’histoire aurait été bien moins drôle…',
      fail: 'Les portes ont refermé leurs mâchoires sur les poches : yaourt sur le pantalon, sur les portes, sur les voisins. Exactement comme le vrai jour !',
    },
  },
  2: {
    title: 'La semoule sur la nappe',
    minigame: 'semoule_nappe',
    caption: 'En préparant le repas, Papa a renversé la sauce de la semoule sur la nappe. Sa solution de génie : verser la semoule par-dessus pour éponger… puis servir à table comme si de rien n’était.',
    funnyNote: 'Technique brevetée : le camouflage culinaire.',
  },
  3: {
    title: 'Le marteau sur le doigt',
    minigame: 'marteau_doigt',
    caption: 'Une séance de bricolage, un clou, un marteau… et un doigt au mauvais endroit. Ce jour-là, le marteau a choisi le doigt.',
    funnyNote: 'Le clou, lui, n’a jamais rien senti.',
  },
  4: {
    title: 'Le fil barbelé du verger',
    minigame: 'fil_barbele',
    caption: 'En traversant le verger à toute allure, Papa n’a pas vu le fil barbelé tendu à hauteur de visage. Il se l’est pris en pleine figure !',
    funnyNote: 'Score final : le verger 1 – Papa 0. Revanche prévue.',
  },
  5: {
    title: 'Le gâteau au bicarbonate',
    minigame: 'gateau_bicarbonate',
    caption: 'Pour faire un gâteau, Papa a mis 2 cuillères à SOUPE de bicarbonate de soude au lieu de 2 cuillères à CAFÉ. La pâte a gonflé… gonflé… et gonflé encore.',
    funnyNote: 'Une cuillère à soupe, c’est juste une cuillère à café qui a de l’ambition.',
  },
};

/* ─── Modèles pour les lanternes encore à écrire ─── */
const TITLES = [
  ["La maison d'enfance", 'Les premiers pas', 'Le vélo rouge', 'Chez les grands-parents', "L'école du village",
   'Le meilleur copain', "Les étés au bord de l'eau", 'Noël en famille', 'La cabane secrète', 'La première bêtise', "Le rêve d'enfant"],
  ['Les années lycée', 'Le premier concert', 'La bande d’amis', 'Le permis de conduire', 'Le premier job d’été',
   'Les années étudiantes', 'Le grand départ', 'La première voiture', 'Un été inoubliable', 'La passion de toujours', 'Les premières responsabilités'],
  ['La rencontre', 'Le premier rendez-vous', 'Le mariage', 'La première maison', 'Une naissance',
   'Les premiers mots', 'Les dimanches en famille', 'Les vacances à la mer', 'Les anniversaires', 'Les fous rires à table', 'Le cœur de la tribu'],
  ['Le premier vrai travail', 'Une grande fierté', 'Le voyage au bout du monde', 'Les amis de toujours', 'Le projet un peu fou',
   'Une épreuve surmontée', 'Le road-trip', 'Le bricolage du dimanche', 'Une rencontre marquante', 'La transmission', 'La passion du week-end'],
  ["Aujourd'hui", "Ce qu'il nous a appris", 'Sa recette fétiche', 'Son endroit préféré', 'Sa phrase culte',
   'Les moments simples', 'Ce qui le fait rire', 'Le regard vers demain', 'Nos plus beaux moments', 'Le mot de la famille', '55 ans de lumière'],
];
const CAPTIONS = [
  'Raconte ici l’anecdote : qui était là, ce qui s’est passé, et pourquoi on en rit (ou on en parle) encore aujourd’hui.',
  'Une anecdote, une phrase entendue ce jour-là, un détail qui fait sourire… Remplace ce texte par le tien.',
  'Écris quelques lignes simples, comme si tu la racontais au coin du feu.',
  'Ce souvenir mérite sa lanterne : décris le lieu, le moment, la chute de l’histoire.',
];

const memories = positions.slice(0, TOTAL_LANTERNS).map((p, i) => {
  const id = i + 1;
  const ci = p.chapter - 1;
  const k = i % 11;
  const a = ANECDOTES[id];
  return {
    id,
    chapter: p.chapter,
    title: a?.title ?? TITLES[ci][k],
    date: a?.date ?? '',
    type: 'image',
    media: '',                     // ex. "assets/media/souvenir-12.jpg" (facultatif)
    caption: a?.caption ?? CAPTIONS[id % CAPTIONS.length],
    minigame: a?.minigame ?? 'default',
    outcomeText: a?.outcomeText ?? null,
    funnyNote: a?.funnyNote ?? '',
    position: { x: p.x, z: p.z },
  };
});

writeFileSync(file, JSON.stringify(memories, null, 2) + '\n');
console.log(`✔ ${memories.length} souvenirs écrits dans data/memories.json (${Object.keys(ANECDOTES).length} anecdotes avec mini-jeu).`);

/**
 * ═══════════════════════════════════════════════════════════
 *  REGISTRE DES MINI-JEUX
 *
 *  Chaque entrée associe l'identifiant utilisé dans data/memories.json
 *  (champ "minigame") au fichier du mini-jeu. Les fichiers sont chargés
 *  à la demande (import dynamique) : seul le mini-jeu joué est téléchargé.
 *
 *  ➕ Ajouter un mini-jeu (par lots, au fil de l'eau) :
 *     1. copie js/minigames/_template.js → js/minigames/mon_id.js
 *     2. ajoute une ligne ci-dessous :  mon_id: () => import('./minigames/mon_id.js'),
 *     3. dans data/memories.json :      "minigame": "mon_id"
 *
 *  Tant qu'un identifiant est absent, vide, inconnu ou que son fichier plante,
 *  le mini-jeu de secours « default » est lancé : les 55 étapes restent jouables.
 * ═══════════════════════════════════════════════════════════
 */
const REGISTRY = {
  default: () => import('./minigames/default.js'),
  naissance_bouake: () => import('./minigames/naissance_bouake.js'),
  pioche_pilou: () => import('./minigames/pioche_pilou.js'),
  petards_margouillats: () => import('./minigames/petards_margouillats.js'),
  motocross_pilou: () => import('./minigames/motocross_pilou.js'),
  yaourt_metro: () => import('./minigames/yaourt_metro.js'),
  dessin_nu: () => import('./minigames/dessin_nu.js'),
  assiette_bulgare: () => import('./minigames/assiette_bulgare.js'),
  princesse_de_papa: () => import('./minigames/princesse_de_papa.js'),
  naissance_ylan: () => import('./minigames/naissance_ylan.js'),
  grigri_leboncoin: () => import('./minigames/grigri_leboncoin.js'),
  tendinite_20: () => import('./minigames/tendinite_20.js'),
  mami_jose: () => import('./minigames/mami_jose.js'),
  naissance_iordan: () => import('./minigames/naissance_iordan.js'),
  gateau_bicarbonate: () => import('./minigames/gateau_bicarbonate.js'),
  maman_de_selena: () => import('./minigames/maman_de_selena.js'),
  semoule_nappe: () => import('./minigames/semoule_nappe.js'),
  marteau_doigt: () => import('./minigames/marteau_doigt.js'),
  vanne_egr: () => import('./minigames/vanne_egr.js'),
  beaux_nenes: () => import('./minigames/beaux_nenes.js'),
  fil_barbele: () => import('./minigames/fil_barbele.js'),
  lasure_crotte: () => import('./minigames/lasure_crotte.js'),
  jean_yves_toilettes: () => import('./minigames/jean_yves_toilettes.js'),
  blague_premonitoire: () => import('./minigames/blague_premonitoire.js'),
  abeilles_levres: () => import('./minigames/abeilles_levres.js'),
  meuble_iordan: () => import('./minigames/meuble_iordan.js'),
};

/** true si un mini-jeu personnalisé existe pour cet identifiant. */
export function hasMiniGame(id) {
  return !!id && id !== 'default' && Object.prototype.hasOwnProperty.call(REGISTRY, id);
}

export function listMiniGames() {
  return Object.keys(REGISTRY);
}

/**
 * Charge la définition d'un mini-jeu ; retombe sur « default » en cas d'absence ou d'erreur.
 * @returns {Promise<{def: object, fallback: boolean}>}
 */
export async function loadMiniGame(id) {
  if (hasMiniGame(id)) {
    try {
      const mod = await REGISTRY[id]();
      const def = mod.default;
      if (def && typeof def.create === 'function') return { def, fallback: false };
      console.warn(`[mini-jeux] "${id}" n'exporte pas de définition valide → mini-jeu de secours.`);
    } catch (err) {
      console.warn(`[mini-jeux] impossible de charger "${id}" → mini-jeu de secours.`, err);
    }
  } else if (id && id !== 'default') {
    console.info(`[mini-jeux] "${id}" n'existe pas encore → mini-jeu de secours.`);
  }
  const mod = await REGISTRY.default();
  return { def: mod.default, fallback: true };
}

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

  // ── Lot 1 : anecdotes 1 à 5
  yaourt_metro: () => import('./minigames/yaourt_metro.js'),
  semoule_nappe: () => import('./minigames/semoule_nappe.js'),
  marteau_doigt: () => import('./minigames/marteau_doigt.js'),
  fil_barbele: () => import('./minigames/fil_barbele.js'),
  gateau_bicarbonate: () => import('./minigames/gateau_bicarbonate.js'),

  // ── Lot 2 : à venir…
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

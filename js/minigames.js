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
  course_tout_nu: () => import('./minigames/course_tout_nu.js'),
  singe_ami: () => import('./minigames/singe_ami.js'),
  mygale_evadee: () => import('./minigames/mygale_evadee.js'),
  voleur_promeneur: () => import('./minigames/voleur_promeneur.js'),
  pioche_pilou: () => import('./minigames/pioche_pilou.js'),
  petards_margouillats: () => import('./minigames/petards_margouillats.js'),
  fantome_placard: () => import('./minigames/fantome_placard.js'),
  ish_li_bedich: () => import('./minigames/ish_li_bedich.js'),
  theatre_oranges: () => import('./minigames/theatre_oranges.js'),
  motocross_pilou: () => import('./minigames/motocross_pilou.js'),
  truites_megeve: () => import('./minigames/truites_megeve.js'),
  spaghetti_bataille: () => import('./minigames/spaghetti_bataille.js'),
  trampoline_usa: () => import('./minigames/trampoline_usa.js'),
  malfrats_marseille: () => import('./minigames/malfrats_marseille.js'),
  yaourt_metro: () => import('./minigames/yaourt_metro.js'),
  dessin_nu: () => import('./minigames/dessin_nu.js'),
  pizzas_commandant: () => import('./minigames/pizzas_commandant.js'),
  infirmier_motard: () => import('./minigames/infirmier_motard.js'),
  reunion_soporifique: () => import('./minigames/reunion_soporifique.js'),
  chocolats_couettes: () => import('./minigames/chocolats_couettes.js'),
  assiette_bulgare: () => import('./minigames/assiette_bulgare.js'),
  mariage_14_juillet: () => import('./minigames/mariage_14_juillet.js'),
  requin_australie: () => import('./minigames/requin_australie.js'),
  casse_graffiti: () => import('./minigames/casse_graffiti.js'),
  naissance_selena: () => import('./minigames/naissance_selena.js'),
  princesse_de_papa: () => import('./minigames/princesse_de_papa.js'),
  naissance_ylan: () => import('./minigames/naissance_ylan.js'),
  grigri_leboncoin: () => import('./minigames/grigri_leboncoin.js'),
  gouteur_gateaux: () => import('./minigames/gouteur_gateaux.js'),
  tennis_levis: () => import('./minigames/tennis_levis.js'),
  tendinite_20: () => import('./minigames/tendinite_20.js'),
  mami_jose: () => import('./minigames/mami_jose.js'),
  naissance_iordan: () => import('./minigames/naissance_iordan.js'),
  operation_fesses: () => import('./minigames/operation_fesses.js'),
  candy_crush: () => import('./minigames/candy_crush.js'),
  gateau_bicarbonate: () => import('./minigames/gateau_bicarbonate.js'),
  maman_de_selena: () => import('./minigames/maman_de_selena.js'),
  semoule_nappe: () => import('./minigames/semoule_nappe.js'),
  marteau_doigt: () => import('./minigames/marteau_doigt.js'),
  vanne_egr: () => import('./minigames/vanne_egr.js'),
  beaux_nenes: () => import('./minigames/beaux_nenes.js'),
  fil_barbele: () => import('./minigames/fil_barbele.js'),
  fourrure_verger: () => import('./minigames/fourrure_verger.js'),
  pigeon_velo: () => import('./minigames/pigeon_velo.js'),
  lasure_crotte: () => import('./minigames/lasure_crotte.js'),
  jean_yves_toilettes: () => import('./minigames/jean_yves_toilettes.js'),
  blague_premonitoire: () => import('./minigames/blague_premonitoire.js'),
  police_peche: () => import('./minigames/police_peche.js'),
  savons_gourmands: () => import('./minigames/savons_gourmands.js'),
  abeilles_levres: () => import('./minigames/abeilles_levres.js'),
  meuble_iordan: () => import('./minigames/meuble_iordan.js'),
  calins_mami: () => import('./minigames/calins_mami.js'),
  michel_bestiole: () => import('./minigames/michel_bestiole.js'),
  patisseries_cachees: () => import('./minigames/patisseries_cachees.js'),
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

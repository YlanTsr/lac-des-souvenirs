/**
 * ─────────────────────────────────────────────────────────────
 *  Les 55 Lanternes — configuration générale
 *  C'est ici que tu personnalises les textes « hors souvenirs »
 *  (titre, chapitres, message final) et la géographie du lac.
 * ─────────────────────────────────────────────────────────────
 */

export const TOTAL_LANTERNS = 55;

/** Textes de l'écran d'accueil. */
export const INTRO = {
  title: 'Les 55 Lanternes',
  subtitle: 'Un voyage de nuit sur le lac des souvenirs',
  dedication: 'Pour les 55 ans de Papa',
};

/**
 * Les 5 chapitres = 5 îles. Chaque île accueille 11 lanternes en cercle.
 * - center : position de l'île dans le monde (x, z). L'axe -z est « le nord ».
 * - radius : rayon de l'île (les lanternes sont posées à radius + LANTERN_RING_OFFSET).
 * - color  : teinte d'accent du chapitre (carte souvenir, journal, carte).
 * - landmark : petit élément de décor unique posé au sommet de l'île.
 */
export const CHAPTERS = [
  { id: 1, roman: 'I',   name: "L'Enfance",             subtitle: 'De Bouaké aux premières bêtises',        center: { x: 0,   z: -34 },  radius: 12, color: '#ffcf8a', landmark: 'tree' },
  { id: 2, roman: 'II',  name: 'La Jeunesse',           subtitle: 'Études, aventures et coup de foudre',     center: { x: 74,  z: -82 },  radius: 13, color: '#ffb08a', landmark: 'lighthouse' },
  { id: 3, roman: 'III', name: "L'Étincelle",           subtitle: 'Un mariage et deux merveilles',        center: { x: 36,  z: -168 }, radius: 14, color: '#ff9fb4', landmark: 'house' },
  { id: 4, roman: 'IV',  name: 'La Tribu au complet',   subtitle: 'Papa à plein temps', center: { x: -56, z: -152 }, radius: 13, color: '#b9a8ff', landmark: 'arch' },
  { id: 5, roman: 'V',   name: 'Le Verger',             subtitle: 'Abeilles, Michel et autres surprises',           center: { x: -80, z: -64 },  radius: 14, color: '#9fe3ff', landmark: 'stele' },
];

/** Distance entre le rivage d'une île et son cercle de lanternes. */
export const LANTERN_RING_OFFSET = 10;

/** Géographie du lac et point de départ de la barque. */
export const WORLD = {
  lakeCenter: { x: -4, z: -92 },
  lakeRadius: 190,                       // au-delà, un courant doux ramène la barque
  start: { x: 0, z: 20, heading: Math.PI }, // heading : 0 = +z, PI = -z (vers la 1re île)
  seed: 55,                              // graine du décor (change-la pour un autre lac)
};

/** Scène finale, déclenchée quand les 55 lanternes sont allumées. */
export const FINALE = {
  title: 'Joyeux anniversaire, Papa',
  subtitle: '55 ans · 55 lanternes · une infinité de souvenirs',
  message:
    "Chaque lanterne est un moment de ta vie qui continue de nous éclairer.\n" +
    "Merci pour tout ce que tu nous as donné, appris et transmis.\n" +
    "Que la route devant toi soit aussi lumineuse que celle que tu as tracée.",
  signature: 'Avec tout notre amour ♥',
};

/** Clé de sauvegarde locale (progression dans le navigateur). */
export const SAVE_KEY = 'les55lanternes.v1';

/**
 * ═══════════════════════════════════════════════════════════
 *  MODÈLE DE MINI-JEU — copie ce fichier pour créer une nouvelle anecdote.
 *
 *  1. Copie : js/minigames/_template.js → js/minigames/mon_anecdote.js
 *  2. Registre : dans js/minigames.js ajoute
 *        mon_anecdote: () => import('./minigames/mon_anecdote.js'),
 *  3. Souvenir : dans data/memories.json mets  "minigame": "mon_anecdote"
 *
 *  Règles d'or :
 *   • 5 à 15 secondes, une seule action principale, compréhensible en 1 phrase ;
 *   • on ne bloque JAMAIS : réussi ou raté, la lanterne s'allume ;
 *   • l'échec est drôle et tendre (c'est souvent ce qui s'est vraiment passé !) ;
 *   • Canvas 2D uniquement, pas d'images lourdes : dessine avec des formes simples.
 *
 *  Zone de dessin : 960 × 540 (api.W × api.H), quelle que soit la taille de l'écran.
 * ═══════════════════════════════════════════════════════════
 */
export default {
  id: 'mon_anecdote',
  title: 'Titre affiché si le souvenir n’en a pas',
  instructions: 'Une phrase qui explique le but.',
  controls: 'Espace / clic : action',
  duration: 10,                 // secondes (le chrono s'affiche en haut)
  introExpression: 'smile',     // expression de Papa sur l'écran d'intro
  successTitle: 'Bien joué !',
  failTitle: 'Oups !',
  successText: 'Texte par défaut si réussi (data/memories.json → outcomeText peut le remplacer).',
  failText: 'Texte par défaut si raté.',

  /**
   * Appelé au lancement (et pour l'aperçu de l'intro). Crée l'état du jeu.
   * @param {object} api voir js/minigames/engine.js
   */
  create(api) {
    const { W, H } = api;
    const s = { score: 0 };

    return {
      /**
       * @param {number} dt secondes depuis la frame précédente
       * @param {object} input
       *   input.pressed()        → action déclenchée cette frame (Espace, Entrée, E, clic, tap)
       *   input.held()           → action maintenue
       *   input.held('left')     → flèche/touche maintenue ('left','right','up','down')
       *   input.axis('x' | 'y')  → -1..1
       *   input.pointer          → {x, y, down, pressed, released, active} en coordonnées 960×540
       *   input.cursor           → {x, y} suit la souris ou se déplace aux flèches
       */
      update(dt, input) {
        if (api.ended) return;
        if (input.pressed()) {
          s.score++;
          api.sfx('pop');                         // pop, catch, splat, boing, clang, ouch, beep, whoosh, grain, win, lose
          api.burst(W / 2, H / 2, { color: '#ffc685', n: 12 });
          if (s.score >= 5) api.end(true, 'Cinq sur cinq !');
        }
      },
      /** Si le temps s'écoule : true = réussi, false = raté. */
      timeout() { return s.score >= 3; },
      draw(g) {
        g.fillStyle = '#1c1940';
        g.fillRect(0, 0, W, H);
        api.avatar(g, { x: W / 2, y: 470, size: 70, expression: s.score > 2 ? 'happy' : 'smile' });
        api.text(g, `${s.score} / 5`, W / 2, 60, { size: 40, color: '#ffc685' });
      },
    };
  },
};

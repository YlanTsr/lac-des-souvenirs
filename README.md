# Les 55 Lanternes 🏮

Un jeu 3D poétique pour les 55 ans de Papa : une barque glisse de nuit sur un lac,
on allume 55 lanternes et chacune libère un souvenir (photo ou vidéo) avant de s'envoler.
Quand les 55 sont allumées, elles dessinent un grand « 55 » dans le ciel.

- **Three.js 0.160** chargé depuis un CDN, en modules ES : **aucun build**.
- Pensé pour un portable **sans carte graphique dédiée** : une seule lumière dynamique, zéro ombre,
  textures 100 % procédurales, décor en `InstancedMesh`. Résolution plafonnée à 1,5×, abaissée
  automatiquement sous ~40 i/s.
- Les médias ne sont **jamais** chargés au démarrage : seulement à l'ouverture d'une carte souvenir
  (et pré-chargement discret de la photo quand on approche à moins de 22 m).

## Arborescence

```
les-55-lanternes/
├── index.html              ← page unique (HUD, carte souvenir, journal, finale)
├── style.css
├── .nojekyll               ← dit à GitHub Pages de servir les fichiers tels quels
├── package.json            ← facultatif (raccourcis npm)
├── data/
│   └── memories.json       ← LES 55 SOUVENIRS (à personnaliser)
├── assets/
│   └── media/              ← tes photos / vidéos (souvenir-01.jpg … souvenir-55.mp4)
├── js/
│   ├── main.js             ← point d'entrée : boucle de jeu, états, entrées, sauvegarde
│   ├── config.js           ← textes, chapitres/îles, message final  ✏️
│   ├── layout.js           ← placement des lanternes et anneaux (utilisé aussi par l'outil)
│   ├── world.js            ← ciel, lune, eau (shader), îles, décor, lucioles
│   ├── boat.js             ← barque, lanterne de proue, physique, pilote auto, sillage
│   ├── camera.js           ← caméra de suivi lissée + regarder autour
│   ├── lanterns.js         ← les 55 lanternes (allumage, envol, formation « 55 »)
│   ├── rings.js            ← anneaux-guides (impulsion + note)
│   ├── audio.js            ← musique générative Web Audio
│   ├── ui.js               ← interface HTML, chargement paresseux des médias, carte du lac
│   ├── utils.js
│   ├── avatar.js           ← Papa : version 3D (barque) + dessin 2D (mini-jeux, cartes)  ✏️ LOOK
│   ├── minigames.js        ← REGISTRE des mini-jeux (id → fichier)                       ✏️
│   └── minigames/
│       ├── engine.js       ← moteur Canvas 2D (intro → jeu → résultat, entrées, particules)
│       ├── _template.js    ← modèle commenté pour créer une nouvelle anecdote
│       ├── default.js      ← mini-jeu de secours (lucioles) pour les anecdotes sans jeu
│       ├── people.js       ← les autres personnages (Mami, Maman, Pilou, Michel…)  ✏️ PEOPLE
│       └── <id>.js         ← les 55 mini-jeux (un par anecdote, id = champ "minigame")
└── tools/
    ├── serve.py            ← serveur local sans cache
    ├── gallery.html        ← galerie : aperçu en images de tous les mini-jeux
    ├── test-minigames.mjs  ← banc de test automatique (robots joueurs)
    ├── bots/               ← robots dédiés aux jeux d'adresse (pour le banc de test)
    ├── register-minigames.mjs ← ajoute des ids au registre js/minigames.js
    └── generate-memories.mjs ← recalcule les positions (--positions-only) sans toucher aux textes
```

## Tester en local

Les navigateurs bloquent les modules ES et `fetch()` quand on ouvre la page en double-cliquant
(`file://`). Il faut un petit serveur local, lancé **depuis le dossier du projet** :

```powershell
python tools/serve.py
```

puis ouvre <http://localhost:8080>. (`python -m http.server 8080` fonctionne aussi, mais garde
les fichiers en cache : fais Ctrl+F5 après une modification. Avec Node : `npx http-server -c-1`.)

**Outils de test** : ajoute `?debug` à l'adresse (<http://localhost:8080/?debug>) pour avoir les
boutons « Allumer la suivante » (touche `L`) et « Tout allumer (finale) ».
La progression est sauvegardée dans le navigateur. « Recommencer le voyage » (dans le journal) la remet à zéro.

## Ajouter les vraies photos et vidéos

1. Dépose tes fichiers dans `assets/media/` en respectant les noms de `data/memories.json`
   (`souvenir-01.jpg`, `souvenir-11.mp4`…), ou change le champ `media` pour pointer vers ton fichier.
2. Pour chaque entrée, modifie `title`, `date` (texte libre : « Été 1978 »), `caption`
   (les retours à la ligne `\n` sont respectés) et `type` (`"image"` ou `"video"`).
   Champ facultatif pour une vidéo : `"poster": "assets/media/souvenir-11-poster.jpg"`.
3. Tant qu'un fichier manque, la carte affiche un joli visuel « Photo à venir » avec le chemin attendu.

Conseils de poids (important pour GitHub Pages et les iGPU) :

| Type   | Format conseillé                                 | Poids visé          |
|--------|--------------------------------------------------|---------------------|
| Photo  | JPG ou WebP, 1600 px de large max               | 200–500 Ko          |
| Vidéo  | MP4 (H.264 + AAC), 720p, 30 à 60 s              | < 15 Mo (max 100 Mo/fichier sur GitHub) |

⚠️ Sur GitHub Pages, les noms de fichiers sont **sensibles à la casse** : `Souvenir-01.JPG` ≠ `souvenir-01.jpg`.

## Mini-jeux d'anecdotes

Chaque lanterne lance un mini-jeu de 5 à 15 s **avant** de s'allumer. Réussi, raté ou passé
(bouton « Passer » ou `Échap`), la lanterne s'allume toujours, la progression est sauvegardée,
puis la carte souvenir s'affiche avec un bouton « Rejouer l'anecdote ». Les anecdotes réussies
ont une ★ dans le journal. Pendant un mini-jeu, la 3D est en pause : seul un petit canvas 2D tourne.

Champs de `data/memories.json` :

| Champ         | Rôle                                                                                  |
|---------------|---------------------------------------------------------------------------------------|
| `minigame`    | identifiant du mini-jeu (`"yaourt_metro"`…) ou `"default"`. Inconnu → jeu de secours. |
| `outcomeText` | facultatif : texte de fin, soit `"…"`, soit `{ "success": "…", "fail": "…" }`.        |
| `funnyNote`   | facultatif : « mot de la fin » affiché sur la carte souvenir.                         |
| `media`       | facultatif : photo/vidéo. Vide → illustration de Papa (aucune requête réseau).        |

**Ajouter un mini-jeu** (par lots) :

1. copier `js/minigames/_template.js` en `js/minigames/mon_id.js` ;
2. ajouter `mon_id: () => import('./minigames/mon_id.js'),` dans `js/minigames.js` ;
3. mettre `"minigame": "mon_id"` dans `data/memories.json`.

Tester un mini-jeu sans naviguer : ouvre la console du navigateur (F12) et tape
`__lanternes.game.testMiniGame('mon_id')`.

Voir tous les jeux d'un coup : <http://localhost:8080/tools/gallery.html> (`?ids=a,b` pour filtrer).
Vérifier qu'aucun jeu ne plante et qu'on peut gagner comme perdre (des robots jouent des centaines de parties) :

```powershell
node tools/test-minigames.mjs
```

Tu as déjà modifié ton `memories.json` ? Ajoute les nouveaux champs sans toucher à tes textes :

```powershell
node tools/generate-memories.mjs --migrate
```

## L'avatar de Papa

`js/avatar.js` contient la version 3D (assis dans la barque, il rame, compense le roulis et lève les
bras quand une lanterne s'allume) et la version 2D dessinée (8 expressions, 5 poses). Les couleurs
(peau, cheveux, polo…) sont regroupées dans l'objet `LOOK` en haut du fichier.

## Personnaliser

- **Textes d'accueil, noms des chapitres, message final** : `js/config.js` (`INTRO`, `CHAPTERS`, `FINALE`).
- **Placer les lanternes** : chaque souvenir a une `position` `{x, z}`. Si tu la supprimes, le jeu la calcule
  tout seul (cercle autour de l'île du chapitre). Après avoir déplacé des îles dans `config.js`, recalcule
  toutes les positions sans toucher à tes textes :

  ```powershell
  node tools/generate-memories.mjs --positions-only
  ```

## Publier sur GitHub Pages

1. Crée un dépôt (ex. `les-55-lanternes`) et pousse tous les fichiers à la racine.
2. *Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`*.
3. Le jeu sera en ligne sur `https://<ton-pseudo>.github.io/les-55-lanternes/`. Tous les chemins sont relatifs (`./`),
   donc ça marche aussi dans un sous-dossier.

## Commandes

| Action                       | Clavier / souris                                   |
|------------------------------|----------------------------------------------------|
| Avancer / tourner            | `Z Q S D`, `W A S D` ou flèches                   |
| Aller quelque part           | clic sur l'eau (pilote automatique)                |
| Aller vers une lanterne      | clic sur la lanterne (elle s'allume à l'arrivée)   |
| Jouer l'anecdote (allumer)   | `E`, `Espace` ou le bouton qui apparaît            |
| Dans un mini-jeu             | `Espace` / clic / tap · flèches · `Échap` = passer |
| Regarder autour / zoom       | glisser la souris / molette                        |
| Journal et carte du lac      | `J` (clic sur la carte = s'y rendre)               |
| Son / aide / fermer          | `M` / `H` / `Échap`                                |

# CLAUDE.md — CLPS Lunar Mission Browser

Projet NASA Space Apps 2026, défi « CLPS Lunar Mission Browser ». Équipe de 4, hackathon les 14 et 15 novembre 2026, soumission visée le dimanche à 18 h (limite 23 h 59).
L'outil compare des sites d'atterrissage lunaires et des dates : position du Soleil et de la Terre par rapport au vrai horizon (relief LOLA), énergie solaire, liaison directe avec la Terre.
Le README (en anglais, pour les juges) décrit les fonctions ; ce fichier dit comment travailler dans le code.

## Règles de l'équipe (à respecter strictement)

- Chaque personne travaille sur SA branche et ne modifie QUE ses fichiers :

  | Personne | Branche | Fichiers autorisés |
  |---|---|---|
  | A — calculs, données | `feat/engine` | `src/engine.js`, `src/terrain.js`, `data/`, `tools/`, `tests/` |
  | B — 3D, interface | `feat/ui` | `src/view3d.js`, `src/app.js`, `src/styles.css`, `src/index.html` |
  | C — API, déploiement, fusions | `feat/api` | `server/`, `cli.js`, `openapi.yaml`, `Dockerfile`, `.github/` |
  | D — pitch, soumission | `docs/pitch` | `README.md`, `AI_DISCLOSURE.md`, `docs/` |

- Si une tâche demande de modifier le fichier d'une autre personne : **s'arrêter et le dire**, ne pas le modifier.
- Ne jamais commiter sur `main`, ne jamais `git push --force`. Une Pull Request = une tâche (2 h de travail au maximum).
- Avant chaque commit : `npm test && npm run build`. Les deux doivent réussir.
- Avant de pousser : `git pull origin main` dans sa branche.
- Conflit sur `dist/` ou `package-lock.json` : `git checkout origin/main -- dist package-lock.json` puis `npm run build`.
- Ne pas renommer les champs de `siteSeries()` / `summarize()` / `conditionsAt()` (contrat moteur → interface) ni les champs JSON de l'API (`openapi.yaml`) sans accord de l'équipe.
- Interface en anglais par défaut, avec traduction française : toute nouvelle chaîne visible va dans les deux dictionnaires `I18N.en` et `I18N.fr` en haut de `src/app.js`.
- Pas de logo ni d'identité visuelle NASA (règle Space Apps pour le contenu fait avec une IA).

## Commandes

```bash
npm ci                 # dépendance unique : astronomy-engine
npm test               # engine + JPL Horizons + API (37 tests, < 30 s)
npm run build          # src/ + data/ -> dist/index.html (page autonome) et dist/artifact.html
npm start              # app + API sur http://localhost:8080
node cli.js help       # ligne de commande, mêmes paramètres que l'API
python tests/gpu_consistency.py   # optionnel : 3D (GPU) vs moteur, nécessite Playwright
```

`dist/` est généré : ne jamais l'éditer à la main, toujours modifier `src/` puis `npm run build`.

## Architecture

```
src/engine.js     Éphémérides et visibilité (Node + navigateur, aucune dépendance au DOM)
                  stateAt, buildGrid, siteSeries, summarize, conditionsAt, scenario,
                  windowList, landingDates, bestLandings, toICS, siteEvents
src/terrain.js    Relief LOLA compact + calcul d'horizon par lancer de rayons (Node + navigateur)
src/view3d.js     Vue 3D WebGL (three.js r128 via CDN), ombres calculées sur la carte graphique
src/app.js        Toute l'interface (onglets, graphiques canvas, scénarios, pédagogie, i18n)
src/styles.css    Jetons de couleur (thème clair + sombre) et mise en page
src/index.html    Gabarit ; build.js y injecte styles, données et scripts aux marqueurs /*__X__*/
server/core.js    Opérations de l'API (fonctions pures) ; server/server.js = HTTP ; cli.js = CLI
data/             sites.json (à la main), horizons.json + DEM compacts + basemap (générés par tools/)
tools/            Python : horizon_from_dem.py, make_assets.py, fetch_horizons_reference.py
tests/            engine.test.js, horizons.test.js (réf. JPL), api.test.js, gpu_consistency.py
```

Flux de données : `buildGrid` calcule une fois le Soleil, la Terre et le DSN pour toute la période ; `siteSeries` en déduit, pour un site, hauteur/azimut, horizon, et les états `lit`, `earthUp`, `dte` (liaison = Terre visible + antenne DSN), `ops` (énergie + liaison) ; `summarize` et `conditionsAt` en tirent les chiffres affichés.

## Conventions et pièges

- **Unités** : km dans engine.js et view3d.js, mètres dans terrain.js et les fichiers DEM. Angles en degrés côté API/affichage, radians en interne.
- **Repère lunaire** : modèle de rotation IAU (Astronomy Engine). X vers la Terre moyenne (longitude 0), Z vers le nord.
- **Azimut** : degrés depuis le nord, vers l'est. Masques d'horizon = 360 valeurs, une par degré.
- **Projection polaire** (terrain.js, DEM) : stéréographique sud, ligne 0 = +y (longitude 180), colonne 0 = −x (longitude 270).
- **Vue 3D** : scène = `(X, −Z − R, Y)` du repère lunaire (`toScene` / `fromScene` dans view3d.js). La physique utilise toujours les vraies altitudes ; l'étirement vertical est seulement visuel. Les shaders sont du GLSL ES 1.0 (boucles à borne constante).
- **Sites** : un site prédéfini a son horizon dans `data/horizons.json`. Ajouter un site = l'ajouter dans `data/sites.json` puis régénérer les horizons (les fichiers LOLA .IMG, ~1,1 Go, ne sont pas dans le dépôt ; voir README). `snap_m` seulement pour des coordonnées publiées arrondies, jamais pour un atterrisseur réel. Sans régénération, l'app utilise un horizon lisse (moins précis) : le signaler.
- **Validation** : ne pas modifier `tests/horizons_reference.json` à la main (référence JPL Horizons). Un test qui échoue après une modification du moteur = régression à corriger, pas un seuil à relâcher.
- **dist/artifact.html** : version pour claude.ai, sans boutons de téléchargement (retirés par build.js). Ne pas casser les ids `dlCsv` / `dlIcs`.
- **Stockage navigateur** : toujours dans un try/catch (`store.get` / `store.set` dans app.js).
- **Performances** : la vue 3D tourne sur des ordis portables ; ne pas augmenter la taille des textures de calcul (1024 max) ni le nombre de pas des rayons sans mesurer.

## Avant de dire « fini »

1. `npm test && npm run build` passent.
2. Pour une modification visible : ouvrir `dist/index.html` (ou `npm start`) et vérifier l'onglet concerné en anglais ET en français, thème clair ET sombre, et à 400 px de large.
3. Commit avec un message clair (`ui: …`, `engine: …`, `api: …`, `docs: …`), push sur sa branche, Pull Request vers `main`.
4. Si des chiffres du pitch changent (validation, pourcentages), le signaler à D : ils sont repris dans `README.md` et `docs/submission.md`.

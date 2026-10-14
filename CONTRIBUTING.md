# Travailler à 4 sur ce dépôt

## Qui possède quoi

| Rôle | Branche | Fichiers « à soi » |
|---|---|---|
| Calculs & données | `feat/engine` | `src/engine.js`, `tools/`, `data/`, `tests/` |
| Graphiques & interface | `feat/ui` | `src/app.js` (sections compare, timeline, sky, map), `src/styles.css` |
| Planificateur & UX | `feat/planner` | `src/app.js` (section `planner`), textes i18n |
| Pitch & soumission | `docs/pitch` | `README.md`, `docs/`, vidéo, slides |

Le contrat entre `engine.js` et l'interface, c'est la sortie de `siteSeries()` et
`summarize()`. On ne change pas leurs noms de champs sans prévenir l'équipe.

## Règles

1. `main` reste toujours fonctionnel (`npm test` passe, `dist/index.html` s'ouvre).
2. Petits commits, Pull Request vers `main` au moins toutes les 2 heures.
3. Avant de pousser : `git pull origin main`, puis `npm test && npm run build`.
4. Une personne valide les PR. Jamais de `git push --force` sur `main`.
5. `dist/` est régénéré par `npm run build` : en cas de conflit sur ce dossier, on
   prend la version de `main` et on relance le build.

```bash
git checkout -b feat/ui
# ... travail ...
git add -p && git commit -m "ui: tooltip on heatmap"
git pull origin main          # récupérer le travail des autres
npm test && npm run build
git push -u origin feat/ui    # puis ouvrir la Pull Request sur GitHub
```

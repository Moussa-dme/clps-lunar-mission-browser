# Travailler à 4 sur ce dépôt

Le plan complet du week-end (horaires, soumission, plan B) est dans le document « Plan du jour J ».
Les tâches du jour sont dans `docs/backlog.md` ; `scripts/create-issues.sh` en fait des tickets GitHub.

## Qui possède quoi

| Personne | Rôle | Branche | Fichiers « à soi » |
|---|---|---|---|
| A | Calculs et données | `feat/engine` | `src/engine.js`, `src/terrain.js`, `data/`, `tools/`, `tests/` |
| B | Vue 3D et interface | `feat/ui` | `src/view3d.js`, `src/app.js`, `src/styles.css`, `src/index.html` |
| C | API, déploiement, fusions | `feat/api` | `server/`, `cli.js`, `openapi.yaml`, `Dockerfile`, `.github/` |
| D | Pitch et soumission | `docs/pitch` | `README.md`, `AI_DISCLOSURE.md`, `docs/` |

Les contrats entre les parties : la sortie de `siteSeries()` / `summarize()` (moteur → interface)
et les noms des champs JSON de l'API (`openapi.yaml`). On ne les renomme pas sans prévenir.

## Règles

1. `main` reste toujours présentable : CI verte, `dist/index.html` s'ouvre.
2. Une Pull Request = une tâche, 2 h de travail au maximum.
3. Avant de pousser : `git pull origin main`, puis `npm test && npm run build`.
4. C valide les Pull Requests et pose l'étiquette `demo-ok` à chaque fusion réussie.
5. Jamais de commit direct ni de `git push --force` sur `main`.
6. Conflit sur `dist/` ou `package-lock.json` : `git checkout origin/main -- dist package-lock.json`, puis `npm run build`.

```bash
git switch main && git pull
git switch -c feat/ui
# ... travail ...
git add -p && git commit -m "ui: tooltip on heatmap"
git pull origin main
npm test && npm run build
git push -u origin feat/ui    # puis ouvrir la Pull Request sur GitHub
```

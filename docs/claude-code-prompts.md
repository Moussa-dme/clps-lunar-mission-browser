# Premier message à donner à Claude Code (samedi 9 h 10)

Chacun ouvre un terminal dans le dépôt, sur sa branche, lance `claude` et colle son message.
Ensuite, une tâche du backlog à la fois (`docs/backlog.md` ou les tickets GitHub).

## A — calculs et données (`feat/engine`)

> Lis CLAUDE.md et README.md. Je suis A, je travaille sur la branche feat/engine et je ne touche qu'aux fichiers de A. Lance npm test pour vérifier que tout passe, puis résume-moi en 5 lignes comment engine.js et terrain.js produisent les chiffres de l'onglet Compare. Ne modifie rien pour l'instant.

## B — vue 3D et interface (`feat/ui`)

> Lis CLAUDE.md et README.md. Je suis B, je travaille sur la branche feat/ui et je ne touche qu'aux fichiers de B. Lance npm test et npm run build, puis explique-moi comment app.js appelle view3d.js (initialisation, mise à jour à chaque pas de temps, visite guidée). Ne modifie rien pour l'instant.

## C — API, déploiement, fusions (`feat/api`)

> Lis CLAUDE.md et README.md. Je suis C, je travaille sur la branche feat/api et je ne touche qu'aux fichiers de C. Lance npm test, démarre le serveur avec npm start et interroge /api/health et /api/compare?sites=ptB,pns,dg2&days=30. Vérifie ensuite que .github/workflows/ci.yml déploie bien dist/ sur GitHub Pages. Ne modifie rien pour l'instant.

## D — pitch et soumission (`docs/pitch`)

> Lis CLAUDE.md, README.md, docs/submission.md et AI_DISCLOSURE.md. Je suis D, je travaille sur la branche docs/pitch et je ne touche qu'aux fichiers de D. Vérifie que les chiffres de docs/submission.md sont identiques à ceux du README (validation, tests, pourcentages) et liste les écarts. Ne modifie rien pour l'instant.

## Bonnes habitudes

- Une demande précise par tâche : « dans l'onglet Scenarios, ajoute un bouton +14 jours » plutôt que « améliore les scénarios ».
- Demander un plan avant les grosses modifications : « propose un plan, ne code pas encore ».
- Terminer chaque tâche par : « lance npm test et npm run build, puis fais le commit et pousse sur ma branche ».
- `/clear` entre deux tâches sans rapport, pour repartir d'un contexte propre.

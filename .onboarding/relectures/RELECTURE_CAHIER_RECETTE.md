# Relecture — CAHIER_RECETTE.md

## Verdict global
À corriger — le cahier est globalement solide et exploite bien les workflows amont, mais il introduit une décision de correction qui n'est pas prouvée par l'amont. Un plan de recette peut constater le bug ; il ne peut pas trancher seul la forme exacte de la correction.

## Problèmes bloquants
- `Scenario 4`, bloc `Correction attendue : remplacer "canceled" par "cancelled" ligne 23` : cette formulation impose une solution précise qui n'est pas prouvée par l'amont. Le matériau disponible prouve seulement un mismatch entre données (`"cancelled"`, `src/routes/orders.js:3-8`) et comparaison (`"canceled"`, `src/routes/orders.js:23`), pas que la correction doive forcément se faire côté comparaison. Le `CDC_FONCTIONNEL.md` du même lot garde d'ailleurs honnêtement la question ouverte dans `Indéterminable`, et `PROJECT_CONTEXT.md` liste aussi l'orthographe canonique comme décision en suspens. La recette doit rester au niveau du comportement attendu et du défaut observé, sans figer l'implémentation.

## Problèmes mineurs
- `Scenario 7 — Données statiques et redémarrage` : le scénario est testable et cohérent avec le code (`src/routes/users.js:3-7`, `src/routes/orders.js:3-8`), mais il n'est pas dérivé d'un workflow métier amont comme le sont les scénarios 1 à 6. Si tu le gardes, marque-le explicitement comme contrôle technique hors parcours métier pour éviter de donner l'impression qu'il provient d'un workflow utilisateur.

## Points vérifiés et corrects
- Les scénarios 1 à 6 recouvrent bien les chemins prouvés par `WORKFLOW_LIST_USERS.md`, `WORKFLOW_LIST_ORDERS.md` et le dispatcher `src/server.js:14-28`.
- Le bug `active=true` est correctement décrit comme défaut livré par le code actuel, avec preuve dans `src/routes/orders.js:22-24`, `README.md:9` et `test/orders.test.js:5-19`.
- Les cas limites `POST /users`, `GET /unknown`, `userId=abc` restent fidèles au comportement décrit dans `CDC_FONCTIONNEL.md` et visible dans `src/server.js:18-28`.

## Recommandations de correction
- Remplacer la phrase de `Scenario 4` qui prescrit une modification de code par une formulation purement fonctionnelle : comportement attendu, comportement actuel, preuve du mismatch, question ouverte sur la manière d'aligner le contrat.
- Si `Scenario 7` est conservé, le qualifier explicitement comme vérification technique de non-persistance dérivée du code, pas comme parcours métier issu d'un workflow.

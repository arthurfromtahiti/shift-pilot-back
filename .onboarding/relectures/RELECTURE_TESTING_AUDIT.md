# Relecture — TESTING_AUDIT.md

## Verdict global
Bon. L'audit tests est bien tenu: constats sourcés, preuve runtime sur `npm test`, et risques directement reliés à ce qui est effectivement couvert ou non.

## Problèmes bloquants
- Aucun bloquant identifié.

## Problèmes mineurs
- La recommandation `.onboarding/audits/TESTING_AUDIT.md:56` citant `supertest` n'est pas problématique, mais elle s'écarte légèrement de la philosophie zéro-dépendance du dépôt. Une alternative "simple `http.request`" existe déjà dans la même phrase; elle pourrait être mise en avant en premier.

## Points vérifiés et corrects
- Le dépôt ne contient bien qu'un seul fichier de test et une seule assertion (`test/orders.test.js:1-18`).
- L'échec de `node --test test/orders.test.js` sur l'assertion attendue a été vérifié, avec inclusion indue de l'id `2`.
- Le script `npm test` est effectivement cassé sous Node `v24.18.0` à cause de `node --test test/` dans `package.json:9`.
- L'absence de tests sur `listUsers`, `getUserById`, `isAdmin`, `listOrders`, `getOrdersByUser` et sur l'intégration HTTP est correctement sourcée.

## Recommandations de correction
- Aucune correction requise avant validation.

# Relecture — FUNCTIONAL_AUDIT.md

## Verdict global
Bon. L'audit fonctionnel tient désormais correctement la frontière entre faits prouvés et intentions supposées. Les comportements réellement exposés sont décrits sans surinterpréter les helpers morts en fonctionnalités avérées.

## Problèmes bloquants
- Aucun bloquant identifié.

## Problèmes mineurs
- Aucun problème mineur notable.

## Points vérifiés et corrects
- La reformulation des helpers morts est désormais correctement qualifiée : `getUserById` et `isAdmin` sont décrits comme présents dans le code, et toute intention d'extension reste explicitement en `HYPOTHÈSE` (`.onboarding/audits/FUNCTIONAL_AUDIT.md:11`, `.onboarding/audits/FUNCTIONAL_AUDIT.md:19-21`, `.onboarding/audits/FUNCTIONAL_AUDIT.md:39-40`).
- Le comportement de `GET /users` est correctement décrit depuis `src/server.js:13-15` et `src/routes/users.js:9-11`.
- Le bug sur `GET /orders?active=true` est correctement expliqué et relié à la documentation et au test (`src/server.js:18-23`, `src/routes/orders.js:18-23`, `README.md:9`, `test/orders.test.js:5-18`).
- L'absence d'opérations d'écriture et le 404 générique sont exacts (`src/server.js:13-27`).
- La cohérence des `userId` entre `users` et `orders` est bien décrite (`src/routes/users.js:3-7`, `src/routes/orders.js:3-8`).

## Recommandations de correction
- Aucune correction requise avant validation.

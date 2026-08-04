# Relecture — DATA_MODEL_AUDIT.md

## Verdict global
Bon. L'audit du modèle de données est précis, correctement sourcé et ne gonfle pas artificiellement les risques. Les frontières entre faits lus dans le code et anticipations sur une future évolution sont bien tenues.

## Problèmes bloquants
- Aucun bloquant identifié.

## Problèmes mineurs
- Aucun problème mineur notable.

## Points vérifiés et corrects
- Les structures et valeurs de `users` et `orders` sont fidèlement restituées depuis `src/routes/users.js:3-7` et `src/routes/orders.js:3-8`.
- Le lien logique `orders.userId -> users.id` est correctement décrit comme cohérent dans les données mais non enforce par le code (`src/routes/orders.js:14-16`).
- Le mismatch `"canceled"` / `"cancelled"` est correctement localisé et relié au bug volontaire (`src/routes/orders.js:18-23`, `README.md:9`, `test/orders.test.js:5-18`).
- Les risques évoqués restent concrets et proportionnés au dépôt: enum implicite fragile, mutation accidentelle d'état global, absence d'intégrité applicative.

## Recommandations de correction
- Aucune correction requise avant validation.

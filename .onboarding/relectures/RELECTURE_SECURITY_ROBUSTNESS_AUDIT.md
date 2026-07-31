# Relecture — SECURITY_ROBUSTNESS_AUDIT.md

## Verdict global
Bon. L'audit sécurité/robustesse a été resserré et distingue maintenant correctement les faits prouvés, les hypothèses d'évolution et les extrapolations d'infrastructure. Les constats clés sont exacts et les risques restent proportionnés au dépôt.

## Problèmes bloquants
- Aucun bloquant identifié.

## Problèmes mineurs
- Aucun problème mineur notable.

## Points vérifiés et corrects
- La phrase erronée sur un `200` universel a disparu : l'audit borne maintenant correctement le constat aux deux routes fonctionnelles et rappelle le `404` pour le reste (`.onboarding/audits/SECURITY_ROBUSTNESS_AUDIT.md:17`, `src/server.js:14-28`).
- Le cas `userId` est désormais décrit avec la bonne frontière de preuve : `null` et `""` restent sur `listOrders()`, tandis que `?userId=abc` mène à `Number("abc")`, puis à `[]` silencieux (`.onboarding/audits/SECURITY_ROBUSTNESS_AUDIT.md:21`, `src/server.js:19-23`, `src/routes/orders.js:14-16`).
- Le passage sur l'absence de limitation de débit est correctement requalifié en observation faible côté code puis en `HYPOTHÈSE` d'infrastructure, sans surqualifier un "DoS trivial" (`.onboarding/audits/SECURITY_ROBUSTNESS_AUDIT.md:27`).
- L'absence de secret en dur est bien vérifiée sur les fichiers cités (`src/server.js`, `src/routes/users.js`, `src/routes/orders.js`, `package.json`).
- L'absence d'authentification et d'utilisation de `isAdmin` est correctement sourcée (`src/server.js:10-27`, `src/routes/users.js:17-21`).
- Le constat `GET /users` expose le champ `role` sans filtrage est exact (`src/routes/users.js:3-11`, `src/server.js:13-15`).
- Le comportement `GET /orders?userId=abc` menant à `Number("abc")`, puis à `getOrdersByUser(NaN)` et donc à `[]`, est prouvé par lecture du code (`src/server.js:18-23`, `src/routes/orders.js:14-16`).

## Recommandations de correction
- Aucune correction requise avant validation.

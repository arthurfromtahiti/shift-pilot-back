# Relecture — CODE_HOTSPOTS_AUDIT.md

## Verdict global
Bon. L'audit identifie des points chauds plausibles sans plaquer une grille "gros monolithe" sur un dépôt minuscule. Les constats clés sont exacts et les risques restent concrets.

## Problèmes bloquants
- Aucun bloquant identifié.

## Problèmes mineurs
- La formulation "`npm test` ne teste rien" dans `.onboarding/audits/CODE_HOTSPOTS_AUDIT.md:47` gagnerait à être légèrement resserrée: la commande échoue bien avant d'atteindre le vrai test, ce qui est le point important. La preuve runtime existe, mais la phrase peut laisser croire à tort que la commande sort verte sans exécuter les tests.

## Points vérifiés et corrects
- `src/server.js` est bien le point de passage obligatoire pour les évolutions HTTP (`src/server.js:10-27`).
- `filterActiveOrders` concentre à la fois la seule logique conditionnelle non triviale et le bug volontaire (`src/routes/orders.js:18-23`).
- Le dead import `getUserById` et l'export mort `isAdmin` sont correctement identifiés (`src/server.js:3`, `src/routes/users.js:17-21`).
- Le constat sur `npm test` cassé sous Node `v24.18.0` est exact: l'exécution de `npm test` échoue sur `Error: Cannot find module .../test` avant d'atteindre `test/orders.test.js`, alors que `node --test test/orders.test.js` échoue ensuite sur l'assertion attendue.

## Recommandations de correction
- Aucune correction requise avant validation. Un simple ajustement de formulation sur le risque lié à `npm test` suffirait.

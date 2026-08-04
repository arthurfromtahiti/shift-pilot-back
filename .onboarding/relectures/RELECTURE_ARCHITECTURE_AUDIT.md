# Relecture — ARCHITECTURE_AUDIT.md

## Verdict global
Bon. L'audit d'architecture reste globalement dans la preuve, distingue correctement les hypothèses sur `getUserById` de ce qui est simplement lu dans le code, et ses recommandations sont reliées à des fichiers réels.

## Problèmes bloquants
- Aucun bloquant identifié.

## Problèmes mineurs
- La formulation "absence totale de surface d'attaque sur la chaîne de dépendances" dans `.onboarding/audits/ARCHITECTURE_AUDIT.md:25` est un peu absolue. Ce qui est prouvé ici, c'est l'absence de dépendances npm déclarées dans `package.json`, pas une nullité absolue de tout risque supply-chain.

## Points vérifiés et corrects
- Le cadrage "3 fichiers source + 1 test" est exact au regard de `src/server.js`, `src/routes/users.js`, `src/routes/orders.js` et `test/orders.test.js`.
- Le constat sur le rôle central de `src/server.js` est prouvé par le code: parsing d'URL, routage HTTP et composition `getOrdersByUser` / `filterActiveOrders` sont bien concentrés dans ce fichier (`src/server.js:10-27`).
- Le dead import `getUserById` et l'export mort `isAdmin` sont réels et correctement sourcés (`src/server.js:3`, `src/routes/users.js:17-21`).
- Le pattern `require.main === module` / `module.exports = server` est bien présent et justifie l'argument de testabilité (`src/server.js:29-38`).

## Recommandations de correction
- Aucune correction requise avant validation. Un simple resserrage lexical sur la phrase relative à la supply-chain suffirait si le producteur veut rendre l'audit plus strict.

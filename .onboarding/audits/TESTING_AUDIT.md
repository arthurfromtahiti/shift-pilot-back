# Tests — Audit

> Confiance : high

## Compréhension globale

Le projet dispose d'un unique fichier de test (`test/orders.test.js`, 19 lignes) utilisant le runner natif Node.js (`node:test`). Ce test couvre une seule fonction sur six fonctions exportées par le projet, et il est intentionnellement rouge — il reproduit le bug volontaire `filterActiveOrders`. La couverture fonctionnelle est donc quasi nulle : aucune route HTTP n'est testée, aucune logique `listUsers`, `listOrders`, `getOrdersByUser` ni `isAdmin` ne l'est. La commande `npm test` est de plus cassée sous Node 24. L'état des tests est entièrement documenté, cohérent avec le périmètre pilote déclaré.

## Résumé exécutif

Un test, une fonction, rouge par conception. La seule assertion du projet vérifie que `filterActiveOrders` exclut correctement les commandes annulées — ce qu'elle ne fait pas, ce qui est le sujet du pilote. C'est une démarche Test-Driven parfaitement honnête : le test décrit le comportement attendu, il échoue tant que le bug n'est pas corrigé. En revanche, le script `npm test` ne l'exécute pas sous Node 24 (la résolution de `test/` comme module échoue avant d'atteindre le fichier). Cinq des six fonctions publiques du projet ne sont pas couvertes : `listUsers`, `getUserById`, `isAdmin`, `listOrders`, `getOrdersByUser`. Aucun test d'intégration HTTP (routes, statuts, parsing des paramètres, 404, NaN silencieux) n'existe. Pour un pilote à données statiques, cette couverture est acceptable ; toute extension du projet vers une vraie persistance ou de nouvelles routes devrait s'accompagner d'une stratégie de test explicite.

## Constats détaillés

**Fichier de test unique.** `VÉRIFIÉ_CODE` : `test/orders.test.js`, 19 lignes. Un seul appel à `test(...)` (ligne 5), un seul `assert.deepEqual` (lignes 14-18). Le test importe directement `filterActiveOrders` depuis `../src/routes/orders` — c'est un test unitaire pur qui ne démarre pas le serveur HTTP.

**Assertion testée et résultat attendu.** `VÉRIFIÉ_CODE` : le test passe l'échantillon `[{id:1, status:"paid"}, {id:2, status:"cancelled"}, {id:3, status:"paid"}]` à `filterActiveOrders` et attend `[1, 3]` en sortie (les ids des commandes non annulées). En raison du bug (`"canceled"` vs `"cancelled"`), `filterActiveOrders` retourne les trois éléments — l'assertion échoue. Lorsqu'exécuté directement avec `node --test test/orders.test.js`, le message d'échec pointe correctement sur l'assertion à la ligne 14, avec les valeurs attendues et obtenues.

**Script `npm test` cassé sous Node 24.** `VÉRIFIÉ_CODE` : `package.json:9` définit `"test": "node --test test/"`. Passer un répertoire à `node --test` demande à Node.js de le résoudre comme un module — ce qui échoue sous Node 24 avec `Error: Cannot find module` avant même d'atteindre le fichier de test. Ce comportement est documenté dans `WORKFLOW_LIST_ORDERS.md` (section Justification). La commande correcte est `node --test test/orders.test.js` ou un glob de la forme `test/**/*.test.js`.

**Fonctions non testées.** `VÉRIFIÉ_CODE` : `listUsers` (`src/routes/users.js:9-11`), `getUserById` (`src/routes/users.js:13-15`), `isAdmin` (`src/routes/users.js:17-19`), `listOrders` (`src/routes/orders.js:10-12`), `getOrdersByUser` (`src/routes/orders.js:14-16`) — aucun test ne couvre ces cinq fonctions. Recherche de `listUsers`, `getUserById`, `isAdmin`, `listOrders`, `getOrdersByUser` dans `test/orders.test.js` — non localisées.

**Aucun test d'intégration HTTP.** `VÉRIFIÉ_CODE` : aucun fichier de test ne démarre le serveur ni n'envoie de requête HTTP. Les comportements testables uniquement via HTTP — codes de statut, parsing de paramètres, 404, NaN silencieux sur `userId` invalide, en-têtes de réponse — ne sont pas couverts. Le pattern `module.exports = server` (`src/server.js:38`) combiné avec `require.main === module` (`src/server.js:32`) rend possible l'écriture de tels tests sans surcoût de setup.

**Outil de test natif, sans dépendance.** `VÉRIFIÉ_CODE` : `node:test` (stdlib Node.js ≥ 18) et `node:assert/strict` — aucune dépendance externe (Jest, Mocha, etc.) n'est nécessaire. C'est un choix cohérent avec la philosophie zéro-dépendance du projet.

## Forces

- **Test unitaire de la fonction défaillante** : la seule fonction ayant un comportement non trivial et un bug est exactement celle qui est testée — la priorité est juste.
- **Test TDD honnête** : le test est rouge parce que le code est incorrect, pas parce que le test est mal écrit — c'est un test de qualité, une seule assertion claire.
- **Outil natif** : `node:test` + `node:assert/strict` — zéro dépendance, pas de versioning de framework à gérer.
- **Architecture testable** : `require.main === module` dans `src/server.js:32` permet d'importer le serveur sans le démarrer — fondation correcte pour des tests d'intégration futurs.

## Dettes techniques

- **Script `npm test` cassé** : `package.json:9` — le script standard du projet ne fonctionne pas, ce qui signifie qu'un CI naïf qui lance `npm test` ne verra jamais les tests échouer (il verra une erreur de résolution de module avant).
- **Couverture unitaire < 20%** : 1 fonction testée sur 6 — les 5 autres n'ont aucun filet.
- **Aucun test HTTP** : le comportement observable de l'API (statuts, headers, parsing, 404) n'est vérifié nulle part.

## Zones critiques

- **`package.json:9`** : le script `test` est le point d'entrée de toute intégration CI. S'il est cassé, aucune pipeline ne voit les échecs de test — risque d'arriver en production sans le savoir.
- **`test/orders.test.js:14`** : l'assertion clé du projet — elle passera au vert dès que `src/routes/orders.js:23` sera corrigée. C'est la vérification de complétude du correctif attendu.

## Risques

- **Faux sentiment de couverture** : un développeur qui lance `npm test`, voit une erreur de module et conclut "le test ne s'exécute pas à cause de l'environnement" peut passer à côté du bug réel — le script cassé masque les échecs.
- **Régression non détectée** : toute modification de `listOrders`, `getOrdersByUser`, `listUsers` ou de la logique de routage HTTP peut introduire un défaut invisible — aucun test ne les surveille.
- **Pas de test sur le parsing `userId`** : le comportement NaN silencieux (un non-entier retourne 200+[] sans 400) n'est pas couvert — si une validation était ajoutée, personne ne le verrait régresser.

## Recommandations priorisées

1. **Corriger `package.json:9`** : remplacer `"test": "node --test test/"` par `"test": "node --test test/orders.test.js"` (ou `"node --test 'test/**/*.test.js'"` pour couvrir les futurs fichiers) — priorité absolue pour que CI puisse voir les failures.
2. **Vérifier que le test passe au vert après le correctif** `filterActiveOrders` — c'est la validation naturelle du bug fix, un test existant attendant cette correction.
3. **Ajouter des tests pour `getOrdersByUser`** et le comportement `userId=NaN` — les deux cas d'utilisation les plus exposés aux entrées externes, aujourd'hui sans filet.
4. **Envisager un test d'intégration HTTP minimal** utilisant `supertest` ou un simple `http.request` sur le serveur exporté — couvrirait les statuts, le 404 et le parsing de paramètres sans setup lourd.

## Questions ouvertes

- Le script `npm test` cassé sous Node 24 est-il un bug additionnel volontaire du pilote, ou un oubli ?
- La couverture actuelle (1 test, 1 fonction) est-elle considérée comme suffisante pour la durée du pilote, ou des tests supplémentaires sont-ils attendus dans une prochaine itération ?
- Un outil de couverture de code (Istanbul/nyc, `node --experimental-test-coverage`) est-il envisagé ?

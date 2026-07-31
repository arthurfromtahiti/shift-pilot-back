# Architecture — Audit

> Confiance : high

## Compréhension globale

Le projet est une API HTTP minimale Node.js (CommonJS, `node:http` seul, sans framework) composée de trois fichiers source : un dispatcher central (`src/server.js`) et deux modules de domaine (`src/routes/users.js`, `src/routes/orders.js`). L'architecture suit un modèle à deux couches — transport HTTP + données en mémoire — avec une couche de routage concentrée dans le serveur. Le périmètre est volontairement jouet et ne représente aucune architecture de production ; l'évaluation est donc calibrée à cette réalité.

## Résumé exécutif

L'architecture est plate, cohérente pour un pilote de démonstration de 3 fichiers. La séparation en modules de domaine est lisible et la contrainte `require.main === module` permet d'importer le serveur en test sans le démarrer — c'est un choix sain. En revanche, `src/server.js` cumule trois responsabilités distinctes : parsing HTTP, routage et orchestration de la logique métier (composition des filtres commandes). Cette concentration n'est pas un problème à cette taille, mais elle deviendrait un goulot d'évolution dès la première route ajoutée. Deux helpers (`getUserById`, `isAdmin`) sont définis, exportés, voire importés, mais jamais appelés — code mort qui crée une fausse impression de fonctionnalités disponibles. Aucune couche de middleware, aucune gestion des erreurs transverse, aucune abstraction de routage ne sont présentes — ce qui est acceptable pour un jouet mais documente clairement ce qui manque avant toute vraie utilisation.

## Constats détaillés

**Structure générale.** `VÉRIFIÉ_CODE` : le projet contient exactement 3 fichiers source (`src/server.js`, `src/routes/users.js`, `src/routes/orders.js`) plus un test (`test/orders.test.js`). Il n'y a ni répertoire `middleware/`, ni `services/`, ni `lib/`, ni fichier de configuration applicative — la structure est strictement plate sous `src/`. C'est cohérent avec la déclaration `README.md:1` (« dépôt de test jetable »).

**Dispatcher central.** `VÉRIFIÉ_CODE` : `src/server.js` concentre le parsing d'URL (`new URL(req.url, ...)` à la ligne 12), le routage (deux blocs `if` aux lignes 14 et 18), et la composition de la logique métier (`getOrdersByUser` + `filterActiveOrders` aux lignes 22-23). Un senior regarderait ce fichier en premier dès qu'une nouvelle route est à ajouter — il est aujourd'hui le seul point de modification obligatoire pour toute évolution fonctionnelle.

**Import mort : `getUserById`.** `VÉRIFIÉ_CODE` : `getUserById` est importé à `src/server.js:3` (`const { listUsers, getUserById } = require("./routes/users")`) mais n'est utilisé à aucun endroit du fichier. Ce n'est pas un défaut de sécurité mais un signal de fonctionnalité prévue et non câblée — une future route `GET /users/:id` était vraisemblablement envisagée. `HYPOTHÈSE` : sans intention produit confirmée, il est impossible de savoir si cet import annonce une route imminente ou est du code de démo oublié.

**Export mort : `isAdmin`.** `VÉRIFIÉ_CODE` : `isAdmin(user)` est défini à `src/routes/users.js:17-19`, exporté à la ligne 21 (`module.exports = { listUsers, getUserById, isAdmin }`), mais jamais importé dans `src/server.js:3` ni dans aucun autre fichier. Le squelette d'autorisation par rôle est présent dans les données (le champ `role` à `src/routes/users.js:4-6`) et dans un prédicat fonctionnel mais n'est raccordé à aucune logique de contrôle.

**Pattern testabilité.** `VÉRIFIÉ_CODE` : `src/server.js:32-36` utilise `if (require.main === module) { server.listen(...) }` — le serveur ne démarre que s'il est invoqué directement, et `module.exports = server` à la ligne 38 permet de l'importer dans un test HTTP d'intégration. C'est un choix architectural explicitement bon pour un projet Node.js CommonJS.

**Zéro dépendance externe.** `VÉRIFIÉ_CODE` : `package.json` ne déclare aucune dépendance (`dependencies` absent, `devDependencies` absent). Toute la pile repose sur les modules `node:http` et `node:url` de la stdlib Node.js. Cela garantit un `npm install` sans artefact tiers et une absence totale de surface d'attaque sur la chaîne de dépendances.

## Forces

- **Séparation domaine / transport** : les modules `users.js` et `orders.js` ne connaissent pas HTTP — ils exposent des fonctions pures sur des tableaux en mémoire (`src/routes/users.js:9-21`, `src/routes/orders.js:10-26`). Le couplage entre couches est minimal et unidirectionnel.
- **Pattern `require.main === module`** : rend le serveur testable sans démarrage réseau (`src/server.js:32-36`) — architecture correcte dès le départ.
- **Zéro dépendance externe** : surface de risque supply-chain nulle (`package.json`).
- **Fonctions pures testables unitairement** : `filterActiveOrders`, `getOrdersByUser`, `listUsers`, `getUserById` sont toutes des fonctions sans effet de bord importable directement dans un test (`src/routes/orders.js:10-26`, `src/routes/users.js:9-15`).

## Dettes techniques

- **Import mort `getUserById`** : importé à `src/server.js:3`, jamais appelé — génère une fausse impression de route `/users/:id` opérationnelle.
- **Export mort `isAdmin`** : exporté à `src/routes/users.js:21`, jamais consommé — squelette d'autorisation déconnecté des routes.
- **`src/server.js` multi-rôle** : un seul fichier assure parsing HTTP, routage et composition métier (`src/server.js:11-29`). Tolérable à 38 lignes, dette structurelle dès la deuxième route ajoutée.
- **Aucune gestion d'erreur transverse** : pas de `try/catch` dans le handler, pas de middleware d'erreur — une exception non attrapée crasherait le processus sans réponse HTTP propre.

## Zones critiques

- **`src/server.js` (lignes 11-29)** : unique point d'entrée des modifications fonctionnelles futures ; toute route nouvelle, tout middleware transverse passe ici. Un senior le surveillerait comme un fichier à refactoriser dès que le projet grandit, pour éviter qu'il devienne un "god file".

## Risques

- **Crash silencieux** : l'absence de `try/catch` dans le handler (`src/server.js:11-29`) implique qu'une exception non gérée (ex. erreur dans un futur accès base) fermerait la connexion sans réponse, voire planterait le processus. Impact concret : tous les clients en cours de traitement perdraient leur connexion sans message d'erreur exploitable.
- **Évolutivité du dispatcher** : chaque nouvelle route ou paramètre s'ajoute en `if` dans `src/server.js` — pattern qui ne passe pas à l'échelle sans refactoring (pas un risque aujourd'hui, signal d'alerte pour la première vraie itération).

## Recommandations priorisées

1. **Supprimer `getUserById` de l'import de `src/server.js`** ou câbler une route `/users/:id` — l'import mort est trompeur et source de confusion pour le prochain développeur — `src/server.js:3`.
2. **Ajouter un bloc `try/catch` global dans le handler** pour renvoyer un 500 propre plutôt qu'un crash silencieux — `src/server.js:11-29`.
3. **Documenter l'intention de `isAdmin`** : si c'est une amorce, l'annoter ; si c'est du bruit, le retirer — `src/routes/users.js:17-21`.

## Questions ouvertes

- `getUserById` et `isAdmin` sont-ils des amorces de fonctionnalités prévues (route `/users/:id`, contrôle d'accès) ou du code de démo sans suite ? La réponse détermine si on les connecte ou si on les supprime.
- L'architecture plate est-elle intentionnelle pour toute la durée du pilote, ou une évolution vers un routeur explicite (ex. une simple map `pathname → handler`) est-elle envisagée ?

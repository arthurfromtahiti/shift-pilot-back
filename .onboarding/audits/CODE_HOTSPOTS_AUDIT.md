# Points chauds du code — Audit

> Confiance : high

## Compréhension globale

Le projet ne contient que 4 fichiers de code significatifs (3 sources + 1 test) pour un total d'environ 100 lignes. À cette taille, la notion de "point chaud" au sens habituel (fichier de 500+ lignes, fort couplage, couverture nulle) ne s'applique pas : il n'y a pas de Dieu-fichier. Il y a cependant deux zones précises qui concentrent les risques et méritent l'attention d'un senior : `src/server.js` comme point de changement obligatoire pour toute évolution, et `src/routes/orders.js:22-24` comme localisation du seul défaut fonctionnel actif du projet.

## Résumé exécutif

À 3 fichiers source et 85 lignes de code total, ce projet n'a pas de hotspot de volume. En revanche, il a deux points de risque logiques. Premier : `src/server.js` est le seul fichier qu'un développeur devra modifier pour ajouter une route, un paramètre ou un middleware — c'est un point de passage obligatoire dont le format actuel (deux blocs `if` inline) ne passe pas à l'échelle. Second : `src/routes/orders.js:22-24` contient la seule logique non triviale du projet et le bug volontaire (`"canceled"` vs `"cancelled"`) — c'est ici que le premier correctif interviendra. Deux helpers morts (`getUserById` importé mais non appelé dans le serveur, `isAdmin` exporté mais jamais importé) créent une ambiguité de lecture sans risque fonctionnel direct. La couverture de test ne couvre qu'une seule fonction sur six.

## Constats détaillés

**`src/server.js` — dispatcher monolithique (38 lignes).** `VÉRIFIÉ_CODE` : ce fichier importe toutes les fonctions de domaine (ligne 3 : `listUsers`, `getUserById` ; ligne 4 : `listOrders`, `getOrdersByUser`, `filterActiveOrders`), définit le helper `sendJson` (lignes 6-9), contient le handler HTTP complet (lignes 11-29) et la logique de démarrage (lignes 31-36). Toute modification fonctionnelle — nouvelle route, paramètre supplémentaire, middleware — passe nécessairement par ce fichier. Il n'est pas "gros" aujourd'hui mais est structurellement couplé à tout le reste : un senior le signalerait comme candidate au découpage si le projet dépassait 4-5 routes.

**`src/routes/orders.js:22-24` — seule logique non triviale et localisation du bug.** `VÉRIFIÉ_CODE` : `filterActiveOrders` est la seule fonction du projet qui fait un traitement conditionnel non trivial (un filtre). C'est ici que vit le bug volontaire : la comparaison `order.status !== "canceled"` (ligne 23) ne correspond à aucune valeur des données (`"cancelled"`, ligne 5 et 7). Le commentaire inline (lignes 18-21) documente l'intention et le défaut — rare et appréciable dans un projet pilote. Cette fonction est testée par `test/orders.test.js` mais le test est rouge. Un correctif d'une seule lettre sur la ligne 23 la rendrait verte.

**Import mort : `getUserById` dans `src/server.js:3`.** `VÉRIFIÉ_CODE` : `getUserById` est importé à la ligne 3 mais aucune occurrence de son appel n'est présente dans le reste du fichier (recherche sur l'identifiant — non trouvé hors de l'import). Ce dead import rend le point d'entrée trompeur : un lecteur peut croire qu'une route `/users/:id` existe ou qu'une jointure `orders → users` est réalisée, alors qu'aucun des deux n'est câblé.

**Export mort : `isAdmin` dans `src/routes/users.js:17-21`.** `VÉRIFIÉ_CODE` : `isAdmin(user)` est défini (lignes 17-19) et inclus dans `module.exports` (ligne 21). Recherche de `isAdmin` dans `src/server.js` — non localisé. Le prédicat est correct (vérifie `user !== null && user.role === "admin"`) mais sans consommateur. Un audit de sécurité superficiel pourrait conclure à tort que l'autorisation est câblée.

**`src/routes/users.js` (21 lignes) — profil le plus simple.** `VÉRIFIÉ_CODE` : 3 fonctions, un tableau en mémoire, aucune logique conditionnelle. Seule `listUsers` est exposée via une route. C'est le fichier le plus sain du projet — aucun risque logique.

**`test/orders.test.js` (19 lignes) — unique test, rouge.** `VÉRIFIÉ_CODE` : un seul test, unitaire, sur `filterActiveOrders`. Il importe directement la fonction (`require("../src/routes/orders")`), sans démarrer le serveur HTTP. Il est rouge par conception (le bug volontaire le fait échouer sur l'assertion à la ligne 14). Le script `npm test` (`package.json:9` : `node --test test/`) passe un répertoire en argument ; la résolution de répertoire comme module échoue sous Node 24 — le test n'est donc pas atteint par `npm test` et il faut l'invoquer directement (`node --test test/orders.test.js`).

## Forces

- **`filterActiveOrders` commentée avec le défaut** : l'auteur a documenté le bug volontaire inline (`src/routes/orders.js:18-21`) — c'est une pratique de lisibilité rare et utile qui signale immédiatement la zone à corriger.
- **Fonctions pures, pas de side effects** : toutes les fonctions des modules de domaine sont pures (entrée → sortie, pas de mutation de tableau, pas d'appel réseau) — testables unitairement sans setup.
- **`require.main === module`** : `src/server.js:32-36` — le pattern correct pour rendre un serveur Node.js testable sans démarrage réseau.

## Dettes techniques

- **Import `getUserById` mort** : `src/server.js:3` — confusion de lecture, nettoyage trivial.
- **Export `isAdmin` mort** : `src/routes/users.js:21` — ambiguité sécurité, à connecter ou retirer.
- **`npm test` cassé sous Node 24** : `package.json:9` — le script `node --test test/` échoue avant d'atteindre le test à cause de la résolution du répertoire `test/` comme module. À corriger par `node --test test/orders.test.js` ou par un glob (`test/**/*.test.js`).

## Zones critiques

- **`src/routes/orders.js:22-24`** : logique non triviale + bug volontaire actif + test rouge — c'est le premier et seul endroit où un correctif code est attendu dans le cadre du pilote. Un senior commencerait ici.
- **`src/server.js:11-29`** : point de changement obligatoire pour toute évolution — à garder en tête dès qu'une 3ème route est envisagée.

## Risques

- **Bug `filterActiveOrders` actif** : `GET /orders?active=true` retourne les commandes annulées — comportement silencieusement incorrect, sans erreur ni avertissement côté API (`src/routes/orders.js:23`).
- **`npm test` ne teste rien** sous Node 24 : un développeur ajoutant des tests et lançant `npm test` ne verra aucune failure — et peut conclure à tort que les tests passent, alors qu'ils ne sont simplement pas exécutés (`package.json:9`).
- **Lecture trompeuse des imports/exports** : `getUserById` et `isAdmin` semblent des fonctionnalités câblées alors qu'elles ne le sont pas — risque de confusion lors d'une revue rapide.

## Recommandations priorisées

1. **Corriger `filterActiveOrders`** : remplacer `"canceled"` par `"cancelled"` à `src/routes/orders.js:23` — correctif d'une lettre, test existant passera au vert.
2. **Corriger le script `npm test`** : remplacer `"test": "node --test test/"` par `"test": "node --test test/orders.test.js"` (ou un glob) dans `package.json:9` pour que `npm test` exécute réellement les tests.
3. **Nettoyer les dead code** : retirer `getUserById` de l'import `src/server.js:3` s'il n'est pas utilisé ; connecter ou retirer `isAdmin` de `src/routes/users.js:21`.

## Questions ouvertes

- Le script `npm test` cassé sous Node 24 est-il connu et intentionnel (pour tester la robustesse de la chaîne CI), ou un oubli ?
- `getUserById` doit-il être câblé dans une route `GET /users/:id` prochainement, ou s'agit-il de code de démo à retirer ?

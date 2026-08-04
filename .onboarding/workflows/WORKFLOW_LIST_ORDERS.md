# WORKFLOW_LIST_ORDERS — Consultation et filtrage des commandes

## Classification
- **Type** : `api_flow`
- **Sous-type** : lecture en mémoire avec filtres optionnels composables, réponse JSON
- **Visibilité** : external_user
- **Acteur principal** : client HTTP externe (toute requête `GET /orders`)
- **Acteurs** : client HTTP ; serveur Node.js (`src/server.js`) ; module commandes (`src/routes/orders.js`)
- **Criticité** : Basse — donnée jouet en mémoire, aucun effet de bord, aucune persistance ; criticité pilote (pas de production)
- **Confiance** : high
- **Justification** : Tous les fichiers sources lus intégralement. La logique de filtrage est visible ligne à ligne. Le bug volontaire est documenté dans le source lui-même (`src/routes/orders.js:18-21`). Cause du bug : `VÉRIFIÉ_CODE`. À noter : le script `npm test` (`package.json:9`) échoue avant d'atteindre les assertions métier sous Node 24 (`Error: Cannot find module` sur le répertoire `test/`) ; exécuté directement avec `node --test test/orders.test.js`, le test échoue bien sur l'assertion métier à la ligne 14 — mais cette exécution runtime n'est pas utilisée comme preuve primaire dans ce document.

## Objectif
Permettre à un client HTTP de consulter les commandes, avec deux filtres optionnels et composables : restreindre aux commandes d'un utilisateur précis (`userId`), et/ou exclure les commandes annulées (`active=true`). Ce workflow contient le **bug volontaire du pilote SHIFT** : le filtre `active` ne fonctionne pas en raison d'une faute d'orthographe dans la comparaison de statut.

## Acteurs
- **Client HTTP externe** : émet `GET /orders` avec ou sans paramètres de requête
- **`src/server.js`** : dispatcher HTTP, orchestre les appels aux fonctions de filtrage
- **`src/routes/orders.js`** : détient le tableau `orders` en mémoire et expose `listOrders()`, `getOrdersByUser()`, `filterActiveOrders()`

## Points d'entrée
- `GET /orders` — géré à `src/server.js:18-26`
- Paramètre optionnel `userId` (entier) : filtre les commandes d'un utilisateur
- Paramètre optionnel `active=true` : tente d'exclure les commandes annulées (inopérant — voir Risques)

## Étapes principales
1. Le serveur parse l'URL entrant : `new URL(req.url, ...)` (`src/server.js:12`).
2. Le dispatcher teste `url.pathname === "/orders" && req.method === "GET"` (`src/server.js:18`).
3. Lecture des paramètres de requête :
   - `userId` : `url.searchParams.get("userId")` → converti en `Number` si présent (`src/server.js:19,22`)
   - `active` : `url.searchParams.get("active") === "true"` → booléen (`src/server.js:20`)
4. Sélection de la liste de base :
   - Si `userId` fourni → `getOrdersByUser(Number(userIdParam))` — filtre le tableau `orders` par `order.userId === userId` (`src/server.js:22`, `src/routes/orders.js:14-16`)
   - Sinon → `listOrders()` — retourne le tableau complet (`src/server.js:22`, `src/routes/orders.js:10-12`)
5. Si `activeOnly` vrai → `filterActiveOrders(result)` appelé sur la liste résultante (`src/server.js:23`) ; en pratique, **ne filtre rien** (voir Risques).
6. `sendJson(res, 200, result)` sérialise et envoie la réponse (`src/server.js:25`).

## Règles métier
- **Filtre `userId` (fonctionnel)** : `getOrdersByUser` compare `order.userId === userId` (égalité stricte, nombres) — seules les commandes dont `userId` correspond à l'entier passé sont retournées (`src/routes/orders.js:14-16`).
- **Filtre `active=true` (non fonctionnel — bug volontaire)** : `filterActiveOrders` tente `order.status !== "canceled"` (`src/routes/orders.js:22-24`), mais les données portent `"cancelled"` (double `l`). La comparaison ne correspond jamais à aucun statut du tableau → **toutes les commandes passent le filtre**, y compris les annulées (`VÉRIFIÉ_CODE`). Documenté dans le commentaire source (`src/routes/orders.js:18-21`). Le test `test/orders.test.js:5-19` décrit exactement ce scénario et échoue sur l'assertion à la ligne 14 lorsqu'exécuté directement avec `node --test test/orders.test.js` — mais ce n'est pas une validation runtime du workflow lui-même ; la preuve reste le code lu (voir section Justification).
- **Composabilité des filtres** : `userId` et `active` sont indépendants et cumulables — `userId` est appliqué en premier, `active` sur la sous-liste résultante (`src/server.js:22-23`).
- **Méthode HTTP stricte** : seul `GET` répond ; autre méthode → 404 (`src/server.js:18`).
- **Statut 200 systématique** : aucune gestion d'erreur ; liste vide, userId inexistant → 200 + `[]`.

## Données
- `orders` : tableau en mémoire de 4 objets `{ id, userId, total, status }` (`src/routes/orders.js:3-8`).
  - `status` ∈ `{"paid", "cancelled"}` — orthographe anglaise britannique dans les données.
  - `userId` lie chaque commande à un utilisateur du domaine `utilisateurs` (clé étrangère logique, non enforced).

## Intégrations
Aucune intégration externe explicite visible. Aucun appel réseau, aucune base de données. La jointure `userId` → `users` est logique (données cohérentes en mémoire) mais ne fait l'objet d'aucune vérification d'intégrité dans le code.

## Risques
- **Bug volontaire — filtre `active` inopérant** : `filterActiveOrders` compare `order.status !== "canceled"` (`src/routes/orders.js:23`) alors que les statuts du tableau sont `"cancelled"`. La fonction retourne toujours la liste complète. Scénario : un client appelle `GET /orders?active=true` et s'attend à ne voir que les commandes payées — il reçoit aussi les annulées, sans avertissement. Ce bug est intentionnel dans le cadre du pilote (`README.md:9`, `src/routes/orders.js:18`) et décrit par le test `test/orders.test.js:5-19`. Ce test échoue sur l'assertion métier lorsqu'il est lancé directement (`node --test test/orders.test.js`) ; il n'est pas atteint via le script standard `npm test` (`package.json:9`), cassé en amont sous Node 24 (résolution de `test/` comme module inexistant).
- **`userId` non valide silencieux** : si `userId` n'est pas un entier, `Number(userIdParam)` produit `NaN` → `getOrdersByUser(NaN)` retourne `[]` silencieusement (comparaison `=== NaN` toujours fausse) plutôt qu'une erreur 400. Un client passe `?userId=abc` et reçoit 200 + `[]` sans feedback.
- **Absence de contrôle d'accès** : n'importe quel client peut lire les commandes de n'importe quel utilisateur via `?userId=<n>` — pas d'authentification câblée.
- **Données statiques non persistées** : identique au workflow `LIST_USERS` — toute modification en mémoire disparaîtrait au redémarrage.

## Questions ouvertes
- Le bug `"canceled"` vs `"cancelled"` sera-t-il corrigé en changeant la comparaison ou en changeant les données ? Les deux modifications ont des impacts différents (compatibilité si d'autres systèmes lisent les données brutes).
- Existe-t-il un cas d'usage prévu pour `getUserById` (importé dans `src/server.js:3` mais jamais appelé) — par exemple, une future route `GET /orders` qui jointurait les données utilisateur à la réponse ?
- L'absence de validation de `userId` (chaîne → NaN silencieux) est-elle intentionnelle pour le pilote ou un bug additionnel ?

## Preuves
- `src/server.js` — lu intégralement (lignes 1-38)
- `src/routes/orders.js` — lu intégralement (lignes 1-26)
- `test/orders.test.js` — lu intégralement (lignes 1-19)

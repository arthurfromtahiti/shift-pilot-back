# Sécurité & Robustesse — Audit

> Confiance : high

## Compréhension globale

Le projet est une API HTTP sans authentification exposant deux ressources en lecture. Aucun secret, aucune persistance, aucun appel réseau sortant — la surface d'attaque est donc très restreinte pour un projet jouet. Les déficits observés (absence d'authz, exposition des rôles, validation d'entrée nulle, robustesse zéro) sont cohérents avec la nature pilote déclarée et non avec une intention de production. L'évaluation les documente comme enjeux réels à traiter avant toute vraie utilisation.

## Résumé exécutif

Aucun secret n'est codé en dur : c'est la seule garantie de sécurité inconditionnelle du projet. Pour le reste, le tableau est prévisible pour un jouet : zéro authentification, zéro autorisation câblée (le prédicat `isAdmin` existe mais est mort), exposition du champ `role` à tout client sans filtre, aucune validation des paramètres d'entrée (`userId` accepte n'importe quelle chaîne en silence), et aucune gestion des erreurs qui éviterait un crash de processus sur exception. Ces points ne constituent pas des vulnérabilités actives sur un jouet en mémoire — ils le deviendraient immédiatement si une persistance, une vraie base d'utilisateurs ou une exposition publique étaient ajoutées sans refonte de la couche de sécurité.

## Constats détaillés

**Aucun secret en dur.** `VÉRIFIÉ_CODE` : lecture intégrale de `src/server.js`, `src/routes/users.js`, `src/routes/orders.js`, `package.json`. Aucun token, aucune clé d'API, aucun mot de passe n'est présent dans le code ou la configuration. Les données codées en dur sont des valeurs de démonstration (`heiata@example.pf`, totaux en chiffres). Ce point est conforme à la règle agence §2.

**Absence d'authentification.** `VÉRIFIÉ_CODE` : `src/server.js:11-29` ne contient aucun mécanisme d'authentification — ni vérification d'en-tête `Authorization`, ni cookie de session, ni JWT, ni middleware quelconque. Les deux routes fonctionnelles (`GET /users` et `GET /orders`) répondent `200` sans vérifier l'identité de l'appelant ; toute autre URL ou méthode reçoit `404` (`src/server.js:28`). `isAdmin(user)` est défini à `src/routes/users.js:17-19` et exporté (ligne 21) mais n'est importé ni appelé nulle part — le contrôle d'accès est un squelette sans fil (`src/server.js:3` n'importe pas `isAdmin`).

**Exposition du champ `role` sans filtre.** `VÉRIFIÉ_CODE` : `listUsers()` retourne le tableau brut `users` (`src/routes/users.js:9-11`), qui inclut le champ `role` (`admin` ou `customer`, lignes 4-6). N'importe quel client HTTP appelle `GET /users` et voit qui est administrateur, sans authentification. Pour un pilote à données fictives, c'est sans conséquence directe ; pour un service réel, ce serait une divulgation d'information sensible.

**Validation d'entrée absente — `userId`.** `VÉRIFIÉ_CODE` : `src/server.js:19-22` lit `userIdParam = url.searchParams.get("userId")` et le passe à `Number(userIdParam)` — mais seulement si `userIdParam` est truthy (opérateur ternaire ligne 22). Sans paramètre (`null`) ou avec `?userId=` vide (`""`), la valeur est falsy : la branche `getOrdersByUser` n'est pas prise, c'est `listOrders()` qui s'exécute normalement. Le cas problématique est `?userId=abc` : la chaîne `"abc"` est truthy, donc `Number("abc") === NaN`, puis `getOrdersByUser(NaN)` (`src/routes/orders.js:14-16`) retourne `[]` silencieusement car `order.userId === NaN` est toujours `false`. Le client reçoit `200` + `[]` sans aucun feedback d'erreur de saisie — comportement trompeur pour un paramètre non numérique non vide.

**Aucune gestion d'erreur.** `VÉRIFIÉ_CODE` : le handler HTTP (`src/server.js:11-29`) ne contient aucun bloc `try/catch`. En cas d'exception non attrapée (impossible avec les données statiques actuelles, mais possible si une future source de données était ajoutée), Node.js leverait une `uncaughtException`, laisserait la réponse HTTP pendante et, selon la configuration du processus, planterait. L'impact direct serait l'indisponibilité du service pour tous les clients connectés.

**En-têtes de sécurité HTTP absents.** `VÉRIFIÉ_CODE` : `sendJson` (`src/server.js:6-9`) ne pose que `Content-Type: application/json`. Aucun en-tête de sécurité (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc.) n'est défini. Pour une API JSON pure sans navigateur, l'impact est faible ; documenté pour référence si le service venait à être consommé depuis un navigateur.

**Pas de limitation de débit ni de taille de corps.** `VÉRIFIÉ_CODE` : `node:http` ne pose aucun seuil de taux de connexion ni de taille de corps dans le code analysé. Pour les deux routes GET actuelles (sans corps), l'impact est faible dans le périmètre du projet. `HYPOTHÈSE` : sur un réseau ouvert sans reverse proxy, l'absence de limitation pourrait permettre une saturation de connexions — mais ce risque relève de la configuration d'infrastructure, non du code ici audité, et ne peut être qualifié de "trivial" sans mesure.

## Forces

- **Aucun secret en dur** (`src/server.js`, `src/routes/users.js`, `src/routes/orders.js`, `package.json`) — propriété inconditionnelle et reproductible.
- **Surface d'attaque minimale** : zéro dépendance externe, zéro opération d'écriture, zéro appel réseau sortant — aucune vulnérabilité de type injection SQL, SSRF ou supply-chain n'est possible dans l'état actuel.
- **`Content-Type: application/json` systématique** (`src/server.js:7`) — évite toute interprétation du corps de réponse comme HTML par un navigateur.

## Dettes techniques

- **Squelette d'autorisation mort** : `isAdmin` défini, exporté (`src/routes/users.js:17-21`), jamais raccordé — crée une fausse impression que l'autorisation est gérée, alors qu'elle ne l'est pas.
- **Champ `role` exposé sans filtrage** dans `listUsers()` (`src/routes/users.js:9-11`).
- **`userId` non validé** : NaN silencieux plutôt qu'un 400 (`src/server.js:19-22`).

## Zones critiques

- **`src/server.js:18-26` (bloc orders)** : c'est ici que la validation d'entrée manque et que la logique de filtrage est exposée sans contrôle. Un senior ajouterait ici la première ligne de défense (validation `userId`, gestion du 400) avant d'ajouter toute vraie persistance.
- **`src/routes/users.js:17-21` (`isAdmin` + export)** : le fait que ce prédicat existe sans être jamais appelé dans le routeur est le signal le plus trompeur du dépôt — une revue de code rapide pourrait conclure à tort que l'autorisation est câblée.

## Risques

- **Passage à une vraie base de données sans refonte sécurité** : si `orders` ou `users` étaient remplacés par des requêtes vers une base réelle sans ajout d'authentification, toutes les données seraient accessibles sans contrôle. Impact : divulgation totale. Ce risque est latent, pas actif. `HYPOTHÈSE` : probable si le pilote est prolongé.
- **NaN silencieux** : `GET /orders?userId=abc` retourne `200 + []` — un client bogué ou malveillant pourrait itérer sur des `userId` invalides sans recevoir de signal d'erreur exploitable pour diagnostiquer son problème (`src/server.js:19-22`).
- **Absence de gestion d'erreur** : tout futur code levant une exception planterait le processus ou laisserait des connexions pendantes (`src/server.js:11-29`).

## Recommandations priorisées

1. **Valider `userId` avant conversion** — répondre `400 { error: "userId must be a positive integer" }` si la valeur n'est pas un entier positif — `src/server.js:19-22`. C'est la seule validation d'entrée manquante avec un impact utilisateur immédiat.
2. **Ajouter un `try/catch` global dans le handler** pour capturer les exceptions et renvoyer un `500` propre — `src/server.js:11-29`. Protège le processus dès que le projet évolue vers de vraies sources de données.
3. **Connecter `isAdmin` ou le retirer** — laisser un prédicat d'autorisation exporté mais jamais utilisé est plus dangereux qu'une absence : il masque l'absence réelle de contrôle d'accès — `src/routes/users.js:17-21`.
4. **Filtrer `role` de la réponse `GET /users`** avant toute exposition publique — `src/routes/users.js:9-11`.

## Questions ouvertes

- L'absence d'authentification est-elle intentionnelle pour toute la durée du pilote, ou y a-t-il une date à laquelle un token ou une session doit être ajouté ?
- Le champ `role` doit-il être retourné à tous les clients ou seulement aux administrateurs ? La réponse détermine si `isAdmin` est à raccorder ou à retirer.

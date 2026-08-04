# Carte des domaines — shift-pilot-back

> **Confiance globale : medium.** Dépôt volontairement minuscule (3 fichiers source + 1 test), lecture intégrale — l'échantillon n'est donc *pas* partiel. Les **3 domaines** ci-dessous sont chacun `high`. La confiance globale reste `medium` (et non `high`) uniquement parce que la matière est trop maigre pour lire l'intention produit derrière des données jouet, et parce qu'aucune observation runtime n'a pu confirmer le comportement des routes. Toutes les affirmations sont `VÉRIFIÉ_CODE` (lues dans le source, `fichier:ligne`) : **rien d'`OBSERVÉ`** — le serveur n'a pas été exécuté et aucune base n'a été fournie ni sondée.

## Nature du projet

**API HTTP jouet, en mémoire, exposant deux ressources métier : utilisateurs et commandes.** Petit serveur Node.js sans dépendance externe (`node:http` seul), deux points d'entrée en lecture — `GET /users` et `GET /orders` — servant du JSON depuis des tableaux codés en dur (`src/routes/users.js:3`, `src/routes/orders.js:3`). Il n'y a ni persistance, ni authentification câblée, ni écriture : uniquement de la lecture et un filtrage. Le `README.md:1-3` le déclare explicitement comme *dépôt de test jetable pour le pilote SHIFT/Paperclip*, non comme un produit réel — la carte reflète donc un périmètre réellement minuscule, sans le gonfler pour atteindre un quota de domaines.

## Domaines

### Utilisateurs (`utilisateurs`)
- **Catégorie** : métier
- **Priorité** : cœur
- **Confiance** : high
- **Description** : annuaire des utilisateurs de l'API. Expose la liste des utilisateurs et porte les données d'identité (nom, e-mail) et le rôle de chacun. C'est l'une des deux ressources métier autour desquelles l'API existe.
- **Entités** : collection `users` en mémoire — objets `{ id, name, email, role }` (`src/routes/users.js:3-7`).
- **Routes / points d'entrée** : `GET /users` → `listUsers()` (`src/server.js:14-16`).
- **Indices de rattachement** : fichier `src/routes/users.js` ; fonction exposée `listUsers` ; champ `role` ; import dans `src/server.js:3`.
- **Types de workflows attendus** : consultation de l'annuaire (`GET /users`). À terme, création/mise à jour d'un utilisateur (non présent aujourd'hui — aucune route d'écriture).
- **Helpers internes non exposés** : `getUserById(id)` (`src/routes/users.js:13-15`) est défini et importé (`src/server.js:3`) mais **jamais appelé** par aucune route ; `isAdmin(user)` (`src/routes/users.js:17-19`) est exporté (`src/routes/users.js:21`) mais **jamais importé ni appelé**. Ce sont des helpers présents dans le code, pas des workflows observables du dépôt (voir Incertitudes : « amorce d'autorisation par rôle »).
- **Preuves** : `src/routes/users.js:3-21`, `src/server.js:3`, `src/server.js:14-16`.
- **Dépend de la base** : non.

### Commandes (`commandes`)
- **Catégorie** : métier
- **Priorité** : cœur
- **Confiance** : high
- **Description** : gestion des commandes rattachées aux utilisateurs. Porte la seule logique métier non triviale du dépôt : filtrage par utilisateur (`userId`) et exclusion des commandes annulées (`active=true`). C'est ici que vit le **bug volontaire du pilote** (voir preuves).
- **Entités** : collection `orders` en mémoire — objets `{ id, userId, total, status }` avec `status` ∈ {`paid`, `cancelled`} (`src/routes/orders.js:3-8`). Lien `userId` vers le domaine `utilisateurs`.
- **Routes / points d'entrée** : `GET /orders`, avec paramètres de requête `userId` (filtre par utilisateur) et `active=true` (filtre les annulées) (`src/server.js:18-26`).
- **Indices de rattachement** : fichier `src/routes/orders.js` ; fonctions `listOrders`, `getOrdersByUser`, `filterActiveOrders` ; champ `status`, param `active`.
- **Types de workflows attendus** : liste des commandes, commandes d'un utilisateur, liste des commandes « actives » (non annulées).
- **Preuves** : `src/routes/orders.js:3-26`, `src/server.js:4`, `src/server.js:18-26`. **Bug connu** : `filterActiveOrders` compare `status !== "canceled"` (orthographe US) alors que les données portent `"cancelled"` — le filtre n'exclut donc jamais rien (`src/routes/orders.js:22-24`) ; test rouge reproduisant le défaut dans `test/orders.test.js:5-19`. Bug documenté comme volontaire dans `README.md:9`.
- **Dépend de la base** : non.

### API HTTP & routage (`api-http-routage`)
- **Catégorie** : technique
- **Priorité** : support
- **Confiance** : high
- **Description** : socle technique transverse qui fait tourner le service — création du serveur `node:http`, parsing d'URL, aiguillage (méthode + chemin) vers les domaines métier, sérialisation JSON des réponses, réponse 404 par défaut, lecture du port depuis l'environnement. Ne porte aucune logique métier : il orchestre l'accès aux domaines `utilisateurs` et `commandes`.
- **Entités** : aucune (couche transport).
- **Routes / points d'entrée** : le dispatcher `http.createServer(...)` (`src/server.js:11-29`) ; helper `sendJson` (`src/server.js:6-9`) ; démarrage conditionnel sur `PORT` (`src/server.js:31-36`).
- **Indices de rattachement** : fichier `src/server.js` ; `http.createServer`, `sendJson`, `new URL(...)`, `res.writeHead`, `process.env.PORT`.
- **Types de workflows attendus** : ajout de routes/méthodes, gestion d'erreurs et de statuts HTTP, middleware transverse (aujourd'hui inexistant).
- **Preuves** : `src/server.js:1-38`.
- **Dépend de la base** : non.

---

**Détection de contenu piloté par la base (méthode §6)** : recherche des trois signaux effectuée — **aucun trouvé**. Pas d'accès base fourni (signal schéma non testable). Aucune entité métier n'est étendue d'un champ `layout`/`blocks`/`config`/`content` (les entités `users`/`orders` sont des objets plats à champs scalaires — `src/routes/users.js:3-7`, `src/routes/orders.js:3-8`). Aucun service ne décode ni ne parcourt récursivement une structure arborescente à l'exécution (pas de `json_decode`/`JSON.parse` récursif, pas de `*Renderer`/`*Resolver` — le seul parsing est celui de l'URL de requête, `src/server.js:12`). **Aucun domaine ne dépend de la base.**

## Incertitudes

- **Amorce d'autorisation par rôle — repliée dans `utilisateurs`, pas un domaine.** La donnée porte un `role` (`admin` / `customer`, `src/routes/users.js:4-6`) et un prédicat `isAdmin(user)` existe (`src/routes/users.js:17-19`), mais **aucun contrôle d'accès n'est câblé** : `isAdmin` est exporté puis jamais importé ni appelé, et le serveur n'importe même pas ce prédicat (`src/server.js:3` importe seulement `listUsers`/`getUserById`). Un champ de donnée plus un helper mort ne suffisent pas à établir un domaine technique distinct : c'est un **signal faible / question ouverte** rangé sous `utilisateurs`, non un domaine à part entière. Question : (a) amorce d'autorisation à câbler, (b) helper de démo, ou (c) bruit ? Non tranchable sans intention produit.
- **Helper `getUserById` non exposé.** Défini et importé mais jamais appelé (`src/routes/users.js:13-15`, `src/server.js:3`) : pas de route « lookup par id ». Mentionné comme helper interne, pas comme workflow du dépôt.
- **Décompte volontairement modeste.** 3 domaines prouvés seulement — deux ressources métier (`utilisateurs`, `commandes`) et une couche serveur HTTP (`api-http-routage`), ce qui recoupe exactement le `README.md:7-10`. Le dépôt étant déclaré jouet et jetable (`README.md:1-3`), ce nombre bas est un signe de rigueur, pas un manque de couverture : je n'ai pas fabriqué de quatrième domaine pour atteindre un plancher formel.
- **Aucune observation runtime ni base.** Tout est `VÉRIFIÉ_CODE`. Le comportement réel des routes (codes, payloads) et l'existence d'une persistance en environnement réel restent `INCONNU` faute d'exécution et d'accès base — cohérent avec le fait qu'aucune persistance n'apparaît dans le source.

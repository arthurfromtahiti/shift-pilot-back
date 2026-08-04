# Cartographie du code — shift-pilot-back

> **Confiance : high**
> 
> Structure technique du projet, domaines aux fichiers source, points d'entrée, fichiers critiques. Synthèse des audits architecture et hotspots. Tous les fichiers source lus intégralement — aucun domaine basé sur un échantillon.

## Structure générale

```
shift-pilot-back/
├── src/
│   ├── server.js         [dispatcher HTTP, routage, orchestration]
│   ├── routes/
│   │   ├── users.js      [domaine utilisateurs]
│   │   └── orders.js     [domaine commandes]
├── test/
│   └── orders.test.js    [tests d'acceptation]
├── package.json          [1 dépendance : lodash]
├── README.md             [déclaration pilote SHIFT]
```

**3 fichiers source, 1 fichier de test, 1 dépendance externe** : `lodash` (utilisée dans `orders.js:3` via `_.sortBy`).

## Domaines et fichiers

### Domaine : `utilisateurs` (métier, priorité cœur)

**Rôle** : annuaire en mémoire des utilisateurs exposé par `GET /users` et `GET /users/:id` (`src/routes/users.js`).

**Fichiers**
| Fichier | Rôle | Confiance |
|---------|------|-----------|
| `src/routes/users.js` | Données + logique métier | high |
| `src/server.js` (lignes 4, 16-17, 20-25) | Dispatcher HTTP vers users | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `users` | Data (const array) | 3-7 | Tableau littéral, 3 objets `{id, name, email, role}`. Données figées en mémoire. |
| `listUsers()` | Function export | 9-11 | Retourne `users` complet. Aucun paramètre, aucun filtre. |
| `getUserById(id)` | Function export | 13-15 | Lookup par ID via `find()`. Importée dans server.js:4. Appelée par GET /users/:id (server.js:22) et par GET /orders (server.js:41) pour enrichir chaque commande avec `clientName` (CLA-187). |
| `isAdmin(user)` | Function export | 17-19 | Prédicat : `user !== null && user.role === "admin"`. Exportée, jamais importée. |
| Route HTTP | GET /users | server.js:16-17 | `GET /users` → `listUsers()` → JSON 200 |
| Route HTTP | GET /users/:id | server.js:20-25 | `GET /users/:id` → `getUserById(id)` → JSON 200 / 404 si absent (CLA-187) |

**Points critiques**
- **Export mort** : `isAdmin` exporté ligne 21 de users.js, jamais consommé — squelette d'autorisation déconnecté.
- **Données brutes en réponse** : champ `role` exposé sans contrôle d'accès (src/routes/users.js:4-6, src/server.js:16-17).

### Domaine : `commandes` (métier, priorité cœur)

**Rôle** : gestion des commandes avec filtrage par utilisateur, statut et mode actif.

**Fichiers**
| Fichier | Rôle | Confiance |
|---------|------|-----------|
| `src/routes/orders.js` | Données + logique métier | high |
| `src/server.js` (lignes 6, 27-44) | Dispatcher HTTP vers orders | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `orders` | Data (const array) | 5-10 | Tableau littéral, 4 objets `{id, userId, total, status}`. `total` en XPF. Statut ∈ {`"paid"`, `"cancelled"`} (double l). |
| `listOrders()` | Function export | 12-14 | Retourne `orders` triés par id (via `_.sortBy`). |
| `getOrdersByUser(userId)` | Function export | 16-18 | Filtre par `order.userId === userId`. Fonctionne correctement. |
| `filterActiveOrders(orderList)` | Function export | 20-22 | Exclut les commandes `"cancelled"`. Bug orthographique ("canceled" vs "cancelled") corrigé en CLA-195. |
| `filterByStatus(orderList, status)` | Function export | 24-26 | Filtre par valeur de statut exacte (`order.status === status`). |
| `getOrderById(id)` | Function export | 28-30 | Lookup par ID via `find()`. Importée dans server.js:6 mais non appelée (route `/orders/:id` inexistante). |
| Route HTTP | GET /orders | server.js:27-44 | `GET /orders` avec params optionnels `userId`, `active`, `status` → JSON 200. |

**Composition des filtres** (`src/server.js:35-43`)
```
1. Si userId fourni → getOrdersByUser(userId)
2. Sinon → listOrders()
3. Normaliser statusParam ("canceled" → "cancelled")
4. Si activeOnly vrai ET status null → filterActiveOrders(result)
5. Si status fourni → filterByStatus(result, status)
6. Enrichir chaque commande avec clientName via getUserById() (server.js:40-42)
7. Retourner result
```

**Points critiques**
- **Import inutilisé** : `getOrderById` importée dans server.js:6, aucune route ne l'appelle.
- **Validation d'entrée absente** : `userId=abc` → `NaN` silencieux, pas d'erreur 400.

### Domaine : `api-http-routage` (technique, priorité support)

**Rôle** : socle HTTP transverse. Parsing d'URL, dispatch par méthode+chemin, sérialisation JSON, fallback 404. N'expose aucune logique métier.

**Fichiers**
| Fichier | Rôle | Confiance |
|---------|------|-----------|
| `src/server.js` | Dispatcher, orchestration, démarrage | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `sendJson(res, status, body)` | Function | 8-11 | Écrit en-têtes + sérialise JSON. Code réutilisable. |
| Dispatcher | if-else block | 13-47 | Parse `req.url`, teste méthode+chemin, délègue ou retourne 404. |
| `new URL(req.url, ...)` | URL parsing | 14 | Parse relative à `http://${req.headers.host}` — préserve chemin + query string. |
| Routes GET /users | if-block | 16-17 | Branchement `→ listUsers()`. |
| Routes GET /users/:id | if-block | 20-25 | Lookup par ID via `getUserById()` ; retourne 404 si absent (CLA-187). |
| Routes GET /orders | if-block | 27-44 | Branchement + orchestration filtres (userId, active, status). Paramètres optionnels fournis par query string, appliqués en cascade. Chaque commande est enrichie avec `clientName` via lookup `getUserById()` (server.js:40-42, CLA-187). **C'est ici que la logique métier est composée.** |
| Fallback 404 | if-block | 46 | Tout ce qui ne match pas → 404 + `{error: "Not found"}`. |
| `require.main === module` | Conditional | 50-53 | Démarre le serveur uniquement si invoqué directement (pas si importé en test). |
| `module.exports = server` | Export | 56 | Permet d'importer le serveur en test et de le décorer (ex. faire des requêtes HTTP). |

**Points critiques**
- **Multi-responsabilité** : parsing HTTP + routage + orchestration métier dans un seul fichier. Acceptable à 56 lignes actuellement. Debt dès la 5ème-6ème route ajoutée.
- **Aucun middleware transverse** : pas de try/catch global, pas de middleware d'erreur. Une exception non attrapée crasherait le processus sans réponse HTTP.
- **Seul point de modification pour toute évolution fonctionnelle** : ajouter une route, un paramètre, un filtre passe obligatoirement par ce fichier.

## Points d'entrée

### HTTP (points d'accès du système)

| Méthode | Chemin | Code | Domaine | Comportement |
|---------|--------|------|---------|---|
| GET | `/users` | server.js:16-17 | utilisateurs | Retourne annuaire complet (200 + JSON) |
| GET | `/users/:id` | server.js:20-25 | utilisateurs | Retourne utilisateur par ID (200) ou 404 si absent (CLA-187) |
| GET | `/orders` | server.js:27-44 | commandes | Retourne commandes filtrées et enrichies avec clientName (userId, active, status) |
| (any) | (autre) | server.js:46 | — | 404 + `{error: "Not found"}` |

### Exports du système (pour test/import)

| Export | Fichier | Usage |
|--------|---------|-------|
| `listUsers()` | users.js:9-11 | Exposé via GET /users. Importé : server.js:4. |
| `getUserById(id)` | users.js:13-15 | Importé : server.js:4. Appelé par GET /users/:id (server.js:22) et GET /orders (server.js:41) pour enrichir chaque commande avec clientName (CLA-187). |
| `isAdmin(user)` | users.js:17-19 | Exporté ligne 21. **Jamais importé.** |
| `listOrders()` | orders.js:12-14 | Utilisé via GET /orders sans filtre. Retourne les commandes triées par id. Importé : server.js:6. |
| `getOrdersByUser(id)` | orders.js:16-18 | Utilisé par GET /orders?userId=. Importé : server.js:6. |
| `filterActiveOrders(orderList)` | orders.js:20-22 | Utilisé par GET /orders?active=true. Exclut les commandes `"cancelled"`. Importé : server.js:6. |
| `filterByStatus(orderList, status)` | orders.js:24-26 | Utilisé par GET /orders?status=. Filtre par valeur de statut. Importé : server.js:6. |
| `getOrderById(id)` | orders.js:28-30 | Importé : server.js:6. **Jamais appelé** (route /orders/:id inexistante). |
| `server` (http.Server) | server.js:56 | Exporté pour import en test. |

## Fichiers critiques (hotspots d'évolution)

### 1. `src/server.js` (hotspot primaire)

**Criticité** : haute. Tout changement fonctionnel passe ici.

**Changements attendus**
- Ajouter une route → nouvel `if` vers la ligne ~20
- Ajouter un paramètre de requête → lecture supplémentaire vers la ligne ~28-30
- Ajouter un middleware → wrapping du dispatcher ligne ~13-47
- Ajouter de la gestion d'erreur → try/catch autour du handler

**Risques**
- Dispatcher sans refactoring dépassera 50-100 lignes rapidement
- Pas de structure de routage (map, router explicite)
- Composition métier (lignes 35-43) reste libre — pas de pattern déclaratif

### 2. `src/routes/orders.js` (hotspot secondaire — filtres)

**Criticité** : moyenne. Évolution fonctionnelle principale du filtre commandes.

**État actuel** : Bug orthographique corrigé (CLA-195). `filterActiveOrders()` exclut correctement les `"cancelled"`. `filterByStatus()` ajoutée (CLA-195). Dépendance `lodash` (_.sortBy dans listOrders, ligne 3). `getOrderById` exportée mais non appelée par aucune route.

**Changements attendus**
- Ajouter un filtre supplémentaire → nouvelle fonction + ajout dans module.exports (ligne 32) + branchement dans server.js

### 3. `src/routes/users.js:17-19` (hotspot secondaire — export mort)

**Criticité** : faible. Décision produit requise.

**État actuel** : `getUserById` est **utilisée** dans GET /users/:id (server.js:22) et dans GET /orders (server.js:41) pour enrichir avec clientName (CLA-187). `isAdmin` reste un export mort.

**Options restantes**
- (a) Câbler contrôle d'accès (utiliser `isAdmin`)
- (b) Retirer `isAdmin` exporté si jamais utilisée

## Zones de faible confiance

Aucune. Tous les fichiers source ont été lus intégralement.

## Preuves

**Architecture générale** : src/server.js:1-56 (lu intégralement, 56 lignes)

**Domaine utilisateurs** : src/routes/users.js:1-21 (lu intégralement, 21 lignes)

**Domaine commandes** : src/routes/orders.js:1-32 (lu intégralement, 32 lignes)

**Package** : package.json (dépendance lodash ^4.18.1, engines node>=18)

**Tests** : test/orders.test.js (tests d'acceptation : clientName, total XPF, filtres)

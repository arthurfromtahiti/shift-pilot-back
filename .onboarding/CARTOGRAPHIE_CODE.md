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
│   └── orders.test.js    [test du bug volontaire]
├── package.json          [aucune dépendance]
├── README.md             [déclaration pilote SHIFT]
```

**3 fichiers source, 1 fichier de test, aucune dépendance externe** : `package.json` vide.

## Domaines et fichiers

### Domaine : `utilisateurs` (métier, priorité cœur)

**Rôle** : annuaire en mémoire des utilisateurs exposé par `GET /users` (`src/routes/users.js`).

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
| `getUserById(id)` | Function export | 13-15 | Lookup par ID via `find()`. Utilisée par GET /users/:id (server.js:22) pour retourner un utilisateur unique, et par GET /orders (server.js:45) pour enrichir chaque commande avec clientName (CLA-187). |
| `isAdmin(user)` | Function export | 17-19 | Prédicat : `user !== null && user.role === "admin"`. Exportée, jamais importée. |
| Route HTTP | GET /users | server.js:14-16 | `GET /users` → `listUsers()` → JSON 200 |

**Points critiques**
- **Export mort** : `isAdmin` exporté ligne 21 de users.js, jamais consommé — squelette d'autorisation déconnecté.
- **Données brutes en réponse** : champ `role` exposé sans contrôle d'accès (src/routes/users.js:4-6, src/server.js:16-17).

### Domaine : `commandes` (métier, priorité cœur)

**Rôle** : gestion des commandes avec filtrage par utilisateur et statut. Porte le bug volontaire du pilote (corrigé en CLA-195).

**Fichiers**
| Fichier | Rôle | Confiance |
|---------|------|-----------|
| `src/routes/orders.js` | Données + logique métier | high |
| `src/server.js` (lignes 6, 27-44) | Dispatcher HTTP vers orders | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `orders` | Data (const array) | 5-10 | Tableau littéral, 4 objets `{id, userId, total, status}`. `total` en XPF (42, 18, 96, 30). Statut ∈ {`"paid"`, `"cancelled"`} (double l). |
| `listOrders()` | Function export | 12-14 | Retourne `orders` triés par id. |
| `getOrdersByUser(userId)` | Function export | 16-18 | Filtre par `order.userId === userId`. Fonctionne correctement. |
| `filterActiveOrders(orderList)` | Function export | 20-22 | Filtre les commandes actives : `order.status !== "cancelled"`. Fonctionne correctement. |
| `filterByStatus(orderList, status)` | Function export | 24-26 | Filtre par statut exact (`order.status === status`). |
| `getOrderById(id)` | Function export | 28-30 | Lookup par ID via `find()`. Exportée ligne 32 de orders.js, non appelée actuellement. |
| Route HTTP | GET /orders | server.js:27-41 | `GET /orders` avec params optionnels `userId`, `active`, `status` → JSON 200. |

**Composition des filtres** (`src/server.js:28-40`)
```
1. Si userId fourni → getOrdersByUser(userId)
2. Sinon → listOrders()
3. Normaliser status param ("canceled" → "cancelled")
4. Si activeOnly vrai ET status null → filterActiveOrders(result)
5. Si status fourni → filterByStatus(result, status)
6. Retourner result
```

**Points critiques**
- **Filtre actif fonctionnel** : `filterActiveOrders()` compare correctement à `"cancelled"`. Le bug orthographique a été corrigé en CLA-195.
- **Filtre par statut** : `filterByStatus()` permet un filtrage explicite par valeur de statut (nouveau en CLA-195).
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
| Dispatcher | if-else block | 13-50 | Parse `req.url`, teste méthode+chemin, délègue ou retourne 404. |
| `new URL(req.url, ...)` | URL parsing | 14 | Parse relative à `http://${req.headers.host}` — préserve chemin + query string. |
| Routes GET /users | if-block | 16-17 | Branchement `→ listUsers()`. |
| Routes GET /users/:id | if-block | 20-25 | Lookup par ID via `getUserById()` ; retourne 404 si absent (CLA-187). |
| Routes GET /orders | if-block | 27-43 | Branchement + orchestration filtres (userId, active, status). Paramètres optionnels fournis par query string, appliqués en cascade. Chaque commande est enrichie avec `clientName` via lookup `getUserById()` (server.js:40-42, CLA-187). **C'est ici que la logique métier est composée.** |
| Fallback 404 | if-block | 49 | Tout ce qui ne match pas → 404 + `{error: "Not found"}`. |
| `require.main === module` | Conditional | 53-57 | Démarre le serveur uniquement si invoqué directement (pas si importé en test). |
| `module.exports = server` | Export | 59 | Permet d'importer le serveur en test et de le décorer (ex. faire des requêtes HTTP). |

**Points critiques**
- **Multi-responsabilité** : parsing HTTP + routage + orchestration métier dans un seul fichier. Acceptable à 60 lignes actuellement. Debt dès la 5ème-6ème route ajoutée.
- **Aucun middleware transverse** : pas de try/catch global, pas de middleware d'erreur. Une exception non attrapée crasherait le processus sans réponse HTTP.
- **Seul point de modification pour toute évolution fonctionnelle** : ajouter une route, un paramètre, un filtre passe obligatoirement par ce fichier.

## Points d'entrée

### HTTP (points d'accès du système)

| Méthode | Chemin | Code | Domaine | Comportement |
|---------|--------|------|---------|---|
| GET | `/users` | server.js:16-17 | utilisateurs | Retourne annuaire complet (200 + JSON) |
| GET | `/users/:id` | server.js:20-25 | utilisateurs | Retourne utilisateur par ID ou 404 (CLA-187) |
| GET | `/orders` | server.js:27-41 | commandes | Retourne commandes filtrées (userId, active, status) |
| (any) | (autre) | server.js:49 | — | 404 + `{error: "Not found"}` |

### Exports du système (pour test/import)

| Export | Fichier | Usage |
|--------|---------|-------|
| `listUsers()` | users.js:9-11 | Exposé via GET /users. Importé : server.js:4. |
| `getUserById(id)` | users.js:13-15 | Importé : server.js:4. Appelé par GET /users/:id (server.js:22) pour retourner un utilisateur unique, et par GET /orders (server.js:41) pour enrichir les commandes avec clientName (CLA-187). |
| `isAdmin(user)` | users.js:17-19 | Exporté ligne 21. **Jamais importé.** |
| `listOrders()` | orders.js:12-14 | Utilisé via GET /orders sans filtre. Retourne les commandes triées par id. Importé : server.js:6. |
| `getOrdersByUser(id)` | orders.js:16-18 | Utilisé par GET /orders?userId=. Importé : server.js:6. |
| `filterActiveOrders(orderList)` | orders.js:20-22 | Utilisé par GET /orders?active=true. Filtre les commandes actives. Importé : server.js:6. |
| `filterByStatus(orderList, status)` | orders.js:24-26 | Utilisé par GET /orders?status=. Filtre par statut exact. Importé : server.js:6. |
| `getOrderById(id)` | orders.js:28-30 | Exporté ligne 32. **Non appelé actuellement.** |
| `server` (http.Server) | server.js:59 | Exporté pour import en test. |

## Fichiers critiques (hotspots d'évolution)

### 1. `src/server.js` (hotspot primaire)

**Criticité** : haute. Tout changement fonctionnel passe ici.

**Changements attendus**
- Ajouter une route → nouvel `if` ligne ~18-20
- Ajouter un paramètre de requête → lecture supplémentaire ligne ~19-20
- Ajouter un middleware → wrapping du dispatcher ligne ~11-29
- Ajouter de la gestion d'erreur → try/catch autour du handler

**Risques**
- Dispatcher sans refactoring dépassera 50-100 lignes rapidement
- Pas de structure de routage (map, router explicite)
- Composition métier (lignes 22-23) reste libre — pas de pattern déclaratif

### 2. `src/routes/orders.js` (hotspot secondaire — filtres)

**Criticité** : moyenne. Évolution fonctionnelle principale du filtre commandes.

**État actuel** : Bug volontaire **corrigé** en CLA-195. `filterActiveOrders()` compare correctement à `"cancelled"` (ligne 21). Filtre par statut présent : `filterByStatus()` (lignes 24-26). Fonction `getOrderById()` exportée (lignes 28-30) mais non utilisée pour le moment.

**Livraisons récentes** : CLA-187 câble le lookup utilisateur dans GET /orders pour enrichir chaque commande avec `clientName` via `getUserById()` (server.js:40-42).

**Options de futur évolutif**
- Ajouter une fonction `filterByDate()` ou `filterByAmount()` si le domaine l'exige
- Câbler `getOrderById()` si une route `GET /orders/:id` est projetée

### 3. `src/routes/users.js:3,17-19` (hotspot secondaire — imports morts)

**Criticité** : faible. Décision produit requise.

**Options**
- (a) Câbler route `GET /users/:id` (utiliser `getUserById`)
- (b) Retirer l'import mort de `server.js:3`
- (c) Câbler contrôle d'accès (utiliser `isAdmin`)
- (d) Retirer `isAdmin` exporté

## Zones de faible confiance

Aucune. Tous les fichiers source ont été lus intégralement.

## Preuves

**Architecture générale** : src/server.js:1-60 (lu intégralement, 60 lignes)

**Domaine utilisateurs** : src/routes/users.js:1-21 (lu intégralement, 21 lignes)

**Domaine commandes** : src/routes/orders.js:1-30 (lu intégralement, 30 lignes)

**Package** : package.json (aucune dépendance, engines node>=18)

**Tests** : test/orders.test.js (test volontaire : démontre le bug de filterActiveOrders qui ne filtre rien)

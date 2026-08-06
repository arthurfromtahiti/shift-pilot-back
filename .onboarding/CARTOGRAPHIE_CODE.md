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
| `src/server.js` (lignes 4, 64-65, 68-73) | Dispatcher HTTP vers users | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `users` | Data (const array) | 3-7 | Tableau littéral, 3 objets `{id, name, email, role}`. Données figées en mémoire. |
| `listUsers()` | Function export | 9-11 | Retourne `users` complet. Aucun paramètre, aucun filtre. |
| `getUserById(id)` | Function export | 13-15 | Lookup par ID via `find()`. Importée dans server.js:4. Appelée par GET /users/:id (server.js:70) et par `getFilteredOrders` (server.js:43) pour enrichir chaque commande avec `clientName` et `clientEmail` (CLA-187, SHIAAAAAAAAAAAAAAAAAAAAAAAA-240). |
| `isAdmin(user)` | Function export | 17-19 | Prédicat : `user !== null && user.role === "admin"`. Exportée, jamais importée. |
| Route HTTP | GET /users | server.js:64-65 | `GET /users` → `listUsers()` → JSON 200 |
| Route HTTP | GET /users/:id | server.js:68-73 | `GET /users/:id` → `getUserById(id)` → JSON 200 / 404 si absent (CLA-187) |

**Points critiques**
- **Export mort** : `isAdmin` exporté ligne 21 de users.js, jamais consommé — squelette d'autorisation déconnecté.
- **Données brutes en réponse** : champ `role` exposé sans contrôle d'accès (src/routes/users.js:4-6, src/server.js:64-65).

### Domaine : `commandes` (métier, priorité cœur)

**Rôle** : gestion des commandes avec filtrage par utilisateur, statut, mode actif, et plage de dates (CLA-186), avec tri par date.

**Fichiers**
| Fichier | Rôle | Confiance |
|---------|------|-----------|
| `src/routes/orders.js` | Données + logique métier | high |
| `src/server.js` (lignes 6, 13-50, 75-108) | Dispatcher HTTP vers orders | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `orders` | Data (const array) | 7-12 | Tableau littéral, 4 objets `{id, userId, total, status, createdAt}`. `total` en XPF. Statut ∈ {`"paid"`, `"cancelled"`} (double l). `createdAt` ISO 8601 UTC (CLA-225). |
| `listOrders()` | Function export | 14-16 | Retourne `orders` triés par id (via `_.sortBy`). |
| `getOrdersByUser(userId)` | Function export | 18-20 | Filtre par `order.userId === userId`. Fonctionne correctement. |
| `filterActiveOrders(orderList)` | Function export | 22-24 | Exclut les commandes `"cancelled"`. Bug orthographique corrigé en CLA-195. |
| `filterByStatus(orderList, status)` | Function export | 26-28 | Filtre par valeur de statut exacte (`order.status === status`). |
| `getOrderById(id)` | Function export | 30-32 | Lookup par ID via `find()`. Importée dans server.js:6 mais non appelée (route `/orders/:id` inexistante). |
| `normalize(s)` | Function (interne) | 34-36 | Normalise une chaîne : suppression diacritiques (NFD), conversion minuscules. Utile pour recherche insensible à la casse. |
| `filterByCustomerName(orderList, customerName)` | Function export | 38-43 | Filtre les commandes par nom de client (substring, insensible à la casse). Exclut les commandes avec `clientName=null`. Chaque objet dans orderList doit porter `clientName` (enrichi par server.js:42-45). SHIAAAAAAAAAAAAAAAAAAAAAAAA-7. |
| `DEFAULT_CURRENCY` | Constant export | 5 | Devise par défaut `"XPF"`. Utilisée lors de l'enrichissement pour ajouter le champ `currency` à chaque commande (server.js:44, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235). |
| Route HTTP | GET /orders | server.js:93-108 | `GET /orders` avec params optionnels `userId`, `active`, `status`, `sort` (date_asc, date_desc, amount_asc, amount_desc), `from`, `to`, `customerName`, `page`, `limit` → JSON 200 avec réponse structurée `{ orders: [...], pagination: { total, page, limit, totalPages } }`. Chaque commande inclut `clientName`, `clientEmail`, `currency` en plus des champs natifs (SHIAAAAAAAAAAAAAAAAAAAAAAAA-235). |
| Route HTTP | GET /orders/export.csv | server.js:75-91 | Export CSV sans pagination. BOM UTF-8 (`\uFEFF`), Content-Type `text/csv; charset=utf-8`, Content-Disposition avec date UTC. En-tête `id;date;clientName;clientEmail;montant;devise;statut`. Mêmes filtres que GET /orders via `getFilteredOrders()` sans page/limit. (SHIAAAAAAAAAAAAAAAAAAAAAAAA-310) |

**Composition des filtres** — étapes 1–9 dans `getFilteredOrders(url)` (`src/server.js:13-50`), étapes 10–12 dans GET /orders (`src/server.js:96-107`)
```
1. Si userId fourni → getOrdersByUser(userId)
2. Sinon → listOrders()
3. Normaliser statusParam ("canceled" → "cancelled")
4. Si activeOnly vrai ET status null → filterActiveOrders(result)
5. Si status fourni → filterByStatus(result, status)
6. Si from/to fournis (format YYYY-MM-DD valide) → filtre par plage de dates sur createdAt (CLA-186)
7. Si sort fourni → trier :
   - sort=date_asc → tri croissant par createdAt (CLA-186)
   - sort=date_desc → tri décroissant par createdAt (CLA-186)
   - sort=amount_asc → tri croissant par total (SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
   - sort=amount_desc → tri décroissant par total (SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
   - autre → pas de tri (valeurs ignorées silencieusement)
8. Enrichir chaque commande avec clientName, clientEmail, et currency via getUserById() + DEFAULT_CURRENCY (server.js:42-45, CLA-187, SHIAAAAAAAAAAAAAAAAAAAAAAAA-240, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
9. Si customerName fourni → filterByCustomerName(enriched, customerName) (server.js:47, SHIAAAAAAAAAAAAAAAAAAAAAAAA-7)
   — GET /orders/export.csv s'arrête ici (retourne getFilteredOrders(url) complet, sans pagination)
10. Pagination : lire params page et limit, parser avec clampage silencieux (page défaut 1, min 1 ; limit défaut 20, min 1, max 100) (server.js:96-101, SHIAAAAAAAAAAAAAAAAAAAAAAAA-249, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
11. Calculer total (nb items enrichis), totalPages (≥1), découper slice par (page-1)*limit (server.js:103-105, SHIAAAAAAAAAAAAAAAAAAAAAAAA-249, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
12. Retourner objet structuré { orders: [...], pagination: { total, page, limit, totalPages } } (server.js:107, SHIAAAAAAAAAAAAAAAAAAAAAAAA-249, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
```

**Points critiques**
- **Import inutilisé** : `getOrderById` exportée dans orders.js:30, aucune route ne l'appelle.
- **Validation d'entrée absente** : `userId=abc` → `NaN` silencieux, pas d'erreur 400.
- **Ordre de filtrage** : le filtre `customerName` s'applique **après** enrichissement (`clientName`). C'est intentionnel : il filtre sur le nom résolu de l'utilisateur propriétaire.

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
| `getFilteredOrders(url)` | Function | 13-50 | Pipeline filtres étapes 1–9 partagée par GET /orders et GET /orders/export.csv. Lit les query params, applique les filtres, enrichit avec clientName/clientEmail/currency. |
| `csvEscape(value)` | Function | 52-59 | Échappement RFC 4180 avec `;` comme délimiteur. Quote les valeurs contenant `;`, `"`, CR ou LF, et double les guillemets internes. |
| Dispatcher | if-else block | 61-111 | Parse `req.url`, teste méthode+chemin, délègue ou retourne 404. |
| `new URL(req.url, ...)` | URL parsing | 62 | Parse relative à `http://${req.headers.host}` — préserve chemin + query string. |
| Routes GET /users | if-block | 64-65 | Branchement `→ listUsers()`. |
| Routes GET /users/:id | if-block | 68-73 | Lookup par ID via `getUserById()` ; retourne 404 si absent (CLA-187). |
| Routes GET /orders/export.csv | if-block | 75-91 | Export CSV sans pagination. BOM UTF-8, Content-Type `text/csv; charset=utf-8`, Content-Disposition avec date UTC, en-tête `id;date;clientName;clientEmail;montant;devise;statut`. Appelle `getFilteredOrders()` sans page/limit. (SHIAAAAAAAAAAAAAAAAAAAAAAAA-310) |
| Routes GET /orders | if-block | 93-108 | Branchement + pagination (étapes 10–12). Appelle `getFilteredOrders()`, applique page/limit avec clampage silencieux, retourne `{ orders, pagination }` (SHIAAAAAAAAAAAAAAAAAAAAAAAA-249). **C'est ici que la logique métier est composée.** |
| Fallback 404 | if-block | 110 | Tout ce qui ne match pas → 404 + `{error: "Not found"}`. |
| `require.main === module` | Conditional | 113-117 | Démarre le serveur uniquement si invoqué directement (pas si importé en test). |
| `module.exports = server` | Export | 120 | Permet d'importer le serveur en test et de le décorer (ex. faire des requêtes HTTP). |

**Points critiques**
- **Multi-responsabilité** : parsing HTTP + routage + orchestration métier dans un seul fichier. Actuellement 120 lignes (logique d'enrichissement + pagination pour GET /orders + export CSV, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235, SHIAAAAAAAAAAAAAAAAAAAAAAAA-310). Debt dès la 5ème-6ème route ajoutée.
- **Aucun middleware transverse** : pas de try/catch global, pas de middleware d'erreur. Une exception non attrapée crasherait le processus sans réponse HTTP.
- **Seul point de modification pour toute évolution fonctionnelle** : ajouter une route, un paramètre, un filtre passe obligatoirement par ce fichier.

## Points d'entrée

### HTTP (points d'accès du système)

| Méthode | Chemin | Code | Domaine | Comportement |
|---------|--------|------|---------|---|
| GET | `/users` | server.js:64-65 | utilisateurs | Retourne annuaire complet (200 + JSON) |
| GET | `/users/:id` | server.js:68-73 | utilisateurs | Retourne utilisateur par ID (200) ou 404 si absent (CLA-187) |
| GET | `/orders/export.csv` | server.js:75-91 | commandes | Export CSV de toutes les commandes filtrées (sans pagination). BOM UTF-8, délimiteur `;`, filename commandes-YYYY-MM-DD.csv. Mêmes filtres que GET /orders sans page/limit. (SHIAAAAAAAAAAAAAAAAAAAAAAAA-310) |
| GET | `/orders` | server.js:93-108 | commandes | Retourne commandes filtrées et enrichies avec clientName, clientEmail, currency (userId, active, status, from, to, sort, customerName, page, limit) ; réponse structurée { orders: [...], pagination: { total, page, limit, totalPages } }. Sort support date_asc, date_desc, amount_asc, amount_desc (SHIAAAAAAAAAAAAAAAAAAAAAAAA-235). |
| (any) | (autre) | server.js:110 | — | 404 + `{error: "Not found"}` |

### Exports du système (pour test/import)

| Export | Fichier | Usage |
|--------|---------|-------|
| `listUsers()` | users.js:9-11 | Exposé via GET /users. Importé : server.js:4. |
| `getUserById(id)` | users.js:13-15 | Importé : server.js:4. Appelé par GET /users/:id (server.js:70) et par `getFilteredOrders` (server.js:43) pour enrichir chaque commande avec clientName et clientEmail (CLA-187, SHIAAAAAAAAAAAAAAAAAAAAAAAA-240). |
| `isAdmin(user)` | users.js:17-19 | Exporté ligne 21. **Jamais importé.** |
| `listOrders()` | orders.js:14-16 | Utilisé via GET /orders sans filtre. Retourne les commandes triées par id. Importé : server.js:6. |
| `getOrdersByUser(id)` | orders.js:18-20 | Utilisé par GET /orders?userId=. Importé : server.js:6. |
| `filterActiveOrders(orderList)` | orders.js:22-24 | Utilisé par GET /orders?active=true. Exclut les commandes `"cancelled"`. Importé : server.js:6. |
| `filterByStatus(orderList, status)` | orders.js:26-28 | Utilisé par GET /orders?status=. Filtre par valeur de statut. Importé : server.js:6. |
| `filterByCustomerName(orderList, customerName)` | orders.js:38-43 | Utilisé par GET /orders?customerName=. Filtre par nom de client (substring, insensible à la casse). Importé : server.js:6. SHIAAAAAAAAAAAAAAAAAAAAAAAA-7. |
| `DEFAULT_CURRENCY` | orders.js:5 | Devise par défaut `"XPF"`. Importé : server.js:6. Utilisé pour enrichir chaque commande avec le champ `currency` (server.js:44, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235). |
| `getOrderById(id)` | orders.js:30-32 | Importé : server.js:6. **Jamais appelé** (route /orders/:id inexistante). |
| `server` (http.Server) | server.js:120 | Exporté pour import en test. |

## Fichiers critiques (hotspots d'évolution)

### 1. `src/server.js` (hotspot primaire)

**Criticité** : haute. Tout changement fonctionnel passe ici.

**Changements attendus**
- Ajouter une route → nouvel `if` dans le dispatcher vers la ligne ~65
- Ajouter un paramètre de requête filtre → lecture supplémentaire dans `getFilteredOrders` vers la ligne ~20
- Ajouter un middleware → wrapping du dispatcher ligne ~61-111
- Ajouter de la gestion d'erreur → try/catch autour du handler

**Risques**
- Dispatcher sans refactoring dépassera 50-100 lignes rapidement
- Pas de structure de routage (map, router explicite)
- Composition métier (lignes 35-55) reste libre — pas de pattern déclaratif

### 2. `src/routes/orders.js` (hotspot secondaire — filtres)

**Criticité** : moyenne. Évolution fonctionnelle principale du filtre commandes.

**État actuel** : Bug orthographique corrigé (CLA-195). `filterActiveOrders()` exclut correctement les `"cancelled"`. `filterByStatus()` ajoutée (CLA-195). Champ `createdAt` ISO 8601 ajouté sur chaque commande (CLA-225). Tri et filtre par date implémentés dans server.js (CLA-226). `getOrderById` exportée mais non appelée par aucune route.

**Changements attendus**
- Ajouter un filtre supplémentaire → nouvelle fonction + ajout dans module.exports (ligne 32) + branchement dans server.js

### 3. `src/routes/users.js:17-19` (hotspot secondaire — export mort)

**Criticité** : faible. Décision produit requise.

**État actuel** : `getUserById` est **utilisée** dans GET /users/:id (server.js:70) et dans `getFilteredOrders` (server.js:43) pour enrichir avec clientName et clientEmail (CLA-187, SHIAAAAAAAAAAAAAAAAAAAAAAAA-240). `isAdmin` reste un export mort.

**Options restantes**
- (a) Câbler contrôle d'accès (utiliser `isAdmin`)
- (b) Retirer `isAdmin` exporté si jamais utilisée

## Zones de faible confiance

Aucune. Tous les fichiers source ont été lus intégralement.

## Preuves

**Architecture générale** : src/server.js:1-120 (lu intégralement, 120 lignes)

**Domaine utilisateurs** : src/routes/users.js:1-21 (lu intégralement, 21 lignes)

**Domaine commandes** : src/routes/orders.js:1-32 (lu intégralement, 32 lignes)

**Package** : package.json (dépendance lodash ^4.18.1, engines node>=18)

**Tests** : test/orders.test.js (tests d'acceptation : clientName, total XPF, filtres, tri et filtre par date)

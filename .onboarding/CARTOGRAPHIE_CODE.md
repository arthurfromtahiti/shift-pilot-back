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
│   ├── orders.test.js    [tests d'acceptation — commandes]
│   ├── orders-history.test.js [tests d'acceptation — historique statuts (SHIAAAAAAAAAAAAAAAAAAAAAAAA-320)]
│   ├── orders-get-by-id.test.js [tests d'acceptation — lecture unitaire commande (SHIAAAAAAAAAAAAAAAAAAAAAAAA-352)]
│   ├── lint.test.js      [tests d'acceptation — linting]
│   ├── orders-search.test.js [tests d'acceptation — recherche commandes]
│   └── users.test.js     [tests d'acceptation — utilisateurs]
├── package.json          [1 dépendance : lodash]
├── README.md             [déclaration pilote SHIFT]
```

**3 fichiers source, 6 fichiers de test, 1 dépendance externe** : `lodash` (utilisée dans `orders.js:3` via `_.sortBy`).

## Domaines et fichiers

### Domaine : `utilisateurs` (métier, priorité cœur)

**Rôle** : annuaire en mémoire des utilisateurs exposé par `GET /users` et `GET /users/:id` (`src/routes/users.js`).

**Fichiers**
| Fichier | Rôle | Confiance |
|---------|------|-----------|
| `src/routes/users.js` | Données + logique métier | high |
| `src/server.js` (lignes 4, 69-71, 73-78) | Dispatcher HTTP vers users | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `users` | Data (const array) | 3-7 | Tableau littéral, 3 objets `{id, name, email, role}`. Données figées en mémoire. |
| `listUsers()` | Function export | 9-11 | Retourne `users` complet. Aucun paramètre, aucun filtre. |
| `getUserById(id)` | Function export | 13-15 | Lookup par ID via `find()`. Importée dans server.js:4. Appelée par GET /users/:id (server.js:75) et par `getFilteredOrders` (server.js:44) pour enrichir chaque commande avec `clientName` et `clientEmail` (CLA-187, SHIAAAAAAAAAAAAAAAAAAAAAAAA-240). |
| `isAdmin(user)` | Function export | 17-19 | Prédicat : `user !== null && user.role === "admin"`. Exportée, jamais importée. |
| Route HTTP | GET /users | server.js:69-71 | `GET /users` → `listUsers()` → JSON 200 |
| Route HTTP | GET /users/:id | server.js:73-78 | `GET /users/:id` → `getUserById(id)` → JSON 200 / 404 si absent (CLA-187) |

**Points critiques**
- **Export mort** : `isAdmin` exporté ligne 21 de users.js, jamais consommé — squelette d'autorisation déconnecté.
- **Données brutes en réponse** : champ `role` exposé sans contrôle d'accès (src/routes/users.js:4-6, src/server.js:69-71).

### Domaine : `commandes` (métier, priorité cœur)

**Rôle** : gestion des commandes avec filtrage par utilisateur, statut, mode actif, et plage de dates (CLA-186), avec tri par date.

**Fichiers**
| Fichier | Rôle | Confiance |
|---------|------|-----------|
| `src/routes/orders.js` | Données + logique métier | high |
| `src/server.js` (lignes 6, 14-55, 80-135) | Dispatcher HTTP vers orders | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `orders` | Data (const array) | 7-12 | Tableau littéral, 4 objets `{id, userId, total, currency, status, createdAt, statusHistory}`. `total` en XPF. `currency: "XPF"` (valeur figée). Statut ∈ {`"paid"`, `"cancelled"`} (double l). `createdAt` ISO 8601 UTC (CLA-225). `statusHistory` tableau d'objets `{status, at}` — historique des transitions de statut (SHIAAAAAAAAAAAAAAAAAAAAAAAA-320). |
| `listOrders()` | Function export | 14-16 | Retourne `orders` triés par id (via `_.sortBy`). |
| `getOrdersByUser(userId)` | Function export | 18-20 | Filtre par `order.userId === userId`. Fonctionne correctement. |
| `filterActiveOrders(orderList)` | Function export | 22-24 | Exclut les commandes `"cancelled"`. Bug orthographique corrigé en CLA-195. |
| `filterByStatus(orderList, status)` | Function export | 26-28 | Filtre par valeur de statut exacte (`order.status === status`). |
| `getOrderById(id)` | Function export | 30-32 | Lookup par ID via `find()`. Importée dans server.js:6. Appelée par GET /orders/:id (server.js:91) et par GET /orders/:id/history (server.js:83) pour obtenir la commande (SHIAAAAAAAAAAAAAAAAAAAAAAAA-349, SHIAAAAAAAAAAAAAAAAAAAAAAAA-320). |
| `normalize(s)` | Function (interne) | 34-36 | Normalise une chaîne : suppression diacritiques (NFD), conversion minuscules. Utile pour recherche insensible à la casse. |
| `filterByCustomerName(orderList, customerName)` | Function export | 38-43 | Filtre les commandes par nom de client (substring, insensible à la casse). Exclut les commandes avec `clientName=null`. Chaque objet dans orderList doit porter `clientName` (enrichi par server.js:44-45). SHIAAAAAAAAAAAAAAAAAAAAAAAA-7. |
| `sortOrdersByTotal(orderList, direction)` | Function export | 45-49 | Trie les commandes par montant total (champ `total`). Paramètre `direction` ∈ {`"asc"`, `"desc"`}. Retourne nouvelle liste triée. Utilisée dans server.js:55-56 pour les paramètres `sort=total_asc` et `sort=total_desc` (SHIAAAAAAAAAAAAAAAAAAAAAAAA-461). |
| `DEFAULT_CURRENCY` | Constant export | 5 | Devise par défaut `"XPF"`. Utilisée lors de l'enrichissement pour ajouter le champ `currency` à chaque commande (server.js:45, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235). |
| Route HTTP | GET /orders/:id/history | server.js:80-86 | Retourne historique des statuts d'une commande. Lookup par ID via `getOrderById()` ; retourne 404 si absent. Réponse : `{ orderId, history: [ { status, at }, ... ] }` (SHIAAAAAAAAAAAAAAAAAAAAAAAA-320). |
| Route HTTP | GET /orders/:id | server.js:88-100 | Retourne le détail d'une commande enrichie (clientName, clientEmail, currency). Lookup par ID via `getOrderById()` ; retourne 404 si absent. Enrichissement identique à GET /orders. (SHIAAAAAAAAAAAAAAAAAAAAAAAA-349) |
| Route HTTP | GET /orders/export.csv | server.js:106-122 | Export CSV sans pagination. Content-Type `text/csv; charset=utf-8`, Content-Disposition avec date UTC. En-tête `id;date;clientName;clientEmail;montant;devise;statut`. Mêmes filtres que GET /orders via `getFilteredOrders()` sans page/limit. (SHIAAAAAAAAAAAAAAAAAAAAAAAA-310) |
| Route HTTP | GET /orders | server.js:124-139 | `GET /orders` avec params optionnels `userId`, `active`, `status`, `sort` (date_asc, date_desc, amount_asc, amount_desc, client_asc, client_desc, status_asc, status_desc, total_asc, total_desc), `from`, `to`, `customerName`, `page`, `limit` → JSON 200 avec réponse structurée `{ orders: [...], pagination: { total, page, limit, totalPages } }`. Chaque commande inclut `clientName`, `clientEmail`, `currency` en plus des champs natifs (SHIAAAAAAAAAAAAAAAAAAAAAAAA-235, SHIAAAAAAAAAAAAAAAAAAAAA-461). |

**Composition des filtres** — étapes 1–9 dans `getFilteredOrders(url)` (`src/server.js:14-59`), étapes 10–12 dans GET /orders (`src/server.js:124-139`)
```
1. Si userId fourni → getOrdersByUser(userId)
2. Sinon → listOrders()
3. Normaliser statusParam ("canceled" → "cancelled")
4. Si activeOnly vrai ET status null → filterActiveOrders(result)
5. Si status fourni → filterByStatus(result, status)
6. Si from/to fournis (format YYYY-MM-DD valide) → filtre par plage de dates sur createdAt (CLA-186)
7. Si sort fourni → trier (premièrement, tri par date/montant avant enrichissement) :
   - sort=date_asc → tri croissant par createdAt (CLA-186)
   - sort=date_desc → tri décroissant par createdAt (CLA-186)
   - sort=amount_asc → tri croissant par total (SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
   - sort=amount_desc → tri décroissant par total (SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
   - autre → pas de tri (valeurs ignorées silencieusement)
8. Enrichir chaque commande avec clientName, clientEmail, et currency via getUserById() + DEFAULT_CURRENCY (server.js:43-46, CLA-187, SHIAAAAAAAAAAAAAAAAAAAAAAAA-240, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
9. Si customerName fourni → filterByCustomerName(enriched, customerName) (server.js:48, SHIAAAAAAAAAAAAAAAAAAAAAAAA-7)
9b. Si sort fourni → trier (deuxièmement, tri par client/statut/total après enrichissement) :
   - sort=client_asc → tri croissant par clientName (ordre alphabétique, localeCompare), traite clientName=null comme chaîne vide (SHIAAAAAAAAAAAAAAAAAAAAAAAA-406)
   - sort=client_desc → tri décroissant par clientName (ordre alphabétique inverse, localeCompare), traite clientName=null comme chaîne vide (SHIAAAAAAAAAAAAAAAAAAAAAAAA-406)
   - sort=status_asc → tri croissant par statut (ordre alphabétique, localeCompare), traite status=null comme chaîne vide (SHIAAAAAAAAAAAAAAAAAAAAAAAA-436)
   - sort=status_desc → tri décroissant par statut (ordre alphabétique inverse, localeCompare), traite status=null comme chaîne vide (SHIAAAAAAAAAAAAAAAAAAAAAAAA-436)
   - sort=total_asc → tri croissant par montant total (via `sortOrdersByTotal()`) (SHIAAAAAAAAAAAAAAAAAAAAAAAA-461)
   - sort=total_desc → tri décroissant par montant total (via `sortOrdersByTotal()`) (SHIAAAAAAAAAAAAAAAAAAAAAAAA-461)
   — GET /orders/export.csv s'arrête ici (retourne getFilteredOrders(url) complet, sans pagination)
10. Pagination : lire params page et limit, parser avec clampage silencieux (page défaut 1, min 1 ; limit défaut 20, min 1, max 100) (server.js:123-128, SHIAAAAAAAAAAAAAAAAAAAAAAAA-249, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
11. Calculer total (nb items enrichis), totalPages (≥1), découper slice par (page-1)*limit (server.js:130-132, SHIAAAAAAAAAAAAAAAAAAAAAAAA-249, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
12. Retourner objet structuré { orders: [...], pagination: { total, page, limit, totalPages } } (server.js:134, SHIAAAAAAAAAAAAAAAAAAAAAAAA-249, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235)
```

**Points critiques**
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
| `getFilteredOrders(url)` | Function | 14-59 | Pipeline filtres étapes 1–9 partagée par GET /orders et GET /orders/export.csv. Lit les query params, applique les filtres, enrichit avec clientName/clientEmail/currency. Supporte tris par total via `sortOrdersByTotal()` (SHIAAAAAAAAAAAAAAAAAAAAAAAA-461). |
| `csvEscape(value)` | Function | 62-68 | Échappement RFC 4180 avec `;` comme délimiteur. Quote les valeurs contenant `;`, `"`, CR ou LF, et double les guillemets internes. |
| Dispatcher | if-else block | 70-142 | Parse `req.url`, teste méthode+chemin, délègue ou retourne 404. |
| `new URL(req.url, ...)` | URL parsing | 71 | Parse relative à `http://${req.headers.host}` — préserve chemin + query string. |
| Routes GET /users | if-block | 73-75 | Branchement `→ listUsers()`. |
| Routes GET /users/:id | if-block | 77-82 | Lookup par ID via `getUserById()` ; retourne 404 si absent (CLA-187). |
| Routes GET /orders/:id/history | if-block | 84-90 | Lookup par ID via `getOrderById()` ; retourne 404 si absent. Retourne `{ orderId, history }` (SHIAAAAAAAAAAAAAAAAAAAAAAAA-320). |
| Routes GET /orders/:id | if-block | 92-104 | Lookup par ID via `getOrderById()` ; retourne 404 si absent. Retourne commande enrichie avec clientName, clientEmail, currency (SHIAAAAAAAAAAAAAAAAAAAAAAAA-349). |
| Routes GET /orders/export.csv | if-block | 106-122 | Export CSV sans pagination. Content-Type `text/csv; charset=utf-8`, Content-Disposition avec date UTC, en-tête `id;date;clientName;clientEmail;montant;devise;statut`. Appelle `getFilteredOrders()` sans page/limit. (SHIAAAAAAAAAAAAAAAAAAAAAAAA-310) |
| Routes GET /orders | if-block | 124-139 | Branchement + pagination (étapes 10–12). Appelle `getFilteredOrders()`, applique page/limit avec clampage silencieux, retourne `{ orders, pagination }` (SHIAAAAAAAAAAAAAAAAAAAAAAAA-249). **C'est ici que la logique métier est composée.** |
| Fallback 404 | if-block | 141 | Tout ce qui ne match pas → 404 + `{error: "Not found"}`. |
| `require.main === module` | Conditional | 145-149 | Démarre le serveur uniquement si invoqué directement (pas si importé en test). |
| `module.exports = server` | Export | 150 | Permet d'importer le serveur en test et de le décorer (ex. faire des requêtes HTTP). |

**Points critiques**
- **Multi-responsabilité** : parsing HTTP + routage + orchestration métier dans un seul fichier. Actuellement 150 lignes (logique d'enrichissement + pagination pour GET /orders + export CSV + historique statuts + tris multiples, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235, SHIAAAAAAAAAAAAAAAAAAAAAAAA-310, SHIAAAAAAAAAAAAAAAAAAAAAAAA-320, SHIAAAAAAAAAAAAAAAAAAAAAAAA-406, SHIAAAAAAAAAAAAAAAAAAAAAAAA-436, SHIAAAAAAAAAAAAAAAAAAAAAAAA-461). Debt dès la 6ème-7ème route ajoutée.
- **Aucun middleware transverse** : pas de try/catch global, pas de middleware d'erreur. Une exception non attrapée crasherait le processus sans réponse HTTP.
- **Seul point de modification pour toute évolution fonctionnelle** : ajouter une route, un paramètre, un filtre passe obligatoirement par ce fichier.

## Points d'entrée

### HTTP (points d'accès du système)

| Méthode | Chemin | Code | Domaine | Comportement |
|---------|--------|------|---------|---|
| GET | `/users` | server.js:69-71 | utilisateurs | Retourne annuaire complet (200 + JSON) |
| GET | `/users/:id` | server.js:73-78 | utilisateurs | Retourne utilisateur par ID (200) ou 404 si absent (CLA-187) |
| GET | `/orders/:id/history` | server.js:80-86 | commandes | Retourne historique des statuts d'une commande (200 + `{ orderId, history: [ { status, at }, ... ] }`) ou 404 si la commande n'existe pas (SHIAAAAAAAAAAAAAAAAAAAAAAAA-320). |
| GET | `/orders/:id` | server.js:88-100 | commandes | Retourne détail d'une commande enrichie (clientName, clientEmail, currency). Lookup par ID ; retourne 404 si absent (SHIAAAAAAAAAAAAAAAAAAAAAAAA-349). |
| GET | `/orders/export.csv` | server.js:106-122 | commandes | Export CSV de toutes les commandes filtrées (sans pagination). Délimiteur `;`, filename commandes-YYYY-MM-DD.csv. Mêmes filtres que GET /orders sans page/limit. (SHIAAAAAAAAAAAAAAAAAAAAAAAA-310) |
| GET | `/orders` | server.js:124-139 | commandes | Retourne commandes filtrées et enrichies avec clientName, clientEmail, currency (userId, active, status, from, to, sort, customerName, page, limit) ; réponse structurée { orders: [...], pagination: { total, page, limit, totalPages } }. Sort support date_asc, date_desc, amount_asc, amount_desc, client_asc, client_desc, status_asc, status_desc, total_asc, total_desc (SHIAAAAAAAAAAAAAAAAAAAAAAAA-235, SHIAAAAAAAAAAAAAAAAAAAAA-406, SHIAAAAAAAAAAAAAAAAAAAAA-436, SHIAAAAAAAAAAAAAAAAAAAAA-461). |
| (any) | (autre) | server.js:137 | — | 404 + `{error: "Not found"}` |

### Exports du système (pour test/import)

| Export | Fichier | Usage |
|--------|---------|-------|
| `listUsers()` | users.js:9-11 | Exposé via GET /users. Importé : server.js:4. |
| `getUserById(id)` | users.js:13-15 | Importé : server.js:4. Appelé par GET /users/:id (server.js:75) et par `getFilteredOrders` (server.js:44) pour enrichir chaque commande avec clientName et clientEmail (CLA-187, SHIAAAAAAAAAAAAAAAAAAAAAAAA-240). |
| `isAdmin(user)` | users.js:17-19 | Exporté ligne 21. **Jamais importé.** |
| `listOrders()` | orders.js:14-16 | Utilisé via GET /orders sans filtre. Retourne les commandes triées par id. Importé : server.js:6. |
| `getOrdersByUser(id)` | orders.js:18-20 | Utilisé par GET /orders?userId=. Importé : server.js:6. |
| `filterActiveOrders(orderList)` | orders.js:22-24 | Utilisé par GET /orders?active=true. Exclut les commandes `"cancelled"`. Importé : server.js:6. |
| `filterByStatus(orderList, status)` | orders.js:26-28 | Utilisé par GET /orders?status=. Filtre par valeur de statut. Importé : server.js:6. |
| `filterByCustomerName(orderList, customerName)` | orders.js:38-43 | Utilisé par GET /orders?customerName=. Filtre par nom de client (substring, insensible à la casse). Importé : server.js:6. SHIAAAAAAAAAAAAAAAAAAAAAAAA-7. |
| `sortOrdersByTotal(orderList, direction)` | orders.js:45-49 | Utilisé par GET /orders?sort=total_asc/total_desc. Trie par montant total. Importé : server.js:6. Appelé par getFilteredOrders (server.js:55-56) (SHIAAAAAAAAAAAAAAAAAAAAAAAA-461). |
| `DEFAULT_CURRENCY` | orders.js:5 | Devise par défaut `"XPF"`. Importé : server.js:6. Utilisé pour enrichir chaque commande avec le champ `currency` (server.js:45, SHIAAAAAAAAAAAAAAAAAAAAAAAA-235). |
| `getOrderById(id)` | orders.js:30-32 | Importé : server.js:6. Appelé par GET /orders/:id (server.js:91) et GET /orders/:id/history (server.js:83) pour obtenir la commande (SHIAAAAAAAAAAAAAAAAAAAAAAAA-349, SHIAAAAAAAAAAAAAAAAAAAAAAAA-320). |
| `server` (http.Server) | server.js:147 | Exporté pour import en test. |

## Fichiers critiques (hotspots d'évolution)

### 1. `src/server.js` (hotspot primaire)

**Criticité** : haute. Tout changement fonctionnel passe ici.

**Changements attendus**
- Ajouter une route → nouvel `if` dans le dispatcher vers la ligne ~80-85
- Ajouter un paramètre de requête filtre → lecture supplémentaire dans `getFilteredOrders` vers la ligne ~15-21
- Ajouter un middleware → wrapping du dispatcher ligne ~66-138
- Ajouter de la gestion d'erreur → try/catch autour du handler

**Risques**
- Dispatcher sans refactoring dépassera 50-100 lignes rapidement
- Pas de structure de routage (map, router explicite)
- Composition métier (lignes 14-55) reste libre — pas de pattern déclaratif

### 2. `src/routes/orders.js` (hotspot secondaire — filtres)

**Criticité** : moyenne. Évolution fonctionnelle principale du filtre commandes.

**État actuel** : Bug orthographique corrigé (CLA-195). `filterActiveOrders()` exclut correctement les `"cancelled"`. `filterByStatus()` ajoutée (CLA-195). Champ `createdAt` ISO 8601 ajouté sur chaque commande (CLA-225). Tri et filtre par date implémentés dans server.js (CLA-226). `getOrderById` exportée et appelée par GET /orders/:id/history (server.js:83, SHIAAAAAAAAAAAAAAAAAAAAAAAA-320). Tri par nom de client (client_asc, client_desc) appliqué après enrichissement pour bénéficier de la résolution clientName (SHIAAAAAAAAAAAAAAAAAAAAAAAA-406). Tri par statut (status_asc, status_desc) ajouté après enrichissement (SHIAAAAAAAAAAAAAAAAAAAAAAAA-436). Tri par montant total (total_asc, total_desc) via nouvelle fonction `sortOrdersByTotal()` après enrichissement (SHIAAAAAAAAAAAAAAAAAAAAAAAA-461).

**Changements attendus**
- Ajouter un filtre supplémentaire → nouvelle fonction + ajout dans module.exports (ligne 32) + branchement dans server.js

### 3. `src/routes/users.js:17-19` (hotspot secondaire — export mort)

**Criticité** : faible. Décision produit requise.

**État actuel** : `getUserById` est **utilisée** dans GET /users/:id (server.js:75) et dans `getFilteredOrders` (server.js:43) pour enrichir avec clientName et clientEmail (CLA-187, SHIAAAAAAAAAAAAAAAAAAAAAAAA-240). `isAdmin` reste un export mort.

**Options restantes**
- (a) Câbler contrôle d'accès (utiliser `isAdmin`)
- (b) Retirer `isAdmin` exporté si jamais utilisée

## Zones de faible confiance

Aucune. Tous les fichiers source ont été lus intégralement.

## Preuves

**Architecture générale** : src/server.js:1-150 (lu intégralement, 150 lignes après ajout GET /orders/:id, GET /orders/export.csv, tri client_asc/client_desc, tri status_asc/status_desc, et tri total_asc/total_desc, SHIAAAAAAAAAAAAAAAAAAAAAAAA-406, SHIAAAAAAAAAAAAAAAAAAAAAAAA-436, SHIAAAAAAAAAAAAAAAAAAAAAAAA-461). Corrections de numéros de lignes: require.main au 145-149, module.exports au 150, dispatcher au 70-142.

**Domaine utilisateurs** : src/routes/users.js:1-21 (lu intégralement, 21 lignes)

**Domaine commandes** : src/routes/orders.js:1-46 (lu intégralement, 46 lignes — structure `statusHistory` vérifiée lignes 8-12)

**Package** : package.json (dépendance lodash ^4.18.1, engines node>=18)

**Tests** : test/orders.test.js (tests d'acceptation : clientName, total XPF, filtres, tri et filtre par date, tri client_asc/client_desc pour JSON et CSV, SHIAAAAAAAAAAAAAAAAAAAAAAAA-410)

**Tests** : test/orders-history.test.js:1-105 (lu intégralement, 104 lignes — tests d'acceptation : GET /orders/:id/history, 404, statusHistory sur chaque commande, SHIAAAAAAAAAAAAAAAAAAAAAAAA-320)

**Tests** : test/orders-get-by-id.test.js:1-76 (lu intégralement, 76 lignes — tests d'acceptation : GET /orders/:id, 404, objet enrichi clientName/clientEmail/currency, SHIAAAAAAAAAAAAAAAAAAAAAAAA-352)

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

**3 fichiers source, 1 fichier de test, zéro dépendance externe** (`node:http` et `node:url` de la stdlib uniquement).

## Domaines et fichiers

### Domaine : `utilisateurs` (métier, priorité cœur)

**Rôle** : annuaire en mémoire des utilisateurs exposé par `GET /users` (`src/routes/users.js`).

**Fichiers**
| Fichier | Rôle | Confiance |
|---------|------|-----------|
| `src/routes/users.js` | Données + logique métier | high |
| `src/server.js` (lignes 3, 14-16) | Dispatcher HTTP vers users | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `users` | Data (const array) | 3-7 | Tableau littéral, 3 objets `{id, name, email, role}`. Données figées en mémoire. |
| `listUsers()` | Function export | 9-11 | Retourne `users` complet. Aucun paramètre, aucun filtre. |
| `getUserById(id)` | Function export | 13-15 | Lookup par ID via `find()`. **Importée dans server.js:3, jamais appelée.** |
| `isAdmin(user)` | Function export | 17-19 | Prédicat : `user !== null && user.role === "admin"`. Exportée, jamais importée. |
| Route HTTP | GET /users | server.js:14-16 | `GET /users` → `listUsers()` → JSON 200 |

**Points critiques**
- **Imports morts** : `getUserById` importé ligne 3 de server.js mais non appelé — signal d'une future route `/users/:id` non câblée.
- **Exports morts** : `isAdmin` exporté ligne 21 de users.js, jamais consommé — squelette d'autorisation déconnecté.
- **Données brutes en réponse** : champ `role` exposé sans contrôle d'accès (src/routes/users.js:4-6, src/server.js:14-16).

### Domaine : `commandes` (métier, priorité cœur)

**Rôle** : gestion des commandes avec filtrage par utilisateur et statut. Porte le bug volontaire du pilote.

**Fichiers**
| Fichier | Rôle | Confiance |
|---------|------|-----------|
| `src/routes/orders.js` | Données + logique métier + bug | high |
| `src/server.js` (lignes 4, 18-26) | Dispatcher HTTP vers orders | high |

**Contenu clé**

| Élément | Type | Ligne(s) | Détail |
|---------|------|----------|--------|
| `orders` | Data (const array) | 3-8 | Tableau littéral, 4 objets `{id, userId, total, status}`. Statut ∈ {`"paid"`, `"cancelled"`} (double l). |
| `listOrders()` | Function export | 10-12 | Retourne `orders` complet. |
| `getOrdersByUser(userId)` | Function export | 14-16 | Filtre par `order.userId === userId`. Fonctionne correctement. |
| `filterActiveOrders(orders)` | Function export | 22-24 | **BUG VOLONTAIRE** : compare `order.status !== "canceled"` (un seul l) alors que données portent `"cancelled"`. Ne filtre rien. |
| Commentaire bug | Marker | 18-21 | Documente l'intention du bug (exemple volontaire pour le pilote). |
| Route HTTP | GET /orders | server.js:18-26 | `GET /orders` avec params optionnels `userId`, `active` → JSON 200 |

**Composition des filtres** (`src/server.js:22-23`)
```
1. Si userId fourni → getOrdersByUser(userId)
2. Si activeOnly vrai → filterActiveOrders(result)
3. Retourner result
```

**Points critiques**
- **`src/routes/orders.js:23`** : zone de correction du bug. `"canceled"` doit devenir `"cancelled"` (ou aligner les données).
- **Données mismatch** : enum `status` défini avec `"cancelled"` (British English) mais comparé contre `"canceled"` (American English). Cause directe du filtre inopérant.
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
| `sendJson(res, code, data)` | Function | 6-9 | Écrit en-têtes + sérialise JSON. Code réutilisable. |
| Dispatcher | if-else block | 11-29 | Parse `req.url`, teste méthode+chemin, délègue ou retourne 404. |
| `new URL(req.url, ...)` | URL parsing | 12 | Parse relative à une base vide — fonctionne pour chemin + query string. |
| Routes GET /users | if-block | 14-16 | Branchement `→ listUsers()`. |
| Routes GET /orders | if-block | 18-26 | Branchement + orchestration filtres (userId, activeOnly). **Ici que la logique métier est composée.** |
| Fallback 404 | if-block | 28 | Tout ce qui ne match pas → 404 + `{error: "Not found"}`. |
| `require.main === module` | Conditional | 32-36 | Démarre le serveur uniquement si invoqué directement (pas si importé en test). |
| `module.exports = server` | Export | 38 | Permet d'importer le serveur en test et de le décorer (ex. faire des requêtes HTTP). |

**Points critiques**
- **Multi-responsabilité** : parsing HTTP + routage + orchestration métier dans un seul fichier. Acceptable à 38 lignes. Debt dès la 4ème-5ème route ajoutée.
- **Aucun middleware transverse** : pas de try/catch global, pas de middleware d'erreur. Une exception non attrapée crasherait le processus sans réponse HTTP.
- **Seul point de modification pour toute évolution fonctionnelle** : ajouter une route, un paramètre, un filtre passe obligatoirement par ce fichier.

## Points d'entrée

### HTTP (points d'accès du système)

| Méthode | Chemin | Code | Domaine | Comportement |
|---------|--------|------|---------|---|
| GET | `/users` | server.js:14-16 | utilisateurs | Retourne annuaire complet (200 + JSON) |
| GET | `/orders` | server.js:18-26 | commandes | Retourne commandes, filtres optionnels userId/active |
| (any) | (autre) | server.js:28 | — | 404 + `{error: "Not found"}` |

### Exports du système (pour test/import)

| Export | Fichier | Usage |
|--------|---------|-------|
| `listUsers()` | users.js:9-11 | Exposé via GET /users. Importé : server.js:3. |
| `getUserById(id)` | users.js:13-15 | Importé : server.js:3. **Jamais appelé.** |
| `isAdmin(user)` | users.js:17-19 | Exporté line 21. **Jamais importé.** |
| `listOrders()` | orders.js:10-12 | Utilisé via GET /orders sans filtre. Importé : server.js:4. |
| `getOrdersByUser(id)` | orders.js:14-16 | Utilisé par GET /orders?userId=. Importé : server.js:4. |
| `filterActiveOrders(orders)` | orders.js:22-24 | Utilisé par GET /orders?active=true (défaillant). Importé : server.js:4. |
| `server` (http.Server) | server.js:38 | Exporté pour import en test. **Aucun test de server lui-même.** |

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

### 2. `src/routes/orders.js:23` (hotspot secondaire — bug)

**Criticité** : moyenne. Correction volontaire du bug pilote.

**Changement attendu**
- Remplacer `"canceled"` par `"cancelled"` (ou aligner données sur `"canceled"`)

**Impact** : test `test/orders.test.js:14` passera au vert.

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

**Architecture générale** : src/server.js:1-38 (lu intégralement, 38 lignes)

**Domaine utilisateurs** : src/routes/users.js:1-21 (lu intégralement, 21 lignes)

**Domaine commandes** : src/routes/orders.js:1-26 (lu intégralement, 26 lignes)

**Package** : package.json (lu intégralement, zéro dépendances)

**Test** : test/orders.test.js:1-19 (lu intégralement, test rouge documentant le bug)

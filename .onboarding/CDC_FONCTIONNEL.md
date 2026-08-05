# Cahier des charges fonctionnel — shift-pilot-back

> **Confiance : high**
> 
> Synthèse des domaines validés (CARTE_DES_DOMAINES), workflows analysés (WORKFLOW_LIST_USERS, WORKFLOW_LIST_ORDERS), audits fonctionnels et modèle de données. Le projet expose deux ressources métier (utilisateurs, commandes) via une API HTTP stateless en mémoire. **Important** : ce système est une API jouet déclarée par son auteur comme dépôt de test jetable pour le pilote SHIFT/Paperclip (README.md:1-3), non un produit destiné à la production. Toutes les affirmations sont `VÉRIFIÉ_CODE` (lues dans le source) — aucune `OBSERVÉ` (exécution/base).

## Contexte métier

**Problème** : démontrer la capacité du pilote SHIFT/Paperclip à analyser et documenter un dépôt réel (même minuscule) en partant du code source.

**Organisations** : API HTTP standalone, sans clients décrits. Hypothèse d'usage : un fournisseur API interne ou une démo de produit exposant deux ressources.

**Périmètre** : deux ressources de lecture (`GET /users`, `GET /orders`), aucune écriture, aucune persistance en base, aucune authentification câblée, données intégralement en mémoire (tableaux codés en dur). Le filtre `/orders?active=true` contient un bug volontaire documenté.

## Acteurs

### Par capacité

**Client HTTP externe** (humain ou système)
- Peut : lister tous les utilisateurs (`GET /users`)
- Peut : lister toutes les commandes (`GET /orders`), montant en XPF
- Peut : filtrer les commandes par utilisateur (`GET /orders?userId=N`)
- Peut : filtrer les commandes par nom de client (`GET /orders?customerName=<valeur>` — substring, insensible à la casse, via le champ `clientName` résolu à partir du `userId`)
- **Peut (bug volontaire)** : filtrer les commandes actives (`GET /orders?active=true` — **NE FONCTIONNE PAS** car `filterActiveOrders()` compare à `"canceled"` au lieu de `"cancelled"`)
- **Interdit** : filtrer les commandes par statut exact (`GET /orders?status=...` — paramètre `status` n'existe pas)
- **Interdit** : créer, modifier, supprimer (aucune route POST/PUT/PATCH/DELETE)
- **Interdit** : accéder à un utilisateur par id (helper existe, route absente)
- **Interdit** : vérifier son autorisation (prédicat `isAdmin` existe, aucun contrôle d'accès câblé)

### Rôle (données, non enforced)

Les utilisateurs portent un champ `role` ∈ {`admin`, `customer`} (`src/routes/users.js:4-6`), exposé sans filtrage dans la réponse à `/users`. Un prédicat `isAdmin(user)` existe mais n'est jamais appelé (§Architecture — code mort). Aucun endpoint ne vérife les autorisation du client.

## Parcours métier par criticité

### Parcours 1 — Consultation de l'annuaire (criticité basse)

**Objectif** : un client obtient la liste des utilisateurs du système.

**Déclencheur** : requête HTTP `GET /users`

**Déroulement** (fonctionnel)
1. Client émet `GET /users` (pas de paramètre)
2. Serveur parse l'URL (`src/server.js:12`)
3. Dispatcher teste `url.pathname === "/users" && req.method === "GET"` (`src/server.js:14`)
4. Appel de `listUsers()` → retourne le tableau complet en mémoire (`src/routes/users.js:9-11`)
5. Réponse HTTP : statut 200, en-tête `Content-Type: application/json`, corps = tableau JSON des utilisateurs

**États et résultats** : 
- Statut 200 toujours retourné
- Payload JSON : 3 utilisateurs (données figées en mémoire)
```json
[
  { "id": 1, "name": "Heiata", "email": "heiata@example.pf", "role": "admin" },
  { "id": 2, "name": "Teiki", "email": "teiki@example.pf", "role": "customer" },
  { "id": 3, "name": "Manoa", "email": "manoa@example.pf", "role": "customer" }
]
```

**Aucun filtre** : la liste retournée est intégralement le tableau en mémoire — pas de paramètre de requête utilisé, pas de condition d'exclusion.

### Parcours 2 — Consultation et filtrage des commandes (criticité basse)

**Objectif** : un client consulte les commandes, avec filtres optionnels sur l'utilisateur propriétaire et l'état (actif/annulé).

**Déclencheur** : requête HTTP `GET /orders` avec paramètres de requête optionnels

**Variantes**

#### Variante 2a — Toutes les commandes

**Requête** : `GET /orders` (sans paramètre)

**Déroulement**
1. Dispatcher teste `url.pathname === "/orders" && req.method === "GET"` (`src/server.js:18`)
2. Lecture `userId = null`, `activeOnly = false` (`src/server.js:19-20`)
3. Pas de filtre `userId` → appel `listOrders()` → tableau complet en mémoire (`src/server.js:22`, `src/routes/orders.js:10-12`)
4. `activeOnly === false` → pas d'appel à `filterActiveOrders` (la réponse retournée directement `src/server.js:25`)
5. Réponse : statut 200 + tableau JSON

**Résultat** : 4 commandes (toutes, incluses les annulées)
```json
[
  { "id": 101, "userId": 2, "total": 42, "status": "paid" },
  { "id": 102, "userId": 2, "total": 18, "status": "cancelled" },
  { "id": 103, "userId": 3, "total": 96, "status": "paid" },
  { "id": 104, "userId": 3, "total": 30, "status": "cancelled" }
]
```

#### Variante 2b — Commandes d'un utilisateur spécifique

**Requête** : `GET /orders?userId=2`

**Déroulement**
1. Dispatcher teste condition `GET /orders` → vrai (`src/server.js:18`)
2. Lecture `userId = "2"` → conversion `Number("2")` = 2 (`src/server.js:19,22`)
3. `activeOnly = false` (pas de paramètre `active`)
4. Appel `getOrdersByUser(2)` → filtre par `order.userId === 2` (`src/routes/orders.js:14-16`)
5. Résultat : 2 commandes (101 et 102, toutes de Teiki)
6. Pas d'appel `filterActiveOrders` → tableau retourné tel quel

**Résultat** : commandes de l'utilisateur 2 (y compris annulée)
```json
[
  { "id": 101, "userId": 2, "total": 42, "status": "paid" },
  { "id": 102, "userId": 2, "total": 18, "status": "cancelled" }
]
```

#### Variante 2c — Tentative de filtrer commandes actives d'un utilisateur

**Requête** : `GET /orders?userId=2&active=true`

**Déroulement**
1. Dispatcher teste condition `GET /orders` → vrai
2. Lecture `userId = 2`, `activeOnly = true` (`src/server.js:19-20`)
3. Appel `getOrdersByUser(2)` → retourne [101, 102]
4. `activeOnly === true` → **appel `filterActiveOrders([101, 102])`** (`src/server.js:23`)
5. `filterActiveOrders` compare `order.status !== "canceled"` (orthographe US — BUG) (`src/routes/orders.js:23`)
   - Commande 101 : `"paid" !== "canceled"` → true, passe
   - Commande 102 : `"cancelled" !== "canceled"` → true, **PASSE AUSSI** (orthographe ne match pas)
6. Résultat retourné : [101, 102]

**Ce qui est reçu** : **les deux commandes incluant l'annulée** — **comportement incorrect**. Le bug n'a pas été corrigé.
```json
[
  { "id": 101, "userId": 2, "total": 42, "status": "paid" },
  { "id": 102, "userId": 2, "total": 18, "status": "cancelled" }
]
```

#### Variante 2d — Commandes actives globales

**Requête** : `GET /orders?active=true`

**Déroulement**
1. Dispatcher teste `GET /orders` → vrai
2. Lecture `userId = null`, `activeOnly = true`
3. `listOrders()` → [101, 102, 103, 104] (tri par id)
4. `filterActiveOrders([...])` → exclut 102 et 104 (`"cancelled"`)

**Résultat reçu** : **4 commandes (y compris les annulées)** — **COMPORTEMENT INCORRECT** car `filterActiveOrders()` compare `order.status !== "canceled"` (orthographe US) alors que les données portent `"cancelled"` (orthographe GB). Aucune commande n'est exclue. Bug volontaire du pilote.
```json
[
  { "id": 101, "userId": 2, "total": 42, "status": "paid" },
  { "id": 102, "userId": 2, "total": 18, "status": "cancelled" },
  { "id": 103, "userId": 3, "total": 96, "status": "paid" },
  { "id": 104, "userId": 3, "total": 30, "status": "cancelled" }
]
```

#### Variante 2e — Commandes filtrées par nom de client

**Requête** : `GET /orders?customerName=teiki`

**Déroulement**
1. Dispatcher teste condition `GET /orders` → vrai (`src/server.js:27`)
2. Lecture de tous les paramètres de requête, dont `customerName = "teiki"` (`src/server.js:34`)
3. Pas de filtre `userId` → appel `listOrders()` → [101, 102, 103, 104]
4. Appels de filtres optionnels : aucun (pas de `active`, `status`, `from`, `to`) → résultat inchangé
5. Enrichissement : chaque commande enrichie avec `clientName` résolu via `getUserById(userId)` (`src/server.js:53-56`)
   - Commande 101 : `userId=2` → `clientName="Teiki"`
   - Commande 102 : `userId=2` → `clientName="Teiki"`
   - Commande 103 : `userId=3` → `clientName="Manoa"`
   - Commande 104 : `userId=3` → `clientName="Manoa"`
6. `customerNameParam = "teiki"` est non-null → appel `filterByCustomerName(enriched, "teiki")` (`src/server.js:58`)
7. `filterByCustomerName()` normalise aiguille et champs :
   - Normalisation : diacritiques supprimés, conversion minuscules (`normalize()`, `src/routes/orders.js:34-36`)
   - Aiguille normalisée : `"teiki"` → `"teiki"`
   - Commande 101 : `clientName="Teiki"` → normalisé `"teiki"` → `includes("teiki")` = true → conservée
   - Commande 102 : `clientName="Teiki"` → normalisé `"teiki"` → `includes("teiki")` = true → conservée
   - Commande 103 : `clientName="Manoa"` → normalisé `"manoa"` → `includes("teiki")` = false → exclue
   - Commande 104 : `clientName="Manoa"` → normalisé `"manoa"` → `includes("teiki")` = false → exclue

**Résultat** : 2 commandes (101 et 102 de Teiki)
```json
[
  { "id": 101, "userId": 2, "total": 42, "status": "paid", "createdAt": "2024-01-10T08:00:00Z", "clientName": "Teiki", "currency": "XPF" },
  { "id": 102, "userId": 2, "total": 18, "status": "cancelled", "createdAt": "2024-02-20T14:30:00Z", "clientName": "Teiki", "currency": "XPF" }
]
```

**Particularité** : le filtre `customerName` est appliqué **après** l'enrichissement (`clientName`). Un `userId` sans utilisateur correspondant (`clientName=null`) est toujours exclu du résultat du filtre, même si aucune aiguille n'est fournie.

### Parcours 3 — Tentative d'accès refusé ou mal formé

**Requête** : `GET /unknown`, `POST /users`, `GET /orders?userId=abc` (userId invalide)

**Déroulement**
1. Dispatcher teste les deux conditions `if` → aucune ne match
2. Fallback ligne 28 : retourne `{ "error": "Not found" }` avec statut 404

**Particularité** : une mauvaise méthode (`POST /users`) tombe en 404 comme une URL inexistante. Une `userId` non-entier (ex. `abc`) est convertie en `NaN` → `getOrdersByUser(NaN)` retourne `[]` silencieusement (aucune commande ne match `=== NaN`), statut 200 + `[]` retourné sans erreur.

## Règles métier

### Utilisateurs

1. **Annuaire complet à `/users`** : `GET /users` retourne toujours l'intégralité du tableau sans paramètre (`src/routes/users.js:9-11`).
2. **Structure utilisateur** : chaque utilisateur porte `id` (entier unique), `name` (chaîne), `email` (chaîne au format `*@example.pf`), `role` (enum ∈ {`admin`, `customer`}) — `src/routes/users.js:3-7`.
3. **Rôle exposé sans filtre** : le champ `role` est retourné dans la réponse à `/users` sans contrôle d'accès visible (`src/routes/users.js:4-6`, `src/server.js:14-16`).
4. **Méthode GET exclusive** : seul `GET` répond sur `/users`. Autres méthodes → 404.
5. **Statut HTTP fixe** : 200 toujours retourné (pas de statut d'erreur même si liste vide).

### Commandes

1. **Filtre `userId` (fonctionnel)** : `GET /orders?userId=N` filtre par égalité stricte (`order.userId === N`). Paramètre converti en nombre entier avant comparaison. Si `userId` n'existe pas (ex. `userId=99`), retour 200 + `[]` (liste vide, pas erreur 404) — `src/routes/orders.js:18-20`.
2. **Filtre `active` (BUG VOLONTAIRE — NE FONCTIONNE PAS)** : `GET /orders?active=true` **ne filtre rien** car `filterActiveOrders()` compare `order.status !== "canceled"` (orthographe US) au lieu de `"cancelled"` (données en orthographe GB). La condition ne match jamais. Toutes les commandes, y compris les annulées, passent à travers — `src/routes/orders.js:22-24`, `src/server.js:41`.
3. **Filtre `customerName` (fonctionnel)** : `GET /orders?customerName=<valeur>` filtre les commandes par nom de client. Recherche **substring insensible à la casse** via normalisation Unicode (suppression diacritiques, minuscules) — `src/routes/orders.js:38-43`, `src/server.js:58`. Chaque commande est d'abord enrichie avec `clientName` résolu depuis `userId` avant filtre. Les commandes avec `clientName=null` sont exclues. Format : `GET /orders?customerName=teiki` retourne commandes 101 et 102 (toutes deux liées à l'utilisateur Teiki).
4. **Paramètre `status` (n'existe pas)** : `GET /orders?status=paid` ne fonctionne pas car le dispatcher ne lit pas ce paramètre. Seuls `userId`, `active` et `customerName` sont interprétés — `src/server.js:28-34`.
5. **Statuts de commande** : enum implicite = {`"paid"`, `"cancelled"`} (orthographe britannique, double `l`) — `src/routes/orders.js:7-12`.
6. **Méthode GET exclusive** : seul `GET` répond sur `/orders`. Autres méthodes → 404.
7. **Lien utilisateur (non enforced)** : chaque commande lie un `userId` à un utilisateur (données cohérentes), mais aucune vérification ne force cette contrainte dans le code. Un `userId` invalide ne génère pas d'erreur, juste une liste vide.

## Données

### Utilisateurs (tableau constant en mémoire)

**Emplacement** : `src/routes/users.js:3-7` (tableau `users`)

**Enregistrements** :
- ID 1, Heiata, heiata@example.pf, admin (zéro commande dans les données de démo)
- ID 2, Teiki, teiki@example.pf, customer (2 commandes : 101, 102)
- ID 3, Manoa, manoa@example.pf, customer (2 commandes : 103, 104)

**Persistance** : aucune. Redémarrage = réinitialisation au tableau source.

**Unicité d'ID** : pas de vérification dans le code. Les données en dur ne contiennent pas de doublon.

### Commandes (tableau constant en mémoire)

**Emplacement** : `src/routes/orders.js:3-8` (tableau `orders`)

**Enregistrements** :
- ID 101, userId 2 (Teiki), total 4200, paid
- ID 102, userId 2 (Teiki), total 1800, cancelled
- ID 103, userId 3 (Manoa), total 9600, paid
- ID 104, userId 3 (Manoa), total 3000, cancelled

**Persistance** : aucune. Redémarrage = réinitialisation.

**Intégrité `userId`** : cohérence vérifiée manuellement. IDs 2 et 3 correspondent à des utilisateurs existants. Aucune FK enforced.


## Délimitations honnêtes

### Hors périmètre (volontaire)

- **Écriture** : aucune route POST/PUT/PATCH/DELETE
- **Authentification** : pas de login, pas de token, pas de session
- **Autorisation** : `isAdmin()` existe mais n'est jamais appelé
- **Persistance** : pas de base de données, données intégralement en RAM
- **Validation d'entrée** : les paramètres de requête ne sont pas validés (ex. `userId=abc` → `NaN` silencieux)
- **Gestion d'erreur** : aucun `try/catch` global, pas de codes d'erreur HTTP variés (que 200 et 404)
- **Filtre `status`** : non implémenté (paramètre n'est pas lu par le dispatcher)
- **Filtre `active=true`** : **bug volontaire non corrigé** — compare orthographe US vs GB, ne filtre jamais

### Inachevé (code présent, non câblé)

- Route `GET /users/:id` : `getUserById(id)` importée dans `src/server.js:3` mais aucune route ne l'appelle.
- Contrôle d'accès `isAdmin` : prédicat défini et exporté, jamais importé dans le dispatcher.

### Indéterminable (intention non exposée)

- Schéma canonique d'orthographe pour statut annulé : `"cancelled"` (données) ou `"canceled"` (bug) ?
- Intention du `role` : est-ce le début d'un système d'autorisation à câbler, ou du bruit de démo ?
- Cas `userId` inexistant : faut-il 404 ou 200 + [] ?

## Preuves

**Domaine utilisateurs** : src/routes/users.js:3-21, src/server.js:3, src/server.js:14-16

**Domaine commandes** : src/routes/orders.js:3-26, src/server.js:4, src/server.js:18-26

**API HTTP & routage** : src/server.js:1-38

**Modèle de données** : src/routes/users.js:3-7, src/routes/orders.js:3-8

**Filtres commandes** : src/routes/orders.js:14-24, src/server.js:19-23, test/orders.test.js (test volontaire du bug filterActiveOrders)

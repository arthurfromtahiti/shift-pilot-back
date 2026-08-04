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
- Peut : lister toutes les commandes (`GET /orders`)
- Peut : filtrer les commandes par utilisateur (`GET /orders?userId=N`)
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

**Résultat** : 4 commandes (toutes, incluses les annulées, enrichies avec `totalXpf`)
```json
[
  { "id": 101, "userId": 2, "total": 4200, "status": "paid", "totalXpf": 42 },
  { "id": 102, "userId": 2, "total": 1800, "status": "cancelled", "totalXpf": 18 },
  { "id": 103, "userId": 3, "total": 9600, "status": "paid", "totalXpf": 96 },
  { "id": 104, "userId": 3, "total": 3000, "status": "cancelled", "totalXpf": 30 }
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

**Résultat** : commandes de l'utilisateur 2 (y compris annulée, enrichies avec `totalXpf`)
```json
[
  { "id": 101, "userId": 2, "total": 4200, "status": "paid", "totalXpf": 42 },
  { "id": 102, "userId": 2, "total": 1800, "status": "cancelled", "totalXpf": 18 }
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
6. Résultat retourné : [101, 102] enrichis avec `totalXpf`

**Ce qui est reçu** : **les deux commandes incluant l'annulée** — **comportement incorrect**. Le bug n'a pas été corrigé.
```json
[
  { "id": 101, "userId": 2, "total": 4200, "status": "paid", "totalXpf": 42 },
  { "id": 102, "userId": 2, "total": 1800, "status": "cancelled", "totalXpf": 18 }
]
```

#### Variante 2d — Commandes actives globales

**Requête** : `GET /orders?active=true`

**Déroulement**
1. Dispatcher teste `GET /orders` → vrai
2. Lecture `userId = null`, `activeOnly = true`
3. `listOrders()` → [101, 102, 103, 104] (tri par id)
4. `filterActiveOrders([...])` → exclut 102 et 104 (`"cancelled"`)

**Résultat reçu** : **4 commandes (y compris les annulées), enrichies avec `totalXpf`** — **COMPORTEMENT INCORRECT** car `filterActiveOrders()` compare `order.status !== "canceled"` (orthographe US) alors que les données portent `"cancelled"` (orthographe GB). Aucune commande n'est exclue. Bug volontaire du pilote.
```json
[
  { "id": 101, "userId": 2, "total": 4200, "status": "paid", "totalXpf": 42 },
  { "id": 102, "userId": 2, "total": 1800, "status": "cancelled", "totalXpf": 18 },
  { "id": 103, "userId": 3, "total": 9600, "status": "paid", "totalXpf": 96 },
  { "id": 104, "userId": 3, "total": 3000, "status": "cancelled", "totalXpf": 30 }
]
```

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

1. **Filtre `userId` (fonctionnel)** : `GET /orders?userId=N` filtre par égalité stricte (`order.userId === N`). Paramètre converti en nombre entier avant comparaison. Si `userId` n'existe pas (ex. `userId=99`), retour 200 + `[]` (liste vide, pas erreur 404) — `src/routes/orders.js:14-16`.
2. **Filtre `active` (BUG VOLONTAIRE — NE FONCTIONNE PAS)** : `GET /orders?active=true` **ne filtre rien** car `filterActiveOrders()` compare `order.status !== "canceled"` (orthographe US) au lieu de `"cancelled"` (données en orthographe GB). La condition ne match jamais. Toutes les commandes, y compris les annulées, passent à travers — `src/routes/orders.js:22-24`, `src/server.js:23`.
3. **Paramètre `status` (n'existe pas)** : `GET /orders?status=paid` ne fonctionne pas car le dispatcher ne lit pas ce paramètre. Seuls `userId` et `active` sont interprétés — `src/server.js:19-20`.
4. **Statuts de commande** : enum implicite = {`"paid"`, `"cancelled"`} (orthographe britannique, double `l`) — `src/routes/orders.js:4-8`.
5. **Méthode GET exclusive** : seul `GET` répond sur `/orders`. Autres méthodes → 404.
6. **Lien utilisateur (non enforced)** : chaque commande lie un `userId` à un utilisateur (données cohérentes), mais aucune vérification ne force cette contrainte dans le code. Un `userId` invalide ne génère pas d'erreur, juste une liste vide.

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

**Enrichissement à la sérialisation** : chaque objet commande retourné par `GET /orders` (tous paramètres) est enrichi avec `totalXpf: Math.round(total / 100)` au moment de `sendJson()` dans `src/server.js:25`. Valeurs pour les données de démo : id 101 → 42, id 102 → 18, id 103 → 96, id 104 → 30. Le champ n'est pas stocké dans `src/routes/orders.js`.

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

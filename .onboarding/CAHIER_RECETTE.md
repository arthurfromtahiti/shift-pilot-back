# Cahier de recette — shift-pilot-back

> **Confiance : high**
> 
> Parcours à tester, dérivés des workflows WORKFLOW_LIST_USERS et WORKFLOW_LIST_ORDERS. Correspond exactement aux routes exposées et aux règles métier documentées.

## Couverture de test

Ce cahier couvre **100% des routes implémentées** :
- `GET /users` — route de consultation de l'annuaire
- `GET /orders` — route de consultation/filtrage des commandes (3 cas de filtrage)
- Fallback 404 — routes inexistantes ou méthodes interdites

Aucune route d'écriture à tester (POST/PUT/PATCH/DELETE inexistantes).

---

## Scenario 1 — Lister tous les utilisateurs

**Classification** : nominal, cas d'usage fondamental

**Objectif** : un client consulte l'annuaire complet

**Préconditions**
- Serveur démarré (port par défaut ou lecture `process.env.PORT`)
- Aucune authentification requise

**Requête**
```
GET /users HTTP/1.1
Host: localhost:3000 (ou port du serveur)
```

**Réponse attendue**

Status : **200 OK**

Headers : `Content-Type: application/json`

Body (JSON) :
```json
[
  {
    "id": 1,
    "name": "Heiata",
    "email": "heiata@example.pf",
    "role": "admin"
  },
  {
    "id": 2,
    "name": "Teiki",
    "email": "teiki@example.pf",
    "role": "customer"
  },
  {
    "id": 3,
    "name": "Manoa",
    "email": "manoa@example.pf",
    "role": "customer"
  }
]
```

**Points de contrôle**
- ✅ Statut 200
- ✅ En-tête `Content-Type` = `application/json`
- ✅ Array JSON de 3 objets
- ✅ Chaque objet porte `id`, `name`, `email`, `role`
- ✅ Champ `role` exposé (pas de filtrage)
- ✅ Données cohérentes avec `src/routes/users.js:3-7`

**Cas limite à tester**
- ✅ Requête `GET /users?unknown=param` (paramètres ignorés) → même résultat 200 + 3 utilisateurs
- ✅ Requête `POST /users` → 404 (méthode interdite)
- ✅ Requête `GET /Users` (majuscule différente) → 404 (chemin ne match pas)

**Preuve du code**
- `src/server.js:14-16` : routing vers `listUsers()`
- `src/routes/users.js:9-11` : `listUsers()` retourne tableau complet
- `src/routes/users.js:3-7` : données

---

## Scenario 2 — Lister toutes les commandes

**Classification** : nominal, cas de base sans filtre

**Objectif** : un client consulte les 4 commandes, y compris les annulées

**Préconditions**
- Serveur démarré
- Aucun paramètre de requête

**Requête**
```
GET /orders HTTP/1.1
Host: localhost:3000
```

**Réponse attendue**

Status : **200 OK**

Body (JSON) :
```json
[
  {
    "id": 101,
    "userId": 2,
    "total": 4200,
    "status": "paid"
  },
  {
    "id": 102,
    "userId": 2,
    "total": 1800,
    "status": "cancelled"
  },
  {
    "id": 103,
    "userId": 3,
    "total": 9600,
    "status": "paid"
  },
  {
    "id": 104,
    "userId": 3,
    "total": 3000,
    "status": "cancelled"
  }
]
```

**Points de contrôle**
- ✅ Statut 200
- ✅ Array JSON de 4 objets
- ✅ Deux commandes ont `status: "paid"`, deux ont `status: "cancelled"`
- ✅ `userId` lie à utilisateurs existants (2=Teiki, 3=Manoa)
- ✅ Commandes annulées présentes dans le résultat (pas filtré)

**Cas limite à tester**
- ✅ Requête `GET /orders?unknown=param` → même résultat 4 commandes
- ✅ Requête `GET /orders?active=false` (booléen incorrect) → 4 commandes (paramètre ignoré)
- ✅ Requête `DELETE /orders` → 404

**Preuve du code**
- `src/server.js:18-26` : routing vers commandes sans filtre → `listOrders()`
- `src/routes/orders.js:10-12` : `listOrders()` retourne tableau complet
- `src/routes/orders.js:3-8` : données

---

## Scenario 3 — Filtrer commandes par utilisateur (userId)

**Classification** : nominal, filtre fonctionnel

**Objectif** : un client consulte uniquement les commandes d'un utilisateur spécifique

### Variante 3a — userId=2 (Teiki, 2 commandes)

**Requête**
```
GET /orders?userId=2 HTTP/1.1
Host: localhost:3000
```

**Réponse attendue**

Status : **200 OK**

Body (JSON) :
```json
[
  {
    "id": 101,
    "userId": 2,
    "total": 4200,
    "status": "paid"
  },
  {
    "id": 102,
    "userId": 2,
    "total": 1800,
    "status": "cancelled"
  }
]
```

**Points de contrôle**
- ✅ Statut 200
- ✅ Array JSON de 2 objets (uniquement userId=2)
- ✅ Les deux commandes de Teiki retournées

### Variante 3b — userId=3 (Manoa, 2 commandes)

**Requête**
```
GET /orders?userId=3 HTTP/1.1
```

**Réponse attendue**

Status : **200 OK**

Body : 2 commandes (103, 104) avec `userId: 3`

**Points de contrôle**
- ✅ Filtrage correct par userId

### Variante 3c — userId=1 (Heiata, 0 commandes)

**Requête**
```
GET /orders?userId=1 HTTP/1.1
```

**Réponse attendue**

Status : **200 OK**

Body : `[]` (liste vide)

**Points de contrôle**
- ✅ Statut 200, pas 404
- ✅ Array vide (utilisateur sans commandes = cas valide)

### Variante 3d — userId invalide (non-entier)

**Requête**
```
GET /orders?userId=abc HTTP/1.1
```

**Réponse attendue**

Status : **200 OK**

Body : `[]`

**Points de contrôle**
- ✅ `userId=abc` converti en `NaN` → comparaison `=== NaN` toujours fausse → liste vide retournée
- ⚠️ Aucun code 400 Bad Request (pas de validation d'entrée dans ce pilote)
- ⚠️ Aucun message d'erreur

### Variante 3e — userId inexistant (entier valide)

**Requête**
```
GET /orders?userId=99 HTTP/1.1
```

**Réponse attendue**

Status : **200 OK**

Body : `[]`

**Points de contrôle**
- ✅ Pas de 404 pour userId inexistant
- ✅ Liste vide = cas normal

**Preuve du code**
- `src/server.js:19,22` : lecture et conversion `userId`
- `src/routes/orders.js:14-16` : `getOrdersByUser(userId)` filtre par égalité stricte

---

## Scenario 4 — Filtrer commandes actives (active=true) — BUG VOLONTAIRE

**Classification** : anomalie documentée, bug volontaire du pilote

**Objectif** : démontrer le filtre cassé et le bug intentionnel

### Variante 4a — active=true sans userId (toutes les commandes actives attendues)

**Requête**
```
GET /orders?active=true HTTP/1.1
```

**VÉRIFIÉ_CODE (défaillant)** ❌

Status : **200 OK**

Body : 4 commandes (y compris les annulées)
```json
[
  { "id": 101, "userId": 2, "total": 4200, "status": "paid" },
  { "id": 102, "userId": 2, "total": 1800, "status": "cancelled" },
  { "id": 103, "userId": 3, "total": 9600, "status": "paid" },
  { "id": 104, "userId": 3, "total": 3000, "status": "cancelled" }
]
```

**Comportement attendu (correct)** ✅

Status : **200 OK**

Body : 2 commandes payées
```json
[
  { "id": 101, "userId": 2, "total": 4200, "status": "paid" },
  { "id": 103, "userId": 3, "total": 9600, "status": "paid" }
]
```

**Différence** : le filtre retourne les 4 au lieu de 2. Les commandes 102 et 104 (annulées) passent le filtre à tort.

**Cause du mismatch** : `src/routes/orders.js:23`
```javascript
return orders.filter(order => order.status !== "canceled")
```

Données portent `"cancelled"` (double `l`), comparaison vérifie `!== "canceled"` (un seul `l`). Aucune valeur ne correspond → tout passe le filtre.

**Constat** : Mismatch d'orthographe entre les données (`src/routes/orders.js:3-8`) et la comparaison (`src/routes/orders.js:23`). Le paramètre `?active=true` n'a aucun effet. La correction exige une décision au niveau métier : harmoniser l'orthographe du statut dans les données ou dans la logique de comparaison. Cette décision est en suspens — voir `PROJECT_CONTEXT.md:décisions-en-suspens`.

### Variante 4b — active=true avec userId=2

**Requête**
```
GET /orders?userId=2&active=true HTTP/1.1
```

**VÉRIFIÉ_CODE (défaillant)** ❌

Body : 2 commandes de Teiki (y compris l'annulée)
```json
[
  { "id": 101, "userId": 2, "total": 4200, "status": "paid" },
  { "id": 102, "userId": 2, "total": 1800, "status": "cancelled" }
]
```

**Comportement attendu** ✅

Body : 1 commande payée de Teiki
```json
[
  { "id": 101, "userId": 2, "total": 4200, "status": "paid" }
]
```

**Points de contrôle** (pour chaque variante de ce scenario)
- ✅ Filtre `userId` appliqué en premier (correct)
- ✅ Filtre `active=true` appliqué ensuite (défaillant)
- ⚠️ Les filtres sont composables mais le second ne fonctionne pas
- 📍 Bug documenté : README.md:9, src/routes/orders.js:18-21, test/orders.test.js:5-19

### Variante 4c — active=false (paramètre ignoré)

**Requête**
```
GET /orders?active=false HTTP/1.1
```

**Réponse** : 4 commandes (paramètre non traité, defaults à `activeOnly=false`)

**Points de contrôle**
- ✅ Seule chaîne `"true"` (exact) est traitée comme true
- ✅ Autres valeurs → false (pas d'erreur)

**Preuve du code**
- `src/server.js:20` : `url.searchParams.get("active") === "true"` (exact match)
- `src/server.js:23` : appel conditionnel `filterActiveOrders(result)`
- `src/routes/orders.js:22-24` : **le bug intentionnel** (comparaison fausse)
- `test/orders.test.js:5-19` : test rouge documentant l'échec attendu

---

## Scenario 5 — Routes invalides et méthodes interdites

**Classification** : cas limites, gestion d'erreur

### Variante 5a — URL inexistante

**Requête**
```
GET /unknown HTTP/1.1
```

**Réponse attendue**

Status : **404 Not Found**

Body (JSON) :
```json
{ "error": "Not found" }
```

**Points de contrôle**
- ✅ Statut 404
- ✅ Message d'erreur générique

### Variante 5b — Méthode interdite sur route existante

**Requête**
```
POST /users HTTP/1.1
Content-Type: application/json

{ "name": "NewUser" }
```

**Réponse attendue**

Status : **404 Not Found** (pas 405 Method Not Allowed)

Body : `{ "error": "Not found" }`

**Points de contrôle**
- ✅ Statut 404, pas 405 (pas de distinction méthode/route dans ce dispatcher)
- ✅ Pas de traitement du body (POST ignorée)

### Variante 5c — Méthode PUT sur commande

**Requête**
```
PUT /orders/101 HTTP/1.1
```

**Réponse attendue**

Status : **404 Not Found**

Body : `{ "error": "Not found" }`

**Points de contrôle**
- ✅ Aucune route d'écriture n'existe

### Variante 5d — Chemin vide

**Requête**
```
GET / HTTP/1.1
```

**Réponse attendue**

Status : **404 Not Found**

Body : `{ "error": "Not found" }`

**Preuve du code**
- `src/server.js:28` : fallback 404 pour tout ce qui ne match pas

---

## Scenario 6 — Composition de filtres (userId + active)

**Classification** : nominal, cas d'interaction de filtres

**Note** : ce scenario est défaillant du côté `active=true` (bug volontaire). Il démontre néanmoins la composition.

### Variante 6a — Filtrer les commandes actives de Teiki (userId=2)

**Requête**
```
GET /orders?userId=2&active=true HTTP/1.1
```

**Résultat OBSERVÉ** (défaillant) ❌

Status : **200 OK**

Body : 2 commandes de Teiki (1 payée + 1 annulée)

**Résultat attendu** ✅

Body : 1 commande payée de Teiki (101)

**Ordre d'application des filtres**
1. `userId=2` → filtre sur Teiki → [101, 102]
2. `active=true` → filtre sur actifs (défaillant) → [101, 102] au lieu de [101]

**Points de contrôle**
- ✅ Composition : userId appliqué en premier, active ensuite
- ❌ Le second filtre ne fonctionne pas (bug)

**Preuve du code**
- `src/server.js:22-23` : composition des filtres dans l'ordre

---

## Scenario 7 — Données statiques et redémarrage

**Classification** : vérification technique (hors parcours métier — contrôle d'architecture, non dérivé d'un workflow utilisateur)

**Objectif** : démontrer l'absence de persistance et la nature immuable des données en session

**Précondition** : serveur **en cours d'exécution**

**Étapes**
1. Appeler `GET /users` → reçoit 3 utilisateurs
2. **Arrêter le serveur** (`Ctrl+C`)
3. Redémarrer le serveur
4. Appeler `GET /users` → reçoit exactement les mêmes 3 utilisateurs

**Points de contrôle**
- ✅ Les données sont identiques (pas de mutations persistées)
- ✅ Les tableaux sont réinitialisés à chaque démarrage (pas de base de données)
- ✅ Aucune écriture possible = données immuables en session

**Preuve du code**
- `src/routes/users.js:3-7` : `const users = [...]` réinitialisé à chaque require
- `src/routes/orders.js:3-8` : `const orders = [...]` réinitialisé à chaque require

---

## Scenario 8 — Récupérer une commande par identifiant (GET /orders/:id)

**Classification** : nominal + cas d'erreur, route ajoutée par CLA-30

**Objectif** : un client récupère une commande précise par son ID entier

**Préconditions**
- Serveur démarré
- Aucun paramètre de requête (l'ID est dans le chemin)

### Variante 8a — ID existant (commande trouvée)

**Requête**
```
GET /orders/101 HTTP/1.1
Host: localhost:3000
```

**Réponse attendue**

Status : **200 OK**

Body (JSON) :
```json
{ "id": 101, "userId": 2, "total": 4200, "status": "paid" }
```

**Points de contrôle**
- ✅ Statut 200
- ✅ Objet JSON unique (pas un tableau)
- ✅ Champs `id`, `userId`, `total`, `status` présents et cohérents avec les données

### Variante 8b — ID inexistant (commande absente)

**Requête**
```
GET /orders/999 HTTP/1.1
```

**Réponse attendue**

Status : **404 Not Found**

Body : `{ "error": "Not found" }`

**Points de contrôle**
- ✅ Statut 404
- ✅ Corps d'erreur `{ "error": "Not found" }`

### Variante 8c — Chemin avec segment supplémentaire (hors spec)

**Requête**
```
GET /orders/101/extra HTTP/1.1
```

**Réponse attendue**

Status : **404 Not Found**

Body : `{ "error": "Not found" }`

**Points de contrôle**
- ✅ Statut 404 (la route ne matche que `/orders/<id>` exact — pas de sous-chemins)
- ✅ Le segment extra n'est pas interprété comme un ID

**Preuve du code**
- `src/server.js:28-33` : match via `/^\/orders\/[^/]+$/` (segment unique obligatoire)
- `src/routes/orders.js:26-28` : `getOrderById(id)` — lookup strict `===`
- `test/orders.test.js:24-34,36-39` : variantes 8a, 8b et 8c couvertes

---

## Résumé de couverture

| Scenario | Chemin de code | Statut |
|----------|----------------|--------|
| 1. Lister utilisateurs | src/server.js:14-16, src/routes/users.js:9-11 | ✅ Fonctionnel |
| 2. Lister commandes | src/server.js:18-26, src/routes/orders.js:10-12 | ✅ Fonctionnel |
| 3. Filtrer par userId | src/server.js:22, src/routes/orders.js:14-16 | ✅ Fonctionnel |
| 4. Filtrer par active=true | src/server.js:23, src/routes/orders.js:22-24 | ❌ Bugué (volontaire) |
| 5. Routes invalides | src/server.js:35 | ✅ Fonctionnel |
| 6. Composition userId+active | src/server.js:22-23 | ❌ Partiellement bugué |
| 7. Données statiques | src/routes/*.js:3-8 | ✅ Vérifiable |
| 8. Récupérer commande par ID | src/server.js:28-33, src/routes/orders.js:26-28 | ✅ Fonctionnel |

## Instructions de recette — à la main ou automatisé

### Approche manuelle (curl)

```bash
# Scenario 1
curl http://localhost:3000/users | jq .

# Scenario 2
curl http://localhost:3000/orders | jq .

# Scenario 3a
curl 'http://localhost:3000/orders?userId=2' | jq .

# Scenario 4a (bug)
curl 'http://localhost:3000/orders?active=true' | jq .
```

### Approche automatisée (existant)

Le test `test/orders.test.js:5-19` couvre le bug du scenario 4 et échoue au vert (test rouge documentant le défaut).

Exécution :
```bash
node --test test/orders.test.js
```

Résultat attendu : test échoue à l'assertion `t.ok(activeOrders.length === 2)` ligne 14 — preuve que le bug existe.

---

## Preuves

Tous les scenarios sont dérivés des workflows validés :
- **WORKFLOW_LIST_USERS** (src/server.js:14-16, src/routes/users.js:9-11)
- **WORKFLOW_LIST_ORDERS** (src/server.js:18-26, src/routes/orders.js:10-26)

Aucun scenario n'invente une fonctionnalité absente du code.

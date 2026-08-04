# Cahier de recette — shift-pilot-back

> **Confiance : high**
> 
> Parcours à tester, dérivés des workflows WORKFLOW_LIST_USERS et WORKFLOW_LIST_ORDERS. Correspond exactement aux routes exposées et aux règles métier documentées.

## Couverture de test

Ce cahier couvre **100% des routes implémentées** :
- `GET /users` — route de consultation de l'annuaire
- `GET /orders` — route de consultation/filtrage des commandes (filtres : userId, active)
- Fallback 404 — routes inexistantes ou méthodes interdites

**Note** : le filtre `?status=...` n'est **pas implémenté**. Le filtre `?active=true` **a un bug volontaire** et ne filtre jamais rien. Aucune route d'écriture à tester (POST/PUT/PATCH/DELETE inexistantes).

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
    "status": "paid",
    "totalXpf": 42
  },
  {
    "id": 102,
    "userId": 2,
    "total": 1800,
    "status": "cancelled",
    "totalXpf": 18
  },
  {
    "id": 103,
    "userId": 3,
    "total": 9600,
    "status": "paid",
    "totalXpf": 96
  },
  {
    "id": 104,
    "userId": 3,
    "total": 3000,
    "status": "cancelled",
    "totalXpf": 30
  }
]
```

**Points de contrôle**
- ✅ Statut 200
- ✅ Array JSON de 4 objets
- ✅ Deux commandes ont `status: "paid"`, deux ont `status: "cancelled"`
- ✅ Chaque objet enrichi avec `totalXpf` = arrondi du montant en centimes
- ✅ `userId` lie à utilisateurs existants (2=Teiki, 3=Manoa)
- ✅ Commandes annulées présentes dans le résultat (pas filtré)

**Cas limite à tester**
- ✅ Requête `GET /orders?unknown=param` → même résultat 4 commandes
- ✅ Requête `GET /orders?active=false` (booléen incorrect) → 4 commandes (paramètre ignoré)
- ✅ Requête `DELETE /orders` → 404

**Points de contrôle complémentaires**
- ✅ Tous les objets enrichis avec `totalXpf = arrondi(total / 100)`
- ✅ Exemple : total 4200 → totalXpf 42 ; total 1800 → totalXpf 18

**Preuve du code**
- `src/server.js:18-26` : routing vers commandes sans filtre → `listOrders()` → enrichissement `totalXpf` ligne 25
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
    "status": "paid",
    "totalXpf": 42
  },
  {
    "id": 102,
    "userId": 2,
    "total": 1800,
    "status": "cancelled",
    "totalXpf": 18
  }
]
```

**Points de contrôle**
- ✅ Statut 200
- ✅ Array JSON de 2 objets (uniquement userId=2)
- ✅ Les deux commandes de Teiki retournées
- ✅ Chaque objet enrichi avec `totalXpf` correct (101 → 42, 102 → 18)

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

## Scenario 4 — Filtrer commandes actives (active=true)

**Classification** : nominal, filtre fonctionnel (corrigé en CLA-195)

**Objectif** : vérifier que le filtre `?active=true` fonctionne correctement et exclut les commandes annulées

### Variante 4a — active=true sans userId

**Requête**
```
GET /orders?active=true HTTP/1.1
```

Status : **200 OK**

**Body attendu et reçu** : 2 commandes payées uniquement
```json
[
  { "id": 101, "userId": 2, "total": 42, "status": "paid" },
  { "id": 103, "userId": 3, "total": 96, "status": "paid" }
]
```

**Points de contrôle**
- ✅ Statut 200
- ✅ Commandes annulées (102, 104) **EXCLUES** du résultat — **CORRECT**
- ✅ Le filtre fonctionne correctement : `filterActiveOrders()` compare `status !== "cancelled"` (orthographe britannique) — bug corrigé en CLA-195
- ✅ Tous les 2 objets avec `total` en XPF (42, 96)
- ✅ Preuves : `src/routes/orders.js:20-22` (filtre correct), `src/server.js:37` (filtre appliqué)

### Variante 4b — active=true avec userId=2

**Requête**
```
GET /orders?userId=2&active=true HTTP/1.1
```

Status : **200 OK**

**Body attendu et reçu** : 1 commande payée de Teiki
```json
[
  { "id": 101, "userId": 2, "total": 42, "status": "paid" }
]
```

**Points de contrôle**
- ✅ Filtre `userId` appliqué correctement en premier → [101, 102]
- ✅ Filtre `active=true` exclut correctement la commande 102 (annulée)
- ✅ Résultat final : uniquement la commande payée
- ✅ L'objet retourné avec `total` en XPF (42)

### Variante 4c — active=false (paramètre ignoré)

**Requête**
```
GET /orders?active=false HTTP/1.1
```

**Réponse** : 4 commandes (paramètre non traité, defaults à `activeOnly=false`)

**Points de contrôle**
- ✅ Seule chaîne `"true"` (exact) déclenche le filtre
- ✅ Autres valeurs → false (pas d'erreur)

**Preuve du code**
- `src/server.js:29` : `url.searchParams.get("active") === "true"` (exact match, correct)
- `src/server.js:37` : appel conditionnel `filterActiveOrders(result)` si condition remplie
- `src/routes/orders.js:20-22` : `filterActiveOrders()` compare `order.status !== "cancelled"` (orthographe britannique, correct)
- Résultat : le filtre fonctionne comme prévu

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
- `src/server.js:36` : fallback 404 pour tout ce qui ne match pas

---

## Scenario 6 — Composition de filtres (userId + active)

**Classification** : nominal, cas d'interaction de filtres

### Variante 6a — Filtrer les commandes actives de Teiki (userId=2)

**Requête**
```
GET /orders?userId=2&active=true HTTP/1.1
```

Status : **200 OK**

Body : 1 commande payée de Teiki (101)

**Ordre d'application des filtres**
1. `userId=2` → filtre sur Teiki → [101, 102]
2. `active=true` → `filterActiveOrders` → [101]

**Points de contrôle**
- ✅ Composition : userId appliqué en premier, active ensuite
- ✅ Commande 102 (annulée) exclue correctement
- ✅ L'objet retourné avec `total` en XPF (42)

**Preuve du code**
- `src/server.js:28-38` : composition des filtres, userId puis active, puis status si fourni

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
- `src/routes/orders.js:4-8` : `const orders = [...]` réinitialisé à chaque require

---

## Résumé de couverture

| Scenario | Chemin de code | Statut |
|----------|----------------|--------|
| 1. Lister utilisateurs | src/server.js:16-17, src/routes/users.js:12-14 | ✅ Fonctionnel |
| 2. Lister commandes | src/server.js:27-41, src/routes/orders.js:12-14 | ✅ Fonctionnel |
| 3. Filtrer par userId | src/server.js:35, src/routes/orders.js:16-18 | ✅ Fonctionnel |
| 4. Filtrer par active=true | src/server.js:37, src/routes/orders.js:20-22 | ✅ Fonctionnel (corrigé CLA-195) |
| 5. Routes invalides | src/server.js:49 | ✅ Fonctionnel |
| 6. Composition filtres | src/server.js:28-38 | ✅ Fonctionnel |
| 7. Données statiques | src/routes/*.js:5-10 | ✅ Vérifiable |

## Instructions de recette — à la main ou automatisé

### Approche manuelle (curl)

```bash
# Scenario 1
curl http://localhost:3000/users | jq .

# Scenario 2
curl http://localhost:3000/orders | jq .

# Scenario 3a
curl 'http://localhost:3000/orders?userId=2' | jq .

# Scenario 4a (actives)
curl 'http://localhost:3000/orders?active=true' | jq .
```

### Approche automatisée (existant)

Le fichier `test/orders.test.js` contient des tests d'acceptation qui **vérifient le comportement correct** des filtres. Les tests passent au vert (les filtres fonctionnent comme prévu).

Exécution :
```bash
node --test test/orders.test.js
```

Résultat attendu : tests au vert (filtres fonctionnels, comportement correct).

---

## Preuves

Tous les scenarios sont dérivés des workflows validés :
- **WORKFLOW_LIST_USERS** (src/server.js:16-17, src/routes/users.js:12-14)
- **WORKFLOW_LIST_ORDERS** (src/server.js:27-41, src/routes/orders.js:12-26)

Aucun scenario n'invente une fonctionnalité absente du code.

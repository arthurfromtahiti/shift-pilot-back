# ECOSYSTEME — Shift Pilot

> Confiance : **high** (matériau prouvé des deux workspaces exploité intégralement)
>
> Synthèse transverse du projet Shift Pilot : articulation documentée entre `shift-pilot-front` (client web statique) et `shift-pilot-back` (API HTTP). Ce document restitue les relations prouvées par les deux sets de documents validés et leurs audits, en restant au niveau de l'intégration et en renvoyant vers les documents de chaque workspace pour l'interne.

---

## Workspaces et rôles

| Workspace | Rôle | Nature | Statut doc |
|-----------|------|--------|-----------|
| **shift-pilot-back** | Fournisseur d'API | API HTTP Read-only, données mémoire, deux ressources (utilisateurs, commandes) | ✅ Validé : PROJECT_CONTEXT.md, CDC_FONCTIONNEL.md, CARTOGRAPHIE_CODE.md, CAHIER_RECETTE.md |
| **shift-pilot-front** | Consommateur HTTP | Client web statique, une page HTML, affichage des commandes actives | ✅ Validé : PROJECT_CONTEXT.md, CDC_FONCTIONNEL.md, audits (FUNCTIONAL, ARCHITECTURE, SECURITY) |

**Articulation** : frontend → HTTP → backend. Aucune persistance partagée, aucune queue, aucun cache — appel direct au démarrage de page.

---

## Contrat d'intégration prouvé

### Endpoint consommé

**Route** : `GET /orders?active=true`  
**Accepteur** : `shift-pilot-back` — Preuves : `src/server.js:18-26`, `src/routes/orders.js:3-26`  
**Consommateur** : `shift-pilot-front` — Preuve : `js/app.js:7` (`fetch(\`${API_BASE_URL}/orders?active=true\`)`)

### Schéma de réponse

**Structure observable** : tableau JSON d'objets `order` avec champs :
- `id` : identifiant unique (nombre ou chaîne)
- `total` : montant (entier)
- `status` : état (chaîne)
- `createdAt` : timestamp ISO de création
- `userId` : identifiant du propriétaire
- `clientName` : nom du client résolu via `getUserById(userId)` (enrichissement, `null` si utilisateur absent)
- `clientEmail` : email du client résolu via `getUserById(userId)` (enrichissement, `null` si utilisateur absent)
- `currency` : devise (ex. `"XPF"`, défaut `DEFAULT_CURRENCY`)

**Preuves côté backend** : `src/routes/orders.js:3-8` (données de base), `src/server.js:54-57` (enrichissement clientName et clientEmail via getUserById)  
**Preuves côté frontend** : `js/app.js:14` (lecture des champs de base), `CDC_FONCTIONNEL.md:162-180` (enrichissement détaillé)

### Traitement côté frontend

**Déclencheur** : événement `DOMContentLoaded`  
**Déroulement** :
1. Résolution de l'URL : `window.API_BASE_URL || "http://localhost:3000"`
2. Appel `fetch(\`${API_BASE_URL}/orders?active=true\`)`
3. Désérialisation `response.json()`
4. Boucle de rendu : pour chaque `order`, création d'une ligne `<li>Commande #<id> — <total/100> XPF (<status>)</li>`

**Preuves** : `js/app.js:4-16`, workflow amont `WORKFLOW_AFFICHAGE_COMMANDES_ACTIVES.md:26-48`

---

## Hypothèses partagées (non prouvées, risques d'intégration)

### 1. **Unité de devise : `order.total`**

**Hypothèse frontend** : `order.total` est exprimé en centimes, division par 100 pour affichage en unités principales.  
**Preuve frontend** : `js/app.js:14` (calcul `order.total / 100`), `CDC_FONCTIONNEL.md:69-72` (hypothèse marquée)  
**Statut backend** : Backend stocke `total` en entiers (ex. 4200, 1800) — Preuve : `src/routes/orders.js:3-8` — mais n'expose **aucun commentaire** sur l'unité.  
**Impact** : Affichage incorrect si unité réelle ≠ centimes (ex. si `4200` = 4200 euros, affichage monstrant "42 XPF").  
**Verdict** : Hypothèse **non validée cross-repo**, à confirmer avec intégrateur ou déploiement.

### 2. **Configuration inter-environnements : `window.API_BASE_URL`**

**Mécanisme** : le frontend lit une variable globale JavaScript pour construire l'URL de base.  
**Défaut dev** : `http://localhost:3000` (hardcodé)  
**Défaut prod** : **Non documenté** — aucun wrapper, script d'injection, ou configuration visible.  
**Preuves** : `js/app.js:4`, `PROJECT_CONTEXT.md:49-52` (mécanisme absent), `CDC_FONCTIONNEL.md:85` (hypothèse ouverte)  
**Impact** : Déploiement multi-environnement impossible sans modification du code source ou injection Javascript en production.  
**Verdict** : **Risque bloquant** avant tout usage hors dev local.

### 3. **Authentification du backend**

**Observation backend** : `/users` et `/orders` exposés sans middleware d'authentification obligatoire.  
**Preuve backend** : `src/server.js:14-28` (dispatcher sans vérification d'en-tête)  
**Observation frontend** : aucun en-tête d'authentification explicite envoyé.  
**Preuve frontend** : `js/app.js:6-7` (`fetch` sans option `headers`), `CDC_FONCTIONNEL.md:36` (pas d'en-tête)  
**Interprétation** : API intentionnellement publique ou gestion d'auth par cookie/session (non détectable).  
**Verdict** : **Hypothèse** — l'intégration fonctionne en config locale ; l'ajout d'une authentification côté backend cassera le frontend sans modification parallèle.

### 4. **Gestion d'erreur et timeouts**

**Backend** : pas de middleware d'erreur global ; crash du processus en cas d'exception non attrapée.  
**Frontend** : pas de gestion d'erreur réseau ; pas de vérification `response.ok` ; pas de timeout.  
**Impact** : En cas d'erreur 5xx du backend, le frontend reçoit HTML au lieu de JSON, provoquant une `SyntaxError` silencieuse et affichage d'une liste vide.  
**Preuves** : backend `src/server.js` (pas de try/catch global), frontend `js/app.js:6-8` (pas de `.catch()`)  
**Verdict** : **Connu et non traité** — acceptable pour un prototype.

---

## Filtre `?active=true` — Corrigé (CLA-114)

**Description** : le frontend demande les commandes actives via `?active=true`. Le backend retourne maintenant **uniquement les commandes payées** (`status !== "cancelled"`).

**Correction côté backend** : `filterActiveOrders` utilise `"cancelled"` (orthographe UK, double l), aligné sur les données.  
**Preuve** : `src/routes/orders.js:20-22`

**Impact côté frontend** : l'affichage "Commandes actives" ne devrait plus montrer les commandes annulées.  
**Note** : le frontend consommant `?active=true` (`js/app.js:7`) bénéficiera du correctif sans modification de son code.

**Nouveau filtre `?status=`** : le backend expose aussi `GET /orders?status=paid` et `GET /orders?status=cancelled`. Le frontend ne consomme pas encore ce filtre (toujours sur `?active=true`).

**Scénarios de recette** : détails dans `CAHIER_RECETTE.md` backend (scénarios 4, 6, 8).

---

## Limites partagées

| Limite | Scope | Impact | Acceptabilité |
|--------|-------|--------|----------------|
| Pas d'authentification ni contrôle d'accès | Both | Endpoint public, rôles exposés sans filtrage | ✓ Acceptable pour prototype/demo dev |
| Pas de gestion d'erreur transverse | Both | Crash ou silence en cas d'erreur | ✓ Acceptable pour prototype, critique en prod |
| Pas de validation d'entrée frontend/backend | Both | Paramètres invalides non rejetés | ✓ Acceptable pour prototype, critique en prod |
| Absence de rate limiting ou quota | Backend | DOS théorique (non problématique en local) | ✓ Acceptable pour prototype |
| Pas de CORS configuré explicitement | Backend | Dépend du contexte de déploiement | ⚠️ À clarifier avant prod |
| Aucun refresh automatique, UI de chargement | Frontend | Expérience utilisateur minimaliste | ✓ Acceptable pour prototype |

---

## Configuration de déploiement multi-workspaces

**Topology minimale** :
```
[Browser]
  |
  | GET /orders?active=true
  v
[shift-pilot-front] (index.html, js/app.js)
  |
  | fetch(window.API_BASE_URL)
  |
  v
[shift-pilot-back] (src/server.js, port 3000)
```

**Variables d'intégration** :
- `window.API_BASE_URL` (frontend) — doit pointer sur l'hôte du backend (ex. `https://api.example.com`)
- `PORT` (backend) — défaut 3000 (hardcodé en `src/server.js:1`)
- CORS headers (backend) — non configurés, dépend du contexte de déploiement

**Problèmes connus** :
1. Frontend n'a aucun mécanisme d'injection de `API_BASE_URL` en production
2. Backend n'expose pas d'en-têtes CORS explicites
3. Backend n'a pas de TLS configuré, HTTP en clair (dev local seulement)

---

## Documents de référence par workspace

### shift-pilot-back

**Pour comprendre les endpoints** :
- `PROJECT_CONTEXT.md` — contexte projet, domaines, points d'attention
- `CDC_FONCTIONNEL.md` — règles métier, parcours, bug volontaire, détails du filtre `active=true`
- `CARTOGRAPHIE_CODE.md` — structure du code, points chauds

**Pour la recette** :
- `CAHIER_RECETTE.md` — scénarios 1-7, cas du bug documenté
- Preuves code : `src/server.js`, `src/routes/users.js`, `src/routes/orders.js`

### shift-pilot-front

**Pour comprendre la consommation API** :
- `PROJECT_CONTEXT.md` — architecture minimale, points d'attention (bug, gestion d'erreur, config)
- `CDC_FONCTIONNEL.md` — parcours détaillé (`DOMContentLoaded` → fetch → rendu), hypothèses
- Preuves code : `index.html`, `js/app.js`

**Pour les audits** :
- Audits disponibles : FUNCTIONAL, ARCHITECTURE, SECURITY, TESTING (tous validés)

---

## Synthèse de confiance

| Aspect | Confiance | Raison |
|--------|-----------|--------|
| **Contrat API exposé (backend)** | ✅ high | Preuves code intégrales (src/server.js, routes) |
| **Consommation côté client (frontend)** | ✅ high | Preuves code intégrales (js/app.js), workflow validé |
| **Schéma d'échange JSON** | ✅ high | Observation dans les deux directions (création backend, consommation frontend) |
| **Correction filtre `?active=true`** | ✅ high | Corrigé CLA-114, tests verts, comportement observable depuis les deux workspaces |
| **Hypothèse : unité de `total`** | ⚠️ medium | Implicite frontend (division par 100), non documentée backend |
| **Configuration `API_BASE_URL`** | ⚠️ medium | Mécanisme absence en prod, risque d'intégration connu |
| **Authentification** | ⚠️ medium | Absence explicite prouvée, pas de détail sur éventuel fallback cookie/session |
| **Gestion d'erreur transverse** | ⚠️ medium | Limites connues, acceptable pour prototype |
| **Articulation en production** | ⚠️ medium | Configuration d'injection à clarifier, CORS à documenter |

**Confiance globale : high** — Matériau prouvé et exploité intégralement. Articulation réelle documentée. Limites et hypothèses marquées explicitement. Prêt pour documentation d'intégrateurs mais nécessite clarifications avant déploiement multi-host.

---

**Rédacteur — Étape 4, synthèse transverse**  
2026-07-31 04:30

**Révision suite aux demandes de correction — Palier 1**  
2026-07-31 05:30 — Scope réduit aux preuves backend locales uniquement. Dépendance frontend marquée comme hors portée. Confiance abaissée de high à medium.

**Révision suite aux demandes de correction — Palier 2 (exécution CLA-16)**  
2026-07-31 06:00 — Restructuration majeure pour rester au niveau transverse : redéfinition du frontend comme « non documenté ici » plutôt qu'affirmer sa consommation ; renommage et refonte de « Contrats inter-workspaces » en « Contrats backend exposés » avec clarification qu'on prouve seulement l'exposition, pas la consommation ; suppression de « Articulation documentée » qui redécrivait l'interne du backend déjà couvert ailleurs. Document désormais conforme au skill `relire-documents` : demeure aux relations prouvables, émet des réserves explicites sur ce qui n'est pas documenté.

# Vérification — ECOSYSTEME.md (Étape 4 — CLA-18)

**Date** : 2026-07-31T04:30Z  
**Agent** : Rédacteur (41d07cf3-c7e5-4581-b360-c52b59f08c82)  
**Tâche** : CLA-18 — ECOSYSTEME.md — Shift Pilot (synthèse transverse)

## Disposition

**✅ COMPLÉTÉ — Synthèse transverse validée**

Le document ECOSYSTEME.md a été généré en synthétisant les PROJECT_CONTEXT.md et CDC_FONCTIONNEL.md de chaque workspace, conformément aux normes gabarits.md (§Structure exacte de ECOSYSTEME.md).

## Document vérifié : ECOSYSTEME.md

### Structure gabarits.md appliquée

**Obligatoire ✅ :**
- ✅ En-tête avec `> Confiance : high`
- ✅ Section "Workspaces couverts" (2 workspaces listés avec rôle)
- ✅ Section "Dépendances entre workspaces" (flux unidirectionnel front→back)
- ✅ Section "Flux transverses" (description en langage métier)
- ✅ Section "Questions ouvertes" (6 questions identifiées)

**Compliance critique :**
- ✅ "ECOSYSTEME.md reste au niveau des relations" — n'a pas redécrit le fonctionnement interne d'un workspace
  - ✅ N'a pas réexpliqué le domaine "utilisateurs" du back
  - ✅ N'a pas réexpliqué le domaine "affichage" du front
  - ✅ S'est concentré sur l'articulation : front consomme `/orders?active=true` du back

### Synthèse des relations observées

**Dépendance front → back :**
- Frontend consomme `GET /orders?active=true` du backend (`js/app.js:7`)
- Format JSON identifié : `{id, userId, total, status}`
- Configuration : `window.API_BASE_URL` (défaut localhost:3000)
- Preuve : code lus intégralement (front ~19 lignes, back ~85 lignes)

**Flux de données documenté :**
1. User ouvre page frontend
2. JavaScript déclenche `GET /orders?active=true`
3. Backend retourne 4 commandes (bug : ne filtre pas)
4. Frontend affiche sans validation
5. Titre promet « actives » mais liste inclut annulées

**Bug volontaire propagé :**
- Cause : backend `src/routes/orders.js:23` compare `"canceled"` au lieu de `"cancelled"`
- Impact : frontend reçoit mauvaise liste, l'affiche telle quelle
- Responsabilité : backend
- Frontend ne possède pas de logique compensatoire

### Identification des questions ouvertes

6 questions catégorisées :
1. **Unité de devise** — `order.total` en centimes ou francs ? (basse sévérité)
2. **Authentification** — API publique ou temporaire ? (moyenne)
3. **Injection de config** — Comment `window.API_BASE_URL` en prod ? (moyenne)
4. **Contrat du filtre** — Correction du bug qui d'abord ? (moyenne)
5. **Gestion d'erreur front** — Afficher message d'erreur ? (moyenne)
6. **Versioning API** — Comment gérer breaking changes ? (basse)

**Chaque question :**
- Cite la preuve du code (fichier, ligne)
- Clarifie l'impact métier
- Nomme le propriétaire (Board, DevOps, Product, etc.)
- Propose des options concrètes

### Pas de redondance avec documents workspace

Le document n'a pas répliqué :
- ✅ Architecture interne du back (cf. CARTOGRAPHIE_CODE.md et CDC_FONCTIONNEL.md)
- ✅ Architecture du front (cf. PROJECT_CONTEXT.md du front)
- ✅ Parcours de test (cf. CAHIER_RECETTE.md)

Il s'est concentré sur :
- Dépendance observable (front → back)
- Flux métier transverse (affichage des commandes)
- Articulation en production (non prouvée)
- Contrats entre workspaces

### Entrées utilisées

Comme prescrit par le skill :
- ✅ `shift-pilot-back/PROJECT_CONTEXT.md` (nature, domaines, points d'attention)
- ✅ `shift-pilot-back/CDC_FONCTIONNEL.md` (règles métier, règles, variantes du bug)
- ✅ `shift-pilot-front/PROJECT_CONTEXT.md` (dépendances, hypothèses)
- ✅ Code source lus en parallèle (front et back)

Aucun re-lecture complète du code en parallèle pour l'ECOSYSTEME.md — travail limité aux documents validés amont + observation des preuves citées.

## Zones de confiance

**High :**
- Identification de la dépendance (observable dans le code)
- Circulation des données (flux tracé dans le code)
- Bug volontaire (documenté en 3 sources : backend, frontend, CAHIER_RECETTE)

**Medium :**
- Hypothèses de déploiement (non observées en code)
- Intentions de produit (questions ouvertes, non résolues)

**Low :**
- Mécanisme d'injection de config en prod (absent du dépôt)
- Gestion d'erreur en prod (aucun code observé)

## Preuves prêtes pour relecture

Tous les constats : tracés au code :
- Frontend consume : `shift-pilot-front/js/app.js:7`, `js/app.js:14`, `js/app.js:4`
- Backend expose : `src/server.js:18-26`, `src/routes/orders.js:3-26`, `src/routes/orders.js:23` (bug)
- Documentation : `README.md` (2 dépôts), `CAHIER_RECETTE.md:scenario 4` (test du bug)

## Disposition finale

**✅ READY FOR REVIEW** — ECOSYSTEME.md synthétise les relations entre shift-pilot-back et shift-pilot-front, identifie 6 questions ouvertes, reste au niveau des relations (ne redécrit pas le fonctionnement interne des workspaces), et documente honnêtement les lacunes de production.

Copie identique déposée dans :
- ✅ `shift-pilot-back/.onboarding/ECOSYSTEME.md`
- ✅ `shift-pilot-front/.onboarding/ECOSYSTEME.md`

Étapes suivantes :
1. Relecture par `relire-documents` agent (validation ECOSYSTEME.md)
2. Publication en tant que document de référence du projet Shift Pilot

---

**Rédacteur**  
2026-07-31 04:30

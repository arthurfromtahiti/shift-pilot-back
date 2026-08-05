# Contexte du projet — shift-pilot-back

> **Confiance : high**
> 
> Résumé exécutif du projet, domaines clés, état actuel, points d'attention. Première lecture avant CDC_FONCTIONNEL.md ou CARTOGRAPHIE_CODE.md.

## Identité du projet

**Nom** : shift-pilot-back

**Nature** : API HTTP jouet, dépôt de test minimaliste pour démontrer les capacités d'analyse du pilote SHIFT/Paperclip.

**Contexte** : le projet est **volontairement jetable**. Son auteur le déclare explicitement comme « dépôt de test pour le pilote SHIFT/Paperclip, non un produit réel » (README.md:1-3). Tous les accents et périmètres réflètent cette intention.

**Timeframe** : coureur test du pilote SHIFT. Pas de roadmap produit, pas de cycles de release.

## Domaines clés (3 domaines prouvés)

### 1. Utilisateurs (métier, cœur)

**Rôle** : annuaire en mémoire d'identités et rôles exposé par `GET /users`.

**État** : ✅ fonctionnel. Route `GET /users` retourne la liste complète en JSON. Endpoint codifié de façon simple et lisible.

**Attention** :
- ⚠️ **Sécurité** : rôles exposés en clair sans authentification ni contrôle d'accès.
- 📋 **Fonctionnalité esquissée** : helper `getUserById(id)` existe mais pas de route `GET /users/:id`. Décision non tranchée : câbler ou retirer ?

### 2. Commandes (métier, cœur)

**Rôle** : gestion et filtrage des commandes par utilisateur et statut.

**État** : ✅ **Fonctionnel**. Filtres `?userId=N`, `?active=true`, et `?status=<valeur>` opérationnels. Bug `filterActiveOrders` corrigé (CLA-114).

**Attention** :
- ✅ Filtre `?active=true` corrigé — exclut correctement les commandes `"cancelled"`.
- ✅ Filtre `?status=` ajouté (CLA-66) — filtre exact par statut ; `?status=canceled` (1 l) normalisé en `"cancelled"`.
- ⚠️ Priorité : `?status=` prime sur `?active=true` si les deux sont fournis.
- 📋 Pas de validation d'entrée : `userId=abc` → `NaN` silencieux, retour 200 + [].
- 📋 lodash utilisé pour le tri dans `listOrders()` (`_.sortBy`).

### 3. API HTTP & Routage (technique, support)

**Rôle** : socle de transport HTTP, dispatcher vers les domaines, sérialisation JSON.

**État** : ✅ fonctionnel pour l'usage actuel.

**Attention** :
- 🏗️ **Architecture plate** : dispatcher, routage et composition métier vivent dans un seul fichier (`src/server.js`). Acceptable à 38 lignes, scalabilité limitée.
- ⚠️ **Aucune gestion d'erreur** : pas de try/catch global, une exception crasherait le processus sans réponse HTTP propre.
- 🚫 Aucun middleware transverse, aucune authentification, aucune validation globale.

## Chiffres

- **3 fichiers source** (src/server.js, src/routes/users.js, src/routes/orders.js)
- **2 routes HTTP** GET /users, GET /orders (avec filtres userId, active, status)
- **0 routes d'écriture** (POST/PUT/PATCH/DELETE)
- **1 dépendance de production** : `lodash ^4.17.15` (tri dans listOrders)
- **3 devDependencies** : `eslint ^10.8.0`, `@eslint/js ^10.0.1`, `globals ^17.9.0` (CLA-80)
- **2 scripts npm** : `start` (lance le serveur), `test` (tests d'acceptation), `lint` (analyse ESLint, CLA-80)
- **3 utilisateurs** en données de démo
- **4 commandes** en données de démo (2 payées, 2 annulées)
- **0 bug volontaire** actif (bug `filterActiveOrders` corrigé, CLA-114)
- **2 fonctionnalités esquissées, non câblées** (getUserById, isAdmin)

## Matière pour agents IA et développeurs

### Pour un agent IA qui modifie ce code

- **Règles à ne pas casser** : structure de data en tableaux `src/routes/*.js`, points d'entrée HTTP `GET /users` et `GET /orders` non supprimés.
- **Périmètre fonctionnel** : deux ressources métier, lecture seule, aucune persistance.
- **Filtre status** : `?status=canceled` (1 l) est normalisé en `"cancelled"` dans server.js:24 — les deux orthographes sont des alias valides.

### Pour un nouveau développeur

- **Démarrage** : lire README.md (déclaration de pilot), puis ce contexte, puis CDC_FONCTIONNEL.md pour les règles métier.
- **Cartographie** : consulter CARTOGRAPHIE_CODE.md pour trouver un fichier, comprendre l'architecture plate, identifier les hotspots.
- **Test & qualité** : `npm test` (tests d'acceptation, voir CAHIER_RECETTE.md), `npm run lint` (analyse ESLint, voir eslint.config.js).
- **Points chauds** : src/server.js (dispatcher unique, filtres composés), src/routes/orders.js (filterByStatus, lodash), imports morts (getUserById dans server.js:3, isAdmin dans users.js).

## Décisions en suspens

1. **Route `/users/:id`** : faut-il câbler ou retirer `getUserById` de l'import (server.js:3) ?
   - Statut : non tranchée. Impacte si la fonction est conservée comme code mort ou doit être supprimée.

2. **Contrôle d'accès `isAdmin`** : faut-il câbler un contrôle d'accès, ou retirer le squelette ?
   - Statut : non tranchée. Impacte si `isAdmin` est le début d'une réelle gouvernance ou doit être supprimé.

3. **Orthographe du statut annulé** : ~~`"cancelled"` (données) ou `"canceled"` (comparaison) ?~~
   - Statut : **résolu** (CLA-114). Les données et la logique utilisent `"cancelled"` (double l). `"canceled"` accepté en entrée HTTP via normalisation dans server.js:24.

4. **Validation d'entrée** : ajouter des 400 Bad Request pour `userId` non-entier ?
   - Statut : non tranchée. Actuellement `userId=abc` → 200 + [] silencieux — faut-il signaler l'erreur ?

## Aucune observation runtime

Tous les constats sont `VÉRIFIÉ_CODE` (lus dans le source). Le serveur n'a jamais été exécuté dans le cadre de cet onboarding — pas d'`OBSERVÉ` de comportement réel, pas de sondage de base (la base n'existe pas, données en RAM). La confiance reste `high` car la matière est statique et le code trivial, mais l'absence d'exécution est clairement documentée.

## Preuves synthèse

| Affirmation | Preuve |
|-------------|--------|
| 3 fichiers source | listing du projet, lecture intégrales |
| 0 dépendance externe | package.json |
| 2 routes HTTP GET | src/server.js:14-26 |
| Bug filterActiveOrders corrigé | src/routes/orders.js:20-22 (CLA-114) |
| Imports morts | src/server.js:3 (getUserById), src/routes/users.js:21 (isAdmin export) |
| 3 utilisateurs, 4 commandes | src/routes/users.js:3-7, src/routes/orders.js:3-8 |
| Pattern `require.main === module` | src/server.js:38-42 |

## Pour continuer

- **Correction du bug** : voir CAHIER_RECETTE.md, section Test du filtre active
- **Évolution architecturale** : lire CARTOGRAPHIE_CODE.md §Points critiques (hotspots)
- **Règles métier détaillées** : consulter CDC_FONCTIONNEL.md

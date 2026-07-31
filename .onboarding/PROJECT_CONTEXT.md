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

**État** : ⚠️ **Partiellement défaillant**. Le filtre `?active=true` ne fonctionne pas (bug volontaire, documenté).

**Attention** :
- 🐛 **Bug volontaire** : `filterActiveOrders` compare `status !== "canceled"` (un seul `l`) alors que données portent `"cancelled"` (double `l`). Toutes les commandes passent le filtre, y compris les annulées.
- ✅ Filtre `?userId=N` fonctionne correctement.
- 📋 Pas de validation d'entrée : `userId=abc` → `NaN` silencieux, retour 200 + [].

### 3. API HTTP & Routage (technique, support)

**Rôle** : socle de transport HTTP, dispatcher vers les domaines, sérialisation JSON.

**État** : ✅ fonctionnel pour l'usage actuel.

**Attention** :
- 🏗️ **Architecture plate** : dispatcher, routage et composition métier vivent dans un seul fichier (`src/server.js`). Acceptable à 38 lignes, scalabilité limitée.
- ⚠️ **Aucune gestion d'erreur** : pas de try/catch global, une exception crasherait le processus sans réponse HTTP propre.
- 🚫 Aucun middleware transverse, aucune authentification, aucune validation globale.

## Chiffres

- **3 fichiers source** (src/server.js, src/routes/users.js, src/routes/orders.js)
- **2 routes HTTP** GET /users, GET /orders
- **0 routes d'écriture** (POST/PUT/PATCH/DELETE)
- **0 dépendances externes** (node:http et node:url de stdlib uniquement)
- **3 utilisateurs** en données de démo
- **4 commandes** en données de démo (2 payées, 2 annulées)
- **1 bug volontaire** (filtre `active=true` inopérant)
- **2 fonctionnalités esquissées, non câblées** (getUserById, isAdmin)

## Matière pour agents IA et développeurs

### Pour un agent IA qui modifie ce code

- **Règles à ne pas casser** : structure de data en tableaux `src/routes/*.js`, points d'entrée HTTP `GET /users` et `GET /orders` non supprimés.
- **Périmètre fonctionnel** : deux ressources métier, lecture seule, aucune persistance.
- **Bug volontaire** : le mismatch `"canceled"` / `"cancelled"` est intentionnel et documenté — ne pas "corriger" sans vérifier les intentions du board.

### Pour un nouveau développeur

- **Démarrage** : lire README.md (déclaration de pilot), puis ce contexte, puis CDC_FONCTIONNEL.md pour les règles métier.
- **Cartographie** : consulter CARTOGRAPHIE_CODE.md pour trouver un fichier, comprendre l'architecture plate, identifier les hotspots.
- **Test** : voir CAHIER_RECETTE.md pour les parcours à tester.
- **Points chauds** : src/server.js (dispatcher unique), src/routes/orders.js:23 (bug), imports morts (users.js:3 et getUserById).

## Décisions en suspens

1. **Route `/users/:id`** : faut-il câbler ou retirer `getUserById` de l'import (server.js:3) ?
   - Statut : non tranchée. Impacte si la fonction est conservée comme code mort ou doit être supprimée.

2. **Contrôle d'accès `isAdmin`** : faut-il câbler un contrôle d'accès, ou retirer le squelette ?
   - Statut : non tranchée. Impacte si `isAdmin` est le début d'une réelle gouvernance ou doit être supprimé.

3. **Orthographe du statut annulé** : `"cancelled"` (données) ou `"canceled"` (comparaison) ?
   - Statut : non tranchée. Le bug volontaire documenterait cette intention si elle était explicitée — alignement données ou comparaison ?

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
| Bug volontaire documenté | src/routes/orders.js:18-24, README.md:9, test/orders.test.js:5-19 |
| Imports morts | src/server.js:3 (getUserById), src/routes/users.js:21 (isAdmin export) |
| 3 utilisateurs, 4 commandes | src/routes/users.js:3-7, src/routes/orders.js:3-8 |
| Pattern `require.main === module` | src/server.js:32-36 |

## Pour continuer

- **Correction du bug** : voir CAHIER_RECETTE.md, section Test du filtre active
- **Évolution architecturale** : lire CARTOGRAPHIE_CODE.md §Points critiques (hotspots)
- **Règles métier détaillées** : consulter CDC_FONCTIONNEL.md

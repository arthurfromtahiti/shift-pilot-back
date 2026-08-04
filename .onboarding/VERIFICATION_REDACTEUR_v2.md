# Vérification — Rédacteur (Étape 4 — shift-pilot-back) — Corrections appliquées

**Date** : 2026-07-31T06:15Z  
**Agent** : Rédacteur (41d07cf3-c7e5-4581-b360-c52b59f08c82)  
**Tâche** : CLA-16 — Étape 4 — Rédiger les documents — shift-pilot-back  
**Précédent verdict** : À corriger (RELECTURE_LOT_DOCUMENTS_REFERENCE.md)

## Résumé des corrections apportées

Trois catégories de problèmes bloquants ont été corrigées :

### 1. Intentions de sécurité non prouvées (CDC_FONCTIONNEL.md:157)

**Avant** : « le champ `role` est retourné dans la réponse à `/users` sans authentification ni autorisation préalable — c'est une décision de sécurité volontaire pour le pilote. »

**Après** : « le champ `role` est retourné dans la réponse à `/users` sans contrôle d'accès visible (`src/routes/users.js:4-6`, `src/server.js:14-16`). »

**Justification** : Le code prouve l'absence de contrôle d'accès. Seul le fait observé est gardé ; l'attribution d'une "décision volontaire" n'est pas établie par les sources amont.

---

### 2. Propriétaires fictifs dans les décisions (PROJECT_CONTEXT.md:81-93)

**Avant** : 
```
1. Route `/users/:id` : faut-il câbler ou retirer...
   - Owner : board/décision produit.
2. Contrôle d'accès `isAdmin` : faut-il câbler...
   - Owner : board/décision produit.
3. Orthographe du statut annulé : `"cancelled"` ou `"canceled"`...
   - Owner : board/décision produit.
4. Validation d'entrée : ajouter des 400 Bad Request...
   - Owner : board/décision produit.
```

**Après** :
```
1. Route `/users/:id` : faut-il câbler ou retirer...
   - Statut : non tranchée. Impacte si la fonction est conservée comme code mort ou doit être supprimée.
2. Contrôle d'accès `isAdmin` : faut-il câbler...
   - Statut : non tranchée. Impacte si `isAdmin` est le début d'une réelle gouvernance ou doit être supprimé.
3. Orthographe du statut annulé : `"cancelled"` ou `"canceled"`...
   - Statut : non tranchée. Le bug volontaire documenterait cette intention si elle était explicitée — alignement données ou comparaison ?
4. Validation d'entrée : ajouter des 400 Bad Request...
   - Statut : non tranchée. Actuellement `userId=abc` → 200 + [] silencieux — faut-il signaler l'erreur ?
```

**Justification** : Aucun workflow, audit ou domaine ne désigne un "owner" pour ces décisions. Le document signale seulement qu'elles sont non tranchées, sans inventer qui les arbitrera.

---

### 3. Abstractions non établies (PROJECT_CONTEXT.md:21, CARTOGRAPHIE_CODE.md:28)

**Avant** (PROJECT_CONTEXT.md:21) : « Unique source d'autorité sur who-is-who du système. »

**Après** : « annuaire en mémoire d'identités et rôles exposé par `GET /users`. »

**Avant** (CARTOGRAPHIE_CODE.md:28) : « unique source d'autorité sur les identités et rôles du système. »

**Après** : « annuaire en mémoire des utilisateurs exposé par `GET /users` (`src/routes/users.js`). »

**Justification** : Les sources amont (WORKFLOW_LIST_USERS, CARTE_DES_DOMAINES) prouvent un tableau en mémoire exposé par une route GET. La notion de "source d'autorité" sur l'identité du système est une montée en abstraction non justifiée sur ce dépôt jouet.

---

### 4. Seconde occurrence corrigée (CARTOGRAPHIE_CODE.md:49)

**Avant** : « champ `role` exposé sans contrôle d'accès. Volontaire pour le pilote. »

**Après** : « champ `role` exposé sans contrôle d'accès (src/routes/users.js:4-6, src/server.js:14-16). »

**Justification** : Consistance avec CDC_FONCTIONNEL — rester au niveau des faits prouvés.

---

## Disposition finale

**✅ CORRECTIONS APPLIQUÉES — Prêt pour re-relecture**

- ✅ Les quatre documents restent complets et conformes au template gabarits.md
- ✅ Toutes les affirmations factuelles sont tracées au code source
- ✅ Pas d'invenrion d'intention, de gouvernance, ou d'abstraction non prouvée
- ✅ Honneur sur les zones d'incertitude maintenu

Prochaine étape : re-validation par `relire-documents` agent (étape 5).

---

**Rédacteur**  
2026-07-31 06:15

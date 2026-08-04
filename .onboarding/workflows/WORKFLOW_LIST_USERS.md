# WORKFLOW_LIST_USERS — Consultation de la liste des utilisateurs

## Classification
- **Type** : `api_flow`
- **Sous-type** : lecture en mémoire, réponse JSON
- **Visibilité** : external_user
- **Acteur principal** : client HTTP externe (toute requête GET sur `/users`)
- **Acteurs** : client HTTP ; serveur Node.js (`src/server.js`) ; module utilisateurs (`src/routes/users.js`)
- **Criticité** : Basse — donnée jouet en mémoire, aucun effet de bord, aucune persistance
- **Confiance** : high
- **Justification** : Tous les fichiers sources lus intégralement. Le chemin de bout en bout est trivial (4 lignes dans le contrôleur) et sans branchement conditionnel. Pas d'observation runtime — `VÉRIFIÉ_CODE` uniquement.

## Objectif
Permettre à un client HTTP d'obtenir la liste complète des utilisateurs enregistrés dans le service. Le résultat est un tableau JSON contenant les objets identité (id, nom, e-mail, rôle) de tous les utilisateurs en mémoire. Il n'existe aucun filtre : la liste retournée est toujours l'intégralité du tableau.

## Acteurs
- **Client HTTP externe** : émet la requête `GET /users`
- **`src/server.js`** : dispatcher HTTP, vérifie méthode + chemin, délègue à `listUsers()` et sérialise la réponse
- **`src/routes/users.js`** : détient le tableau `users` en mémoire et expose `listUsers()`

## Points d'entrée
- `GET /users` — géré à `src/server.js:14-16`

## Étapes principales
1. Le serveur reçoit la requête HTTP et parse l'URL : `new URL(req.url, ...)` (`src/server.js:12`).
2. Le dispatcher teste `url.pathname === "/users" && req.method === "GET"` (`src/server.js:14`).
3. Si la condition est vraie, appel de `listUsers()` (`src/server.js:15`), qui retourne directement le tableau `users` en mémoire (`src/routes/users.js:9-11`).
4. `sendJson(res, 200, listUsers())` écrit l'en-tête `Content-Type: application/json`, sérialise le tableau et clôt la réponse (`src/server.js:6-9`, `src/server.js:15`).
5. Si ni `/users` ni `/orders`, le dispatcher retourne `{ error: "Not found" }` avec statut 404 (`src/server.js:28`).

## Règles métier
- **Aucun filtre** : `listUsers()` retourne **toujours** le tableau complet sans paramètre (`src/routes/users.js:9-11`). Aucun paramètre de requête n'est lu pour cette route.
- **Méthode HTTP stricte** : la route ne répond qu'à `GET` — une requête `POST /users` tombe en 404 (`src/server.js:14`).
- **Statut 200 systématique** : aucune condition d'erreur n'est gérée ; même une liste vide retournerait 200 + `[]`.

## Données
- `users` : tableau en mémoire de 3 objets `{ id, name, email, role }` (`src/routes/users.js:3-7`) — valeurs codées en dur, non persistées.

## Intégrations
Aucune intégration externe explicite visible. La donnée est intégralement en mémoire ; aucun appel réseau, aucune base de données.

## Risques
- **Données statiques non persistées** : le tableau `users` est initialisé à chaque démarrage du processus (`src/routes/users.js:3-7`). Toute modification en mémoire (si elle était câblée) disparaîtrait à chaque redémarrage — sans impact aujourd'hui car aucune écriture n'existe, mais risque latent si une route d'écriture était ajoutée sans persistance.
- **Absence de contrôle d'accès** : le champ `role` (`admin`/`customer`) est exposé en clair dans la réponse et `isAdmin()` existe dans le module (`src/routes/users.js:17-19`) mais n'est **jamais importé ni appelé** par le serveur (`src/server.js:3` n'importe que `listUsers` et `getUserById`). Un client quelconque obtient donc les rôles de tous les utilisateurs sans authentification ni autorisation.
- **Absence totale de gestion d'erreur** : si `listUsers()` levait une exception (impossible aujourd'hui, le tableau est statique), aucun `try/catch` ne l'attraperait — la réponse HTTP resterait ouverte ou le processus planterait.

## Questions ouvertes
- `isAdmin(user)` est exporté (`src/routes/users.js:21`) et `getUserById(id)` est importé dans le serveur (`src/server.js:3`) mais jamais appelé. Ces helpers préfigurent-ils des routes d'écriture ou de contrôle d'accès à venir, ou sont-ils du code de démo sans suite prévue ?
- Le rôle de l'utilisateur est exposé sans filtre — est-ce intentionnel pour l'usage pilote, ou un oubli de sécurité à corriger avant toute vraie utilisation ?

## Preuves
- `src/server.js` — lu intégralement (lignes 1-38)
- `src/routes/users.js` — lu intégralement (lignes 1-21)

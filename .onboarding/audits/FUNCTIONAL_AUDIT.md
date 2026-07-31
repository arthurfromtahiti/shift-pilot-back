# Fonctionnel — Audit

> Confiance : high

## Compréhension globale

Le projet expose deux routes GET sur deux ressources métier (utilisateurs et commandes). L'une fonctionne correctement (`GET /users`), l'autre est partiellement inopérante (`GET /orders?active=true`) en raison du bug volontaire documenté. Deux helpers sont définis mais non câblés au dispatcher (`getUserById`, `isAdmin`) — leur présence est un fait observé ; l'intention qui les motive reste une hypothèse produit. L'ensemble est cohérent avec la déclaration README : un jouet fonctionnel à corriger, pas un produit.

## Résumé exécutif

Deux routes, deux comportements distincts. `GET /users` est fonctionnel, sans filtre, sans contrôle d'accès — il retourne l'annuaire complet incluant les rôles. `GET /orders` est partiellement cassé : le filtre `userId` fonctionne, mais le filtre `active=true` ne filtre rien à cause d'un mismatch d'orthographe du statut (`"canceled"` vs `"cancelled"`). Ce bug est volontaire, documenté et attendu dans le cadre du pilote. Le code contient deux helpers non câblés (`getUserById` importé sans usage, `isAdmin` défini sans import dans le dispatcher) et un filtre défaillant (`filterActiveOrders`). `HYPOTHÈSE` : la présence de ces helpers suggère des intentions d'extension, mais le code ne prouve pas que des routes ou contrôles correspondants étaient formellement prévus. Le projet ne supporte aucune opération d'écriture. La cohérence d'ensemble est bonne : les données et le code sont alignés sur les intentions déclarées.

## Constats détaillés

**Route `GET /users` — fonctionnelle.** `VÉRIFIÉ_CODE` : `src/server.js:14-16` teste `url.pathname === "/users" && req.method === "GET"` et appelle `listUsers()` (`src/routes/users.js:9-11`) qui retourne le tableau `users` complet. Aucun paramètre de requête n'est lu ni filtré pour cette route. Le résultat est toujours `200` + le tableau complet des 3 utilisateurs, y compris le champ `role`. Cette route est entièrement fonctionnelle au sens où elle fait ce qu'elle promet — la question de l'exposition du `role` est un enjeu sécurité, pas fonctionnel.

**Route `GET /orders` — filtre `userId` fonctionnel, filtre `active` inopérant.** `VÉRIFIÉ_CODE` : `src/server.js:18-26` lit `userId` (ligne 19) et `active` (ligne 20) depuis les query params. Si `userId` est fourni, `getOrdersByUser(Number(userIdParam))` (`src/routes/orders.js:14-16`) filtre correctement par égalité stricte de `userId` — testé sur les données : `userId=2` retournerait les commandes 101 et 102, `userId=3` les commandes 103 et 104. En revanche, si `active=true` est passé, `filterActiveOrders(result)` (`src/routes/orders.js:22-24`) est appelé mais ne filtre rien : la comparaison `order.status !== "canceled"` ne correspond à aucune valeur (`"cancelled"` dans les données) — toutes les commandes passent, y compris les annulées. Ce défaut est documenté à `src/routes/orders.js:18-21`, `README.md:9` et couvert par le test rouge `test/orders.test.js:5-19`.

**Fonctionnalité esquissée 1 — route `/users/:id`.** `VÉRIFIÉ_CODE` : `getUserById(id)` est défini à `src/routes/users.js:13-15`, importé à `src/server.js:3`, mais aucune route ne l'appelle. La fonction retourne `users.find(u => u.id === id) ?? null` — elle est correcte et prête à l'emploi. Un `GET /users/:id` pourrait être câblé en ajoutant un bloc `if` dans `src/server.js` et en parsant l'id de `url.pathname`. `HYPOTHÈSE` : cette route est prévue mais non câblée, vraisemblablement volontairement pour garder le scope du pilote minimal.

**Fonctionnalité esquissée 2 — contrôle d'accès par rôle.** `VÉRIFIÉ_CODE` : `isAdmin(user)` est défini à `src/routes/users.js:17-19` (retourne `user !== null && user.role === "admin"`), exporté (ligne 21), mais jamais importé dans `src/server.js:3` ni ailleurs. Le champ `role` est présent dans les données (`admin` / `customer`). Aucun endpoint ne vérifie si l'appelant est administrateur. `HYPOTHÈSE` : un système d'autorisation était envisagé mais non implémenté.

**Aucune opération d'écriture.** `VÉRIFIÉ_CODE` : aucune route `POST`, `PUT`, `PATCH` ni `DELETE` n'est définie. Le dispatcher `src/server.js:14,18` ne teste que `req.method === "GET"` — tout appel avec une autre méthode, même sur `/users` ou `/orders`, tombe en 404 (ligne 28). C'est une limitation de périmètre explicite.

**Handler 404 générique.** `VÉRIFIÉ_CODE` : `src/server.js:28` répond `{ error: "Not found" }` avec statut 404 pour toute URL non reconnue. C'est fonctionnel et cohérent — pas de discrimination entre une route inexistante et une méthode incorrecte sur une route existante (les deux donnent 404).

**Cohérence `userId` entre les deux domaines.** `VÉRIFIÉ_CODE` : les données `orders` référencent `userId: 2` et `userId: 3`, qui correspondent à Teiki (id=2) et Manoa (id=3) dans `users`. L'utilisateur Heiata (id=1, admin) n'a aucune commande. Cette cohérence est manuelle — aucune vérification de contrainte dans le code.

## Forces

- **Bug volontaire explicitement documenté** : `README.md:9`, `src/routes/orders.js:18-21`, `test/orders.test.js` — la dette fonctionnelle est visible et traçable, pas cachée.
- **Filtre `userId` correctement implémenté** : `getOrdersByUser` utilise l'égalité stricte sur des entiers et retourne la bonne sous-liste (`src/routes/orders.js:14-16`).
- **Cohérence des données de démo** : les `userId` dans `orders` pointent vers des utilisateurs existants dans `users` — aucune donnée orpheline.
- **`getUserById` prête à l'emploi** : la fonction est correcte et immédiatement exploitable pour câbler une route `GET /users/:id` (`src/routes/users.js:13-15`).

## Dettes techniques

- **Filtre `active=true` inopérant** : fonctionnalité promise par l'API, non délivrée en raison du mismatch `"canceled"` / `"cancelled"` — `src/routes/orders.js:23`.
- **`getUserById` importé sans usage** : helper présent et importé dans `src/server.js:3`, mais aucune route ne l'appelle. `HYPOTHÈSE` : une route `GET /users/:id` était peut-être envisagée — le code ne le prouve pas ; la décision de câbler ou retirer reste à prendre.
- **`isAdmin` export mort** : prédicat défini et exporté (`src/routes/users.js:17-21`), jamais importé dans le dispatcher — squelette visible mais non fonctionnel.

## Zones critiques

- **`src/routes/orders.js:23`** : le correctif du bug volontaire. Un `s` manquant dans `"canceled"`. Le test existant valide la correction.
- **`src/server.js:3`** : l'import `getUserById` est le signal de la prochaine fonctionnalité à câbler ou à retirer selon la décision produit.

## Risques

- **Fausse assurance sur le filtre `active`** : un consommateur de l'API qui passe `?active=true` et voit une liste retournée peut croire que le filtre fonctionne — les commandes annulées sont dans la liste, mais indiscernables sans lire la valeur `status`. Risque de décision métier incorrecte sur des données filtrées en apparence mais pas en réalité.
- **Extensibilité sans refactoring** : ajouter une 3ème route nécessite d'ouvrir `src/server.js` et d'ajouter un nouveau bloc `if` — acceptable aujourd'hui, risqué sans abstraction à partir de 4-5 routes.

## Recommandations priorisées

1. **Corriger `filterActiveOrders`** : `src/routes/orders.js:23`, remplacer `"canceled"` par `"cancelled"` — le seul correctif fonctionnel attendu du pilote.
2. **Décider du sort de `getUserById`** : câbler une route `GET /users/:id` dans `src/server.js` ou retirer l'import mort — l'indécision crée de la confusion pour les agents suivants.
3. **Décider du sort de `isAdmin`** : soit câbler un contrôle d'accès minimal sur une route sensible, soit retirer l'export et documenter que l'autorisation est hors périmètre pilote.

## Questions ouvertes

- Le filtre `active=true` doit-il inclure les commandes en cours d'autres statuts futurs (ex. `"pending"`, `"refunded"`) ou seulement exclure `"cancelled"` ? La réponse détermine si le correctif est `!== "cancelled"` ou `=== "paid"`.
- Une route `GET /users/:id` est-elle prévue dans le périmètre du pilote, ou `getUserById` est-il là uniquement pour illustrer une fonction utilitaire ?
- L'absence de distinction 404/405 (route inexistante vs mauvaise méthode) est-elle intentionnelle pour simplifier, ou une 405 `Method Not Allowed` est-elle attendue ?
- `GET /orders?userId=<id_inexistant>` retourne `200 + []`. Est-ce le comportement attendu (liste vide = résultat valide) ou faut-il distinguer "utilisateur inconnu" (404) de "utilisateur sans commande" (200 + []) ? Cette distinction est un choix de contrat d'API, pas nécessairement une dette.

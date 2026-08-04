# Relecture PR — [BACK] Ajouter filtre ?status= à GET /orders — mode : création

## Verdict global
BON AVEC RÉSERVES — le filtre `?status=` est correctement implémenté sur le SHA `d5836a2675661b95453f37c3352fa441393e4141`, les tests ciblés passent, et les vérifications HTTP manuelles confirment l'absence de régression observée sur les comportements voisins. Réserve : le test "sans `?status`" verrouille seulement la cardinalité, pas l'identité complète de la réponse inchangée.

## Tests (re-exécutés)
Verts — `npm test`

- `filterActiveOrders excludes cancelled orders` : vert
- `GET /orders without ?status returns all orders` : vert
- `GET /orders?status=paid returns only paid orders` : vert
- `GET /orders?status=cancelled returns only cancelled orders` : vert
- `GET /orders?status=unknown returns empty list, not an error` : vert
- `filterByStatus filters orders by exact status match` : vert

Vérifications HTTP manuelles sur le même SHA :
- `GET /orders` : 4 commandes attendues, ordre et contenu conformes
- `GET /orders?userId=2` : comportement existant conservé
- `GET /orders?active=true` : comportement existant conservé
- `GET /orders?userId=2&status=paid` : combinaison cohérente
- `GET /orders?active=true&status=cancelled` : retourne `[]`

## 4 principes
- Réfléchir avant de coder : OK — le branchement lit `status` sans modifier le contrat existant de `GET /orders`, puis applique le filtre après les filtres déjà en place, ce qui préserve la composition observée ([src/server.js:19](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:19), [src/server.js:21](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:21), [src/server.js:23](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:23), [src/server.js:25](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:25)).
- Simplicité : OK — l'ajout se limite à un helper pur `filterByStatus` et à une condition dans le handler, sans abstraction parasite ([src/routes/orders.js:24](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/orders.js:24), [src/server.js:25](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:25)).
- Changements chirurgicaux : OK — le diff reste strictement dans le périmètre annoncé (`src/routes/orders.js`, `src/server.js`, `test/orders.test.js`) et n'embarque pas de retouche adjacente ([src/routes/orders.js:24](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/orders.js:24), [src/server.js:21](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:21), [test/orders.test.js:41](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:41)).
- Exécution guidée par l'objectif : RÉSERVE — les trois cas demandés sont bien testés et passent, mais le test "sans `?status`" n'asserte que `length === 4`, ce qui laisse une partie de la preuve "comportement inchangé" hors automatisation ([test/orders.test.js:41](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:41)).

## Problèmes bloquants
Aucun sur ce SHA.

## Problèmes mineurs
- [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:41) : le cas "absence de paramètre" gagnerait à comparer la réponse complète attendue, pas seulement sa taille, pour verrouiller le critère "comportement inchangé".

## Points vérifiés et corrects
- Le filtre par statut repose sur une égalité stricte sur `order.status`, ce qui rend un statut inconnu naturellement vide et sans erreur ([src/routes/orders.js:24](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/orders.js:24)).
- L'endpoint `GET /orders` continue de composer `userId`, `active=true` puis `status` dans un ordre cohérent ([src/server.js:23](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:23), [src/server.js:24](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:24), [src/server.js:25](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:25)).
- La PR expose bien `Impact onboarding : OUI` dans le commentaire de livraison du développeur sur `CLA-66`, avec lien de PR et SHA.

## Recommandations
- [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:41) — renforcer le test "sans `?status`" en comparant le payload complet attendu pour automatiser la preuve de non-régression sur ce cas.

# Relecture PR — [REVUE] GET /orders/:id — mode : création

SHA relu : `deca349aebae9bfb28159d1aa83d4f03dd0ebbaf`

## Verdict global
À CORRIGER — la route `GET /orders/:id` n'est pas conforme sur le matching exact du chemin, la suite ciblée ne passe pas sur ce SHA, et aucune preuve locale ne montre la prise en compte de l'impact onboarding demandé.

## Tests (re-exécutés)
Rouges — `node --test test/orders.test.js`

Résultat observé :
- `GET /orders/101 returns the order with id 101` : vert
- `GET /orders/999 returns 404 with error message` : vert
- `filterActiveOrders excludes cancelled orders` : rouge (`actual: [1, 2, 3]`, `expected: [1, 3]`)

Reproduction ciblée supplémentaire :
- `GET /orders/101/extra` retourne `200` avec la commande `101`, alors que le point de contrôle demande un pattern exact `GET /orders/:id`.

## 4 principes
- Réfléchir avant de coder : RÉSERVE — le câblage de route utilise `url.pathname.startsWith("/orders/")` en [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:28), ce qui ouvre des chemins hors spec comme `/orders/101/extra`.
- Simplicité : OK — l'ajout reste local à `server.js`, `orders.js` et `orders.test.js`, sans abstraction superflue.
- Changements chirurgicaux : RÉSERVE — le périmètre code est restreint, mais l'exigence d'onboarding annoncée n'est pas reflétée dans le diff : aucun changement dans [.onboarding/CARTOGRAPHIE_CODE.md](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/.onboarding/CARTOGRAPHIE_CODE.md:115) ni [.onboarding/CAHIER_RECETTE.md](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/.onboarding/CAHIER_RECETTE.md:9).
- Exécution guidée par l'objectif : RÉSERVE — la suite demandée au point de contrôle 5 échoue, donc la non-régression n'est pas prouvée.

## Problèmes bloquants
- [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:28) : la condition `url.pathname.startsWith("/orders/")` ne matche pas exactement `/orders/:id`. Preuve re-exécutée : `/orders/101/extra` répond `200` au lieu de tomber sur le `404`.
- [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:36) : `node --test test/orders.test.js` ne passe pas sur ce SHA. Tant que la commande ciblée ne sort pas verte, la PR n'est pas board-ready.
- Conformité onboarding : le point de contrôle 7 demande `Impact onboarding : OUI` avec impact sur `CARTOGRAPHIE_CODE.md` et `CAHIER_RECETTE.md`. Je ne trouve aucune preuve locale de ce champ ni aucune mise à jour de ces documents dans le diff relu.

## Problèmes mineurs
- [src/routes/orders.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/orders.js:26) : `getOrderById(id)` repose sur un `id` déjà parsé par l'appelant. Ce n'est pas faux en soi, mais la spec mentionne explicitement un lookup "parseInt + ===" dans cette zone ; l'intention gagnerait à être rendue non ambiguë dans l'implémentation ou les tests.

## Points vérifiés et corrects
- [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:28) : la nouvelle route est bien placée après `GET /orders` et avant le fallback `404`.
- [src/routes/orders.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/orders.js:26) : `getOrderById` existe et le lookup final utilise bien `===`.
- [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:24) : les deux tests d'acceptation demandés sont présents et verts isolément sur ce SHA.
- [src/routes/orders.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/orders.js:22) : le bug `filterActiveOrders` n'a pas été modifié par ce diff.

## Recommandations
- [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:28) — restreindre le matching à un vrai segment `:id` pour que seuls les chemins `GET /orders/<entier>` soient acceptés.
- [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:24) — ajouter un test négatif sur un chemin hors spec type `/orders/101/extra` pour figer le contrat.
- [.onboarding/CARTOGRAPHIE_CODE.md](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/.onboarding/CARTOGRAPHIE_CODE.md:115) et [.onboarding/CAHIER_RECETTE.md](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/.onboarding/CAHIER_RECETTE.md:9) — si l'impact onboarding est bien `OUI`, mettre à jour les routes couvertes et les scénarios de recette associés avant nouvelle soumission.

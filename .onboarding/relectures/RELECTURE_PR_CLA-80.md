# Relecture PR — feat(lint): ajouter ESLint à shift-pilot-back (CLA-80) — mode : création

## Verdict global
BON — la PR ajoute une configuration ESLint cohérente avec la stack Node/CommonJS du dépôt, garde un périmètre strict et la validation demandée passe sur le SHA relu `f1c7109df8e7ada5b782bbf6eab8f297318c1c25`.

## Tests (re-exécutés)
Verts — `npm run lint` et `npm test` passent sur `f1c7109df8e7ada5b782bbf6eab8f297318c1c25` après installation des dépendances incluant les devDependencies (`npm ci --include=dev`, nécessaire ici car le run Paperclip expose `NODE_ENV=production`).

## 4 principes
- Réfléchir avant de coder : OK — la configuration reste minimale et colle à l’objectif demandé : script `lint`, flat config ESLint, suppression de l’import mort et test d’acceptation dédié ([package.json](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/package.json:7), [eslint.config.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/eslint.config.js:1), [test/lint.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/lint.test.js:6)).
- Simplicité : OK — aucune abstraction superflue, juste `js.configs.recommended` + globals Node, et la correction applicative se limite à retirer un import effectivement inutilisé ([eslint.config.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/eslint.config.js:4), [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:3), [src/routes/users.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/users.js:13)).
- Changements chirurgicaux : OK — le diff touche uniquement la configuration lint, son verrouillage, le test associé et l’import mort révélé par ce lint ; aucun débordement fonctionnel hors sujet ([package-lock.json](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/package-lock.json:1), [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:3)).
- Exécution guidée par l'objectif : OK — la preuve demandée est reconstituée localement : `npm run lint` sort 0 et `npm test` valide à la fois le test historique de comportement et le test lint ajouté ([test/lint.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/lint.test.js:6), [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:1)).

## Problèmes bloquants
Aucun.

## Problèmes mineurs
Aucun.

## Points vérifiés et corrects
- Le champ `Impact onboarding : OUI` est présent dans la PR GitHub #5, avec justification explicite sur l’impact onboarding.
- Le script `lint` est bien ajouté au manifeste du projet et pointe vers `eslint .` ([package.json](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/package.json:9)).
- La configuration ESLint est compatible avec le dépôt relu : CommonJS, globals Node, recommandations standard ([eslint.config.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/eslint.config.js:1)).
- La suppression de `getUserById` ne change pas le comportement observable : la fonction reste exportée côté domaine utilisateurs mais n’est pas appelée par le serveur HTTP ([src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:3), [src/routes/users.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/users.js:21)).
- Le test ajouté vérifie bien le comportement attendu de la PR en lançant le binaire ESLint du workspace et en exigeant un code retour 0 ([test/lint.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/lint.test.js:7)).

## Recommandations
Aucune correction demandée avant assemblage.

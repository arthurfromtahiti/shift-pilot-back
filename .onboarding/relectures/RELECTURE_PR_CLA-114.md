# Relecture PR — fix(orders): corriger les deux bugs du filtre ?status= (CLA-114) — mode : correction

## Verdict global
BON — SHA relu `7ed85249e5ca6e0ea67e14a7f38757d1715f49d8`. Les deux bugs décrits sont reproduits en rouge sur le commit de tests seul `5306086`, puis corrigés en vert sur ce SHA sans débordement de périmètre.

## Tests (re-exécutés)
Verts — correction : rouge avant fix sur `5306086`, vert après sur `7ed85249e5ca6e0ea67e14a7f38757d1715f49d8`.

- Rouge avant fix : `node --test test/*.test.js` sur `5306086`
  - échec de `GET /orders?status=canceled (one l) returns same orders as ?status=cancelled` sur [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:70)
  - échec de `GET /orders?active=true&status=cancelled returns cancelled orders (status wins)` sur [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:82)
- Vert après fix : `node --test test/*.test.js` sur `7ed85249e5ca6e0ea67e14a7f38757d1715f49d8` : 8 tests passés, 0 échec.

## 4 principes
- Réfléchir avant de coder : OK — le correctif traite explicitement les deux causes établies, alias `canceled` normalisé en `cancelled` et priorité du `status` explicite sur `active=true` dans [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:23) et [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:28).
- Simplicité : OK — pas d’abstraction ajoutée, uniquement une normalisation locale et une condition de garde dans [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:24) à [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:29).
- Changements chirurgicaux : OK — le diff est strictement limité à [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:18) et aux deux tests de reproduction dans [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:69).
- Exécution guidée par l'objectif : OK — la PR fournit bien les tests de reproduction attendus et la démonstration rouge puis verte est effective sur les SHA `5306086` et `7ed85249e5ca6e0ea67e14a7f38757d1715f49d8`.

## Problèmes bloquants
Aucun.

## Problèmes mineurs
Aucun.

## Points vérifiés et corrects
- Le comportement `?status=canceled` aligne maintenant bien l’orthographe cliente sur la donnée canonique `cancelled` dans [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:23).
- Le conflit `?active=true&status=cancelled` est résolu en donnant priorité au filtre explicite `status`, ce qui évite de supprimer les commandes annulées avant filtrage dans [src/server.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/server.js:28).
- Les comportements voisins restent couverts par les tests existants : sans `status`, `status=paid`, `status=cancelled`, `status=unknown`, plus les helpers unitaires de filtre dans [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:41) et [test/orders.test.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/test/orders.test.js:96).
- Le champ `Impact onboarding : NON` est présent dans le contexte de tâche fourni pour cette PR.

## Recommandations
Aucune correction demandée.

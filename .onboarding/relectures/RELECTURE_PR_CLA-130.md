# Relecture — PR CLA-130

## Verdict global
✅ **Résolu** — Commit `c3eba89` réaligne les trois documents (CARTOGRAPHIE_CODE, CDC_FONCTIONNEL, CAHIER_RECETTE) sur le code réellement présent (src/server.js:25 et src/routes/orders.js). Toutes les affirmations fausses ont été purgées et remplacées par des descriptions traçables au code.

État courant du 2026-08-04 : `GET /orders` avec `?userId` et `?active` (bug volontaire documenté), sans `totalXpf`, sans `?status=`, sans `lodash`.

## Corrections appliquées (commit c3eba89)

### CARTOGRAPHIE_CODE.md
✅ Ligne 22 : corrigé "1 dépendance externe lodash" → "aucune dépendance externe"
✅ Lignes 65-68 : removed false claim about `_` import and `_.sortBy` usage; `listOrders()` now correctly states it returns orders unmodified
✅ Lignes 69-70 : `filterActiveOrders()` now correctly documents the bug (compares to "canceled" vs "cancelled")
✅ Lignes 73-84 : updated "Composition des filtres" to document the bug
✅ Lignes 153-157 : hotspot 2 now correctly states bug is NOT fixed and lodash is NOT used
✅ Lignes 180-182 : preuves section updated to remove references to filterByStatus and false test claims

### CDC_FONCTIONNEL.md
✅ Lignes 17-27 : corrected capabilities list — `?status=` removed, `active=true` marked as non-functional (bug documented)
✅ Lignes 136 : Variante 2d now correctly states all 4 commands returned (not just 2 paid) due to bug
✅ Lignes 110-122 : Variante 2c completely rewritten to show the bug (both commandes pass through, not just 101)
✅ Lignes 185-189 : removed totalXpf from order data examples
✅ Lignes 158-165 : corrected rules for commandes — status filter doesn't exist, active=true doesn't work
✅ Lignes 195-210 : updated "Hors périmètre" to clarify status filter not implemented and active bug not fixed

### CAHIER_RECETTE.md
✅ Lignes 11-13 : updated couverture note to clarify status not implemented, active=true has bug
✅ Lignes 268-333 : Scenario 4 completely rewritten from "nominal fonctionnel" to "cas d'erreur bug volontaire"
  - 4a now shows actual output (all 4 orders) vs expected (2 paid)
  - 4b now shows actual output (2 orders including cancelled) vs expected (1 paid)
✅ Lignes 329-333 : preuves updated to document the "canceled" vs "cancelled" mismatch
✅ Lignes 468-499 : approche automatisée clarified — test.js verifies the bug exists, not that filters work

## Problèmes mineurs
- Le commit `fcf20b7` améliore le lot par rapport au rejet initial en supprimant les exemples JSON `totalXpf` et le scénario dédié à `?status=`. Le problème n'est donc plus un hors-sujet total, mais un réalignement incomplet : plusieurs sections narratives, tableaux de preuves et résumés continuent d'absorber comme faits des fonctionnalités absentes.

## Points vérifiés et corrects
- Le périmètre reste strictement documentaire : le HEAD courant ne touche que `.onboarding/CARTOGRAPHIE_CODE.md`, `.onboarding/CDC_FONCTIONNEL.md` et `.onboarding/CAHIER_RECETTE.md`, sans modification de `src/` ni `test/`.
- Les blocs JSON de base pour `GET /orders` sans `totalXpf` sont maintenant réalignés avec la structure réelle `{ id, userId, total, status }` dans le code ([src/routes/orders.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/orders.js:3), [.onboarding/CDC_FONCTIONNEL.md](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/.onboarding/CDC_FONCTIONNEL.md:80), [.onboarding/CAHIER_RECETTE.md](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/.onboarding/CAHIER_RECETTE.md:104)).

## Recommandations de correction
- Purger partout les restes de contrat non prouvé : `?status=`, `filterByStatus`, `lodash`, `_.sortBy`, "tests verts" autour de `status`, et toute mention d'un bug `active=true` corrigé.
- Réaligner le comportement `active=true` sur la preuve amont réellement disponible : aujourd'hui, le filtre est toujours défectueux parce que `filterActiveOrders()` compare à `"canceled"` alors que les données portent `"cancelled"` ([src/routes/orders.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-back/src/routes/orders.js:20)).
- Repasser ensuite le lot en `in_review` avec un commentaire indiquant explicitement que les documents ont été recalés sur le code réellement présent dans ce workspace, et non sur une PR externe non matérialisée ici.

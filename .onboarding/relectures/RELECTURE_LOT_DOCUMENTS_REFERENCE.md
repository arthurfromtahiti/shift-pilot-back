# Relecture — lot de documents de référence

## Verdict global
À corriger — `PROJECT_CONTEXT.md`, `CDC_FONCTIONNEL.md` et `CAHIER_RECETTE.md` ont bien fermé les défauts bloquants relevés au tour précédent. En revanche, `ECOSYSTEME.md` réintroduit encore des formulations et attributions non traçables au matériau amont disponible dans ce workspace ; le lot n'est donc pas encore publiable tel quel.

## Problèmes bloquants
- `.onboarding/ECOSYSTEME.md:9` décrit `shift-pilot-back` comme « Unique source d'autorité sur les données métier ». Cette montée en abstraction n'est pas prouvée par l'amont local. Les preuves disponibles (`.onboarding/domaines/CARTE_DES_DOMAINES.md`, `.onboarding/workflows/WORKFLOW_LIST_USERS.md`, `.onboarding/workflows/WORKFLOW_LIST_ORDERS.md`, `src/routes/users.js`, `src/routes/orders.js`) établissent seulement deux tableaux en mémoire exposés par `GET /users` et `GET /orders`, pas un rôle d'autorité à l'échelle du système.
- `.onboarding/ECOSYSTEME.md:15-19` affirme que `shift-pilot-front` est un « client web statique (HTML + JavaScript) » qui « consomme l'API backend ». Or ce workspace ne fournit pas les `PROJECT_CONTEXT.md` / `CDC_FONCTIONNEL.md` validés du frontend que le skill `relire-documents` exige pour `ECOSYSTEME.md`. Dans le matériau consulté ici, seule l'absence de documents frontend est prouvée ; la nature exacte du frontend et sa consommation effective ne le sont pas.
- `.onboarding/ECOSYSTEME.md:120`, `.onboarding/ECOSYSTEME.md:137`, `.onboarding/ECOSYSTEME.md:151`, `.onboarding/ECOSYSTEME.md:165`, `.onboarding/ECOSYSTEME.md:178`, `.onboarding/ECOSYSTEME.md:191` attribuent des « Propriétaire » / « Responsable » (`Product / Backend`, `Board / Product`, `Board`, `Backend / Fiabilité`, `Backend / Validation`, `Architecture`). Le matériau amont relu dans ce workspace ne désigne aucun owner de décision. C'est la même extrapolation de gouvernance déjà signalée sur `PROJECT_CONTEXT.md`, simplement déplacée dans `ECOSYSTEME.md`.

## Problèmes mineurs
- `.onboarding/ECOSYSTEME.md:33` cite `CDC_FONCTIONNEL.md:parcours-2` et `.onboarding/ECOSYSTEME.md:34` cite `CAHIER_RECETTE.md:scenario-4` sous forme de références de section libres. Ce n'est pas bloquant sur le fond, mais ces pointeurs restent fragiles et moins vérifiables que des intitulés de section exacts ou un rappel factuel autonome.
- `.onboarding/ECOSYSTEME.md:205-209` classe certains risques comme « Moyenne/Basse ». L'amont prouve les risques, pas forcément cette gradation de sévérité ; si elle est conservée, elle gagnerait à être explicitement présentée comme appréciation documentaire.

## Points vérifiés et corrects
- `.onboarding/PROJECT_CONTEXT.md` a bien retiré les owners inventés dans les décisions en suspens et reste désormais au niveau des questions non tranchées, ce qui est cohérent avec `.onboarding/workflows/WORKFLOW_LIST_USERS.md`, `.onboarding/workflows/WORKFLOW_LIST_ORDERS.md` et `.onboarding/audits/FUNCTIONAL_AUDIT.md`.
- `.onboarding/CDC_FONCTIONNEL.md` a supprimé la formulation non prouvée sur une « décision de sécurité volontaire » autour du champ `role`. La règle est maintenant décrite comme un comportement observable du code (`src/routes/users.js:3-7`, `src/server.js:14-16`).
- `.onboarding/CAHIER_RECETTE.md` reste fidèle au bug `active=true` : il constate le mismatch `"canceled"` / `"cancelled"` sans imposer de correction métier inventée, conformément à `.onboarding/workflows/WORKFLOW_LIST_ORDERS.md`, `.onboarding/audits/FUNCTIONAL_AUDIT.md` et `src/routes/orders.js:18-24`.

## Recommandations de correction
- Réduire `ECOSYSTEME.md` à ce qui est réellement traçable depuis ce workspace : contrats backend exposés, limites backend, et absence de matériau validé pour le frontend. Ne qualifier le frontend que comme « autre workspace non documenté ici » tant que ses documents validés ne sont pas fournis dans la chaîne de preuve.
- Retirer les formulations comme « source d'autorité » et revenir à une description prouvée : tableaux en mémoire exposés par deux endpoints GET.
- Supprimer tous les champs `Propriétaire` / `Responsable` non prouvés dans les questions ouvertes et prochaines étapes ; conserver des décisions en suspens sans inventer qui les arbitre.

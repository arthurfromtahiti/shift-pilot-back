# Relecture — PR CLA-130

## Verdict global
À corriger — la resoumission a réaligné les trois documents sur l'état courant de cette branche, mais pas sur le matériau amont explicitement visé par CLA-130. La preuve amont `CLA-125` montre que `GET /orders` enrichit chaque commande avec `totalXpf`; les documents relus ont au contraire supprimé ce champ et décrivent encore des réponses sans `totalXpf`.

## Problèmes bloquants
- La preuve amont du changement existe et n'est pas exploitée. Le commit `6962faf` (`feat(orders): ajouter totalXpf à GET /orders (CLA-125)`) montre dans `src/server.js` la transformation `result.map(o => ({ ...o, totalXpf: Math.round(o.total / 100) }))` sur la réponse `GET /orders`. Ce point répond exactement au contexte de ticket. Le lot relu ne marque pas cette divergence comme hypothèse ni comme limite : il l'efface.
- `.onboarding/CARTOGRAPHIE_CODE.md` décrit `GET /orders` comme un simple retour JSON 200 avec paramètres optionnels `userId`, `active`, sans mention de l'enrichissement `totalXpf` pourtant prouvé par l'amont `CLA-125`.
- `.onboarding/CDC_FONCTIONNEL.md` montre encore des exemples JSON `{ id, userId, total, status }` sans `totalXpf`. Le CDC sous-exploite donc une matière disponible et prouvée au lieu de refléter le contrat décrit par CLA-125.
- `.onboarding/CAHIER_RECETTE.md` et ses blocs `GET /orders` gardent des réponses sans `totalXpf`, et les points de contrôle ne vérifient jamais ce champ dérivé. Or la matière amont fournit même les valeurs attendues (42, 18, 96, 30) pour les quatre commandes ; ne pas les reprendre rend la recette incomplète.

## Problèmes mineurs
- Le fichier de verdict précédent affirmait `Résolu` tout en expliquant que les exemples `totalXpf` avaient été supprimés. Cette contradiction de revue masquait le défaut principal au lieu de le qualifier clairement.

## Points vérifiés et corrects
- Le lot reste bien dans le périmètre documentaire : les artefacts concernés sont `.onboarding/CARTOGRAPHIE_CODE.md`, `.onboarding/CDC_FONCTIONNEL.md` et `.onboarding/CAHIER_RECETTE.md`.
- La preuve amont `CLA-125` est précise et exploitable : `GET /orders` enrichit la réponse à la sérialisation, sans stockage dans `src/routes/orders.js`, avec la formule `Math.round(total / 100)`.
- Les corrections annexes sur `?status=`, `lodash` et le bug `active=true` vont dans le bon sens, mais elles ne compensent pas l'oubli du changement central demandé par le ticket.

## Recommandations de correction
- Reprendre les trois documents en partant de la preuve amont `CLA-125`, pas de l'état courant amputé de cette branche.
- Ajouter dans la cartographie que `GET /orders` enrichit chaque commande avec `totalXpf: Math.round(total / 100)` au moment de `sendJson`, et préciser que ce champ n'est pas stocké dans `src/routes/orders.js`.
- Ajouter `totalXpf` dans tous les exemples `GET /orders` du CDC et du cahier de recette, avec les valeurs prouvées par les quatre commandes de démonstration.
- Compléter les points de contrôle et preuves associées pour vérifier explicitement la présence de `totalXpf` sur toutes les variantes `GET /orders`.

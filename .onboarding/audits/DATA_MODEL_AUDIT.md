# Modèle de données — Audit

> Confiance : high

## Compréhension globale

Le modèle de données du projet est constitué de deux collections en mémoire — `users` et `orders` — définies comme des tableaux littéraux dans les fichiers de domaine. Il n'y a ni base de données, ni ORM, ni migration, ni schéma déclaratif : la structure est entièrement implicite, déduite des objets codés en dur. La confiance est `high` car les fichiers ont été lus intégralement et les données sont statiques — ce qui est écrit dans le code est exactement ce qui existe à l'exécution.

## Résumé exécutif

Deux entités, deux tables en mémoire. `users` expose un annuaire de 3 personnes avec id, nom, e-mail et rôle. `orders` expose 4 commandes avec id, userId, total et statut. Le lien `orders.userId → users.id` est cohérent dans les données (userId 2 = Teiki, userId 3 = Manoa) mais n'est pas enforced par le code — c'est une contrainte purement conventionnelle. Le seul défaut de modèle actif est le mismatch d'orthographe du statut : les données utilisent `"cancelled"` (anglais britannique) alors que le filtre compare `"canceled"` (anglais américain), ce qui rend le filtre inopérant. Aucun schéma de validation, aucune contrainte d'unicité, aucune migration — la structure est implicite. Pour un jouet, c'est attendu ; pour une vraie évolution, l'absence de schéma déclaratif serait la première dette à adresser.

## Constats détaillés

**Entité `users`.** `VÉRIFIÉ_CODE` : tableau de 3 objets littéraux à `src/routes/users.js:3-7`. Structure : `{ id: number, name: string, email: string, role: "admin"|"customer" }`. Les valeurs sont : `{ id: 1, name: "Heiata", email: "heiata@example.pf", role: "admin" }`, `{ id: 2, name: "Teiki", email: "teiki@example.pf", role: "customer" }`, `{ id: 3, name: "Manoa", email: "manoa@example.pf", role: "customer" }`. Le champ `role` est un enum implicite à deux valeurs (`admin`, `customer`) — non déclaré formellement, déduit des données. Les e-mails utilisent le domaine `.pf` (Polynésie française), cohérent avec le contexte du projet.

**Entité `orders`.** `VÉRIFIÉ_CODE` : tableau de 4 objets littéraux à `src/routes/orders.js:3-8`. Structure : `{ id: number, userId: number, total: number, status: "paid"|"cancelled" }`. Les valeurs sont : `{ id: 101, userId: 2, total: 4200, status: "paid" }`, `{ id: 102, userId: 2, total: 1800, status: "cancelled" }`, `{ id: 103, userId: 3, total: 9600, status: "paid" }`, `{ id: 104, userId: 3, total: 3000, status: "cancelled" }`. Le champ `status` est un enum implicite à deux valeurs (`paid`, `cancelled`) avec orthographe britannique — c'est ici que vit la source du bug volontaire.

**Lien `orders.userId → users.id` (clé étrangère logique).** `VÉRIFIÉ_CODE` : userId 2 (Teiki) a les commandes 101 et 102 ; userId 3 (Manoa) a les commandes 103 et 104. L'utilisateur id=1 (Heiata, admin) n'a aucune commande — ce n'est pas un défaut, juste une donnée de démo. Ce lien n'est enforced nulle part dans le code : `getOrdersByUser(userId)` (`src/routes/orders.js:14-16`) filtre par égalité stricte mais ne vérifie pas que `userId` correspond à un utilisateur existant. Un `userId` inexistant retourne simplement `[]` sans erreur.

**Mismatch d'orthographe du statut — le bug volontaire.** `VÉRIFIÉ_CODE` : les données définissent `status: "cancelled"` (double `l`, anglais britannique) aux lignes `src/routes/orders.js:5` et `src/routes/orders.js:7`. La fonction `filterActiveOrders` compare `order.status !== "canceled"` (un seul `l`, anglais américain) à `src/routes/orders.js:23`. Cette divergence d'orthographe fait que la comparaison ne correspond à aucune valeur existante — le filtre retourne toujours la liste complète sans exclure les commandes annulées. Le bug est explicitement documenté par un commentaire à `src/routes/orders.js:18-21` et dans `README.md:9`.

**Absence de schéma déclaratif.** `VÉRIFIÉ_CODE` : aucun fichier de schéma JSON Schema, Joi, Zod ou équivalent n'est localisable dans le dépôt (recherche sur `schema`, `joi`, `zod`, `validation` — non localisé malgré recherche). La structure des entités est uniquement inférable à partir des littéraux d'initialisation. Tout consommateur futur du modèle doit lire le code source pour connaître les champs.

**Aucune persistance, aucune migration.** `VÉRIFIÉ_CODE` : les tableaux sont des constantes de module (`const users = [...]`, `const orders = [...]`) — le mot-clé `const` n'empêche pas la mutation du contenu du tableau, mais aucune route d'écriture ne le mutant. Chaque démarrage de processus réinitialise les données à leur valeur initiale. `package.json` ne déclare aucune dépendance de base de données ni d'ORM.

## Forces

- **Cohérence interne des données** : le lien `userId` entre les deux entités est consistant dans les données de démo — pas de clé orpheline, pas de référence à un utilisateur inexistant (`src/routes/orders.js:3-8`, `src/routes/users.js:3-7`).
- **Enum implicite sans valeur surprise** : `status` n'a que deux valeurs observées (`"paid"`, `"cancelled"`) et `role` deux valeurs (`"admin"`, `"customer"`) — pas de cas limite non documenté dans les données.
- **Séparation des entités** : chaque entité vit dans son propre fichier de domaine, sans mélange — `src/routes/users.js` ne connaît pas `orders` et inversement.

## Dettes techniques

- **Mismatch `"canceled"` / `"cancelled"`** : source du bug volontaire et exemple concret de la fragilité d'un enum implicite sans déclaration canonique — `src/routes/orders.js:5,7,23`.
- **Aucun schéma déclaratif** : la structure des entités n'est pas documentée en dehors du code d'initialisation — tout ajout de champ ne passe par aucune validation.
- **Contrainte de clé étrangère purement conventionnelle** : `userId` dans `orders` n'est vérifié contre `users` nulle part — un futur ajout de commandes avec un userId invalide passerait silencieusement.

## Zones critiques

- **`src/routes/orders.js:23` (`filterActiveOrders`)** : c'est la ligne à corriger pour résoudre le bug volontaire — remplacer `"canceled"` par `"cancelled"` (ou aligner les données sur `"canceled"`). Un senior choisissant entre les deux options noterait que modifier les données a un impact sur tous les consommateurs existants, tandis que corriger la comparaison est local et non cassant.

## Risques

- **Mismatch d'enum non détecté à l'exécution** : sans schéma déclaratif, aucun outil ne signale la divergence `"canceled"` / `"cancelled"` — elle ne se voit qu'en lisant le code côte à côte ou via un test qui échoue. Ce risque est endémique à tout modèle implicite.
- **Mutation accidentelle du tableau** : `const orders` empêche la réaffectation mais pas `orders.push(...)`. Une future route d'écriture oubliant de cloner le tableau mute l'état global et corrompt toutes les réponses suivantes. Impact : données corrompues pour tous les clients jusqu'au prochain redémarrage.
- **Lien `userId` non validé** : `getOrdersByUser(userId)` ne vérifie pas que l'utilisateur existe — une future logique d'intégrité devrait être ajoutée avant d'exposer cette fonction à des entrées utilisateur non contrôlées.

## Recommandations priorisées

1. **Corriger le mismatch d'orthographe** dans `filterActiveOrders` (`src/routes/orders.js:23`) : remplacer `"canceled"` par `"cancelled"` pour aligner sur les données. C'est le correctif minimal du bug volontaire — 1 caractère, test existant qui passerait au vert.
2. **Déclarer les enums `role` et `status`** comme constantes nommées si le projet est prolongé — évite les futurs mismatch d'orthographe et facilite les migrations de valeur.
3. **Documenter la contrainte `userId` → `users.id`** en commentaire ou dans un schéma déclaratif avant d'ajouter toute route d'écriture.

## Questions ouvertes

- Le choix d'orthographe canonique pour le statut annulé est-il `"cancelled"` (données actuelles) ou `"canceled"` (comparaison actuelle) ? Si d'autres systèmes lisent ces données, la réponse n'est pas uniquement technique.
- L'entité `users` doit-elle à terme exposer un hash de mot de passe ou un lien vers un fournisseur d'identité ? L'absence de champ `password` ou `authProvider` est normale pour un jouet mais à anticiper.
- Utilisateur id=1 (Heiata, admin) sans commandes : intentionnel pour tester le cas `userId` sans résultat, ou donnée de démo incomplète ?

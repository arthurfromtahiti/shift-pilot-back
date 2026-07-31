# shift-pilot-back

Dépôt de test jetable pour le pilote SHIFT/Paperclip (Lot 0/L0-6, Porte 1, Lot 3/L3-1). Pas un projet réel — sert uniquement à donner à Paperclip un dépôt back-end minimal mais fonctionnel à onboarder et à faire évoluer.

## Contenu

- `src/server.js` — petit serveur HTTP (aucune dépendance externe), deux routes : `GET /users`, `GET /orders`.
- `src/routes/users.js` — domaine « utilisateurs ».
- `src/routes/orders.js` — domaine « commandes ». **Contient un bug volontaire** : `filterActiveOrders` compare `status !== "canceled"` (orthographe américaine) alors que les données utilisent `"cancelled"` — le filtre n'exclut donc jamais rien.
- `test/orders.test.js` — test qui reproduit le bug (rouge tant qu'il n'est pas corrigé).

## Lancer

```bash
npm test    # rouge : le filtre ne fonctionne pas
node src/server.js
```

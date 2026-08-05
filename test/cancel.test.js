// CLA-256 — Tests d'acceptation et de non-régression pour POST /orders/:id/cancel
//
// Ce fichier doit être ROUGE avant l'implémentation de l'endpoint.
// Il passera au vert uniquement quand le dev aura :
//   1. Implémenté POST /orders/:id/cancel avec auth X-User-Id
//   2. Ajouté le statut cancelled_by_client
//   3. Corrigé filterActiveOrders pour exclure cancelled_by_client
//   4. Exporté resetOrders() depuis src/routes/orders.js

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const server = require("../src/server");
const { filterActiveOrders, resetOrders } = require("../src/routes/orders");

// Helper POST — envoie une requête POST avec headers optionnels et retourne { status, body }
function post(path, { headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: "localhost",
        port,
        path,
        method: "POST",
        headers,
      };
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          server.close(() => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        });
      });
      req.on("error", (err) => server.close(() => reject(err)));
      req.end();
    });
  });
}

// Helper GET (copié pour l'autonomie de ce fichier)
function get(path, { headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: "localhost",
        port,
        path,
        method: "GET",
        headers,
      };
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          server.close(() => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        });
      });
      req.on("error", (err) => server.close(() => reject(err)));
      req.end();
    });
  });
}

// Réinitialise les données en mémoire avant et après chaque test qui mute des commandes.
// Requiert que src/routes/orders.js exporte resetOrders().
beforeEach(resetOrders);
after(resetOrders);

// ---------------------------------------------------------------------------
// Groupe 1 — Tests d'acceptation : POST /orders/:id/cancel
// ---------------------------------------------------------------------------

// AC-1 : Annulation valide — client propriétaire, statut paid → 200
test("AC-1 : POST /orders/101/cancel par Teiki (propriétaire, paid) → 200 + statut cancelled_by_client", async () => {
  const { status, body } = await post("/orders/101/cancel", {
    headers: { "X-User-Id": "2" },
  });
  assert.equal(status, 200, "doit retourner 200");
  assert.equal(body.status, "cancelled_by_client", "le statut doit être cancelled_by_client");
  assert.equal(body.cancelledByUserId, 2, "cancelledByUserId doit être l'id du client qui annule");
  assert.ok(
    typeof body.cancelledAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(body.cancelledAt),
    `cancelledAt doit être une date ISO 8601, reçu : ${body.cancelledAt}`,
  );
});

// AC-2 : Sans authentification (header absent) → 401
test("AC-2 : POST /orders/101/cancel sans header X-User-Id → 401", async () => {
  const { status } = await post("/orders/101/cancel");
  assert.equal(status, 401, "doit refuser avec 401 si X-User-Id absent");
});

// AC-3 : Commande n'appartenant pas au client → 403
// Teiki (userId=2) essaie d'annuler la commande 103 qui appartient à Manoa (userId=3)
test("AC-3 : POST /orders/103/cancel par Teiki (commande de Manoa) → 403", async () => {
  const { status } = await post("/orders/103/cancel", {
    headers: { "X-User-Id": "2" },
  });
  assert.equal(status, 403, "doit refuser avec 403 si la commande appartient à un autre client");
});

// AC-4 : Statut != paid (commande déjà cancelled) → 409
// Commande 102 est cancelled
test("AC-4 : POST /orders/102/cancel (statut cancelled) → 409", async () => {
  const { status } = await post("/orders/102/cancel", {
    headers: { "X-User-Id": "2" },
  });
  assert.equal(status, 409, "doit refuser avec 409 si la commande n'est pas en statut paid");
});

// AC-5 : Utilisateur avec rôle admin (non customer) → 401
// Heiata (userId=1) a le rôle admin, pas customer
test("AC-5 : POST /orders/101/cancel par Heiata (admin, pas customer) → 401", async () => {
  const { status } = await post("/orders/101/cancel", {
    headers: { "X-User-Id": "1" },
  });
  assert.equal(status, 401, "un admin ne peut pas annuler une commande client — doit retourner 401");
});

// AC-6 : Commande inexistante — l'auth est vérifiée AVANT l'existence de la commande
test("AC-6 : POST /orders/999/cancel sans header → 401 (auth avant existence)", async () => {
  const { status } = await post("/orders/999/cancel");
  assert.equal(status, 401, "sans auth, même une commande inexistante doit retourner 401");
});

test("AC-6b : POST /orders/999/cancel avec header valide → 404 (commande inexistante)", async () => {
  const { status } = await post("/orders/999/cancel", {
    headers: { "X-User-Id": "2" },
  });
  assert.equal(status, 404, "une commande inexistante doit retourner 404 une fois l'auth passée");
});

// AC-7 : Après annulation, la commande reste visible dans GET /orders
test("AC-7 : après annulation de 101, GET /orders contient toujours id 101 avec cancelled_by_client", async () => {
  // Annuler d'abord
  const cancel = await post("/orders/101/cancel", { headers: { "X-User-Id": "2" } });
  assert.equal(cancel.status, 200, "pré-condition : l'annulation doit réussir");

  // Vérifier que la commande est toujours visible
  const { status, body } = await get("/orders");
  assert.equal(status, 200);
  const order101 = body.find((o) => o.id === 101);
  assert.ok(order101, "la commande 101 doit toujours être présente après annulation");
  assert.equal(order101.status, "cancelled_by_client", "son statut doit être cancelled_by_client");
});

// AC-8 : Double-annulation (cancelled_by_client → cancel à nouveau) → 409
test("AC-8 : POST /orders/101/cancel deux fois → 409 au second appel", async () => {
  await post("/orders/101/cancel", { headers: { "X-User-Id": "2" } });
  const { status } = await post("/orders/101/cancel", { headers: { "X-User-Id": "2" } });
  assert.equal(status, 409, "une commande déjà cancelled_by_client ne peut plus être annulée — 409");
});

// ---------------------------------------------------------------------------
// Groupe 2 — Non-régression : filterActiveOrders + statuts existants
// ---------------------------------------------------------------------------

// NR-1 : filterActiveOrders exclut cancelled_by_client (test unitaire)
// Ce test sera ROUGE si filterActiveOrders reste en blacklist !== "cancelled"
test("NR-1 : filterActiveOrders exclut cancelled_by_client (test unitaire)", () => {
  const sample = [
    { id: 1, status: "paid" },
    { id: 2, status: "cancelled" },
    { id: 3, status: "cancelled_by_client" },
    { id: 4, status: "paid" },
  ];
  const result = filterActiveOrders(sample);
  assert.deepEqual(
    result.map((o) => o.id),
    [1, 4],
    "filterActiveOrders doit exclure cancelled ET cancelled_by_client",
  );
});

// NR-2 : GET /orders?active=true n'expose pas les cancelled_by_client
test("NR-2 : GET /orders?active=true n'expose pas les commandes cancelled_by_client", async () => {
  // Annuler 101 pour avoir un cancelled_by_client en mémoire
  await post("/orders/101/cancel", { headers: { "X-User-Id": "2" } });

  const { body } = await get("/orders?active=true");
  assert.ok(
    body.every((o) => o.status !== "cancelled_by_client"),
    "GET /orders?active=true ne doit pas retourner de commandes cancelled_by_client",
  );
});

// NR-3 : GET /orders?status=cancelled n'inclut PAS les cancelled_by_client
test("NR-3 : GET /orders?status=cancelled n'inclut pas les cancelled_by_client (statuts distincts)", async () => {
  await post("/orders/101/cancel", { headers: { "X-User-Id": "2" } });

  const { body } = await get("/orders?status=cancelled");
  assert.ok(
    body.every((o) => o.status === "cancelled"),
    "?status=cancelled ne doit retourner QUE les cancelled (pas cancelled_by_client)",
  );
});

// NR-4 : GET /orders?status=cancelled_by_client retourne uniquement ce statut
test("NR-4 : GET /orders?status=cancelled_by_client retourne uniquement les commandes cancelled_by_client", async () => {
  await post("/orders/101/cancel", { headers: { "X-User-Id": "2" } });

  const { body } = await get("/orders?status=cancelled_by_client");
  assert.ok(body.length > 0, "doit retourner au moins une commande cancelled_by_client");
  assert.ok(
    body.every((o) => o.status === "cancelled_by_client"),
    "toutes les commandes retournées doivent avoir status cancelled_by_client",
  );
});

// NR-5 : Le statut cancelled existant (opérateur) n'est pas affecté par CLA-256
test("NR-5 : les commandes cancelled (opérateur) restent bien cancelled après CLA-256", async () => {
  const { body } = await get("/orders?status=cancelled");
  assert.ok(body.length > 0, "les commandes cancelled opérateur doivent toujours exister");
  // Les commandes 102 et 104 sont initialement cancelled — elles doivent le rester
  const ids = body.map((o) => o.id).sort((a, b) => a - b);
  assert.ok(ids.includes(102), "la commande 102 (cancelled opérateur) doit toujours exister");
  assert.ok(ids.includes(104), "la commande 104 (cancelled opérateur) doit toujours exister");
});

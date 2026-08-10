// SHIAAAAAAAAAAAAAAAAAAAAAAAA-516 — Tests d'acceptation : PATCH /orders/:id/cancel

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const server = require("../src/server");

function patch(path) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      const req = http.request(
        { hostname: "localhost", port, path, method: "PATCH", headers: { "Content-Length": 0 } },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            server.close(() => resolve({ status: res.statusCode, body: JSON.parse(data) }));
          });
        }
      );
      req.on("error", (err) => server.close(() => reject(err)));
      req.end();
    });
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}${path}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close(() => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
      }).on("error", (err) => server.close(() => reject(err)));
    });
  });
}

// ── 404 ───────────────────────────────────────────────────────────────────────

test("PATCH /orders/9999/cancel → 404 { error: 'Not found' }", async () => {
  const { status, body } = await patch("/orders/9999/cancel");
  assert.equal(status, 404);
  assert.deepEqual(body, { error: "Not found" });
});

// ── 409 — statut déjà cancelled ──────────────────────────────────────────────

test("PATCH /orders/102/cancel (statut initial cancelled) → 409 { error: 'Order already cancelled' }", async () => {
  const { status, body } = await patch("/orders/102/cancel");
  assert.equal(status, 409);
  assert.deepEqual(body, { error: "Order already cancelled" });
});

// ── 200 — annulation réussie ──────────────────────────────────────────────────

test("PATCH /orders/101/cancel → 200 : status cancelled, statusHistory enrichi, réponse enrichie", async () => {
  const { status, body } = await patch("/orders/101/cancel");
  assert.equal(status, 200, "doit retourner HTTP 200");
  assert.equal(body.id, 101, "id doit être 101");
  assert.equal(body.status, "cancelled", "status doit être 'cancelled'");
  // statusHistory : le dernier événement doit être l'annulation
  const last = body.statusHistory[body.statusHistory.length - 1];
  assert.equal(last.status, "cancelled", "dernier événement statusHistory.status doit être 'cancelled'");
  assert.ok(typeof last.at === "string" && last.at.startsWith("20"), `statusHistory.at doit être une date ISO, reçu : ${last.at}`);
  // Enrichissement client
  assert.equal(body.clientName, "Teiki", "clientName doit être Teiki (userId=2)");
  assert.equal(body.clientEmail, "teiki@example.pf", "clientEmail doit être teiki@example.pf");
  assert.equal(body.currency, "XPF", "currency doit être XPF");
});

// ── 409 — double annulation (s'appuie sur le test précédent qui a annulé 101) ─

test("PATCH /orders/101/cancel une deuxième fois → 409", async () => {
  const { status, body } = await patch("/orders/101/cancel");
  assert.equal(status, 409, "deuxième annulation doit retourner 409");
  assert.deepEqual(body, { error: "Order already cancelled" });
});

// ── Non-régression ────────────────────────────────────────────────────────────

test("non-régression : GET /orders retourne toujours 4 commandes après annulation", async () => {
  const { status, body } = await get("/orders");
  assert.equal(status, 200);
  assert.equal(body.orders.length, 4, "les 4 commandes doivent toujours être retournées");
});

test("non-régression : GET /orders/101 reflète le statut cancelled après annulation", async () => {
  const { status, body } = await get("/orders/101");
  assert.equal(status, 200);
  assert.equal(body.status, "cancelled", "GET /orders/101 doit refléter le statut cancelled");
});

test("non-régression : PATCH /orders/:id/cancel non capturé par les routes GET", async () => {
  // Vérifier que GET /orders/103/cancel retourne 404 (pas de route GET pour cancel)
  const { status } = await get("/orders/103/cancel");
  assert.equal(status, 404, "GET /orders/:id/cancel doit retourner 404 (méthode non supportée)");
});

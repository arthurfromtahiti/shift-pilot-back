// SHIAAAAAAAAAAAAAAAAAAAAAAAA-352 — Tests d'acceptation : GET /orders/:id

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const server = require("../src/server");

function getWithStatus(path) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}${path}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close(() => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
      }).on("error", (err) => {
        server.close(() => reject(err));
      });
    });
  });
}

// ── Nominal ──────────────────────────────────────────────────────────────────

test("GET /orders/101 retourne 200 avec la commande 101", async () => {
  const { status, body } = await getWithStatus("/orders/101");
  assert.equal(status, 200, "doit retourner HTTP 200");
  assert.equal(body.id, 101, "id doit être 101");
  assert.equal(body.status, "paid", "statut doit être paid");
  assert.equal(body.total, 42, "total doit être 42");
});

test("GET /orders/101 enrichit avec clientName et clientEmail (userId=2 → Teiki)", async () => {
  const { body } = await getWithStatus("/orders/101");
  assert.equal(body.clientName, "Teiki", "clientName doit être Teiki (userId=2)");
  assert.equal(body.clientEmail, "teiki@example.pf", "clientEmail doit être teiki@example.pf");
});

test("GET /orders/101 expose currency='XPF'", async () => {
  const { body } = await getWithStatus("/orders/101");
  assert.equal(body.currency, "XPF", "currency doit être XPF");
});

test("GET /orders/103 retourne 200 avec clientName=Manoa (userId=3)", async () => {
  const { status, body } = await getWithStatus("/orders/103");
  assert.equal(status, 200);
  assert.equal(body.id, 103);
  assert.equal(body.clientName, "Manoa", "clientName doit être Manoa (userId=3)");
  assert.equal(body.clientEmail, "manoa@example.pf");
});

// ── 404 ───────────────────────────────────────────────────────────────────────

test("GET /orders/9999 retourne 404 { error: 'Not found' }", async () => {
  const { status, body } = await getWithStatus("/orders/9999");
  assert.equal(status, 404, "un identifiant inexistant doit retourner 404");
  assert.deepEqual(body, { error: "Not found" });
});

// ── Non-régression ────────────────────────────────────────────────────────────

test("non-régression : GET /orders retourne toujours les 4 commandes paginées", async () => {
  const { status, body } = await getWithStatus("/orders");
  assert.equal(status, 200);
  assert.equal(body.orders.length, 4, "les 4 commandes doivent toujours être retournées");
  assert.ok(typeof body.pagination === "object", "pagination doit être présent");
});

test("non-régression : GET /orders/101/history n'est pas capturé par GET /orders/:id", async () => {
  const { status, body } = await getWithStatus("/orders/101/history");
  assert.equal(status, 200, "GET /orders/101/history doit toujours retourner 200");
  assert.ok("history" in body, "body doit contenir le champ history");
  assert.ok("orderId" in body, "body doit contenir le champ orderId");
});

// SHIAAAAAAAAAAAAAAAAAAAAAAAA-320 — Tests d'acceptation : GET /orders/:id/history
// Ces tests sont intentionnellement ROUGES tant que la route n'est pas implémentée.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const server = require("../src/server");

// Helper: GET avec statusCode + corps JSON parsé
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

test("GET /orders/101/history retourne 200 avec { orderId, history }", async () => {
  const { status, body } = await getWithStatus("/orders/101/history");
  assert.equal(status, 200, "doit retourner HTTP 200");
  assert.equal(body.orderId, 101, "orderId doit être 101");
  assert.ok(Array.isArray(body.history), "history doit être un tableau");
  assert.ok(body.history.length >= 1, "history doit contenir au moins une entrée");
});

// Le champ horodatage s'appelle "at" (choix de l'implémentation back)
test("GET /orders/101/history — chaque entrée expose status (string) et at (ISO 8601)", async () => {
  const { body } = await getWithStatus("/orders/101/history");
  const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  for (const entry of body.history) {
    assert.ok(
      typeof entry.status === "string" && entry.status.length > 0,
      `entry.status doit être une string non vide : ${JSON.stringify(entry)}`,
    );
    assert.ok(
      typeof entry.at === "string" && ISO_8601.test(entry.at),
      `entry.at doit être au format ISO 8601 : ${entry.at}`,
    );
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────────

test("GET /orders/9999/history retourne 404 { error: 'Not found' }", async () => {
  const { status, body } = await getWithStatus("/orders/9999/history");
  assert.equal(status, 404, "un identifiant inexistant doit retourner 404");
  assert.equal(body.error, "Not found");
});

// ── statusHistory initialisé sur toutes les commandes existantes ─────────────

test("toutes les commandes existantes (101–104) ont au moins une entrée dans history", async () => {
  const EXISTING_IDS = [101, 102, 103, 104];
  for (const id of EXISTING_IDS) {
    const { status, body } = await getWithStatus(`/orders/${id}/history`);
    assert.equal(status, 200, `commande ${id} doit retourner 200`);
    assert.ok(
      Array.isArray(body.history) && body.history.length >= 1,
      `commande ${id} doit avoir au moins une entrée dans history`,
    );
  }
});

// ── Non-régression ────────────────────────────────────────────────────────────

test("non-régression : GET /orders retourne toujours les 4 commandes paginées", async () => {
  const { status, body } = await getWithStatus("/orders");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.orders), "orders doit être un tableau");
  assert.equal(body.orders.length, 4, "les 4 commandes doivent toujours être retournées");
  assert.ok(typeof body.pagination === "object", "pagination doit être présent");
});

test("non-régression : GET /orders/export.csv retourne 200 text/csv", async () => {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}/orders/export.csv`, (res) => {
        res.resume();
        res.on("end", () => {
          server.close(() => {
            assert.equal(res.statusCode, 200, "GET /orders/export.csv doit retourner 200");
            assert.ok(
              res.headers["content-type"] && res.headers["content-type"].startsWith("text/csv"),
              "Content-Type doit être text/csv",
            );
            resolve();
          });
        });
      }).on("error", (err) => server.close(() => reject(err)));
    });
  });
});

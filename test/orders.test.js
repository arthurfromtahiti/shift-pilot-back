const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { filterActiveOrders, filterByStatus } = require("../src/routes/orders");
const server = require("../src/server");

test("filterActiveOrders excludes cancelled orders", () => {
  const sample = [
    { id: 1, status: "paid" },
    { id: 2, status: "cancelled" },
    { id: 3, status: "paid" },
  ];

  const result = filterActiveOrders(sample);

  assert.deepEqual(
    result.map((order) => order.id),
    [1, 3],
    "cancelled orders must not appear in the active list",
  );
});

// Helper: make a GET request to the server and parse JSON
function get(path) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}${path}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close(() => resolve(JSON.parse(data)));
        });
      }).on("error", (err) => {
        server.close(() => reject(err));
      });
    });
  });
}

test("GET /orders without ?status returns all orders", async () => {
  const result = await get("/orders");
  assert.equal(result.length, 4, "all 4 orders must be returned when no status filter is provided");
});

test("GET /orders?status=paid returns only paid orders", async () => {
  const result = await get("/orders?status=paid");
  assert.ok(result.length > 0, "should return at least one paid order");
  assert.ok(
    result.every((o) => o.status === "paid"),
    "all returned orders must have status=paid",
  );
});

test("GET /orders?status=cancelled returns only cancelled orders", async () => {
  const result = await get("/orders?status=cancelled");
  assert.ok(result.length > 0, "should return at least one cancelled order");
  assert.ok(
    result.every((o) => o.status === "cancelled"),
    "all returned orders must have status=cancelled",
  );
});

test("GET /orders?status=unknown returns empty list, not an error", async () => {
  const result = await get("/orders?status=unknown");
  assert.deepEqual(result, [], "unknown status must return empty array");
});

// CLA-114 — Bug 1: American spelling "canceled" must match British "cancelled" in data
test("GET /orders?status=canceled (one l) returns same orders as ?status=cancelled", async () => {
  const onEl = await get("/orders?status=canceled");
  const twoEl = await get("/orders?status=cancelled");
  assert.ok(onEl.length > 0, "canceled (one l) must return at least one order");
  assert.deepEqual(
    onEl.map((o) => o.id).sort(),
    twoEl.map((o) => o.id).sort(),
    "?status=canceled must return the same orders as ?status=cancelled",
  );
});

// CLA-114 — Bug 2: explicit status param must take precedence over active=true filter
test("GET /orders?active=true&status=cancelled returns cancelled orders (status wins)", async () => {
  const result = await get("/orders?active=true&status=cancelled");
  assert.ok(result.length > 0, "should return at least one cancelled order despite active=true");
  assert.ok(
    result.every((o) => o.status === "cancelled"),
    "all returned orders must have status=cancelled",
  );
  assert.deepEqual(
    result.map((o) => o.id).sort(),
    [102, 104],
    "must return orders 102 and 104",
  );
});

// CLA-187 — GET /orders doit enrichir chaque commande avec clientName
test("GET /orders enrichit chaque commande avec clientName", async () => {
  const result = await get("/orders");
  assert.ok(
    result.every((o) => "clientName" in o),
    "toutes les commandes doivent exposer clientName",
  );
  const order101 = result.find((o) => o.id === 101);
  const order103 = result.find((o) => o.id === 103);
  assert.equal(order101.clientName, "Teiki", "userId=2 → clientName doit être Teiki");
  assert.equal(order103.clientName, "Manoa", "userId=3 → clientName doit être Manoa");
});

// CLA-187 — l'enrichissement clientName ne doit pas casser le filtre par userId
test("GET /orders?userId=2 filtre par userId et expose clientName correct", async () => {
  const result = await get("/orders?userId=2");
  assert.ok(result.length > 0, "au moins une commande pour userId=2");
  assert.ok(
    result.every((o) => o.userId === 2),
    "toutes les commandes retournées doivent appartenir à userId=2",
  );
  assert.ok(
    result.every((o) => o.clientName === "Teiki"),
    "toutes les commandes de userId=2 doivent avoir clientName=Teiki",
  );
});

test("filterByStatus filters orders by exact status match", () => {
  const sample = [
    { id: 1, status: "paid" },
    { id: 2, status: "cancelled" },
    { id: 3, status: "paid" },
  ];

  assert.deepEqual(
    filterByStatus(sample, "paid").map((o) => o.id),
    [1, 3],
  );
  assert.deepEqual(
    filterByStatus(sample, "cancelled").map((o) => o.id),
    [2],
  );
  assert.deepEqual(filterByStatus(sample, "unknown"), []);
});

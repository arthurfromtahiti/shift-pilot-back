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

// CLA-195 — GET /orders must expose total in XPF and must not expose totalXpf
test("GET /orders returns total in XPF and no totalXpf field", async () => {
  const result = await get("/orders");
  assert.deepEqual(
    result.map((o) => o.total),
    [42, 18, 96, 30],
    "GET /orders must return total in XPF (42, 18, 96, 30)",
  );
  assert.ok(
    result.every((o) => !("totalXpf" in o)),
    "GET /orders must not expose a totalXpf field",
  );
});

// CLA-195 — total must be stored in XPF, not centimes
test("listOrders() returns total in XPF (not centimes)", () => {
  const { listOrders } = require("../src/routes/orders");
  const result = listOrders();
  assert.deepEqual(
    result.map((o) => o.total),
    [42, 18, 96, 30],
    "totals must be 42, 18, 96, 30 XPF — not 4200, 1800, 9600, 3000 centimes",
  );
});

// CLA-187 — GET /orders must expose clientName resolved from userId
test("GET /orders exposes clientName resolved from each order's userId", async () => {
  const result = await get("/orders");
  const byId = Object.fromEntries(result.map((o) => [o.id, o]));
  assert.equal(byId[101].clientName, "Teiki", "order 101 belongs to user 2 (Teiki)");
  assert.equal(byId[103].clientName, "Manoa", "order 103 belongs to user 3 (Manoa)");
});

// CLA-225 — chaque commande expose createdAt au format ISO 8601
test("GET /orders retourne createdAt sur chaque commande", async () => {
  const result = await get("/orders");
  const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  assert.equal(result.length, 4, "4 commandes attendues");
  for (const order of result) {
    assert.ok(
      typeof order.createdAt === "string" && ISO_8601.test(order.createdAt),
      `order ${order.id} doit avoir createdAt ISO 8601, reçu : ${order.createdAt}`,
    );
  }
});

test("GET /orders retourne des createdAt tous distincts", async () => {
  const result = await get("/orders");
  const dates = result.map((o) => o.createdAt);
  const unique = new Set(dates);
  assert.equal(unique.size, dates.length, "les dates createdAt doivent être toutes distinctes");
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

// CLA-226 — tri par date createdAt
test("GET /orders?sort=date_asc retourne les commandes en ordre croissant de createdAt", async () => {
  const result = await get("/orders?sort=date_asc");
  const ids = result.map((o) => o.id);
  assert.deepEqual(ids, [101, 102, 103, 104], "date_asc doit retourner 101 < 102 < 103 < 104");
});

test("GET /orders?sort=date_desc retourne les commandes en ordre décroissant de createdAt", async () => {
  const result = await get("/orders?sort=date_desc");
  const ids = result.map((o) => o.id);
  assert.deepEqual(ids, [104, 103, 102, 101], "date_desc doit retourner 104 > 103 > 102 > 101");
});

// CLA-226 — filtrage par plage de dates
test("GET /orders?from=2024-02-01&to=2024-03-31 retourne uniquement id102 et id103", async () => {
  const result = await get("/orders?from=2024-02-01&to=2024-03-31");
  const ids = result.map((o) => o.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [102, 103], "la plage fév–mars doit inclure uniquement id102 et id103");
});

// CLA-226 — sort invalide ignoré silencieusement
test("GET /orders?sort=invalide retourne toutes les commandes sans erreur", async () => {
  const result = await get("/orders?sort=invalide");
  assert.equal(result.length, 4, "un sort invalide ne doit pas provoquer d'erreur ni filtrer de commandes");
});

// CLA-226 — from/to invalides ignorés silencieusement
test("GET /orders?from=foo retourne toutes les commandes sans erreur", async () => {
  const result = await get("/orders?from=foo");
  assert.equal(result.length, 4, "un from invalide doit être ignoré silencieusement");
});

test("GET /orders?to=not-a-date retourne toutes les commandes sans erreur", async () => {
  const result = await get("/orders?to=not-a-date");
  assert.equal(result.length, 4, "un to invalide doit être ignoré silencieusement");
});

// CLA-226 — combinaison avec filtre existant
test("GET /orders?userId=3&sort=date_desc retourne les commandes de l'utilisateur 3 triées décroissant", async () => {
  const result = await get("/orders?userId=3&sort=date_desc");
  const ids = result.map((o) => o.id);
  // id103 (mars) et id104 (avr) appartiennent à userId=3 ; desc → 104 avant 103
  assert.deepEqual(ids, [104, 103], "combinaison userId + sort=date_desc doit retourner 104 avant 103");
});

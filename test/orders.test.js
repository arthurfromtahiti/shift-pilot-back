const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { filterActiveOrders } = require("../src/routes/orders");
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

// CLA-125 — GET /orders must include totalXpf = Math.round(total / 100)
test("GET /orders includes totalXpf computed from total", async () => {
  const result = await get("/orders");
  assert.ok(
    result.every((o) => o.totalXpf === Math.round(o.total / 100)),
    "each order must have totalXpf === Math.round(total / 100)",
  );
  const order101 = result.find((o) => o.id === 101);
  assert.ok(order101, "order 101 must be present");
  assert.equal(order101.total, 4200, "order 101 must still have total=4200");
  assert.equal(order101.totalXpf, 42, "order 101 must have totalXpf=42");
});

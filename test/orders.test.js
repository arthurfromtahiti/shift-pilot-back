const { test } = require("node:test");
const assert = require("node:assert/strict");
const { filterActiveOrders } = require("../src/routes/orders");
const server = require("../src/server");

function request(path) {
  return new Promise((resolve, reject) => {
    const port = 0;
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      const http = require("node:http");
      http.get(`http://127.0.0.1:${addr.port}${path}`, (res) => {
        let body = "";
        res.on("data", chunk => { body += chunk; });
        res.on("end", () => {
          server.close();
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        });
      }).on("error", (err) => { server.close(); reject(err); });
    });
  });
}

test("GET /orders/101 returns the order with id 101", async () => {
  const { status, body } = await request("/orders/101");
  assert.equal(status, 200);
  assert.deepEqual(body, { id: 101, userId: 2, total: 4200, status: "paid" });
});

test("GET /orders/999 returns 404 with error message", async () => {
  const { status, body } = await request("/orders/999");
  assert.equal(status, 404);
  assert.deepEqual(body, { error: "Not found" });
});

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

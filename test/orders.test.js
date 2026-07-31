const { test } = require("node:test");
const assert = require("node:assert/strict");
const { filterActiveOrders } = require("../src/routes/orders");

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

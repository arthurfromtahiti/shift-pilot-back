const http = require("node:http");
const { URL } = require("node:url");
const { listUsers, getUserById } = require("./routes/users");
const { listOrders, getOrdersByUser, filterActiveOrders, filterByStatus } = require("./routes/orders");

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/users" && req.method === "GET") {
    return sendJson(res, 200, listUsers());
  }

  if (url.pathname === "/orders" && req.method === "GET") {
    const userIdParam = url.searchParams.get("userId");
    const activeOnly = url.searchParams.get("active") === "true";
    const statusParam = url.searchParams.get("status");

    // "canceled" (American, 1 l) is an alias for the canonical "cancelled" stored in data
    const normalizedStatus = statusParam === "canceled" ? "cancelled" : statusParam;

    let result = userIdParam ? getOrdersByUser(Number(userIdParam)) : listOrders();
    // explicit status wins over active-only: the two filters are semantically contradictory
    if (activeOnly && normalizedStatus === null) result = filterActiveOrders(result);
    if (normalizedStatus !== null) result = filterByStatus(result, normalizedStatus);

    return sendJson(res, 200, result);
  }

  sendJson(res, 404, { error: "Not found" });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`shift-pilot-back listening on :${PORT}`);
  });
}

module.exports = server;

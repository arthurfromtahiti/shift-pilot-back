const http = require("node:http");
const { URL } = require("node:url");

const { listUsers, getUserById } = require("./routes/users");
const { listOrders, getOrdersByUser, filterActiveOrders, getOrderById } = require("./routes/orders");

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/users" && req.method === "GET") {
    return sendJson(res, 200, listUsers());
  }

  const userByIdMatch = req.method === "GET" && /^\/users\/(\d+)$/.exec(url.pathname);
  if (userByIdMatch) {
    const user = getUserById(Number(userByIdMatch[1]));
    if (user === null) return sendJson(res, 404, { error: "Not found" });
    return sendJson(res, 200, user);
  }

  if (url.pathname === "/orders" && req.method === "GET") {
    const userIdParam = url.searchParams.get("userId");
    const activeOnly = url.searchParams.get("active") === "true";

    let result = userIdParam ? getOrdersByUser(Number(userIdParam)) : listOrders();
    if (activeOnly) result = filterActiveOrders(result);

    return sendJson(res, 200, result.map(o => ({ ...o, totalXpf: Math.round(o.total / 100) })));
  }

  const orderByIdMatch = /^\/orders\/[^/]+$/.exec(url.pathname);
  if (req.method === "GET" && orderByIdMatch) {
    const id = parseInt(url.pathname.slice("/orders/".length), 10);
    const order = getOrderById(id);
    if (order) return sendJson(res, 200, order);
    return sendJson(res, 404, { error: "Not found" });
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

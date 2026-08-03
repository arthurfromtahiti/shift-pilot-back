const http = require("node:http");
const { URL } = require("node:url");
const { listUsers } = require("./routes/users");
const { listOrders, getOrdersByUser, filterActiveOrders } = require("./routes/orders");

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

    let result = userIdParam ? getOrdersByUser(Number(userIdParam)) : listOrders();
    if (activeOnly) result = filterActiveOrders(result);

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

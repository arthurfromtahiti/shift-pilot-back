const http = require("node:http");
const { URL } = require("node:url");

const { listUsers, getUserById } = require("./routes/users");

const { listOrders, getOrdersByUser, filterActiveOrders, getOrderById, filterByStatus, filterByCustomerName, DEFAULT_CURRENCY } = require("./routes/orders");

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

// Steps 1–9 of the orders filter pipeline (shared by GET /orders and GET /orders/export.csv)
function getFilteredOrders(url) {
  const userIdParam = url.searchParams.get("userId");
  const activeOnly = url.searchParams.get("active") === "true";
  const statusParam = url.searchParams.get("status");
  const sortParam = url.searchParams.get("sort");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const customerNameParam = url.searchParams.get("customerName");

  // Normalize case first, then resolve "canceled" (American) → "cancelled" (canonical in data)
  const statusLower = statusParam !== null ? statusParam.toLowerCase() : null;
  const normalizedStatus = statusLower === "canceled" ? "cancelled" : statusLower;

  let result = userIdParam !== null ? getOrdersByUser(Number(userIdParam)) : listOrders();
  // explicit status wins over active-only: the two filters are semantically contradictory
  if (activeOnly && normalizedStatus === null) result = filterActiveOrders(result);
  if (normalizedStatus !== null) result = filterByStatus(result, normalizedStatus);

  // date range filter — YYYY-MM-DD compared against createdAt ISO string; invalid format silently ignored
  const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (fromParam && isValidDate(fromParam)) result = result.filter((o) => o.createdAt >= fromParam + "T00:00:00Z");
  if (toParam && isValidDate(toParam)) result = result.filter((o) => o.createdAt <= toParam + "T23:59:59Z");

  // date/amount sort — unknown sort values are silently ignored, no mutation of source array
  if (sortParam === "date_asc") result = [...result].sort((a, b) => a.createdAt < b.createdAt ? -1 : 1);
  else if (sortParam === "date_desc") result = [...result].sort((a, b) => a.createdAt > b.createdAt ? -1 : 1);
  else if (sortParam === "amount_asc") result = [...result].sort((a, b) => a.total - b.total);
  else if (sortParam === "amount_desc") result = [...result].sort((a, b) => b.total - a.total);

  let enriched = result.map((o) => {
    const user = getUserById(o.userId);
    return { ...o, clientName: user ? user.name : null, clientEmail: user ? user.email : null, currency: o.currency ?? DEFAULT_CURRENCY };
  });

  if (customerNameParam !== null) enriched = filterByCustomerName(enriched, customerNameParam);

  // client sort — applied after enrichment because clientName only exists after getUserById resolution
  if (sortParam === "client_asc") enriched = [...enriched].sort((a, b) => (a.clientName ?? "").localeCompare(b.clientName ?? ""));
  else if (sortParam === "client_desc") enriched = [...enriched].sort((a, b) => (b.clientName ?? "").localeCompare(a.clientName ?? ""));

  return enriched;
}

// RFC 4180 escaping with ; as delimiter: quote fields containing ; " \r or \n
function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(";") || str.includes('"') || str.includes("\r") || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
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

  const orderHistoryMatch = req.method === "GET" && /^\/orders\/(\d+)\/history$/.exec(url.pathname);
  if (orderHistoryMatch) {
    const id = parseInt(orderHistoryMatch[1], 10);
    const order = getOrderById(id);
    if (order === null) return sendJson(res, 404, { error: "Not found" });
    return sendJson(res, 200, { orderId: order.id, history: order.statusHistory });
  }

  const orderByIdMatch = req.method === "GET" && /^\/orders\/(\d+)$/.exec(url.pathname);
  if (orderByIdMatch) {
    const id = parseInt(orderByIdMatch[1], 10);
    const order = getOrderById(id);
    if (order === null) return sendJson(res, 404, { error: "Not found" });
    const user = getUserById(order.userId);
    return sendJson(res, 200, {
      ...order,
      clientName: user ? user.name : null,
      clientEmail: user ? user.email : null,
      currency: order.currency ?? DEFAULT_CURRENCY,
    });
  }

  if (url.pathname === "/orders/export.csv" && req.method === "GET") {
    const enriched = getFilteredOrders(url);
    const today = new Date().toISOString().slice(0, 10);
    const header = "id;date;clientName;clientEmail;montant;devise;statut";
    const rows = enriched.map((o) =>
      [o.id, o.createdAt.slice(0, 10), o.clientName, o.clientEmail, o.total, o.currency, o.status]
        .map(csvEscape)
        .join(";")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\r\n");
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${today}.csv"`,
    });
    res.end(csv);
    return;
  }

  if (url.pathname === "/orders" && req.method === "GET") {
    const enriched = getFilteredOrders(url);

    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");
    const parsePage = (v) => { const n = parseInt(v, 10); return (isNaN(n) || n < 1) ? 1 : n; };
    const parseLimit = (v) => { const n = parseInt(v, 10); if (isNaN(n) || n < 1) return 1; return Math.min(n, 100); };
    const page = pageParam !== null ? parsePage(pageParam) : 1;
    const limit = limitParam !== null ? parseLimit(limitParam) : 20;

    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const orders = enriched.slice((page - 1) * limit, page * limit);

    return sendJson(res, 200, { orders, pagination: { total, page, limit, totalPages } });
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

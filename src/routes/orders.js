// Domaine "commandes" — gestion en mémoire, à but de démonstration.

const _ = require("lodash");

const DEFAULT_CURRENCY = "XPF";

const orders = [
  { id: 101, userId: 2, total: 42, currency: "XPF", status: "paid", createdAt: "2024-01-10T08:00:00Z", statusHistory: [{ status: "paid", at: "2024-01-10T08:00:00Z" }] },
  { id: 102, userId: 2, total: 18, currency: "XPF", status: "cancelled", createdAt: "2024-02-20T14:30:00Z", statusHistory: [{ status: "cancelled", at: "2024-02-20T14:30:00Z" }] },
  { id: 103, userId: 3, total: 96, currency: "XPF", status: "paid", createdAt: "2024-03-05T09:15:00Z", statusHistory: [{ status: "paid", at: "2024-03-05T09:15:00Z" }] },
  { id: 104, userId: 3, total: 30, currency: "XPF", status: "cancelled", createdAt: "2024-04-12T16:45:00Z", statusHistory: [{ status: "cancelled", at: "2024-04-12T16:45:00Z" }] },
];

function listOrders() {
  return _.sortBy(orders, "id");
}

function getOrdersByUser(userId) {
  return orders.filter((order) => order.userId === userId);
}

function filterActiveOrders(orderList) {
  return orderList.filter((order) => order.status !== "cancelled");
}

function filterByStatus(orderList, status) {
  return orderList.filter((order) => order.status === status);
}

function getOrderById(id) {
  if (id === null || id === undefined) return null;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return null;
  return orders.find(order => order.id === numId) || null;
}

function normalize(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function filterByCustomerName(orderList, customerName) {
  const needle = normalize(customerName);
  return orderList.filter(
    (o) => o.clientName != null && normalize(o.clientName).includes(needle)
  );
}

// Comparaison numérique (a.id - b.id) et non lexicographique : "9" > "10" en string mais 9 < 10
function sortOrdersById(orderList, direction) {
  if (direction === "asc") return [...orderList].sort((a, b) => a.id - b.id);
  if (direction === "desc") return [...orderList].sort((a, b) => b.id - a.id);
  return orderList;
}

function sortOrdersByTotal(orderList, direction) {
  if (direction === "asc") return [...orderList].sort((a, b) => a.total - b.total);
  if (direction === "desc") return [...orderList].sort((a, b) => b.total - a.total);
  return orderList;
}

function cancelOrder(id) {
  const numId = (id !== null && id !== undefined) ? Number(id) : NaN;
  const order = Number.isInteger(numId) ? orders.find(o => o.id === numId) : null;
  if (!order) return { status: 404, body: { error: "Not found" } };
  if (order.status === "cancelled") return { status: 409, body: { error: "Order already cancelled" } };
  if (order.status !== "paid") return { status: 422, body: { error: "Order cannot be cancelled" } };
  order.status = "cancelled";
  order.statusHistory = [...order.statusHistory, { status: "cancelled", at: new Date().toISOString() }];
  return { status: 200, body: order };
}

module.exports = { listOrders, getOrdersByUser, filterActiveOrders, getOrderById, filterByStatus, filterByCustomerName, sortOrdersById, sortOrdersByTotal, cancelOrder, DEFAULT_CURRENCY };

// Domaine "commandes" — gestion en mémoire, à but de démonstration.

const _ = require("lodash");

const DEFAULT_CURRENCY = "XPF";

const INITIAL_ORDERS = [
  { id: 101, userId: 2, total: 42, status: "paid", createdAt: "2024-01-10T08:00:00Z" },
  { id: 102, userId: 2, total: 18, status: "cancelled", createdAt: "2024-02-20T14:30:00Z" },
  { id: 103, userId: 3, total: 96, status: "paid", createdAt: "2024-03-05T09:15:00Z" },
  { id: 104, userId: 3, total: 30, status: "cancelled", createdAt: "2024-04-12T16:45:00Z" },
];

const orders = INITIAL_ORDERS.map((o) => ({ ...o }));

function listOrders() {
  return _.sortBy(orders, "id");
}

function getOrdersByUser(userId) {
  return orders.filter((order) => order.userId === userId);
}

function filterActiveOrders(orderList) {
  return orderList.filter((order) => order.status === "paid");
}

function filterByStatus(orderList, status) {
  return orderList.filter((order) => order.status === status);
}

function getOrderById(id) {
  return orders.find(order => order.id === id) || null;
}

function cancelOrder(orderId, user) {
  const order = getOrderById(orderId);
  if (!order) return { status: 404, body: { error: "Not found" } };
  if (order.userId !== user.id) return { status: 403, body: { error: "Forbidden" } };
  if (order.status !== "paid") return { status: 409, body: { error: "Order not in paid status" } };
  order.status = "cancelled_by_client";
  order.cancelledByUserId = user.id;
  order.cancelledAt = new Date().toISOString();
  return { status: 200, body: order };
}

function resetOrders() {
  orders.splice(0, orders.length, ...INITIAL_ORDERS.map((o) => ({ ...o })));
}

module.exports = { listOrders, getOrdersByUser, filterActiveOrders, getOrderById, cancelOrder, resetOrders, filterByStatus, DEFAULT_CURRENCY };

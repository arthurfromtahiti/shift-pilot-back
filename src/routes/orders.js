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
  return orders.find(order => order.id === id) || null;
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

module.exports = { listOrders, getOrdersByUser, filterActiveOrders, getOrderById, filterByStatus, filterByCustomerName, DEFAULT_CURRENCY };

// Domaine "commandes" — gestion en mémoire, à but de démonstration.

const _ = require("lodash");

const orders = [
  { id: 101, userId: 2, total: 42, status: "paid" },
  { id: 102, userId: 2, total: 18, status: "cancelled" },
  { id: 103, userId: 3, total: 96, status: "paid" },
  { id: 104, userId: 3, total: 30, status: "cancelled" },
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

module.exports = { listOrders, getOrdersByUser, filterActiveOrders, getOrderById, filterByStatus };

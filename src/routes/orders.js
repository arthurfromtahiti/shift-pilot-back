// Domaine "commandes" — gestion en mémoire, à but de démonstration.

const orders = [
  { id: 101, userId: 2, total: 4200, status: "paid" },
  { id: 102, userId: 2, total: 1800, status: "cancelled" },
  { id: 103, userId: 3, total: 9600, status: "paid" },
  { id: 104, userId: 3, total: 3000, status: "cancelled" },
];

function listOrders() {
  return orders.slice().sort((a, b) => a.id - b.id);
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

module.exports = { listOrders, getOrdersByUser, filterActiveOrders, filterByStatus };

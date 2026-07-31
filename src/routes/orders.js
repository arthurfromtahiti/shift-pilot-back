// Domaine "commandes" — gestion en mémoire, à but de démonstration.

const orders = [
  { id: 101, userId: 2, total: 4200, status: "paid" },
  { id: 102, userId: 2, total: 1800, status: "cancelled" },
  { id: 103, userId: 3, total: 9600, status: "paid" },
  { id: 104, userId: 3, total: 3000, status: "cancelled" },
];

function listOrders() {
  return orders;
}

function getOrdersByUser(userId) {
  return orders.filter((order) => order.userId === userId);
}

// Doit exclure les commandes annulées. Bug volontaire : compare à "canceled"
// (orthographe américaine) alors que les données utilisent "cancelled" — la
// fonction ne filtre donc jamais rien, elle retourne toujours toutes les
// commandes, y compris les annulées.
function filterActiveOrders(orderList) {
  return orderList.filter((order) => order.status !== "canceled");
}

module.exports = { listOrders, getOrdersByUser, filterActiveOrders };

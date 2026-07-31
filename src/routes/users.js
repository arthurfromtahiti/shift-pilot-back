// Domaine "utilisateurs" — gestion en mémoire, à but de démonstration.

const users = [
  { id: 1, name: "Heiata", email: "heiata@example.pf", role: "admin" },
  { id: 2, name: "Teiki", email: "teiki@example.pf", role: "customer" },
  { id: 3, name: "Manoa", email: "manoa@example.pf", role: "customer" },
];

function listUsers() {
  return users;
}

function getUserById(id) {
  return users.find((user) => user.id === id) ?? null;
}

function isAdmin(user) {
  return user !== null && user.role === "admin";
}

module.exports = { listUsers, getUserById, isAdmin };

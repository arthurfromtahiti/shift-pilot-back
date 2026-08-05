// SHIAAAAAAAAAAAAAAAAAAAAAAAA-21 — Tests d'acceptation : recherche de commandes par nom de client
//
// Critères d'acceptation :
// 1. GET /orders?customerName=<val> retourne les commandes dont clientName contient <val> (substring)
// 2. Insensible à la casse : teiki trouve Teiki
// 3. Insensible aux accents : remi trouve Rémi (testé en unitaire avec données inline)
// 4. Aucun résultat → 200 + []
// 5. Paramètre absent → comportement inchangé (toutes les commandes)
//
// Données de référence en mémoire :
//   Teiki (userId 2) : commandes 101, 102
//   Manoa (userId 3) : commandes 103, 104

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const server = require("../src/server");

function get(path) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      http
        .get(`http://localhost:${port}${path}`, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            server.close(() => resolve({ status: res.statusCode, body: JSON.parse(data) }));
          });
        })
        .on("error", (err) => {
          server.close(() => reject(err));
        });
    });
  });
}

// ── Critère 1 : correspondance exacte ──────────────────────────────────────────

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — GET /orders?customerName=Teiki retourne les commandes 101 et 102", async () => {
  const { status, body } = await get("/orders?customerName=Teiki");
  assert.equal(status, 200, "doit répondre 200");
  const ids = body.orders.map((o) => o.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [101, 102], "doit retourner uniquement les commandes de Teiki (101, 102)");
});

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — GET /orders?customerName=Manoa retourne les commandes 103 et 104", async () => {
  const { status, body } = await get("/orders?customerName=Manoa");
  assert.equal(status, 200, "doit répondre 200");
  const ids = body.orders.map((o) => o.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [103, 104], "doit retourner uniquement les commandes de Manoa (103, 104)");
});

// ── Critère 1 (suite) : correspondance partielle / substring ──────────────────

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — GET /orders?customerName=eik (substring) retourne les commandes de Teiki", async () => {
  const { status, body } = await get("/orders?customerName=eik");
  assert.equal(status, 200, "doit répondre 200");
  const ids = body.orders.map((o) => o.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [101, 102], "substring 'eik' doit correspondre à 'Teiki'");
});

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — GET /orders?customerName=ano (substring) retourne les commandes de Manoa", async () => {
  const { status, body } = await get("/orders?customerName=ano");
  assert.equal(status, 200, "doit répondre 200");
  const ids = body.orders.map((o) => o.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [103, 104], "substring 'ano' doit correspondre à 'Manoa'");
});

// ── Critère 2 : insensibilité à la casse ──────────────────────────────────────

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — GET /orders?customerName=teiki (minuscules) retourne les commandes de Teiki", async () => {
  const { status, body } = await get("/orders?customerName=teiki");
  assert.equal(status, 200, "doit répondre 200");
  const ids = body.orders.map((o) => o.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [101, 102], "insensibilité casse : 'teiki' doit trouver 'Teiki'");
});

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — GET /orders?customerName=MANOA (majuscules) retourne les commandes de Manoa", async () => {
  const { status, body } = await get("/orders?customerName=MANOA");
  assert.equal(status, 200, "doit répondre 200");
  const ids = body.orders.map((o) => o.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [103, 104], "insensibilité casse : 'MANOA' doit trouver 'Manoa'");
});

// ── Critère 3 : insensibilité aux accents (test unitaire inline) ──────────────
//
// Les données en mémoire ne contiennent pas de nom accentué ; ce test importe
// la fonction de filtrage et lui passe des données inline pour vérifier la
// normalisation des accents indépendamment du seed de production.
// Le test sera ROUGE tant que filterByCustomerName n'est pas implémentée.

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — filterByCustomerName 'remi' trouve Rémi (insensibilité aux accents)", () => {
  const { filterByCustomerName } = require("../src/routes/orders");
  const sample = [
    { id: 1, clientName: "Rémi" },
    { id: 2, clientName: "Manoa" },
    { id: 3, clientName: "Héloïse" },
  ];
  const result = filterByCustomerName(sample, "remi");
  const ids = result.map((o) => o.id);
  assert.deepEqual(ids, [1], "'remi' doit correspondre à 'Rémi' après normalisation unicode");
});

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — filterByCustomerName 'heloise' trouve Héloïse (accents composés)", () => {
  const { filterByCustomerName } = require("../src/routes/orders");
  const sample = [
    { id: 1, clientName: "Rémi" },
    { id: 2, clientName: "Héloïse" },
    { id: 3, clientName: "Teiki" },
  ];
  const result = filterByCustomerName(sample, "heloise");
  const ids = result.map((o) => o.id);
  assert.deepEqual(ids, [2], "'heloise' doit correspondre à 'Héloïse' après normalisation unicode");
});

// ── Critère 4 : aucun résultat → 200 + [] ─────────────────────────────────────

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — GET /orders?customerName=xxxxxxxx retourne 200 et liste vide", async () => {
  const { status, body } = await get("/orders?customerName=xxxxxxxx");
  assert.equal(status, 200, "doit répondre 200 (jamais 404)");
  assert.deepEqual(body.orders, [], "aucun résultat doit retourner une liste vide, pas une erreur");
});

// ── Critère 5 : paramètre absent → comportement inchangé ──────────────────────

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — GET /orders sans customerName retourne les 4 commandes habituelles", async () => {
  const { status, body } = await get("/orders");
  assert.equal(status, 200, "doit répondre 200");
  assert.equal(body.orders.length, 4, "sans customerName, le filtre est ignoré : 4 commandes attendues");
});

// ── Combinaisons avec filtres existants ───────────────────────────────────────

test("SHIAAAAAAAAAAAAAAAAAAAAAAAA-7 — customerName + status : teiki + paid retourne uniquement la commande 101", async () => {
  const { status, body } = await get("/orders?customerName=teiki&status=paid");
  assert.equal(status, 200, "doit répondre 200");
  const ids = body.orders.map((o) => o.id);
  assert.deepEqual(ids, [101], "combinaison customerName + status doit affiner le résultat");
});

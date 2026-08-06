const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { filterActiveOrders, filterByStatus } = require("../src/routes/orders");
const server = require("../src/server");

test("filterActiveOrders excludes cancelled orders", () => {
  const sample = [
    { id: 1, status: "paid" },
    { id: 2, status: "cancelled" },
    { id: 3, status: "paid" },
  ];

  const result = filterActiveOrders(sample);

  assert.deepEqual(
    result.map((order) => order.id),
    [1, 3],
    "cancelled orders must not appear in the active list",
  );
});

// Helper: make a GET request to the server and parse JSON
function get(path) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}${path}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close(() => resolve(JSON.parse(data)));
        });
      }).on("error", (err) => {
        server.close(() => reject(err));
      });
    });
  });
}

test("GET /orders without ?status returns all orders", async () => {
  const result = await get("/orders");
  assert.equal(result.orders.length, 4, "all 4 orders must be returned when no status filter is provided");
});

test("GET /orders?status=paid returns only paid orders", async () => {
  const result = await get("/orders?status=paid");
  assert.ok(result.orders.length > 0, "should return at least one paid order");
  assert.ok(
    result.orders.every((o) => o.status === "paid"),
    "all returned orders must have status=paid",
  );
});

test("GET /orders?status=cancelled returns only cancelled orders", async () => {
  const result = await get("/orders?status=cancelled");
  assert.ok(result.orders.length > 0, "should return at least one cancelled order");
  assert.ok(
    result.orders.every((o) => o.status === "cancelled"),
    "all returned orders must have status=cancelled",
  );
});

test("GET /orders?status=unknown returns empty list, not an error", async () => {
  const result = await get("/orders?status=unknown");
  assert.deepEqual(result.orders, [], "unknown status must return empty array");
});

// CLA-114 — Bug 1: American spelling "canceled" must match British "cancelled" in data
test("GET /orders?status=canceled (one l) returns same orders as ?status=cancelled", async () => {
  const onEl = await get("/orders?status=canceled");
  const twoEl = await get("/orders?status=cancelled");
  assert.ok(onEl.orders.length > 0, "canceled (one l) must return at least one order");
  assert.deepEqual(
    onEl.orders.map((o) => o.id).sort(),
    twoEl.orders.map((o) => o.id).sort(),
    "?status=canceled must return the same orders as ?status=cancelled",
  );
});

// CLA-114 — Bug 2: explicit status param must take precedence over active=true filter
test("GET /orders?active=true&status=cancelled returns cancelled orders (status wins)", async () => {
  const result = await get("/orders?active=true&status=cancelled");
  assert.ok(result.orders.length > 0, "should return at least one cancelled order despite active=true");
  assert.ok(
    result.orders.every((o) => o.status === "cancelled"),
    "all returned orders must have status=cancelled",
  );
  assert.deepEqual(
    result.orders.map((o) => o.id).sort(),
    [102, 104],
    "must return orders 102 and 104",
  );
});

// CLA-195 — GET /orders must expose total in XPF and must not expose totalXpf
test("GET /orders returns total in XPF and no totalXpf field", async () => {
  const result = await get("/orders");
  assert.deepEqual(
    result.orders.map((o) => o.total),
    [42, 18, 96, 30],
    "GET /orders must return total in XPF (42, 18, 96, 30)",
  );
  assert.ok(
    result.orders.every((o) => !("totalXpf" in o)),
    "GET /orders must not expose a totalXpf field",
  );
});

// CLA-195 — total must be stored in XPF, not centimes
test("listOrders() returns total in XPF (not centimes)", () => {
  const { listOrders } = require("../src/routes/orders");
  const result = listOrders();
  assert.deepEqual(
    result.map((o) => o.total),
    [42, 18, 96, 30],
    "totals must be 42, 18, 96, 30 XPF — not 4200, 1800, 9600, 3000 centimes",
  );
});

// CLA-187 — GET /orders must expose clientName resolved from userId
test("GET /orders exposes clientName resolved from each order's userId", async () => {
  const result = await get("/orders");
  const byId = Object.fromEntries(result.orders.map((o) => [o.id, o]));
  assert.equal(byId[101].clientName, "Teiki", "order 101 belongs to user 2 (Teiki)");
  assert.equal(byId[103].clientName, "Manoa", "order 103 belongs to user 3 (Manoa)");
});

// CLA-225 — chaque commande expose createdAt au format ISO 8601
test("GET /orders retourne createdAt sur chaque commande", async () => {
  const result = await get("/orders");
  const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  assert.equal(result.orders.length, 4, "4 commandes attendues");
  for (const order of result.orders) {
    assert.ok(
      typeof order.createdAt === "string" && ISO_8601.test(order.createdAt),
      `order ${order.id} doit avoir createdAt ISO 8601, reçu : ${order.createdAt}`,
    );
  }
});

test("GET /orders retourne des createdAt tous distincts", async () => {
  const result = await get("/orders");
  const dates = result.orders.map((o) => o.createdAt);
  const unique = new Set(dates);
  assert.equal(unique.size, dates.length, "les dates createdAt doivent être toutes distinctes");
});

test("filterByStatus filters orders by exact status match", () => {
  const sample = [
    { id: 1, status: "paid" },
    { id: 2, status: "cancelled" },
    { id: 3, status: "paid" },
  ];

  assert.deepEqual(
    filterByStatus(sample, "paid").map((o) => o.id),
    [1, 3],
  );
  assert.deepEqual(
    filterByStatus(sample, "cancelled").map((o) => o.id),
    [2],
  );
  assert.deepEqual(filterByStatus(sample, "unknown"), []);
});

// CLA-226 — tri par date createdAt
test("GET /orders?sort=date_asc retourne les commandes en ordre croissant de createdAt", async () => {
  const result = await get("/orders?sort=date_asc");
  const ids = result.orders.map((o) => o.id);
  assert.deepEqual(ids, [101, 102, 103, 104], "date_asc doit retourner 101 < 102 < 103 < 104");
});

test("GET /orders?sort=date_desc retourne les commandes en ordre décroissant de createdAt", async () => {
  const result = await get("/orders?sort=date_desc");
  const ids = result.orders.map((o) => o.id);
  assert.deepEqual(ids, [104, 103, 102, 101], "date_desc doit retourner 104 > 103 > 102 > 101");
});

// CLA-226 — filtrage par plage de dates
test("GET /orders?from=2024-02-01&to=2024-03-31 retourne uniquement id102 et id103", async () => {
  const result = await get("/orders?from=2024-02-01&to=2024-03-31");
  const ids = result.orders.map((o) => o.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [102, 103], "la plage fév–mars doit inclure uniquement id102 et id103");
});

// SHIAAAAAAAAAAAAAAAAAAAAAAAA-63 — tri par montant total
test("GET /orders?sort=amount_asc retourne les commandes en ordre croissant de total", async () => {
  const result = await get("/orders?sort=amount_asc");
  const ids = result.orders.map((o) => o.id);
  // totaux: 101→42, 102→18, 103→96, 104→30 → ordre croissant: 102 < 104 < 101 < 103
  assert.deepEqual(ids, [102, 104, 101, 103], "amount_asc doit retourner du plus petit au plus grand montant");
});

test("GET /orders?sort=amount_desc retourne les commandes en ordre décroissant de total", async () => {
  const result = await get("/orders?sort=amount_desc");
  const ids = result.orders.map((o) => o.id);
  // totaux: 101→42, 102→18, 103→96, 104→30 → ordre décroissant: 103 > 101 > 104 > 102
  assert.deepEqual(ids, [103, 101, 104, 102], "amount_desc doit retourner du plus grand au plus petit montant");
});

// CLA-226 — sort invalide ignoré silencieusement
test("GET /orders?sort=invalide retourne toutes les commandes sans erreur", async () => {
  const result = await get("/orders?sort=invalide");
  assert.equal(result.orders.length, 4, "un sort invalide ne doit pas provoquer d'erreur ni filtrer de commandes");
});

// CLA-226 — from/to invalides ignorés silencieusement
test("GET /orders?from=foo retourne toutes les commandes sans erreur", async () => {
  const result = await get("/orders?from=foo");
  assert.equal(result.orders.length, 4, "un from invalide doit être ignoré silencieusement");
});

test("GET /orders?to=not-a-date retourne toutes les commandes sans erreur", async () => {
  const result = await get("/orders?to=not-a-date");
  assert.equal(result.orders.length, 4, "un to invalide doit être ignoré silencieusement");
});

// CLA-226 — combinaison avec filtre existant
test("GET /orders?userId=3&sort=date_desc retourne les commandes de l'utilisateur 3 triées décroissant", async () => {
  const result = await get("/orders?userId=3&sort=date_desc");
  const ids = result.orders.map((o) => o.id);
  // id103 (mars) et id104 (avr) appartiennent à userId=3 ; desc → 104 avant 103
  assert.deepEqual(ids, [104, 103], "combinaison userId + sort=date_desc doit retourner 104 avant 103");
});

// CLA-221 — from > to : plage impossible → tableau vide (les deux filtres s'appliquent indépendamment)
test("GET /orders?from=2024-04-01&to=2024-02-01 (from > to) retourne tableau vide", async () => {
  const result = await get("/orders?from=2024-04-01&to=2024-02-01");
  assert.deepEqual(result.orders, [], "une plage inversée (from > to) ne peut contenir aucune commande");
});

// CLA-221 — combinaison from/to + sort
test("GET /orders?from=2024-02-01&to=2024-03-31&sort=date_desc retourne id103 avant id102", async () => {
  const result = await get("/orders?from=2024-02-01&to=2024-03-31&sort=date_desc");
  const ids = result.orders.map((o) => o.id);
  assert.deepEqual(ids, [103, 102], "combinaison plage fév–mars + sort=date_desc doit retourner 103 avant 102");
});

// CLA-261 — chaque commande expose le champ currency avec la valeur XPF
test("GET /orders retourne currency='XPF' sur chaque commande", async () => {
  const result = await get("/orders");
  assert.equal(result.orders.length, 4, "4 commandes attendues");
  assert.ok(
    result.orders.every((o) => o.currency === "XPF"),
    "chaque commande doit exposer currency='XPF'",
  );
});

// SHIAAAAAAAAAAAAAAAAAAAAAAAA-240 — GET /orders expose clientEmail
test("GET /orders exposes clientEmail resolved from each order's userId", async () => {
  const result = await get("/orders");
  const byId = Object.fromEntries(result.orders.map((o) => [o.id, o]));
  assert.equal(byId[101].clientEmail, "teiki@example.pf", "order 101 belongs to user 2 (Teiki)");
  assert.equal(byId[103].clientEmail, "manoa@example.pf", "order 103 belongs to user 3 (Manoa)");
});

test("GET /orders sets clientEmail to null when no user is found", async () => {
  const result = await get("/orders");
  assert.ok(
    result.orders.every((o) => "clientEmail" in o),
    "every enriched order must expose a clientEmail field",
  );
});

// SHIAAAAAAAAAAAAAAAAAAAAAAAA-23 — filtre customerName

test("filterByCustomerName exclut les commandes dont clientName est null", () => {
  const { filterByCustomerName } = require("../src/routes/orders");
  const sample = [
    { id: 1, clientName: "Teiki" },
    { id: 2, clientName: null },
    { id: 3, clientName: "Manoa" },
  ];
  const result = filterByCustomerName(sample, "a");
  assert.deepEqual(
    result.map((o) => o.id),
    [3],
    "les commandes avec clientName null doivent être exclues",
  );
});

// SHIAAAAAAAAAAAAAAAAAAAAAAAA-289 — le champ clientName peut être absent (undefined), pas seulement null
test("filterByCustomerName ne plante pas si clientName est absent (undefined)", () => {
  const { filterByCustomerName } = require("../src/routes/orders");
  const sample = [
    { id: 1 },
    { id: 2 },
    { id: 3 },
  ];
  assert.doesNotThrow(
    () => filterByCustomerName(sample, "teiki"),
    "filterByCustomerName ne doit pas lever d'exception sur des commandes sans champ clientName",
  );
  assert.deepEqual(filterByCustomerName(sample, "teiki"), [], "doit retourner [] si aucune commande n'a clientName");
});

test("GET /orders?customerName=teiki retourne uniquement les commandes de Teiki", async () => {
  const result = await get("/orders?customerName=teiki");
  const ids = result.orders.map((o) => o.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [101, 102], "filtre insensible à la casse doit trouver commandes 101 et 102");
});

test("GET /orders?customerName=zzz retourne 200 et liste vide", async () => {
  const result = await get("/orders?customerName=zzz");
  assert.deepEqual(result.orders, [], "aucun résultat doit retourner []");
});

test("GET /orders sans customerName conserve le comportement actuel (4 commandes)", async () => {
  const result = await get("/orders");
  assert.equal(result.orders.length, 4, "sans customerName toutes les commandes sont retournées");
});

test("GET /orders?customerName=manoa&status=paid retourne uniquement la commande 103", async () => {
  const result = await get("/orders?customerName=manoa&status=paid");
  const ids = result.orders.map((o) => o.id);
  assert.deepEqual(ids, [103], "composition customerName + status doit affiner le résultat");
});

// SHIAAAAAAAAAAAAAAAAAAAAAAAA-249 — pagination de GET /orders

test("GET /orders retourne un objet paginé avec les champs orders et pagination", async () => {
  const result = await get("/orders");
  assert.ok(Array.isArray(result.orders), "orders doit être un tableau");
  assert.ok(typeof result.pagination === "object" && result.pagination !== null, "pagination doit être un objet");
  assert.ok(typeof result.pagination.total === "number", "pagination.total doit être un nombre");
  assert.ok(typeof result.pagination.page === "number", "pagination.page doit être un nombre");
  assert.ok(typeof result.pagination.limit === "number", "pagination.limit doit être un nombre");
  assert.ok(typeof result.pagination.totalPages === "number", "pagination.totalPages doit être un nombre");
});

test("GET /orders sans page/limit retourne page=1, limit=20, total=4, totalPages=1", async () => {
  const result = await get("/orders");
  assert.deepEqual(result.pagination, { total: 4, page: 1, limit: 20, totalPages: 1 });
});

test("GET /orders?page=2&limit=2 retourne les éléments 3 et 4 avec la bonne pagination", async () => {
  // Sans tri, ordre naturel : 101, 102, 103, 104 — page 2, limit 2 → [103, 104]
  const result = await get("/orders?page=2&limit=2");
  assert.deepEqual(result.pagination, { total: 4, page: 2, limit: 2, totalPages: 2 });
  const ids = result.orders.map((o) => o.id);
  assert.deepEqual(ids, [103, 104], "page 2 limit 2 doit retourner id103 et id104");
});

test("GET /orders?page=1&limit=2 retourne les 2 premiers éléments", async () => {
  const result = await get("/orders?page=1&limit=2");
  assert.deepEqual(result.pagination, { total: 4, page: 1, limit: 2, totalPages: 2 });
  const ids = result.orders.map((o) => o.id);
  assert.deepEqual(ids, [101, 102], "page 1 limit 2 doit retourner id101 et id102");
});

test("GET /orders?page=99 (au-delà de totalPages) retourne orders vide avec pagination correcte", async () => {
  const result = await get("/orders?page=99&limit=20");
  assert.deepEqual(result.orders, [], "une page au-delà du total doit retourner un tableau vide");
  assert.equal(result.pagination.total, 4);
  assert.equal(result.pagination.page, 99);
  assert.equal(result.pagination.totalPages, 1);
});

test("GET /orders?page=0 clamp à page=1", async () => {
  const result = await get("/orders?page=0");
  assert.equal(result.pagination.page, 1, "page=0 doit être clampé à 1");
});

test("GET /orders?page=-5 clamp à page=1", async () => {
  const result = await get("/orders?page=-5");
  assert.equal(result.pagination.page, 1, "page négative doit être clampée à 1");
});

test("GET /orders?page=abc clamp à page=1", async () => {
  const result = await get("/orders?page=abc");
  assert.equal(result.pagination.page, 1, "page non entière doit être clampée à 1");
});

test("GET /orders?limit=0 clamp à limit=1", async () => {
  const result = await get("/orders?limit=0");
  assert.equal(result.pagination.limit, 1, "limit=0 doit être clampé à 1");
  assert.equal(result.pagination.total, 4);
});

test("GET /orders?limit=200 clamp à limit=100", async () => {
  const result = await get("/orders?limit=200");
  assert.equal(result.pagination.limit, 100, "limit > 100 doit être clampé à 100");
});

test("GET /orders?status=paid&page=1&limit=1 : filtres + pagination combinés", async () => {
  const result = await get("/orders?status=paid&page=1&limit=1");
  assert.equal(result.pagination.limit, 1);
  assert.ok(result.orders.every((o) => o.status === "paid"), "toutes les commandes doivent être paid");
  assert.equal(result.orders.length, 1, "limit=1 ne retourne qu'une commande par page");
});

test("GET /orders?sort=amount_asc&page=1&limit=2 : tri + pagination combinés", async () => {
  // amount_asc : 102(18), 104(30), 101(42), 103(96) — page 1, limit 2 → [102, 104]
  const result = await get("/orders?sort=amount_asc&page=1&limit=2");
  assert.deepEqual(result.orders.map((o) => o.id), [102, 104]);
  assert.deepEqual(result.pagination, { total: 4, page: 1, limit: 2, totalPages: 2 });
});

test("totalPages vaut au moins 1 même quand total=0", async () => {
  const result = await get("/orders?status=unknown");
  assert.equal(result.pagination.total, 0);
  assert.equal(result.pagination.totalPages, 1, "totalPages minimum est 1 même si total=0");
});

// SHIAAAAAAAAAAAAAAAAAAAAAAAA-310 — GET /orders/export.csv

// Helper: make a GET request and return raw response (status, headers, body string)
function getCsvResponse(path) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}${path}`, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          server.close(() => resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf-8"),
          }));
        });
      }).on("error", (err) => {
        server.close(() => reject(err));
      });
    });
  });
}

test("GET /orders/export.csv sans filtre retourne BOM + en-tête + 4 lignes de données", async () => {
  const { body } = await getCsvResponse("/orders/export.csv");
  // BOM présent en premier caractère
  assert.equal(body.charCodeAt(0), 0xFEFF, "le fichier doit commencer par le BOM \\uFEFF");
  const lines = body.replace(/^﻿/, "").split("\r\n").filter((l) => l.length > 0);
  assert.equal(lines[0], "id;date;clientName;clientEmail;montant;devise;statut", "en-tête CSV incorrect");
  assert.equal(lines.length - 1, 4, "4 lignes de données attendues (toutes les commandes)");
});

test("GET /orders/export.csv retourne Content-Type text/csv et Content-Disposition avec la date", async () => {
  const { statusCode, headers } = await getCsvResponse("/orders/export.csv");
  assert.equal(statusCode, 200, "le statut HTTP doit être 200");
  assert.ok(
    headers["content-type"] && headers["content-type"].startsWith("text/csv"),
    "Content-Type doit commencer par text/csv",
  );
  assert.ok(
    headers["content-disposition"] && headers["content-disposition"].startsWith("attachment; filename="),
    "Content-Disposition doit être attachment avec filename",
  );
  // La date dans le nom de fichier doit être au format YYYY-MM-DD
  const match = /filename="commandes-(\d{4}-\d{2}-\d{2})\.csv"/.exec(headers["content-disposition"]);
  assert.ok(match, "le filename doit être commandes-YYYY-MM-DD.csv");
});

test("GET /orders/export.csv?status=paid retourne uniquement les commandes paid", async () => {
  const { body } = await getCsvResponse("/orders/export.csv?status=paid");
  const lines = body.replace(/^﻿/, "").split("\r\n").filter((l) => l.length > 0);
  // ligne 0 = en-tête, lignes suivantes = données
  const dataLines = lines.slice(1);
  assert.ok(dataLines.length > 0, "au moins une commande paid attendue");
  for (const line of dataLines) {
    const cols = line.split(";");
    // statut est le 7ème champ (index 6)
    assert.equal(cols[6], "paid", `chaque ligne doit avoir statut=paid, reçu : ${cols[6]}`);
  }
});

test("GET /orders/export.csv?from=2024-01-01&to=2024-12-31 retourne les 4 commandes (toutes en 2024)", async () => {
  const { body } = await getCsvResponse("/orders/export.csv?from=2024-01-01&to=2024-12-31");
  const lines = body.replace(/^﻿/, "").split("\r\n").filter((l) => l.length > 0);
  assert.equal(lines.length - 1, 4, "toutes les commandes sont en 2024 : 4 lignes attendues");
});

test("GET /orders/export.csv?from=2024-02-01&to=2024-03-31 retourne uniquement id102 et id103", async () => {
  const { body } = await getCsvResponse("/orders/export.csv?from=2024-02-01&to=2024-03-31");
  const lines = body.replace(/^﻿/, "").split("\r\n").filter((l) => l.length > 0);
  const ids = lines.slice(1).map((l) => Number(l.split(";")[0])).sort((a, b) => a - b);
  assert.deepEqual(ids, [102, 103], "la plage fév–mars doit inclure uniquement id102 et id103");
});

test("GET /orders/export.csv chaque ligne contient les bons champs pour chaque commande", async () => {
  const { body } = await getCsvResponse("/orders/export.csv");
  const lines = body.replace(/^﻿/, "").split("\r\n").filter((l) => l.length > 0);
  // Commande 101 : id=101, date=2024-01-10, clientName=Teiki, clientEmail=teiki@example.pf, montant=42, devise=XPF, statut=paid
  const line101 = lines.slice(1).find((l) => l.startsWith("101;"));
  assert.ok(line101, "commande 101 attendue dans l'export");
  const [id, date, clientName, clientEmail, montant, devise, statut] = line101.split(";");
  assert.equal(id, "101");
  assert.equal(date, "2024-01-10");
  assert.equal(clientName, "Teiki");
  assert.equal(clientEmail, "teiki@example.pf");
  assert.equal(montant, "42");
  assert.equal(devise, "XPF");
  assert.equal(statut, "paid");
});

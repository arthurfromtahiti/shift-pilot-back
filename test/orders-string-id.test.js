// SHIAAAAAAAAAAAAAAAAAAAAAAAA-680 — Reproduction : identifiant en chaine rejeté à tort
// Ces tests doivent ECHOUER avant le correctif et PASSER après.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { getOrderById, cancelOrder } = require("../src/routes/orders");

// ── getOrderById ──────────────────────────────────────────────────────────────

test("getOrderById('101') renvoie la meme commande que getOrderById(101)", () => {
  const byNum = getOrderById(101);
  const byStr = getOrderById("101");
  assert.ok(byNum !== null, "getOrderById(101) doit retourner une commande");
  assert.deepEqual(byStr, byNum, "getOrderById('101') doit renvoyer la meme commande que getOrderById(101)");
});

test("getOrderById('abc') renvoie null sans lever", () => {
  assert.doesNotThrow(() => getOrderById("abc"));
  assert.equal(getOrderById("abc"), null);
});

test("getOrderById(null) renvoie null sans lever", () => {
  assert.doesNotThrow(() => getOrderById(null));
  assert.equal(getOrderById(null), null);
});

// ── cancelOrder ───────────────────────────────────────────────────────────────

test("cancelOrder('101') se comporte comme cancelOrder(101) — retourne 200", () => {
  const result = cancelOrder("101");
  assert.equal(result.status, 200, "cancelOrder('101') doit retourner status 200 (commande paid)");
});

test("cancelOrder('102') retourne 409 (deja annulee)", () => {
  const result = cancelOrder("102");
  assert.equal(result.status, 409, "cancelOrder('102') doit retourner 409");
  assert.deepEqual(result.body, { error: "Order already cancelled" });
});

test("cancelOrder('9999') retourne 404 (commande introuvable)", () => {
  const result = cancelOrder("9999");
  assert.equal(result.status, 404, "cancelOrder('9999') doit retourner 404");
  assert.deepEqual(result.body, { error: "Not found" });
});

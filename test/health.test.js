// SHIAAAAAAAAAAAAAAAAAAAAAAAA-598 — Tests d'acceptation : GET /health

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const server = require("../src/server");

function getWithStatus(path) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}${path}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close(() => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
      }).on("error", (err) => {
        server.close(() => reject(err));
      });
    });
  });
}

test("GET /health retourne 200 avec { status: 'ok' }", async () => {
  const { status, body } = await getWithStatus("/health");
  assert.equal(status, 200, "doit retourner HTTP 200");
  assert.deepEqual(body, { status: "ok" }, "le corps doit être { status: 'ok' }");
});

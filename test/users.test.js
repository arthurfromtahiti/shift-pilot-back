const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const server = require("../src/server");

function request(path) {
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

test("GET /users/:id returns 200 and the user when id exists", async () => {
  const { status, body } = await request("/users/1");
  assert.equal(status, 200);
  assert.equal(body.id, 1);
  assert.equal(body.name, "Heiata");
});

test("GET /users/:id returns 404 and error when id does not exist", async () => {
  const { status, body } = await request("/users/999");
  assert.equal(status, 404);
  assert.deepEqual(body, { error: "Not found" });
});

test("GET /users/:id does not match sub-paths", async () => {
  const { status } = await request("/users/1/profile");
  assert.equal(status, 404, "sub-path /users/1/profile must not match the :id route");
});

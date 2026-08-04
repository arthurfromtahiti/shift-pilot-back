const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("eslint passe sans erreur sur l'ensemble du code source", () => {
  const eslintBin = path.join(__dirname, "..", "node_modules", ".bin", "eslint");
  const result = spawnSync(eslintBin, ["."], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `ESLint a retourné le code ${result.status}:\n${result.stdout}${result.stderr}`,
  );
});

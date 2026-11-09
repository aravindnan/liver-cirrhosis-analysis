require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

// Every data route must refuse unauthenticated callers. Models are only required, never connected.
const app = express();
app.use(express.json());
["auth", "user", "report", "mri"].forEach((name) => app.use(require(`../routes/${name}`)));

const request = (server, method, path) =>
  new Promise((resolve, reject) => {
    const req = http.request({ port: server.address().port, method, path }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.end();
  });

test("protected routes return 401 without credentials, and the wipe route no longer exists", async () => {
  const server = app.listen(0);
  try {
    const id = "3f2b8c1e-9a4d-4e57-8b6a-1c2d3e4f5a6b";
    const protectedRoutes = [
      ["GET", `/get-user-by-id/${id}`],
      ["POST", `/add-files-to-report/${id}`],
      ["POST", "/analyze-report"],
      ["GET", "/get-trends"],
      ["GET", `/get-report-by-id/${id}`],
      ["DELETE", `/delete-report-by-id/${id}`],
      ["POST", `/analyze-mri/${id}`],
      ["GET", `/get-mri-by-id/${id}`],
      ["DELETE", `/delete-mri-by-id/${id}`],
      ["POST", "/logout"],
    ];
    for (const [method, path] of protectedRoutes) {
      assert.equal(await request(server, method, path), 401, `${method} ${path}`);
    }
    assert.equal(await request(server, "DELETE", "/delete-all-data"), 404);
  } finally {
    server.close();
  }
});

test("server refuses to start without required configuration", () => {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync(process.execPath, ["-e", "require('./env/dotenv')"], {
    cwd: require("node:path").join(__dirname, ".."),
    env: { PATH: process.env.PATH },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required environment variable/);
});

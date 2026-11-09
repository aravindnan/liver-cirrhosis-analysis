require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const { createAuthLimiter } = require("../middleware/rateLimit");

test("the limiter allows the configured number of attempts, then answers 429 with a clear message", async () => {
  const app = express();
  app.post("/login", createAuthLimiter(3), (req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  const post = () => new Promise((resolve, reject) => {
    const req = http.request({ port: server.address().port, method: "POST", path: "/login" }, (res) => {
      let data = ""; res.on("data", (c) => (data += c)); res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data), retry: res.headers["retry-after"] }));
    });
    req.on("error", reject); req.end();
  });
  try {
    const statuses = [];
    let last;
    for (let i = 0; i < 5; i += 1) { last = await post(); statuses.push(last.status); }
    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
    assert.match(last.body.error, /Too many attempts/);
    assert.ok(last.retry, "tells the client when to retry");
  } finally {
    server.close();
  }
});

test("the app default is 20 attempts per window", () => {
  delete require.cache[require.resolve("../env/dotenv")];
  const saved = process.env.AUTH_RATE_LIMIT;
  delete process.env.AUTH_RATE_LIMIT;
  assert.equal(require("../env/dotenv").AUTH_RATE_LIMIT, 20);
  process.env.AUTH_RATE_LIMIT = saved;
  delete require.cache[require.resolve("../env/dotenv")];
});

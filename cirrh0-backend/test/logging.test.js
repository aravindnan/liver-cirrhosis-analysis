require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { Writable } = require("node:stream");
const { buildLogger, safeError, requestId } = require("../utils/logger");

const capture = () => {
  const lines = [];
  const stream = new Writable({ write(chunk, _enc, cb) { lines.push(chunk.toString()); cb(); } });
  return { lines, stream };
};

test("credentials and personal fields are redacted from logs", () => {
  const { lines, stream } = capture();
  const log = buildLogger(stream, { level: "info" });
  log.info({
    req: { headers: { authorization: "Bearer secret-token", cookie: "cirrh0_session=secret-cookie" } },
    user: { password: "hunter2", token: "t0ken", email: "a@b.co" },
  }, "x");
  const out = lines.join("");
  for (const secret of ["secret-token", "secret-cookie", "hunter2", "t0ken", "a@b.co"]) {
    assert.ok(!out.includes(secret), `${secret} leaked`);
  }
  assert.match(out, /\[redacted\]/);
});

test("safeError drops request bodies that axios attaches to its errors", () => {
  const axiosLike = Object.assign(new Error("Request failed with status code 500"), {
    name: "AxiosError", code: "ERR_BAD_RESPONSE",
    config: { data: '{"bilirubin":1.2,"sgot":40}' },
    response: { status: 500, data: { patient: "Asha" } },
  });
  const out = JSON.stringify(safeError(axiosLike));
  assert.ok(!out.includes("bilirubin") && !out.includes("Asha"));
  assert.match(out, /ERR_BAD_RESPONSE/);
  assert.match(out, /500/);
});

test("request ids: a well-formed incoming id is reused, anything else is replaced", () => {
  const headers = {};
  const res = { setHeader: (k, v) => { headers[k] = v; } };
  assert.equal(requestId({ headers: { "x-request-id": "trace-12345678" } }, res), "trace-12345678");
  const generated = requestId({ headers: { "x-request-id": "bad id with spaces & <script>" } }, res);
  assert.match(generated, /^[0-9a-f-]{36}$/);
  assert.equal(headers["X-Request-Id"], generated);
});

test("the app returns a request id header, JSON errors and no stack traces", async () => {
  const app = require("../app");
  const server = app.listen(0);
  const call = (opts, body) => new Promise((resolve, reject) => {
    const req = http.request({ port: server.address().port, ...opts }, (res) => {
      let data = ""; res.on("data", (c) => (data += c)); res.on("end", () => resolve({ res, data }));
    });
    req.on("error", reject); if (body) req.write(body); req.end();
  });
  try {
    const missing = await call({ method: "GET", path: "/nope" });
    assert.equal(missing.res.statusCode, 404);
    assert.ok(missing.res.headers["x-request-id"]);

    const badJson = await call({ method: "POST", path: "/login", headers: { "Content-Type": "application/json" } }, "{not json");
    assert.equal(badJson.res.statusCode, 400);
    assert.deepEqual(JSON.parse(badJson.data), { error: "Invalid JSON body" });

    const big = await call({ method: "POST", path: "/login", headers: { "Content-Type": "application/json" } }, JSON.stringify({ x: "a".repeat(200 * 1024) }));
    assert.equal(big.res.statusCode, 413);

    const evil = await call({ method: "GET", path: "/nope", headers: { Origin: "https://evil.example" } });
    assert.equal(evil.res.statusCode, 403);
    assert.ok(!evil.data.includes("at "), "no stack trace in the response");
    assert.equal(missing.res.headers["x-powered-by"], undefined);
  } finally {
    server.close();
  }
});

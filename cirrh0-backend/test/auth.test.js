require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { requireAuth, requireSelf, setSessionCookie } = require("../middleware/auth");

const SECRET = process.env.SECRET_KEY;
const ID = "64b7f0f2a1b2c3d4e5f60718";
const sign = (payload = { _id: ID }, opts = { expiresIn: "2h" }, key = SECRET) => jwt.sign(payload, key, opts);

// Runs the middleware against a fake request and reports what happened.
const run = (mw, req) => {
  const out = { nexted: false };
  const res = {
    status(code) { out.status = code; return this; },
    json(body) { out.body = body; return this; },
  };
  mw(req, res, () => { out.nexted = true; });
  return out;
};
const cookie = (token) => `other=1; cirrh0_session=${encodeURIComponent(token)}`;

test("rejects requests with no credentials", () => {
  const out = run(requireAuth, { method: "GET", headers: {} });
  assert.equal(out.status, 401);
});

test("accepts a valid session cookie on a safe method and sets req.userId", () => {
  const req = { method: "GET", headers: { cookie: cookie(sign()) } };
  assert.equal(run(requireAuth, req).nexted, true);
  assert.equal(req.userId, ID);
});

test("cookie + state-changing request needs an allowed Origin (CSRF)", () => {
  const headers = { cookie: cookie(sign()) };
  assert.equal(run(requireAuth, { method: "POST", headers: { ...headers, origin: "http://localhost:3000" } }).nexted, true);
  assert.equal(run(requireAuth, { method: "POST", headers: { ...headers, origin: "https://evil.example" } }).status, 403);
  assert.equal(run(requireAuth, { method: "POST", headers }).status, 403);
  assert.equal(run(requireAuth, { method: "DELETE", headers: { ...headers, origin: "https://evil.example" } }).status, 403);
});

test("Bearer tokens work without an Origin header", () => {
  const req = { method: "POST", headers: { authorization: `Bearer ${sign()}` } };
  assert.equal(run(requireAuth, req).nexted, true);
  assert.equal(req.userId, ID);
});

test("rejects expired, tampered, wrong-key and malformed tokens", () => {
  const bad = [
    sign({ _id: ID }, { expiresIn: -10 }),
    sign().slice(0, -2) + "xx",
    sign({ _id: ID }, { expiresIn: "2h" }, "k".repeat(48)),
    "not-a-token",
    sign({ _id: "not-an-object-id" }),
    sign({}),
  ];
  for (const token of bad) {
    assert.equal(run(requireAuth, { method: "GET", headers: { authorization: `Bearer ${token}` } }).status, 401);
  }
});

test("rejects tokens signed with the none algorithm", () => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ _id: ID })).toString("base64url");
  const out = run(requireAuth, { method: "GET", headers: { authorization: `Bearer ${header}.${body}.` } });
  assert.equal(out.status, 401);
});

test("requireSelf only lets a user act on their own id", () => {
  assert.equal(run(requireSelf, { params: { userId: ID }, userId: ID }).nexted, true);
  assert.equal(run(requireSelf, { params: { userId: "64b7f0f2a1b2c3d4e5f60999" }, userId: ID }).status, 403);
});

test("session cookie is HttpOnly with the expected attributes", () => {
  let captured;
  setSessionCookie({ cookie: (name, value, options) => { captured = { name, options }; } }, "tok");
  assert.equal(captured.name, "cirrh0_session");
  assert.equal(captured.options.httpOnly, true);
  assert.equal(captured.options.sameSite, "lax");
  assert.equal(captured.options.maxAge, 2 * 60 * 60 * 1000);
});

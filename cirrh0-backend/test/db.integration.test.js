// Runs the real API against a real PostgreSQL. Needs TEST_DATABASE_URL (with migrations applied:
// `npm run db:migrate`) and skips otherwise. It DELETES ALL DATA in that database.
require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { db } = require("../db/client");
const ml = require("../utils/mlClient");

const URL_ = process.env.TEST_DATABASE_URL;
const enabled = Boolean(URL_);
if (enabled && !/test/i.test(new URL(URL_).pathname)) {
  throw new Error("Refusing to run: TEST_DATABASE_URL must point at a database whose name contains 'test'");
}
const it = enabled ? test : test.skip;

const app = require("../app");
const { deleteExpiredDrafts } = require("../utils/drafts");

const ORIGIN = "http://localhost:3000";
let server;
let base;
let mlHandler;

test.before(async () => {
  if (!enabled) return;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  test.mock.method(ml, "post", async (url, body) => ({ data: await mlHandler(url, body) }));
});
test.after(async () => {
  if (!enabled) return;
  server.close();
  await db.$disconnect();
});
test.beforeEach(async () => {
  if (!enabled) return;
  await db.$executeRawUnsafe("TRUNCATE TABLE image_analyses, report_analyses, users RESTART IDENTITY CASCADE");
  mlHandler = async (url) => {
    if (url.endsWith("/predict")) {
      return { stage: 3, model_version: "m-test", analysis: "text", lifestyle_recommendations: ["walk"], precautions: ["rest"], self_treatment_plan: ["eat"], doctor_type: ["Hepatologist"] };
    }
    if (url.endsWith("/extract")) return { bilirubin: "1.1", albumin: "4.0" };
    return { analysis: "findings", diagnosis: ["steatosis"], lifestyle_recommendations: [], precautions: [], medical_treatments: [], doctor_type: ["Hepatologist"] };
  };
});

// ---- helpers ------------------------------------------------------------------------
const call = async (method, path, { body, cookie } = {}) => {
  const headers = { Origin: ORIGIN };
  if (body) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
};

const user = (n) => ({ username: `user${n}`, email: `User${n}@Example.com`, password: "correct-horse-1", fullName: `User ${n}`, gender: "female", age: 50 });
const register = (n) => call("POST", "/register", { body: user(n) });
const login = async (n) => {
  const res = await call("POST", "/login", { body: { username: `user${n}`, password: "correct-horse-1" } });
  const cookie = (res.headers.getSetCookie()[0] || "").split(";")[0];
  return { res, cookie, id: res.json && res.json.userId };
};
const signIn = async (n) => { assert.equal((await register(n)).status, 201); return login(n); };

const labs = {
  age: 55, sex: "male", ascites: "N", edema: "N", spiders: "N", hepatomegaly: "Y",
  bilirubin: 1.2, albumin: 3.8, prothrombin: 11, copper: 80, alk_phos: 300, platelets: 200,
  sgot: 40, tryglycerides: 120, cholesterol: 180, alt: 36,
};
const analyze = (cookie, extra = {}) => call("POST", "/analyze-report", { cookie, body: { reportId: "new-report", validatedData: { ...labs, ...extra } } });

// ---- database rules -------------------------------------------------------------------
it("the stage range and lowercase-email rules are enforced by the database itself", async () => {
  const u = await db.user.create({ data: { username: "a", email: "a@x.co", passwordHash: "h", fullName: "A" } });
  await assert.rejects(db.reportAnalysis.create({ data: { userId: u.id, stage: 9 } }), /./);
  await assert.rejects(db.reportAnalysis.create({ data: { userId: u.id, age: 500 } }), /./);
  await assert.rejects(db.user.create({ data: { username: "b", email: "B@X.CO", passwordHash: "h", fullName: "B" } }), /./);
  assert.equal(await db.reportAnalysis.count(), 0);
});

it("usernames and emails are unique", async () => {
  await db.user.create({ data: { username: "a", email: "a@x.co", passwordHash: "h", fullName: "A" } });
  await assert.rejects(db.user.create({ data: { username: "a", email: "other@x.co", passwordHash: "h", fullName: "A" } }), /./);
  await assert.rejects(db.user.create({ data: { username: "c", email: "a@x.co", passwordHash: "h", fullName: "C" } }), /./);
});

it("deleting a user deletes their analyses (cascade) and no one else's", async () => {
  const [a, b] = await Promise.all([1, 2].map((n) => db.user.create({ data: { username: `u${n}`, email: `u${n}@x.co`, passwordHash: "h", fullName: "U" } })));
  for (const u of [a, b]) {
    await db.reportAnalysis.create({ data: { userId: u.id, stage: 2 } });
    await db.imageAnalysis.create({ data: { userId: u.id, analysis: "x" } });
  }
  await db.user.delete({ where: { id: a.id } });
  assert.equal(await db.reportAnalysis.count(), 1);
  assert.equal(await db.imageAnalysis.count(), 1);
  assert.equal((await db.reportAnalysis.findFirst()).userId, b.id);
});

it("an analysis cannot exist without an owner", async () => {
  await assert.rejects(db.reportAnalysis.create({ data: { userId: "3f2b8c1e-9a4d-4e57-8b6a-1c2d3e4f5a6b", stage: 1 } }), /./);
});

it("array columns, JSON scores and timestamps round-trip", async () => {
  const u = await db.user.create({ data: { username: "a", email: "a@x.co", passwordHash: "h", fullName: "A" } });
  const r = await db.reportAnalysis.create({ data: { userId: u.id, files: ["https://a", "https://b"], doctorType: ["x"], scores: [{ id: "fib4", value: 1.5 }] } });
  const back = await db.reportAnalysis.findUnique({ where: { id: r.id } });
  assert.deepEqual(back.files, ["https://a", "https://b"]);
  assert.deepEqual(back.scores, [{ id: "fib4", value: 1.5 }]);
  assert.ok(back.createdAt instanceof Date && back.updatedAt instanceof Date);
  assert.deepEqual(back.precautions, []); // default
});

// ---- accounts and sessions --------------------------------------------------------------
it("register, login and fetch the profile, with no password hash or token in any response", async () => {
  const reg = await register(1);
  assert.equal(reg.status, 201);
  const { res, cookie, id } = await login(1);
  assert.equal(res.status, 200);
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.ok(cookie.startsWith("cirrh0_session="));
  assert.match(res.headers.getSetCookie()[0], /HttpOnly/i);
  assert.ok(!JSON.stringify(res.json).includes("eyJ"), "no token in the body");

  const profile = await call("GET", `/get-user-by-id/${id}`, { cookie });
  assert.equal(profile.status, 200);
  assert.equal(profile.json.id, id);
  assert.equal(profile.json.email, "user1@example.com"); // stored lower-case
  assert.deepEqual(profile.json.reportAnalysisSet, []);
  const text = JSON.stringify(profile.json);
  assert.ok(!/password|\$2[aby]\$/i.test(text), "no password hash in the profile");
});

it("duplicate usernames and emails are rejected, email case-insensitively", async () => {
  await register(1);
  const dupName = await call("POST", "/register", { body: { ...user(1), email: "different@x.co" } });
  assert.equal(dupName.status, 400);
  assert.match(dupName.json.error, /Username/);
  const dupEmail = await call("POST", "/register", { body: { ...user(2), email: "USER1@EXAMPLE.COM" } });
  assert.equal(dupEmail.status, 400);
  assert.match(dupEmail.json.error, /Email/);
});

it("two sign-ups racing for the same username: exactly one wins, the other gets a clean 400", async () => {
  const results = await Promise.all([1, 2, 3, 4].map((n) => call("POST", "/register", { body: { ...user(n), username: "racer", email: `race${n}@x.co` } })));
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 400, 400, 400]);
  assert.equal(await db.user.count(), 1);
});

it("unknown user and wrong password give the same response", async () => {
  await register(1);
  const wrong = await call("POST", "/login", { body: { username: "user1", password: "wrong-password" } });
  const unknown = await call("POST", "/login", { body: { username: "nobody", password: "wrong-password" } });
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong.json, unknown.json);
});

it("login records the time of last login", async () => {
  await register(1);
  const before = await db.user.findUnique({ where: { username: "user1" } });
  assert.equal(before.lastLoginAt, null);
  await login(1);
  assert.ok((await db.user.findUnique({ where: { username: "user1" } })).lastLoginAt instanceof Date);
});

it("a user cannot read another user's profile", async () => {
  const a = await signIn(1);
  const b = await signIn(2);
  assert.equal((await call("GET", `/get-user-by-id/${b.id}`, { cookie: a.cookie })).status, 403);
  assert.equal((await call("GET", `/get-user-by-id/${b.id}`)).status, 401);
});

it("a legacy MongoDB-style id is not accepted as a user id", async () => {
  const a = await signIn(1);
  assert.equal((await call("GET", "/get-user-by-id/64b7f0f2a1b2c3d4e5f60718", { cookie: a.cookie })).status, 403);
});

// ---- analyses ---------------------------------------------------------------------------
it("analyse a report, then see it in the profile, the trends and by id", async () => {
  const { cookie, id } = await signIn(1);
  const res = await analyze(cookie);
  assert.equal(res.status, 200);
  assert.equal(res.json.modelAvailable, true);
  const reportId = res.json.reportId;
  assert.equal(res.json.reportResult.userId, id);
  assert.equal(res.json.reportResult.alk_phos, 300);
  assert.equal(res.json.reportResult.tryglycerides, 120);
  assert.equal(res.json.reportResult.stage, 3);
  assert.equal(res.json.reportResult.scores.length, 3);

  const profile = await call("GET", `/get-user-by-id/${id}`, { cookie });
  assert.equal(profile.json.reportAnalysisSet.length, 1);
  assert.equal(profile.json.reportAnalysisSet[0].id, reportId);

  const trends = await call("GET", "/get-trends", { cookie });
  assert.equal(trends.json.points.length, 1);
  assert.equal(trends.json.points[0].scores.fib4.value, 1.83);
  assert.equal(trends.json.points[0].labs.alk_phos, 300);

  const one = await call("GET", `/get-report-by-id/${reportId}`, { cookie });
  assert.equal(one.json.report.id, reportId);
});

it("one user's reports are invisible to, and undeletable by, another", async () => {
  const a = await signIn(1);
  const b = await signIn(2);
  const reportId = (await analyze(a.cookie)).json.reportId;

  assert.equal((await call("GET", `/get-report-by-id/${reportId}`, { cookie: b.cookie })).status, 404);
  assert.equal((await call("DELETE", `/delete-report-by-id/${reportId}`, { cookie: b.cookie })).status, 404);
  assert.equal((await call("POST", "/analyze-report", { cookie: b.cookie, body: { reportId, validatedData: labs } })).status, 404);
  assert.equal((await call("GET", "/get-trends", { cookie: b.cookie })).json.points.length, 0);
  assert.equal(await db.reportAnalysis.count(), 1, "the report is still there");

  assert.equal((await call("DELETE", `/delete-report-by-id/${reportId}`, { cookie: a.cookie })).status, 200);
  assert.equal(await db.reportAnalysis.count(), 0);
});

it("a model outage saves the scores and no stage, and the profile still lists the report", async () => {
  const { cookie, id } = await signIn(1);
  mlHandler = async () => { throw new Error("ML down"); };
  const res = await analyze(cookie);
  assert.equal(res.status, 200);
  assert.equal(res.json.modelAvailable, false);
  assert.equal(res.json.reportResult.stage, null);
  assert.equal(res.json.reportResult.scores.length, 3);
  assert.equal((await call("GET", `/get-user-by-id/${id}`, { cookie })).json.reportAnalysisSet.length, 1);
});

it("re-analysing a report while the model is down clears the old stage", async () => {
  const { cookie } = await signIn(1);
  const reportId = (await analyze(cookie)).json.reportId;
  mlHandler = async () => { throw new Error("ML down"); };
  const again = await call("POST", "/analyze-report", { cookie, body: { reportId, validatedData: { ...labs, bilirubin: 3 } } });
  assert.equal(again.json.reportResult.stage, null);
  assert.equal(again.json.reportResult.bilirubin, 3);
  assert.deepEqual(again.json.reportResult.doctor_type, []);
});

it("extracted files make a hidden draft that analysis completes", async () => {
  const { cookie, id } = await signIn(1);
  const ext = await call("POST", `/add-files-to-report/${id}`, { cookie, body: { fileURLSet: ["https://res.cloudinary.com/demo/a.pdf"] } });
  assert.equal(ext.status, 200);
  const draftId = ext.json.reportId;

  assert.equal((await call("GET", `/get-user-by-id/${id}`, { cookie })).json.reportAnalysisSet.length, 0, "drafts are hidden from history");
  assert.equal((await call("GET", "/get-trends", { cookie })).json.points.length, 0, "and from trends");
  const draft = await db.reportAnalysis.findUnique({ where: { id: draftId } });
  assert.ok(draft.draftExpiresAt > new Date());

  const done = await call("POST", "/analyze-report", { cookie, body: { reportId: draftId, validatedData: labs } });
  assert.equal(done.json.reportId, draftId);
  assert.equal((await db.reportAnalysis.findUnique({ where: { id: draftId } })).draftExpiresAt, null);
  assert.equal((await call("GET", `/get-user-by-id/${id}`, { cookie })).json.reportAnalysisSet.length, 1);
  assert.deepEqual((await db.reportAnalysis.findUnique({ where: { id: draftId } })).files, ["https://res.cloudinary.com/demo/a.pdf"]);
});

it("expired drafts are deleted; completed reports and fresh drafts are kept", async () => {
  const { cookie, id } = await signIn(1);
  const completed = (await analyze(cookie)).json.reportId;
  const past = new Date(Date.now() - 60_000);
  const future = new Date(Date.now() + 3_600_000);
  const stale = await db.reportAnalysis.create({ data: { userId: id, draftExpiresAt: past } });
  const fresh = await db.reportAnalysis.create({ data: { userId: id, draftExpiresAt: future } });

  assert.equal(await deleteExpiredDrafts(db), 1);
  const left = (await db.reportAnalysis.findMany()).map((r) => r.id).sort();
  assert.deepEqual(left, [completed, fresh.id].sort());
  assert.ok(!left.includes(stale.id));
});

it("a failed extraction leaves no draft behind", async () => {
  const { cookie, id } = await signIn(1);
  mlHandler = async () => { throw new Error("ML down"); };
  const res = await call("POST", `/add-files-to-report/${id}`, { cookie, body: { fileURLSet: ["https://res.cloudinary.com/demo/a.pdf"] } });
  assert.equal(res.status, 502);
  assert.equal(await db.reportAnalysis.count(), 0);
});

it("trends are ordered by report date and capped to the caller's own", async () => {
  const a = await signIn(1);
  const b = await signIn(2);
  await db.reportAnalysis.createMany({ data: [
    { userId: a.id, date: new Date("2026-03-01"), age: 50, sgot: 40, alt: 36, platelets: 200, bilirubin: 1, albumin: 4 },
    { userId: a.id, date: new Date("2026-01-01"), age: 50, sgot: 30, alt: 30, platelets: 220, bilirubin: 0.8, albumin: 4.2 },
    { userId: b.id, date: new Date("2026-02-01"), age: 40, sgot: 99, alt: 99, platelets: 100, bilirubin: 5, albumin: 2 },
  ] });
  const { json } = await call("GET", "/get-trends", { cookie: a.cookie });
  assert.deepEqual(json.points.map((p) => p.labs.sgot), [30, 40]);
  // Compare values, not text: a random UUID can contain any digits, so searching the JSON for "99" is flaky.
  assert.ok(json.points.every((p) => p.labs.sgot !== 99 && p.labs.bilirubin !== 5), "no data from another user");
});

it("image analyses: create, read, and delete are scoped to the owner", async () => {
  const a = await signIn(1);
  const b = await signIn(2);
  const created = await call("POST", `/analyze-mri/${a.id}`, { cookie: a.cookie, body: { imageURL: "https://res.cloudinary.com/demo/slide.jpg", sex: "female", age: 50 } });
  assert.equal(created.status, 200);
  const mriId = created.json.mriId;
  assert.equal(created.json.mriResult.id, mriId);
  assert.deepEqual(created.json.mriResult.diagnosis, ["steatosis"]);

  assert.equal((await call("GET", `/get-mri-by-id/${mriId}`, { cookie: a.cookie })).json.mriReport.id, mriId);
  assert.equal((await call("GET", `/get-mri-by-id/${mriId}`, { cookie: b.cookie })).status, 404);
  assert.equal((await call("DELETE", `/delete-mri-by-id/${mriId}`, { cookie: b.cookie })).status, 404);
  assert.equal((await call("GET", `/get-user-by-id/${a.id}`, { cookie: a.cookie })).json.mriAnalysisSet.length, 1);
  assert.equal((await call("DELETE", `/delete-mri-by-id/${mriId}`, { cookie: a.cookie })).status, 200);
  assert.equal(await db.imageAnalysis.count(), 0);
});

it("posting as one user to another user's analyze-mri path is forbidden", async () => {
  const a = await signIn(1);
  const b = await signIn(2);
  const res = await call("POST", `/analyze-mri/${b.id}`, { cookie: a.cookie, body: { imageURL: "https://res.cloudinary.com/demo/slide.jpg" } });
  assert.equal(res.status, 403);
  assert.equal(await db.imageAnalysis.count(), 0);
});

it("/healthz reports ok against the real database", async () => {
  const res = await call("GET", "/healthz");
  assert.deepEqual([res.status, res.json], [200, { status: "ok" }]);
});

it("SQL-injection-shaped input is stored as plain text and does not break queries", async () => {
  const evil = "x'; DROP TABLE users; --";
  const res = await call("POST", "/register", { body: { ...user(1), fullName: evil } });
  assert.equal(res.status, 201);
  const { cookie, id } = await login(1);
  assert.equal((await call("GET", `/get-user-by-id/${id}`, { cookie })).json.fullName, evil);
  assert.equal(await db.user.count(), 1);
  const injectedLogin = await call("POST", "/login", { body: { username: "' OR '1'='1", password: "x" } });
  assert.equal(injectedLogin.status, 401);
});

it("a real Prisma validation error would expose patient values in its message, and the logger drops it", async () => {
  const { safeError } = require("../utils/logger");
  const u = await db.user.create({ data: { username: "a", email: "a@x.co", passwordHash: "h", fullName: "A" } });
  let caught;
  try { await db.reportAnalysis.create({ data: { userId: u.id, bilirubin: "not-a-number", analysis: "PATIENT-SECRET-TEXT" } }); } catch (e) { caught = e; }
  assert.ok(caught, "the invalid write is rejected");
  assert.match(caught.message, /PATIENT-SECRET-TEXT/, "this is why raw messages must never be logged");
  assert.ok(!JSON.stringify(safeError(caught)).includes("PATIENT-SECRET-TEXT"));
});

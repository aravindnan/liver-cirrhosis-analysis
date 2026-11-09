require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const ReportAnalysis = require("../model/reportsAnalysis");
const { buildTrends } = require("../utils/trends");
const { SCORE_THRESHOLDS } = require("../utils/scores");
const { get_trends } = require("../controller/reportController");

const ID = "64b7f0f2a1b2c3d4e5f60718";
const raw = (id, date, extra = {}) => ({ _id: id, date, age: 50, sgot: 40, platelets: 200, bilirubin: 1, albumin: 4, alk_phos: 120, ...extra });

test("points are ordered oldest first and carry labs and scores", () => {
  const { points } = buildTrends([raw("b", "2026-06-01T00:00:00Z"), raw("a", "2026-01-01T00:00:00Z", { alt: 36 })]);
  assert.deepEqual(points.map((p) => p.reportId), ["a", "b"]);
  assert.equal(points[0].labs.bilirubin, 1);
  assert.equal(points[0].labs.alt, 36);
  assert.equal(points[1].labs.alt, null);
});

test("older reports without stored scores get scores worked out from their lab values", () => {
  const { points } = buildTrends([raw("a", "2026-01-01T00:00:00Z", { alt: 36 })]);
  // FIB-4 = 50*40 / (200*6) = 1.67, APRI = (40/40)/200*100 = 0.5
  assert.equal(points[0].scores.fib4.value, 1.67);
  assert.equal(points[0].scores.fib4.band, "intermediate");
  assert.equal(points[0].scores.apri.value, 0.5);
  assert.ok(points[0].scores.albi.value < 0);
});

test("a missing ALT leaves FIB-4 empty but keeps APRI and ALBI", () => {
  const { points } = buildTrends([raw("a", "2026-01-01T00:00:00Z")]);
  assert.equal(points[0].scores.fib4, null);
  assert.ok(points[0].scores.apri);
  assert.ok(points[0].scores.albi);
});

test("stored scores are used as saved, even if formulas change later", () => {
  const stored = [{ id: "fib4", value: 9.99, band: "high" }, { id: "apri", value: 0.1, band: "low" }, { id: "albi", value: -3, band: "low" }];
  const { points } = buildTrends([raw("a", "2026-01-01T00:00:00Z", { alt: 36, scores: stored })]);
  assert.deepEqual(points[0].scores.fib4, { value: 9.99, band: "high" });
});

test("reports with no date or missing inputs are handled without errors", () => {
  const { points } = buildTrends([
    raw("nodate", undefined),
    raw("baddate", "not a date"),
    { _id: "sparse", date: "2026-02-01T00:00:00Z" }, // no lab values at all
  ]);
  assert.deepEqual(points.map((p) => p.reportId), ["sparse"]);
  assert.deepEqual(points[0].scores, { fib4: null, apri: null, albi: null });
  assert.equal(points[0].labs.sgot, null);
});

test("nothing from the database leaks into the response beyond ids, dates, labs and scores", () => {
  const { points } = buildTrends([raw("a", "2026-01-01T00:00:00Z", { alt: 36, userId: ID, files: ["https://x"], analysis: "private text", stage: 3 })]);
  assert.deepEqual(Object.keys(points[0]).sort(), ["date", "labs", "reportId", "scores"]);
  assert.ok(!JSON.stringify(points).includes("private text"));
  assert.ok(!JSON.stringify(points).includes("https://x"));
});

test("the response includes the score thresholds for chart reference lines", () => {
  assert.deepEqual(buildTrends([]).thresholds, SCORE_THRESHOLDS);
});

test("get_trends queries only the caller's completed reports and returns the series", async (t) => {
  let query; let sortArg; let limitArg;
  t.mock.method(ReportAnalysis, "find", (q) => {
    query = q;
    return { sort: (s) => { sortArg = s; return { limit: (n) => { limitArg = n; return { lean: async () => [raw("a", "2026-01-01T00:00:00Z", { alt: 36 })] }; } }; } };
  });
  let body;
  await get_trends({ userId: ID, log: { error() {} } }, { status() { return this; }, json(b) { body = b; } });
  assert.equal(query.userId, ID);
  assert.equal(query.draftExpiresAt, null);
  assert.deepEqual(sortArg, { date: 1 });
  assert.equal(limitArg, 200);
  assert.equal(body.points.length, 1);
});

test("a database failure returns a clean 500 and logs only a safe error", async (t) => {
  t.mock.method(ReportAnalysis, "find", () => { throw Object.assign(new Error("boom"), { config: { data: "secret lab values" } }); });
  const logged = []; let status; let body;
  await get_trends({ userId: ID, log: { error: (o) => logged.push(o) } }, { status(c) { status = c; return this; }, json(b) { body = b; } });
  assert.equal(status, 500);
  assert.deepEqual(body, { error: "Internal Server Error" });
  assert.ok(!JSON.stringify(logged).includes("secret lab values"));
});

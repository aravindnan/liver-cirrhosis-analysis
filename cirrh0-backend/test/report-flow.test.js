require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { db } = require("../db/client");
const ml = require("../utils/mlClient");
const { stubModel } = require("./helpers/db");
const { buildReportFields } = require("../utils/reportFields");
const { validateLabData } = require("../utils/validate");
const { analyze_report, report_add_files, get_report, delete_report } = require("../controller/reportController");

const USER = "3f2b8c1e-9a4d-4e57-8b6a-1c2d3e4f5a6b";
const OTHER_REPORT = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";
const REPORT = "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d";
const labs = {
  age: 55, sex: "male", ascites: "N", edema: "N", spiders: "N", hepatomegaly: "Y",
  bilirubin: 1.2, albumin: 3.8, prothrombin: 11, copper: 80, alk_phos: 300, platelets: 200,
  sgot: 40, tryglycerides: 120, cholesterol: 180,
};
const goodPrediction = { stage: 3, model_version: "m-1", analysis: "text", lifestyle_recommendations: ["walk"], precautions: [], self_treatment_plan: [], doctor_type: ["Hepatologist"] };

// Runs a controller with a stubbed ML service and Prisma client, recording what it asked of each.
const run = async (t, controller, { body, params, mlResult, existing = null, deleted = 1 }) => {
  t.mock.method(ml, "post", async () => { if (mlResult instanceof Error) throw mlResult; return { data: mlResult }; });
  const calls = {};
  stubModel(t, "reportAnalysis", {
    findFirst: async (q) => { calls.findFirst = q; return existing; },
    create: async ({ data }) => { calls.create = data; return { id: REPORT, createdAt: new Date(), updatedAt: new Date(), ...data }; },
    update: async (q) => { calls.update = q; return { id: q.where.id, userId: USER, createdAt: new Date(), updatedAt: new Date(), ...q.data }; },
    deleteMany: async (q) => { calls.deleteMany = q; return { count: deleted }; },
  });
  const logs = [];
  const req = { userId: USER, body, params, log: { warn: (o, m) => logs.push(["warn", m]), error: (o, m) => logs.push(["error", m]) } };
  const out = {};
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await controller(req, res);
  return { out, calls, logs };
};

test("buildReportFields always includes scores; model fields come only from a valid prediction", () => {
  const withModel = buildReportFields({ ...labs, alt: 36 }, goodPrediction);
  assert.equal(withModel.scores.length, 3);
  assert.equal(withModel.stage, 3);
  assert.deepEqual(withModel.doctorType, ["Hepatologist"]);
  assert.equal(withModel.alkPhos, 300); // API name mapped to the column
  assert.equal(withModel.triglycerides, 120);

  for (const bad of [null, { stage: 9 }, { stage: "3" }, {}]) {
    const f = buildReportFields(labs, bad);
    assert.equal(f.scores.length, 3);
    assert.equal(f.stage, null);
  }
});

test("without a prediction the model fields are explicitly cleared, never left stale", () => {
  const f = buildReportFields(labs, null);
  assert.equal(f.stage, null);
  assert.equal(f.modelVersion, null);
  assert.equal(f.analysis, null);
  for (const key of ["lifestyleRecommendations", "precautions", "selfTreatmentPlan", "doctorType"]) assert.deepEqual(f[key], [], key);
});

test("optional ALT: accepted when valid, ignored when empty, rejected when nonsense", () => {
  assert.equal(validateLabData({ ...labs, alt: "36" }).value.alt, 36);
  assert.equal(validateLabData({ ...labs, alt: "" }).ok, true);
  assert.equal("alt" in validateLabData({ ...labs, alt: "" }).value, false);
  assert.match(validateLabData({ ...labs, alt: "<10" }).error, /alt/);
  assert.match(validateLabData({ ...labs, alt: 99999 }).error, /alt/);
});

test("a new analysis is created for the caller with stage, scores and no draft timer", async (t) => {
  const { out, calls } = await run(t, analyze_report, { body: { reportId: "new-report", validatedData: { ...labs, alt: "36" } }, mlResult: goodPrediction });
  assert.equal(out.body.analysisSuccess, true);
  assert.equal(out.body.modelAvailable, true);
  assert.equal(out.body.reportId, REPORT);
  assert.equal(out.body.reportResult.id, REPORT);
  assert.equal(calls.create.userId, USER); // owner comes from the session, not the request body
  assert.equal(calls.create.stage, 3);
  assert.equal(calls.create.draftExpiresAt, null);
  assert.equal(calls.create.scores.find((s) => s.id === "fib4").value, 1.83); // 55*40/(200*6)
  assert.equal(out.body.reportResult.alk_phos, 300); // response keeps the API names
});

test("analysing a draft updates it, scoped to the caller, and clears the draft timer", async (t) => {
  const { out, calls } = await run(t, analyze_report, {
    body: { reportId: REPORT, validatedData: labs }, mlResult: goodPrediction, existing: { id: REPORT, userId: USER },
  });
  assert.deepEqual(calls.findFirst.where, { id: REPORT, userId: USER });
  assert.equal(calls.update.where.id, REPORT);
  assert.equal(calls.update.data.draftExpiresAt, null);
  assert.equal(calls.create, undefined);
  assert.equal(out.body.analysisSuccess, true);
});

test("another user's report id is a 404 and nothing is written", async (t) => {
  const { out, calls } = await run(t, analyze_report, { body: { reportId: OTHER_REPORT, validatedData: labs }, mlResult: goodPrediction, existing: null });
  assert.equal(out.status, 404);
  assert.equal(calls.update, undefined);
  assert.equal(calls.create, undefined);
  assert.equal(ml.post.mock.callCount(), 0);
});

test("a malformed report id is a 404 without touching the database", async (t) => {
  const { out, calls } = await run(t, analyze_report, { body: { reportId: "64b7f0f2a1b2c3d4e5f60718", validatedData: labs }, mlResult: goodPrediction });
  assert.equal(out.status, 404);
  assert.equal(calls.findFirst, undefined);
});

test("a model outage still saves the guideline scores and says the model was unavailable", async (t) => {
  const { out, calls, logs } = await run(t, analyze_report, { body: { reportId: "new-report", validatedData: labs }, mlResult: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }) });
  assert.equal(out.status, undefined);
  assert.equal(out.body.analysisSuccess, true);
  assert.equal(out.body.modelAvailable, false);
  assert.equal(calls.create.stage, null);
  assert.equal(calls.create.scores.length, 3);
  assert.equal(calls.create.scores.find((s) => s.id === "fib4").value, null); // no ALT given
  assert.ok(calls.create.scores.find((s) => s.id === "apri").value > 0);
  assert.ok(logs.some(([level, msg]) => level === "warn" && /unavailable/.test(msg)));
});

test("re-analysing while the model is down clears the old stage instead of keeping it next to new labs", async (t) => {
  const { calls } = await run(t, analyze_report, {
    body: { reportId: REPORT, validatedData: labs }, mlResult: new Error("down"), existing: { id: REPORT, userId: USER, stage: 4 },
  });
  assert.equal(calls.update.data.stage, null);
  assert.deepEqual(calls.update.data.doctorType, []);
});

test("an invalid model answer is treated like an outage, not stored", async (t) => {
  const { out, calls } = await run(t, analyze_report, { body: { reportId: "new-report", validatedData: labs }, mlResult: { stage: 99 } });
  assert.equal(out.body.modelAvailable, false);
  assert.equal(calls.create.stage, null);
});

test("invalid lab data is rejected before anything is saved or sent", async (t) => {
  const { out, calls } = await run(t, analyze_report, { body: { reportId: "new-report", validatedData: { ...labs, platelets: "200000" } }, mlResult: goodPrediction });
  assert.equal(out.status, 400);
  assert.equal(calls.create, undefined);
  assert.equal(ml.post.mock.callCount(), 0);
});

test("extracting files creates an expiring draft owned by the caller", async (t) => {
  const { out, calls } = await run(t, report_add_files, { body: { fileURLSet: ["https://res.cloudinary.com/demo/a.pdf"] }, mlResult: { bilirubin: "1.1" } });
  assert.equal(out.body.extractSuccess, true);
  assert.equal(out.body.reportId, REPORT);
  assert.equal(calls.create.userId, USER);
  assert.ok(calls.create.draftExpiresAt > new Date(), "draft expires in the future");
});

test("a failed extraction creates no record", async (t) => {
  const { out, calls } = await run(t, report_add_files, { body: { fileURLSet: ["https://res.cloudinary.com/demo/a.pdf"] }, mlResult: new Error("ml down") });
  assert.equal(out.status, 502);
  assert.equal(calls.create, undefined);
});

test("only allowed upload URLs may be extracted", async (t) => {
  const { out, calls } = await run(t, report_add_files, { body: { fileURLSet: ["https://169.254.169.254/latest"] }, mlResult: {} });
  assert.equal(out.status, 400);
  assert.equal(calls.create, undefined);
});

test("reading and deleting a report are scoped to the owner in the query itself", async (t) => {
  const read = await run(t, get_report, { params: { reportId: REPORT }, existing: { id: REPORT, userId: USER, date: new Date() } });
  assert.deepEqual(read.calls.findFirst.where, { id: REPORT, userId: USER });
  assert.equal(read.out.body.report.id, REPORT);

  const gone = await run(t, delete_report, { params: { reportId: REPORT }, deleted: 0 });
  assert.deepEqual(gone.calls.deleteMany.where, { id: REPORT, userId: USER });
  assert.equal(gone.out.status, 404);
});

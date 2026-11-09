require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const ReportAnalysis = require("../model/reportsAnalysis");
const ml = require("../utils/mlClient");
const { buildReportFields } = require("../utils/reportFields");
const { validateLabData } = require("../utils/validate");
const { analyze_report } = require("../controller/reportController");

const ID = "64b7f0f2a1b2c3d4e5f60718";
const labs = {
  age: 55, sex: "male", ascites: "N", edema: "N", spiders: "N", hepatomegaly: "Y",
  bilirubin: 1.2, albumin: 3.8, prothrombin: 11, copper: 80, alk_phos: 300, platelets: 200,
  sgot: 40, tryglycerides: 120, cholesterol: 180,
};
const goodPrediction = { stage: 3, model_version: "m-1", analysis: "text", lifestyle_recommendations: ["walk"], precautions: [], self_treatment_plan: [], doctor_type: ["Hepatologist"] };

// Runs the controller with a stubbed ML service and database save.
const run = async (t, { body, mlResult }) => {
  t.mock.method(ml, "post", async () => { if (mlResult instanceof Error) throw mlResult; return { data: mlResult }; });
  let saved;
  t.mock.method(ReportAnalysis.prototype, "save", async function () { saved = this; return this; });
  const logs = [];
  const req = { userId: ID, body, log: { warn: (o, m) => logs.push(["warn", m, o]), error: (o, m) => logs.push(["error", m, o]) } };
  const out = {};
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await analyze_report(req, res);
  return { out, saved, logs };
};

test("buildReportFields always includes scores; model fields only for a valid prediction", () => {
  const withModel = buildReportFields({ ...labs, alt: 36 }, goodPrediction);
  assert.equal(withModel.scores.length, 3);
  assert.equal(withModel.stage, 3);
  assert.deepEqual(withModel.doctor_type, ["Hepatologist"]);

  for (const bad of [null, { stage: 9 }, { stage: "3" }, {}]) {
    const f = buildReportFields(labs, bad);
    assert.equal(f.scores.length, 3);
    assert.equal(f.stage, undefined);
  }
});

test("optional ALT: accepted when valid, ignored when empty, rejected when nonsense", () => {
  assert.equal(validateLabData({ ...labs, alt: "36" }).value.alt, 36);
  assert.equal(validateLabData({ ...labs, alt: "" }).ok, true);
  assert.equal("alt" in validateLabData({ ...labs, alt: "" }).value, false);
  assert.match(validateLabData({ ...labs, alt: "<10" }).error, /alt/);
  assert.match(validateLabData({ ...labs, alt: 99999 }).error, /alt/);
});

test("analysis succeeds with stage and all three scores when the model is up", async (t) => {
  const { out, saved } = await run(t, { body: { reportId: "new-report", validatedData: { ...labs, alt: "36" } }, mlResult: goodPrediction });
  assert.equal(out.body.analysisSuccess, true);
  assert.equal(out.body.modelAvailable, true);
  assert.equal(saved.stage, 3);
  assert.equal(saved.scores.find((s) => s.id === "fib4").value, 1.83); // 55*40/(200*6) = 1.833
  assert.equal(saved.draftExpiresAt, undefined);
});

test("a model outage still saves the guideline scores and says the model was unavailable", async (t) => {
  const { out, saved, logs } = await run(t, { body: { reportId: "new-report", validatedData: labs }, mlResult: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }) });
  assert.equal(out.status, undefined); // not an error response
  assert.equal(out.body.analysisSuccess, true);
  assert.equal(out.body.modelAvailable, false);
  assert.equal(saved.stage, undefined);
  assert.equal(saved.scores.length, 3);
  assert.equal(saved.scores.find((s) => s.id === "fib4").value, null); // no ALT given
  assert.ok(saved.scores.find((s) => s.id === "apri").value > 0);
  assert.ok(logs.some(([level, msg]) => level === "warn" && /unavailable/.test(msg)));
});

test("an invalid model answer is treated like an outage, not stored", async (t) => {
  const { out, saved } = await run(t, { body: { reportId: "new-report", validatedData: labs }, mlResult: { stage: 99 } });
  assert.equal(out.body.modelAvailable, false);
  assert.equal(saved.stage, undefined);
});

test("invalid lab data is rejected before anything is saved or sent", async (t) => {
  const { out, saved } = await run(t, { body: { reportId: "new-report", validatedData: { ...labs, platelets: "200000" } }, mlResult: goodPrediction });
  assert.equal(out.status, 400);
  assert.equal(saved, undefined);
  assert.equal(ml.post.mock.callCount(), 0);
});

test("the report schema stores scores and ALT", () => {
  const doc = new ReportAnalysis({ userId: ID, alt: 36, scores: [{ id: "fib4", value: 1.83 }], scores_version: "2026-11" });
  assert.equal(doc.validateSync(), undefined);
  assert.equal(doc.scores[0].value, 1.83);
  assert.equal(doc.alt, 36);
});

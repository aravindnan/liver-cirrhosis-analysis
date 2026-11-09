require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const ReportAnalysis = require("../model/reportsAnalysis");
const MRIAnalysis = require("../model/mriAnalysis");
const User = require("../model/user");

const ID = "64b7f0f2a1b2c3d4e5f60718";

test("a report needs an owner and stores lab values as numbers", () => {
  assert.ok(new ReportAnalysis({}).validateSync().errors.userId);
  const doc = new ReportAnalysis({ userId: ID, cholesterol: "180", tryglycerides: "120", stage: 3 });
  assert.equal(doc.validateSync(), undefined);
  assert.strictEqual(doc.cholesterol, 180); // legacy string values are cast
  assert.strictEqual(doc.tryglycerides, 120);
});

test("a report rejects out-of-range stages and invalid categories", () => {
  const errors = new ReportAnalysis({ userId: ID, stage: 9, ascites: "maybe", edema: "X", sex: "robot" }).validateSync().errors;
  for (const field of ["stage", "ascites", "edema", "sex"]) assert.ok(errors[field], field);
});

test("indexes support history lookups and draft expiry", () => {
  const indexes = ReportAnalysis.schema.indexes().map(([fields, opts]) => ({ fields, opts }));
  assert.ok(indexes.some((i) => i.fields.userId === 1 && i.fields.date === -1));
  assert.ok(indexes.some((i) => i.fields.draftExpiresAt === 1 && i.opts.expireAfterSeconds === 0));
  assert.ok(MRIAnalysis.schema.indexes().some(([f]) => f.userId === 1 && f.date === -1));
});

test("an image analysis needs an owner", () => {
  assert.ok(new MRIAnalysis({}).validateSync().errors.userId);
});

test("the user no longer stores analysis id arrays, and the password is hidden by default", () => {
  assert.equal(User.schema.path("reportAnalysisSet"), undefined);
  assert.equal(User.schema.path("mriAnalysisSet"), undefined);
  assert.equal(User.schema.path("password").options.select, false);
  assert.equal(User.schema.path("email").options.lowercase, true);
});

test("users require a username, email and password", () => {
  const errors = new User({}).validateSync().errors;
  for (const field of ["username", "email", "password"]) assert.ok(errors[field], field);
});

test("get_user_by_id finds analyses by owner, hides drafts and keeps the response shape", async (t) => {
  const { get_user_by_id } = require("../controller/userController");
  const chain = (rows) => ({ sort: () => ({ lean: async () => rows }) });
  const calls = {};
  t.mock.method(User, "findById", () => ({ lean: async () => ({ _id: ID, username: "asha", reportAnalysisSet: ["legacy-id"] }) }));
  t.mock.method(ReportAnalysis, "find", (q) => { calls.report = q; return chain([{ _id: "r1", stage: 2 }]); });
  t.mock.method(MRIAnalysis, "find", (q) => { calls.mri = q; return chain([{ _id: "m1" }]); });

  let body;
  await get_user_by_id({ userId: ID, log: { error() {} } }, { status() { return this; }, json(b) { body = b; } });
  assert.deepEqual(calls.report, { userId: ID, stage: { $ne: null } });
  assert.deepEqual(calls.mri, { userId: ID, analysis: { $ne: null } });
  assert.deepEqual(body.reportAnalysisSet, [{ _id: "r1", stage: 2 }]); // legacy id array is replaced
  assert.deepEqual(body.mriAnalysisSet, [{ _id: "m1" }]);
  assert.equal(body.password, undefined);
});

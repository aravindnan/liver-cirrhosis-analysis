require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { planMigration, applyPlan, describe } = require("../scripts/migrate-from-mongo");

// Stand-ins for MongoDB ObjectIds: only String(_id) is used.
const oid = (hex) => ({ toString: () => hex });
const U1 = oid("64b7f0f2a1b2c3d4e5f60001");
const U2 = oid("64b7f0f2a1b2c3d4e5f60002");
let n = 0;
const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const hash = bcrypt.hashSync("old-password-1", 4);
const legacyUsers = [
  { _id: U1, username: "asha", email: "Asha@Example.COM", password: hash, fullName: " Asha Menon ", age: 55, gender: "female", lastLoginDate: "2026-01-02T03:04:05Z", reportAnalysisSet: [oid("x")] },
  { _id: U2, username: "ravi", email: "ravi@example.com", password: hash, fullName: "Ravi", age: "61", gender: "male" },
];
const legacyReport = (extra = {}) => ({
  _id: oid("64b7f0f2a1b2c3d4e5f60101"), userId: U1, date: "Mon Mar 03 2025 10:00:00 GMT+0530", age: 54, sex: "female", files: ["https://res.cloudinary.com/demo/a.pdf", 5],
  ascites: "N", edema: "S", spiders: "N", hepatomegaly: "Y", bilirubin: 1.2, albumin: 3.8, prothrombin: 11, copper: 80,
  alk_phos: 300, platelets: 200, sgot: 40, tryglycerides: "120", cholesterol: "180", stage: 3, analysis: "text",
  lifestyle_recommendations: ["walk"], precautions: [], self_treatment_plan: ["eat"], doctor_type: ["Hepatologist"], ...extra,
});

test("users: lower-case email, trimmed name, same bcrypt hash, new UUID, gender kept", () => {
  const plan = planMigration({ users: legacyUsers }, { newId });
  assert.equal(plan.users.length, 2);
  const [asha, ravi] = plan.users;
  assert.equal(asha.email, "asha@example.com");
  assert.equal(asha.fullName, "Asha Menon");
  assert.equal(asha.passwordHash, hash);
  assert.match(asha.id, /^[0-9a-f-]{36}$/);
  assert.equal(asha.gender, "female");
  assert.ok(asha.lastLoginAt instanceof Date);
  assert.equal(ravi.age, 61); // numeric string accepted
  assert.ok(!("reportAnalysisSet" in asha), "the old id arrays are not carried over");
});

test("users that cannot work in the new schema are skipped and counted, never half-migrated", () => {
  const plan = planMigration({ users: [
    ...legacyUsers,
    { _id: oid("a1"), username: "nopass", email: "n@x.co" },
    { _id: oid("a2"), username: "noemail", password: hash },
    { _id: oid("a3"), username: "dupemail", email: "ASHA@example.com", password: hash },
    { _id: oid("a4"), username: "asha", email: "other@x.co", password: hash },
  ] }, { newId });
  assert.equal(plan.users.length, 2);
  assert.equal(plan.skipped.users["missing username, email or password"], 2);
  assert.equal(plan.skipped.users["duplicate username or email"], 2);
});

test("a bad gender or age becomes null instead of failing the whole migration", () => {
  const plan = planMigration({ users: [{ _id: U1, username: "a", email: "a@x.co", password: hash, gender: "unknown", age: 999 }] }, { newId });
  assert.equal(plan.users[0].gender, null);
  assert.equal(plan.users[0].age, null);
});

test("reports: string lab values become numbers, names map, relations point at the new user id", () => {
  const plan = planMigration({ users: legacyUsers, reports: [legacyReport()] }, { newId });
  const [r] = plan.reports;
  assert.equal(r.userId, plan.users[0].id);
  assert.equal(r.cholesterol, 180);
  assert.equal(r.triglycerides, 120);
  assert.equal(r.alkPhos, 300);
  assert.equal(r.stage, 3);
  assert.deepEqual(r.files, ["https://res.cloudinary.com/demo/a.pdf"]); // non-strings dropped
  assert.deepEqual(r.doctorType, ["Hepatologist"]);
  assert.equal(r.edema, "S");
  assert.ok(r.date instanceof Date && !Number.isNaN(r.date.getTime()));
  assert.ok(!("_id" in r) && !("model_version" in r));
});

test("old reports get guideline scores computed from their stored values", () => {
  const [r] = planMigration({ users: legacyUsers, reports: [legacyReport()] }, { newId }).reports;
  assert.equal(r.scores.length, 3);
  assert.equal(r.scores.find((s) => s.id === "apri").value, 0.5);
  assert.equal(r.scores.find((s) => s.id === "fib4").value, null); // no ALT in old reports
  assert.ok(r.scoresVersion);
});

test("a report missing the values the scores need is migrated without scores", () => {
  const [r] = planMigration({ users: legacyUsers, reports: [legacyReport({ platelets: undefined })] }, { newId }).reports;
  assert.ok(!("scores" in r));
});

test("drafts, orphans and invalid stages are skipped with a reason", () => {
  const plan = planMigration({ users: legacyUsers, reports: [
    legacyReport(), legacyReport({ stage: null }), legacyReport({ stage: undefined }), legacyReport({ userId: oid("ffff") }), legacyReport({ stage: 7 }), legacyReport({ stage: 2.5 }),
  ] }, { newId });
  assert.equal(plan.reports.length, 1);
  assert.equal(plan.skipped.reports["draft or incomplete"], 2);
  assert.equal(plan.skipped.reports["owner not migrated"], 1);
  assert.equal(plan.skipped.reports["stage out of range"], 2);
});

test("an unparseable date falls back to the migration time", () => {
  const now = new Date("2026-11-10T00:00:00Z");
  const [r] = planMigration({ users: legacyUsers, reports: [legacyReport({ date: "garbage" })] }, { newId, now }).reports;
  assert.equal(r.date.toISOString(), now.toISOString());
});

test("images: mapped, and incomplete or orphaned ones skipped", () => {
  const plan = planMigration({ users: legacyUsers, images: [
    { _id: oid("i1"), userId: U2, file: "https://res.cloudinary.com/x.jpg", age: 61, sex: "male", date: "2025-05-01", analysis: "found", diagnosis: ["steatosis"], medical_treatments: ["t"], doctor_type: ["d"], lifestyle_recommendations: [], precautions: [] },
    { _id: oid("i2"), userId: U2, analysis: null },
    { _id: oid("i3"), userId: oid("ffff"), analysis: "x" },
  ] }, { newId });
  assert.equal(plan.images.length, 1);
  assert.equal(plan.images[0].userId, plan.users[1].id);
  assert.deepEqual(plan.images[0].medicalTreatments, ["t"]);
  assert.equal(plan.skipped.images["no analysis"], 1);
  assert.equal(plan.skipped.images["owner not migrated"], 1);
});

test("the summary shows counts only and never record contents", () => {
  const plan = planMigration({ users: legacyUsers, reports: [legacyReport({ analysis: "PATIENT-SECRET-TEXT" })] }, { newId });
  const text = describe(plan);
  assert.match(text, /users:\s+2 to migrate/);
  assert.match(text, /reports: 1 to migrate/);
  for (const secret of ["PATIENT-SECRET-TEXT", "asha", "example.com", hash]) assert.ok(!text.includes(secret), secret);
});

test("an empty input gives an empty plan", () => {
  const plan = planMigration({});
  assert.deepEqual([plan.users, plan.reports, plan.images], [[], [], []]);
});

// ---- against a real PostgreSQL (needs TEST_DATABASE_URL) ----------------------------------
const it = process.env.TEST_DATABASE_URL ? test : test.skip;
if (process.env.TEST_DATABASE_URL && !/test/i.test(new URL(process.env.TEST_DATABASE_URL).pathname)) throw new Error("TEST_DATABASE_URL must point at a database named *test*");
const { db } = require("../db/client");
const wipe = () => db.$executeRawUnsafe("TRUNCATE TABLE image_analyses, report_analyses, users RESTART IDENTITY CASCADE");
test.after(async () => { if (process.env.TEST_DATABASE_URL) await db.$disconnect(); });

it("applies a real plan: relations hold, hashes still verify, scores are stored", async () => {
  await wipe();
  const plan = planMigration({ users: legacyUsers, reports: [legacyReport()], images: [{ _id: oid("i1"), userId: U2, analysis: "found", file: "https://res.cloudinary.com/x.jpg" }] });
  assert.deepEqual(await applyPlan(db, plan), { users: 2, reports: 1, images: 1 });

  const asha = await db.user.findUnique({ where: { username: "asha" }, include: { reports: true } });
  assert.equal(asha.email, "asha@example.com");
  assert.equal(await bcrypt.compare("old-password-1", asha.passwordHash), true, "people keep their passwords");
  assert.equal(asha.reports.length, 1);
  assert.equal(asha.reports[0].triglycerides, 120);
  assert.equal(asha.reports[0].scores.length, 3);
  assert.equal((await db.user.findUnique({ where: { username: "ravi" }, include: { imageAnalyses: true } })).imageAnalyses.length, 1);
});

it("refuses to write into a database that already has users, and writes nothing", async () => {
  await wipe();
  await db.user.create({ data: { username: "existing", email: "e@x.co", passwordHash: "h", fullName: "E" } });
  await assert.rejects(applyPlan(db, planMigration({ users: legacyUsers, reports: [legacyReport()] })), /not empty/);
  assert.equal(await db.user.count(), 1);
  assert.equal(await db.reportAnalysis.count(), 0);
});

it("is all or nothing: a failure part-way rolls everything back", async () => {
  await wipe();
  const plan = planMigration({ users: legacyUsers, reports: [legacyReport()] });
  plan.reports.push({ ...plan.reports[0], id: plan.reports[0].id }); // duplicate primary key makes the second insert fail
  await assert.rejects(applyPlan(db, plan));
  assert.equal(await db.user.count(), 0, "users inserted earlier in the transaction are rolled back");
  assert.equal(await db.reportAnalysis.count(), 0);
});

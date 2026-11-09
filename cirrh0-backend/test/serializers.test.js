require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { serializeReport, serializeImage, serializeUser, labsToColumns } = require("../utils/serializers");

const row = {
  id: "r1", userId: "u1", age: 55, sex: "male", files: ["https://x"], date: new Date("2026-01-01"),
  ascites: "N", edema: "S", spiders: "N", hepatomegaly: "Y", bilirubin: 1.2, albumin: 3.8, prothrombin: 11,
  platelets: 200, sgot: 40, alt: 36, copper: 80, alkPhos: 300, triglycerides: 120, cholesterol: 180,
  stage: 3, modelVersion: "m-1", analysis: "text", lifestyleRecommendations: ["walk"], precautions: ["rest"],
  selfTreatmentPlan: ["eat well"], doctorType: ["Hepatologist"], scores: [{ id: "fib4", value: 1.83 }], scoresVersion: "v1",
  draftExpiresAt: new Date("2026-01-02"), createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"),
};

test("a report keeps the API names the web app reads, with id instead of _id", () => {
  const out = serializeReport(row);
  assert.equal(out.id, "r1");
  assert.equal("_id" in out, false);
  assert.equal(out.alk_phos, 300);
  assert.equal(out.tryglycerides, 120); // legacy API spelling, fed from the correctly spelled column
  assert.deepEqual(out.lifestyle_recommendations, ["walk"]);
  assert.deepEqual(out.self_treatment_plan, ["eat well"]);
  assert.deepEqual(out.doctor_type, ["Hepatologist"]);
  assert.equal(out.model_version, "m-1");
  assert.equal(out.scores[0].value, 1.83);
});

test("internal fields never reach a response", () => {
  const out = JSON.stringify(serializeReport(row));
  assert.ok(!out.includes("draftExpiresAt") && !out.includes("draft_expires_at"));
});

test("missing values become null and missing lists become empty arrays", () => {
  const out = serializeReport({ id: "r2", userId: "u1", date: new Date() });
  assert.equal(out.stage, null);
  assert.equal(out.alt, null);
  for (const key of ["files", "lifestyle_recommendations", "precautions", "self_treatment_plan", "doctor_type", "scores"]) {
    assert.deepEqual(out[key], [], key);
  }
});

test("an image analysis uses the API names", () => {
  const out = serializeImage({ id: "i1", userId: "u1", file: "https://x", date: new Date(), analysis: "a", diagnosis: ["steatosis"], medicalTreatments: ["t"], doctorType: ["d"], lifestyleRecommendations: [], precautions: [] });
  assert.equal(out.id, "i1");
  assert.deepEqual(out.medical_treatments, ["t"]);
  assert.deepEqual(out.doctor_type, ["d"]);
});

test("the profile carries completed analyses under the names the profile page reads", () => {
  const out = serializeUser(
    { id: "u1", username: "asha", email: "a@b.co", fullName: "Asha", age: 55, gender: "female", passwordHash: "$2a$12$secret", lastLoginAt: null, createdAt: new Date() },
    [row], [{ id: "i1", userId: "u1", date: new Date() }]
  );
  assert.equal(out.id, "u1");
  assert.equal(out.reportAnalysisSet[0].id, "r1");
  assert.equal(out.mriAnalysisSet[0].id, "i1");
  assert.ok(!JSON.stringify(out).includes("secret"), "password hash must never be serialised");
  assert.ok(!("passwordHash" in out) && !("password" in out));
});

test("lab values map to column names, with whole-number ages", () => {
  const cols = labsToColumns({ age: 54.6, sex: "male", alk_phos: 300, tryglycerides: 120, bilirubin: 1 });
  assert.equal(cols.age, 55);
  assert.equal(cols.alkPhos, 300);
  assert.equal(cols.triglycerides, 120);
  assert.equal(cols.bilirubin, 1);
  assert.ok(!("alk_phos" in cols) && !("tryglycerides" in cols));
});

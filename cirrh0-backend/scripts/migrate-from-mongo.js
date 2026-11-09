#!/usr/bin/env node
// One-off migration of the old MongoDB data into PostgreSQL.
//
//   npm install --no-save mongodb          (the driver is not an app dependency any more)
//   MONGO_URI=mongodb+srv://... DATABASE_URL=postgresql://... node scripts/migrate-from-mongo.js
//   ... same command with --apply to write
//
// - Dry run by default: reads, maps and prints counts, writes nothing.
// - Refuses to write unless the PostgreSQL users table is empty, and writes in ONE transaction, so
//   it either completes or leaves the database untouched.
// - Password hashes are copied as they are (bcrypt), so people keep their passwords. Sessions are
//   not migrated: everyone logs in again.
// - Every record gets a new UUID; relations are rebuilt from the old ObjectIds.
// - Skipped: users without a username, email or password hash, or whose lower-cased email collides;
//   report drafts and incomplete reports; images without an analysis; anything whose user was skipped.
// - Output is counts only. Patient data is never printed.

const crypto = require("node:crypto");
const { computeScores, SCORES_VERSION } = require("../utils/scores");

const GENDERS = ["male", "female", "other"];
const YES_NO = ["Y", "N"];
const EDEMA = ["Y", "S", "N"];

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};
const intAge = (v) => {
  const n = num(v);
  if (n === null) return null;
  const r = Math.round(n);
  return r >= 0 && r <= 130 ? r : null;
};
const oneOf = (v, allowed) => (allowed.includes(v) ? v : null);
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const dateOr = (v, fallback) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : fallback;
};

// Turns old documents into rows ready to insert. Pure: no I/O, so it is easy to test.
const planMigration = ({ users = [], reports = [], images = [] }, { newId = crypto.randomUUID, now = new Date() } = {}) => {
  const skipped = { users: {}, reports: {}, images: {} };
  const bump = (kind, reason) => { skipped[kind][reason] = (skipped[kind][reason] || 0) + 1; };

  const userIds = new Map(); // old ObjectId (string) -> new UUID
  const seenEmails = new Set();
  const seenUsernames = new Set();
  const userRows = [];
  for (const u of users) {
    const username = typeof u.username === "string" ? u.username.trim() : "";
    const email = typeof u.email === "string" ? u.email.trim().toLowerCase() : "";
    if (!username || !email || typeof u.password !== "string" || !u.password) { bump("users", "missing username, email or password"); continue; }
    if (seenEmails.has(email) || seenUsernames.has(username)) { bump("users", "duplicate username or email"); continue; }
    seenEmails.add(email);
    seenUsernames.add(username);
    const id = newId();
    userIds.set(String(u._id), id);
    userRows.push({
      id,
      username,
      email,
      passwordHash: u.password,
      fullName: typeof u.fullName === "string" && u.fullName.trim() ? u.fullName.trim() : username,
      age: intAge(u.age),
      gender: oneOf(u.gender, GENDERS),
      lastLoginAt: u.lastLoginDate ? dateOr(u.lastLoginDate, null) : null,
    });
  }

  const reportRows = [];
  for (const r of reports) {
    const userId = userIds.get(String(r.userId));
    if (!userId) { bump("reports", "owner not migrated"); continue; }
    const stage = num(r.stage);
    if (stage === null) { bump("reports", "draft or incomplete"); continue; }
    if (!Number.isInteger(stage) || stage < 1 || stage > 4) { bump("reports", "stage out of range"); continue; }

    const labs = {
      age: intAge(r.age), bilirubin: num(r.bilirubin), albumin: num(r.albumin), prothrombin: num(r.prothrombin),
      platelets: num(r.platelets), sgot: num(r.sgot), alt: num(r.alt), copper: num(r.copper),
      alkPhos: num(r.alk_phos), triglycerides: num(r.tryglycerides), cholesterol: num(r.cholesterol),
    };
    const canScore = [labs.age, labs.sgot, labs.platelets, labs.bilirubin, labs.albumin].every((v) => v !== null);
    const row = {
      id: newId(),
      userId,
      ...labs,
      sex: oneOf(r.sex, GENDERS),
      files: strings(r.files),
      date: dateOr(r.date, now),
      ascites: oneOf(r.ascites, YES_NO),
      edema: oneOf(r.edema, EDEMA),
      spiders: oneOf(r.spiders, YES_NO),
      hepatomegaly: oneOf(r.hepatomegaly, YES_NO),
      stage,
      analysis: typeof r.analysis === "string" ? r.analysis : null,
      lifestyleRecommendations: strings(r.lifestyle_recommendations),
      precautions: strings(r.precautions),
      selfTreatmentPlan: strings(r.self_treatment_plan),
      doctorType: strings(r.doctor_type),
    };
    // Old reports predate the guideline scores; compute them from the stored values.
    if (canScore) {
      row.scores = computeScores({ age: labs.age, sgot: labs.sgot, alt: labs.alt ?? undefined, platelets: labs.platelets, bilirubin: labs.bilirubin, albumin: labs.albumin });
      row.scoresVersion = SCORES_VERSION;
    }
    reportRows.push(row);
  }

  const imageRows = [];
  for (const i of images) {
    const userId = userIds.get(String(i.userId));
    if (!userId) { bump("images", "owner not migrated"); continue; }
    if (typeof i.analysis !== "string" || !i.analysis) { bump("images", "no analysis"); continue; }
    imageRows.push({
      id: newId(),
      userId,
      age: intAge(i.age),
      sex: typeof i.sex === "string" ? i.sex : null,
      file: typeof i.file === "string" ? i.file : null,
      date: dateOr(i.date, now),
      analysis: i.analysis,
      diagnosis: strings(i.diagnosis),
      lifestyleRecommendations: strings(i.lifestyle_recommendations),
      precautions: strings(i.precautions),
      medicalTreatments: strings(i.medical_treatments),
      doctorType: strings(i.doctor_type),
    });
  }

  return { users: userRows, reports: reportRows, images: imageRows, skipped };
};

// Writes a plan in one transaction. Throws, writing nothing, if the target already has users.
const applyPlan = async (db, plan) => {
  return db.$transaction(
    async (tx) => {
      if ((await tx.user.count()) > 0) throw new Error("The PostgreSQL users table is not empty. Refusing to migrate into it.");
      await tx.user.createMany({ data: plan.users });
      await tx.reportAnalysis.createMany({ data: plan.reports });
      await tx.imageAnalysis.createMany({ data: plan.images });
      return { users: plan.users.length, reports: plan.reports.length, images: plan.images.length };
    },
    { timeout: 120000, maxWait: 10000 }
  );
};

const describe = (plan) => {
  const lines = [`users:   ${plan.users.length} to migrate`, `reports: ${plan.reports.length} to migrate`, `images:  ${plan.images.length} to migrate`];
  for (const [kind, reasons] of Object.entries(plan.skipped)) {
    for (const [reason, count] of Object.entries(reasons)) lines.push(`skipped ${kind}: ${count} (${reason})`);
  }
  return lines.join("\n");
};

async function main() {
  const apply = process.argv.includes("--apply");
  if (!process.env.MONGO_URI || !process.env.DATABASE_URL) {
    console.error("Set MONGO_URI (the old database) and DATABASE_URL (the new PostgreSQL database).");
    process.exit(1);
  }
  let MongoClient;
  try { ({ MongoClient } = require("mongodb")); } catch (e) {
    console.error("The MongoDB driver is not installed. Run: npm install --no-save mongodb");
    process.exit(1);
  }
  process.env.SECRET_KEY = process.env.SECRET_KEY || "x".repeat(48); // the shared config requires one; not used here
  for (const k of ["NLP_BASE_URL", "REPORT_BASE_URL", "IMAGE_BASE_URL"]) process.env[k] = process.env[k] || "http://unused";
  const { db } = require("../db/client");

  const mongo = new MongoClient(process.env.MONGO_URI);
  try {
    await mongo.connect();
    const m = mongo.db(process.env.MONGO_DB || undefined);
    const read = (name) => m.collection(name).find({}).toArray();
    const plan = planMigration({
      users: await read(process.env.MONGO_USERS || "users"),
      reports: await read(process.env.MONGO_REPORTS || "reportanalyses"),
      images: await read(process.env.MONGO_IMAGES || "mrianalyses"),
    });
    console.log(describe(plan));
    if (!apply) {
      console.log("\nDry run: nothing was written. Re-run with --apply to migrate.");
      return;
    }
    const done = await applyPlan(db, plan);
    console.log(`\nMigrated ${done.users} users, ${done.reports} reports and ${done.images} images.`);
  } finally {
    await mongo.close();
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(`Migration failed: ${error && error.name}: ${String(error && error.message).split("\n")[0].slice(0, 160)}`); process.exit(1); });
}

module.exports = { planMigration, applyPlan, describe };

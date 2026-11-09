require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { db } = require("../db/client");
const { stubModel } = require("./helpers/db");
const { deleteExpiredDrafts, scheduleDraftCleanup } = require("../utils/drafts");

test("deletes only drafts whose expiry has passed", async (t) => {
  let where;
  stubModel(t, "reportAnalysis", { deleteMany: async (q) => { where = q.where; return { count: 3 }; } });
  const now = new Date("2026-06-01T00:00:00Z");
  assert.equal(await deleteExpiredDrafts(db, now), 3);
  assert.deepEqual(where, { draftExpiresAt: { lt: now } }); // null (completed reports) never matches lt
});

test("cleanup runs at start-up, logs what it removed, and survives a database error", async (t) => {
  const logs = [];
  const log = { info: (o, m) => logs.push(["info", m, o]), warn: (o, m) => logs.push(["warn", m, o]) };
  let calls = 0;
  stubModel(t, "reportAnalysis", { deleteMany: async () => { calls += 1; if (calls === 2) throw new Error("db down"); return { count: calls === 1 ? 2 : 0 }; } });
  const timer = scheduleDraftCleanup(db, log, 10);
  await new Promise((r) => setTimeout(r, 60));
  clearInterval(timer);
  assert.ok(calls >= 2);
  assert.ok(logs.some(([l, m, o]) => l === "info" && /expired report drafts/.test(m) && o.removed === 2));
  assert.ok(logs.some(([l]) => l === "warn"), "a failed run is logged, not thrown");
});

test("the cleanup timer does not keep the process alive", () => {
  const timer = scheduleDraftCleanup({ reportAnalysis: { deleteMany: async () => ({ count: 0 }) } }, { info() {}, warn() {} }, 1e9);
  assert.equal(timer.hasRef(), false);
  clearInterval(timer);
});

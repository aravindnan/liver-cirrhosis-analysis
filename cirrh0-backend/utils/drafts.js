const { safeError } = require("./logger");

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// A report is a draft between extracting its files and analysing it. PostgreSQL has no TTL index
// (MongoDB did), so expired drafts are removed here.
const deleteExpiredDrafts = async (db, now = new Date()) => {
  const { count } = await db.reportAnalysis.deleteMany({ where: { draftExpiresAt: { lt: now } } });
  return count;
};

// Runs once at start-up and then hourly. The timer does not keep the process alive.
const scheduleDraftCleanup = (db, log, intervalMs = CLEANUP_INTERVAL_MS) => {
  const run = async () => {
    try {
      const removed = await deleteExpiredDrafts(db);
      if (removed > 0) log.info({ removed }, "deleted expired report drafts");
    } catch (error) {
      log.warn({ err: safeError(error) }, "draft cleanup failed");
    }
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
};

module.exports = { DRAFT_TTL_MS, deleteExpiredDrafts, scheduleDraftCleanup };

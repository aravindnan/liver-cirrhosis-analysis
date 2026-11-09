const { computeScores, SCORE_THRESHOLDS } = require("./scores");

const LAB_FIELDS = ["bilirubin", "albumin", "platelets", "sgot", "alt", "alk_phos"];
const SCORE_IDS = ["fib4", "apri", "albi"];

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Scores for one report. New reports store them; older reports predate that, so work them out from
// the stored lab values with the same code. A report missing a needed value yields no scores.
const scoresFor = (r) => {
  if (Array.isArray(r.scores) && r.scores.length > 0) return r.scores;
  const needed = [r.age, r.sgot, r.platelets, r.bilirubin, r.albumin];
  if (!needed.every(isNum)) return [];
  return computeScores({ age: r.age, sgot: r.sgot, alt: isNum(r.alt) ? r.alt : undefined, platelets: r.platelets, bilirubin: r.bilirubin, albumin: r.albumin });
};

// Time series for charts: one point per completed report, oldest first.
const buildTrends = (reports) => {
  const points = reports
    .filter((r) => r.date && !Number.isNaN(new Date(r.date).getTime()))
    .map((r) => {
      const byId = Object.fromEntries(scoresFor(r).map((s) => [s.id, s]));
      return {
        reportId: String(r._id),
        date: new Date(r.date).toISOString(),
        labs: Object.fromEntries(LAB_FIELDS.map((f) => [f, isNum(r[f]) ? r[f] : null])),
        scores: Object.fromEntries(
          SCORE_IDS.map((id) => [id, byId[id] && isNum(byId[id].value) ? { value: byId[id].value, band: byId[id].band } : null])
        ),
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return { points, thresholds: SCORE_THRESHOLDS };
};

module.exports = { buildTrends };

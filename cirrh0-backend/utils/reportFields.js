const { computeScores, SCORES_VERSION } = require("./scores");
const { asList } = require("./mlClient");

const validStage = (p) => p && Number.isInteger(p.stage) && p.stage >= 1 && p.stage <= 4;

// Fields saved with an analysis. The guideline scores come from the lab values alone, so they are
// always present. Model fields are only added when the ML service returned a valid prediction.
const buildReportFields = (labs, prediction, now = new Date()) => {
  const fields = {
    ...labs,
    date: now,
    scores: computeScores(labs),
    scores_version: SCORES_VERSION,
  };
  if (validStage(prediction)) {
    Object.assign(fields, {
      stage: prediction.stage,
      model_version: typeof prediction.model_version === "string" ? prediction.model_version : undefined,
      analysis: typeof prediction.analysis === "string" ? prediction.analysis : "",
      lifestyle_recommendations: asList(prediction.lifestyle_recommendations),
      precautions: asList(prediction.precautions),
      self_treatment_plan: asList(prediction.self_treatment_plan),
      doctor_type: asList(prediction.doctor_type),
    });
  }
  return fields;
};

module.exports = { buildReportFields, validStage };

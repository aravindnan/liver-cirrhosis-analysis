const { computeScores, SCORES_VERSION } = require("./scores");
const { asList } = require("./mlClient");
const { labsToColumns } = require("./serializers");

const validStage = (p) => p && Number.isInteger(p.stage) && p.stage >= 1 && p.stage <= 4;

// Column values saved with an analysis. The guideline scores come from the lab values alone, so they
// are always present. Model fields are filled from a valid prediction and otherwise explicitly
// cleared, so re-analysing a report while the model is down cannot leave a stale stage next to new labs.
const buildReportFields = (labs, prediction, now = new Date()) => {
  const base = {
    ...labsToColumns(labs),
    date: now,
    scores: computeScores(labs),
    scoresVersion: SCORES_VERSION,
  };
  if (!validStage(prediction)) {
    return {
      ...base,
      stage: null,
      modelVersion: null,
      analysis: null,
      lifestyleRecommendations: [],
      precautions: [],
      selfTreatmentPlan: [],
      doctorType: [],
    };
  }
  return {
    ...base,
    stage: prediction.stage,
    modelVersion: typeof prediction.model_version === "string" ? prediction.model_version : null,
    analysis: typeof prediction.analysis === "string" ? prediction.analysis : "",
    lifestyleRecommendations: asList(prediction.lifestyle_recommendations),
    precautions: asList(prediction.precautions),
    selfTreatmentPlan: asList(prediction.self_treatment_plan),
    doctorType: asList(prediction.doctor_type),
  };
};

module.exports = { buildReportFields, validStage };

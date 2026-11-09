const mongoose = require("mongoose");

const YES_NO = ["Y", "N"];

const reportAnalysisSchema = new mongoose.Schema(
  {
    // The single source of truth for ownership. The user document no longer lists report ids.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    age: Number,
    sex: { type: String, enum: ["male", "female", "other"] },
    files: [String],
    date: Date,

    ascites: { type: String, enum: YES_NO },
    edema: { type: String, enum: ["Y", "S", "N"] },
    spiders: { type: String, enum: YES_NO },
    hepatomegaly: { type: String, enum: YES_NO },
    bilirubin: Number,
    albumin: Number,
    prothrombin: Number,
    platelets: Number,
    sgot: Number,
    copper: Number,
    alk_phos: Number,
    tryglycerides: Number,
    cholesterol: Number,

    stage: { type: Number, min: 1, max: 4 },
    model_version: String,
    analysis: String,
    lifestyle_recommendations: [String],
    precautions: [String],
    self_treatment_plan: [String],
    doctor_type: [String],

    // Set while a report is only a draft (files extracted, not yet analysed); cleared on analysis.
    // MongoDB removes drafts that are never completed once this time passes.
    draftExpiresAt: Date,
  },
  { timestamps: true }
);

reportAnalysisSchema.index({ userId: 1, date: -1 });
reportAnalysisSchema.index({ draftExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ReportAnalysis", reportAnalysisSchema);

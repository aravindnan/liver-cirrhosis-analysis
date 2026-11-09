const mongoose = require("mongoose");

const mriAnalysisSchema = new mongoose.Schema(
  {
    // The single source of truth for ownership. The user document no longer lists image ids.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    age: Number,
    sex: String,
    file: String,
    date: Date,
    analysis: String,
    diagnosis: [String],
    lifestyle_recommendations: [String],
    precautions: [String],
    medical_treatments: [String],
    doctor_type: [String],
  },
  { timestamps: true }
);

mriAnalysisSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model("MRIAnalysis", mriAnalysisSchema);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  // Never returned by default; select it explicitly (+password) when verifying a login.
  password: { type: String, select: false },
  fullName: { type: String },
  age: { type: Number },
  gender: { type: String, enum: ["male", "female", "other"] },
  lastLoginDate: { type: Date },
  reportAnalysisSet: [{ type: mongoose.Schema.Types.ObjectId, ref: "ReportAnalysis" }],
  mriAnalysisSet: [{ type: mongoose.Schema.Types.ObjectId, ref: "MRIAnalysis" }],
});

module.exports = mongoose.model("User", userSchema);

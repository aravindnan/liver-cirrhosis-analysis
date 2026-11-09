const User = require("../model/user");
const ReportAnalysis = require("../model/reportsAnalysis");
const MRIAnalysis = require("../model/mriAnalysis");
const { safeError } = require("../utils/logger");

exports.get_user_by_id = async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // Analyses are found by their owner. Drafts (extracted but never analysed) are hidden.
    const [reports, images] = await Promise.all([
      ReportAnalysis.find({ userId: req.userId, stage: { $ne: null } }).sort({ date: 1 }).lean(),
      MRIAnalysis.find({ userId: req.userId, analysis: { $ne: null } }).sort({ date: 1 }).lean(),
    ]);

    // Same response shape as before: the client reads reportAnalysisSet and mriAnalysisSet.
    res.status(200).json({ ...user, reportAnalysisSet: reports, mriAnalysisSet: images });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "get user failed");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

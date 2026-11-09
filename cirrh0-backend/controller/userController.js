const User = require("../model/user");

exports.get_user_by_id = async (req, res) => {
  try {
    // Drafts (extracted but never analysed) are hidden from history.
    const user = await User.findById(req.userId)
      .populate({ path: "reportAnalysisSet", match: { stage: { $ne: null } } })
      .populate({ path: "mriAnalysisSet", match: { analysis: { $ne: null } } });

    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

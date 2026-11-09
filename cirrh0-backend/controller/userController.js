const { db } = require("../db/client");
const { serializeUser } = require("../utils/serializers");
const { safeError } = require("../utils/logger");

exports.get_user_by_id = async (req, res) => {
  try {
    const user = await db.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Completed analyses only: drafts (files extracted, never analysed) carry a draftExpiresAt.
    const where = { userId: req.userId, draftExpiresAt: null };
    const [reports, images] = await Promise.all([
      db.reportAnalysis.findMany({ where, orderBy: { date: "asc" } }),
      db.imageAnalysis.findMany({ where: { userId: req.userId }, orderBy: { date: "asc" } }),
    ]);

    res.status(200).json(serializeUser(user, reports, images));
  } catch (error) {
    req.log.error({ err: safeError(error) }, "get user failed");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

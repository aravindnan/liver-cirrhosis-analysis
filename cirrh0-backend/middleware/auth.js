const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { JWT_SECRET } = require("../env/dotenv");

// Verifies the Bearer token and exposes the authenticated user id as req.userId.
// Controllers must use req.userId and never trust an id sent by the client.
exports.requireAuth = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (!mongoose.isValidObjectId(payload._id)) throw new Error("invalid subject");
    req.userId = String(payload._id);
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
};

// For routes that carry :userId in the path, reject any id that is not the caller's.
exports.requireSelf = (req, res, next) => {
  if (req.params.userId !== req.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
};

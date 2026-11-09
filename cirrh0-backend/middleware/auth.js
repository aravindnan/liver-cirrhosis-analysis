const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { JWT_SECRET, CLIENT_ORIGINS, COOKIE_SAMESITE, COOKIE_SECURE } = require("../env/dotenv");

const COOKIE_NAME = "cirrh0_session";
const SESSION_MS = 2 * 60 * 60 * 1000;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const cookieOptions = {
  httpOnly: true, // not readable by page scripts, so XSS cannot steal the session
  secure: COOKIE_SECURE || COOKIE_SAMESITE === "none",
  sameSite: COOKIE_SAMESITE,
  path: "/",
};

const readCookie = (req, name) => {
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

exports.setSessionCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_MS });
exports.clearSessionCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions);

// Accepts the HttpOnly session cookie (browser) or a Bearer token (API clients, tests) and exposes
// the authenticated user id as req.userId. Controllers must use req.userId, never a client-sent id.
exports.requireAuth = (req, res, next) => {
  const [scheme, bearer] = (req.headers.authorization || "").split(" ");
  const cookieToken = readCookie(req, COOKIE_NAME);
  const viaBearer = scheme === "Bearer" && !!bearer;
  const token = viaBearer ? bearer : cookieToken;
  if (!token) return res.status(401).json({ error: "Authentication required" });

  // Cookies are sent automatically by browsers, so state-changing requests that rely on one must
  // come from an allowed origin. Bearer tokens are not sent automatically and need no such check.
  if (!viaBearer && !SAFE_METHODS.has(req.method)) {
    const origin = req.headers.origin;
    if (!origin || !CLIENT_ORIGINS.includes(origin)) {
      return res.status(403).json({ error: "Origin not allowed" });
    }
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

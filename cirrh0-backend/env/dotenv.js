const dotenv = require("dotenv");

dotenv.config();

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example`);
  }
  return value;
};

const JWT_SECRET = required("SECRET_KEY");
if (JWT_SECRET.length < 32) {
  throw new Error("SECRET_KEY must be at least 32 characters long");
}

const SAME_SITE = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
if (!["lax", "strict", "none"].includes(SAME_SITE)) {
  throw new Error("COOKIE_SAMESITE must be lax, strict or none");
}

// The model service address can be given once as ML_SERVICE_URL (a host:port such as Render's internal
// "my-ml:10000" is accepted and gets http://), or per endpoint with NLP_BASE_URL, REPORT_BASE_URL and
// IMAGE_BASE_URL. An explicit per-endpoint value wins.
const withScheme = (value) => (/^https?:\/\//i.test(value) ? value : `http://${value}`).replace(/\/+$/, "");
const ML_SERVICE_URL = process.env.ML_SERVICE_URL ? withScheme(process.env.ML_SERVICE_URL.trim()) : "";
const mlEndpoint = (name, path) => process.env[name] || (ML_SERVICE_URL ? `${ML_SERVICE_URL}${path}` : required(name));

// "" (routes at the root, as in development) or a path such as "/api".
const API_BASE_PATH = (process.env.API_BASE_PATH || "").trim().replace(/\/+$/, "");
if (API_BASE_PATH && !API_BASE_PATH.startsWith("/")) throw new Error("API_BASE_PATH must start with /");

module.exports = {
  PORT: Number(process.env.PORT) || 8000,
  // PostgreSQL connection string, for example postgresql://user:password@host:5432/cirrh0
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET,
  NLP_BASE_URL: mlEndpoint("NLP_BASE_URL", "/extract"),
  REPORT_BASE_URL: mlEndpoint("REPORT_BASE_URL", "/predict"),
  IMAGE_BASE_URL: mlEndpoint("IMAGE_BASE_URL", "/image"),
  API_BASE_PATH,
  // Folder holding the built web app (cirrh0/build). When set, the API serves it, so the site and the
  // API share one origin: no CORS, and the login cookie is first-party.
  WEB_DIR: process.env.WEB_DIR ? require("node:path").resolve(process.env.WEB_DIR) : "",
  // Login and register attempts allowed per IP in 15 minutes.
  AUTH_RATE_LIMIT: Number(process.env.AUTH_RATE_LIMIT) || 20,
  // Number of reverse proxies in front of the API (for example 1 behind a load balancer). Without it
  // every user appears to come from the proxy's address and shares one rate-limit bucket.
  TRUST_PROXY: Number(process.env.TRUST_PROXY) || 0,
  ML_SERVICE_TOKEN: process.env.ML_SERVICE_TOKEN || "",
  // Session cookie. In production the cookie is Secure. Use SAMESITE=none only when the web app and
  // API are on different sites (requires Secure, so https); the Origin check then guards against CSRF.
  COOKIE_SAMESITE: (process.env.COOKIE_SAMESITE || "lax").toLowerCase(),
  COOKIE_SECURE: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production",
  // Defaults to the site's own public address on Render (RENDER_EXTERNAL_URL), else the local dev server.
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGINS || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  UPLOAD_HOSTS: (process.env.UPLOAD_HOSTS || "res.cloudinary.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const { CLIENT_ORIGINS, TRUST_PROXY, API_BASE_PATH, WEB_DIR } = require("./env/dotenv");
const { logger, requestId, safeError } = require("./utils/logger");
const { db } = require("./db/client");

// Fail at start-up, not on the first visit, if the web build is missing.
const WEB_INDEX = WEB_DIR ? path.join(WEB_DIR, "index.html") : "";
if (WEB_DIR && !fs.existsSync(WEB_INDEX)) {
  throw new Error(`WEB_DIR is set but ${WEB_INDEX} does not exist. Build the web app first (npm run build in cirrh0).`);
}

// What the built web app loads. Everything is same-origin except Google Fonts (index.html) and
// Cloudinary (report and image uploads and the images shown from them). No inline or remote scripts.
const contentSecurityPolicy = {
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // MUI injects inline styles
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
    connectSrc: ["'self'", "https://api.cloudinary.com"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  },
};

const app = express();

app.disable("x-powered-by");
if (TRUST_PROXY > 0) app.set("trust proxy", TRUST_PROXY);
app.use(
  pinoHttp({
    logger,
    genReqId: requestId, // also sets the X-Request-Id response header
    // Log the method and path only: never query strings, headers or bodies.
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url.split("?")[0] }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
  })
);
app.use(helmet(WEB_DIR ? { contentSecurityPolicy } : {}));
app.use(compression());
app.use(
  cors({
    origin: (origin, cb) => {
      // Non-browser clients send no Origin header; browsers must be on the allowlist.
      if (!origin || CLIENT_ORIGINS.includes(origin)) return cb(null, true);
      const err = new Error("Origin not allowed by CORS");
      err.status = 403;
      return cb(err);
    },
    credentials: true, // lets the browser send the session cookie
  })
);
app.use(express.json({ limit: "100kb" }));

// Liveness and database readiness for load balancers and container orchestrators.
app.get("/healthz", async (req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  } catch (error) {
    req.log.error({ err: { name: error.name } }, "health check failed");
    res.status(503).json({ status: "unavailable" });
  }
});

const api = express.Router();
api.use(require("./routes/auth"));
api.use(require("./routes/user"));
api.use(require("./routes/report"));
api.use(require("./routes/mri"));
app.use(API_BASE_PATH || "/", api);

if (WEB_DIR) {
  // Hashed build files never change, so they can be cached for a year; index.html must always be fresh.
  app.use(
    express.static(WEB_DIR, {
      index: false,
      setHeaders: (res, filePath) => {
        const hashed = filePath.includes(`${path.sep}static${path.sep}`);
        res.setHeader("Cache-Control", hashed ? "public, max-age=31536000, immutable" : "public, max-age=3600");
      },
    })
  );
  const isApiPath = (p) => Boolean(API_BASE_PATH) && (p === API_BASE_PATH || p.startsWith(`${API_BASE_PATH}/`));
  // Any other page address is a route of the single-page app. Missing files (an extension) and
  // unknown API paths stay real 404s instead of returning the page.
  app.get("*", (req, res, next) => {
    if (isApiPath(req.path) || path.extname(req.path) || !req.accepts("html")) return next();
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(WEB_INDEX);
  });
}

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler: one consistent JSON shape, no internal details in the response.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = "Internal Server Error";
  if (err.type === "entity.parse.failed") { status = 400; message = "Invalid JSON body"; }
  else if (err.type === "entity.too.large") { status = 413; message = "Request body too large"; }
  else if (status === 403) message = "Origin not allowed";
  else if (status < 500) message = "Bad request";
  req.log.error({ err: safeError(err), status }, "request failed");
  res.status(status).json({ error: message });
});

module.exports = app;

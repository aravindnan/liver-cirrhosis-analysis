const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const { CLIENT_ORIGINS } = require("./env/dotenv");
const { logger, requestId } = require("./utils/logger");

const app = express();

app.disable("x-powered-by");
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
app.use(helmet());
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

app.use(require("./routes/auth"));
app.use(require("./routes/user"));
app.use(require("./routes/report"));
app.use(require("./routes/mri"));

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
  req.log.error({ err: { name: err.name, message: String(err.message).slice(0, 200) }, status }, "request failed");
  res.status(status).json({ error: message });
});

module.exports = app;

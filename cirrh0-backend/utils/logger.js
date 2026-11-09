const crypto = require("node:crypto");
const pino = require("pino");

const options = {
  level: process.env.LOG_LEVEL || "info",
  // Defence in depth: requests carry credentials, and records carry health data.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.token",
      "*.email",
    ],
    censor: "[redacted]",
  },
};

const buildLogger = (destination, overrides = {}) => pino({ ...options, ...overrides }, destination);
const logger = buildLogger();

// Axios and Mongoose errors carry the request body (lab values) and document values. Never log the
// error object as-is: keep only fields that identify what failed.
const safeError = (err) => ({
  name: err && err.name,
  code: err && err.code,
  status: err && err.response && err.response.status,
  message: err && typeof err.message === "string" ? err.message.slice(0, 200) : undefined,
});

// Reuse a well-formed incoming id so a request can be traced across services; otherwise make one.
const requestId = (req, res) => {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && /^[\w.-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", id);
  return id;
};

module.exports = { logger, buildLogger, safeError, requestId };

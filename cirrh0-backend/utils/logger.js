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

// Errors can carry patient data: axios errors include the request body (lab values), and Prisma
// errors, especially validation errors, print the arguments of the failed query in their message.
// Never log an error object as-is. Keep only fields that identify what failed, and for database
// errors do not log the message at all.
const isDatabaseError = (err) =>
  Boolean(err) && typeof err.name === "string" && err.name.startsWith("PrismaClient");

const safeError = (err) => ({
  name: err && err.name,
  code: err && err.code,
  status: err && err.response && err.response.status,
  message:
    !err || isDatabaseError(err) || typeof err.message !== "string" ? undefined : err.message.slice(0, 200),
});

// Reuse a well-formed incoming id so a request can be traced across services; otherwise make one.
const requestId = (req, res) => {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && /^[\w.-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", id);
  return id;
};

module.exports = { logger, buildLogger, safeError, requestId };

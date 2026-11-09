const { PORT } = require("./env/dotenv");
const { db } = require("./db/client");
const { logger, safeError } = require("./utils/logger");
const { scheduleDraftCleanup } = require("./utils/drafts");
const app = require("./app");

async function main() {
  await db.$connect(); // fail fast if the database is unreachable
  const server = app.listen(PORT, () => logger.info({ port: PORT }, "API listening"));
  scheduleDraftCleanup(db, logger);

  const shutdown = (signal) => {
    logger.info({ signal }, "shutting down");
    server.close(async () => {
      await db.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref(); // do not hang forever on open connections
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  logger.fatal({ err: safeError(error) }, "could not start the API");
  process.exit(1);
});

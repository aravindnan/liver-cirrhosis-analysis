const { PORT } = require("./env/dotenv");
const { connectToDatabase } = require("./database");
const { logger } = require("./utils/logger");
const app = require("./app");

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => logger.info({ port: PORT }, "API listening"));
  })
  .catch((error) => {
    logger.fatal({ message: error.message }, "could not connect to the database");
    process.exit(1);
  });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { PORT, CLIENT_ORIGINS } = require("./env/dotenv");
const { connectToDatabase } = require("./database");

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Non-browser clients send no Origin header; browsers must be on the allowlist.
      if (!origin || CLIENT_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed by CORS"));
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

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Internal Server Error" });
});

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
  })
  .catch((error) => {
    console.error(`Error connecting to the database: ${error.message}`);
    process.exit(1);
  });

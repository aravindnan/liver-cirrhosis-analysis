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

module.exports = {
  PORT: Number(process.env.PORT) || 8000,
  DB_NAME: required("DB_NAME"),
  DB_USERNAME: required("DB_USERNAME"),
  DB_PASSWORD: required("DB_PASSWORD"),
  DB_HOST: process.env.DB_HOST || "cluster0.myusfay.mongodb.net",
  JWT_SECRET,
  NLP_BASE_URL: required("NLP_BASE_URL"),
  REPORT_BASE_URL: required("REPORT_BASE_URL"),
  IMAGE_BASE_URL: required("IMAGE_BASE_URL"),
  ML_SERVICE_TOKEN: process.env.ML_SERVICE_TOKEN || "",
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  UPLOAD_HOSTS: (process.env.UPLOAD_HOSTS || "res.cloudinary.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

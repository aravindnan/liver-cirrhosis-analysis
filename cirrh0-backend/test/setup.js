// Loaded before the app code so env/dotenv.js sees a valid configuration. No database is needed.
process.env.SECRET_KEY = "t".repeat(48);
process.env.DB_NAME = "test";
process.env.DB_USERNAME = "test";
process.env.DB_PASSWORD = "test";
process.env.NLP_BASE_URL = "http://ml.invalid/extract";
process.env.REPORT_BASE_URL = "http://ml.invalid/predict";
process.env.IMAGE_BASE_URL = "http://ml.invalid/image";
process.env.CLIENT_ORIGINS = "http://localhost:3000";
process.env.UPLOAD_HOSTS = "res.cloudinary.com";
process.env.LOG_LEVEL = "silent";

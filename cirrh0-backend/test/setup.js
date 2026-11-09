// Loaded before the app code so env/dotenv.js sees a valid configuration.
process.env.SECRET_KEY = "t".repeat(48);
// Unit tests never reach a database: they stub the Prisma client. Integration tests set
// TEST_DATABASE_URL (see db.integration.test.js) and talk to a real PostgreSQL.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://test:test@127.0.0.1:1/test";
process.env.NLP_BASE_URL = "http://ml.invalid/extract";
process.env.REPORT_BASE_URL = "http://ml.invalid/predict";
process.env.IMAGE_BASE_URL = "http://ml.invalid/image";
process.env.CLIENT_ORIGINS = "http://localhost:3000";
process.env.UPLOAD_HOSTS = "res.cloudinary.com";
process.env.LOG_LEVEL = "silent";
// The integration tests make many sign-ups from one address; the limiter itself is tested separately.
process.env.AUTH_RATE_LIMIT = "100000";

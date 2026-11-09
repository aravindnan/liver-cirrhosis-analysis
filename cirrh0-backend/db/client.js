const { PrismaPg } = require("@prisma/adapter-pg");
// The generated client is TypeScript (`npm run db:generate`, also run on install). Node runs it directly.
const { PrismaClient, Prisma } = require("../generated/prisma/client.ts");
const { DATABASE_URL } = require("../env/dotenv");

// Prisma connects lazily, on the first query, so requiring this module needs no running database.
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL, max: 10 }),
});

module.exports = { db, Prisma };

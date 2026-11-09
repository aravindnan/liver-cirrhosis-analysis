import "dotenv/config";
import { defineConfig } from "prisma/config";

// Used by the Prisma CLI (generate, migrate). The running API reads DATABASE_URL in db/client.js.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});

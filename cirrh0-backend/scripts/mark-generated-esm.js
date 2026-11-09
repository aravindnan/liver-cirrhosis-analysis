// The Prisma client is generated as TypeScript using ES-module syntax, while this API is CommonJS.
// Marking the generated folder as an ES module lets Node load it from require() without re-parsing
// every file and printing a MODULE_TYPELESS_PACKAGE_JSON warning on each start.
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "..", "generated", "prisma");
if (!fs.existsSync(dir)) {
  console.error("generated/prisma not found; run `prisma generate` first");
  process.exit(1);
}
fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module" }, null, 2) + "\n");

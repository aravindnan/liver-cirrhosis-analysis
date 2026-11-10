require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const BASE_ENV = { PATH: process.env.PATH, HOME: process.env.HOME };

// A tiny stand-in for the real build folder (cirrh0/build).
const makeWebDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cirrh0-web-"));
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>Cirrh0</title><div id=root></div>");
  fs.writeFileSync(path.join(dir, "assets", "index-abc123.js"), "console.log('app')");
  fs.writeFileSync(path.join(dir, "favicon.ico"), "ico");
  return dir;
};

// The config is read once at start-up, so each scenario runs the app in its own process.
const runApp = (env) =>
  new Promise((resolve, reject) => {
    const script = `require("./test/setup"); Object.assign(process.env, JSON.parse(process.env.OVERRIDES));
      const app = require("./app"); const s = app.listen(0, "127.0.0.1", () => console.log("PORT " + s.address().port));`;
    const child = spawn(process.execPath, ["-e", script], { cwd: ROOT, env: { ...BASE_ENV, OVERRIDES: JSON.stringify(env) } });
    let out = ""; let err = "";
    child.stdout.on("data", (d) => { out += d; const m = out.match(/PORT (\d+)/); if (m) resolve({ port: Number(m[1]), stop: () => child.kill() }); });
    child.stderr.on("data", (d) => { err += d; });
    child.on("exit", (code) => reject(new Error(`app exited ${code}: ${err.slice(0, 300)}`)));
  });

const get = async (port, p, headers = {}) => {
  const res = await fetch(`http://127.0.0.1:${port}${p}`, { headers, redirect: "manual" });
  return { status: res.status, headers: res.headers, text: await res.text() };
};

test("serving the web build under /api: pages, assets, caching and security headers", async () => {
  const dir = makeWebDir();
  const { port, stop } = await runApp({ WEB_DIR: dir, API_BASE_PATH: "/api" });
  try {
    const home = await get(port, "/", { Accept: "text/html" });
    assert.equal(home.status, 200);
    assert.match(home.text, /<title>Cirrh0<\/title>/);
    assert.equal(home.headers.get("cache-control"), "no-cache", "index.html is always fresh");

    const csp = home.headers.get("content-security-policy");
    assert.match(csp, /script-src 'self'(;|$)/, "scripts only from this origin");
    assert.ok(!/script-src[^;]*unsafe-inline/.test(csp), "no inline scripts");
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /connect-src 'self' https:\/\/api\.cloudinary\.com/);
    assert.match(csp, /img-src[^;]*https:\/\/res\.cloudinary\.com/);
    assert.match(csp, /object-src 'none'/);

    // Every page route of the single-page app returns the page, so reloading /trends works.
    for (const route of ["/trends", "/report-result", "/about", "/login"]) {
      const page = await get(port, route, { Accept: "text/html" });
      assert.equal(page.status, 200, route);
      assert.match(page.text, /<div id=root>/, route);
    }

    const asset = await get(port, "/assets/index-abc123.js");
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("cache-control"), /max-age=31536000, immutable/);
    assert.match(asset.headers.get("content-type"), /javascript/);
    assert.match((await get(port, "/favicon.ico")).headers.get("cache-control"), /max-age=3600/);
  } finally { stop(); }
});

test("API paths under the prefix stay JSON and never return the page", async () => {
  const dir = makeWebDir();
  const { port, stop } = await runApp({ WEB_DIR: dir, API_BASE_PATH: "/api" });
  try {
    const noSession = await get(port, "/api/get-trends", { Accept: "text/html" });
    assert.equal(noSession.status, 401);
    assert.deepEqual(JSON.parse(noSession.text), { error: "Authentication required" });

    const unknown = await get(port, "/api/does-not-exist", { Accept: "text/html" });
    assert.equal(unknown.status, 404);
    assert.deepEqual(JSON.parse(unknown.text), { error: "Not found" });

    const bare = await get(port, "/api", { Accept: "text/html" });
    assert.equal(bare.status, 404);
    assert.ok(!bare.text.includes("<div id=root>"));
  } finally { stop(); }
});

test("missing files and non-HTML requests are real 404s, not the page", async () => {
  const dir = makeWebDir();
  const { port, stop } = await runApp({ WEB_DIR: dir, API_BASE_PATH: "/api" });
  try {
    const missing = await get(port, "/assets/missing.js", { Accept: "*/*" });
    assert.equal(missing.status, 404);
    assert.ok(!missing.text.includes("<div id=root>"));
    const json = await get(port, "/some-page", { Accept: "application/json" });
    assert.equal(json.status, 404);
    assert.deepEqual(JSON.parse(json.text), { error: "Not found" });
  } finally { stop(); }
});

test("files outside the build folder cannot be reached by path tricks", async () => {
  const dir = makeWebDir();
  fs.writeFileSync(path.join(path.dirname(dir), "cirrh0-secret.txt"), "TOP-SECRET");
  const { port, stop } = await runApp({ WEB_DIR: dir, API_BASE_PATH: "/api" });
  try {
    for (const p of ["/..%2fcirrh0-secret.txt", "/assets/..%2f..%2fcirrh0-secret.txt", "/%2e%2e/cirrh0-secret.txt", "/assets/../../cirrh0-secret.txt"]) {
      const res = await get(port, p, { Accept: "*/*" });
      assert.ok(!res.text.includes("TOP-SECRET"), p);
    }
  } finally { stop(); fs.rmSync(path.join(path.dirname(dir), "cirrh0-secret.txt"), { force: true }); }
});

test("without WEB_DIR the API is JSON only", async () => {
  const { port, stop } = await runApp({});
  try {
    const home = await get(port, "/", { Accept: "text/html" });
    assert.equal(home.status, 404);
    assert.deepEqual(JSON.parse(home.text), { error: "Not found" });
  } finally { stop(); }
});

test("start-up fails clearly when WEB_DIR has no build in it", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "cirrh0-empty-"));
  const r = spawnSync(process.execPath, ["-e", `require("./test/setup"); process.env.WEB_DIR = ${JSON.stringify(empty)}; require("./app");`], { cwd: ROOT, env: BASE_ENV, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /WEB_DIR is set but .*index\.html does not exist/);
});

// ---- configuration ---------------------------------------------------------------------
const config = (env, expr = "require('./env/dotenv')") => {
  const r = spawnSync(process.execPath, ["-e", `require("./test/setup"); for (const [k, v] of Object.entries(JSON.parse(process.env.OVERRIDES))) { if (v === null) delete process.env[k]; else process.env[k] = v; } console.log(JSON.stringify(${expr}));`], { cwd: ROOT, env: { ...BASE_ENV, OVERRIDES: JSON.stringify(env) }, encoding: "utf8" });
  return { status: r.status, out: r.stdout.trim() ? JSON.parse(r.stdout.trim()) : null, err: r.stderr };
};
const noMl = { NLP_BASE_URL: null, REPORT_BASE_URL: null, IMAGE_BASE_URL: null };

test("one ML_SERVICE_URL fills all three endpoints, with or without a scheme or trailing slash", () => {
  let c = config({ ...noMl, ML_SERVICE_URL: "cirrh0-ml:10000" }).out; // Render's internal host:port form
  assert.deepEqual([c.NLP_BASE_URL, c.REPORT_BASE_URL, c.IMAGE_BASE_URL], ["http://cirrh0-ml:10000/extract", "http://cirrh0-ml:10000/predict", "http://cirrh0-ml:10000/image"]);
  c = config({ ...noMl, ML_SERVICE_URL: "https://ml.example.com/" }).out;
  assert.equal(c.REPORT_BASE_URL, "https://ml.example.com/predict");
});

test("an explicit endpoint wins over ML_SERVICE_URL", () => {
  const c = config({ ...noMl, ML_SERVICE_URL: "ml:1", NLP_BASE_URL: "http://elsewhere/extract" }).out;
  assert.equal(c.NLP_BASE_URL, "http://elsewhere/extract");
  assert.equal(c.REPORT_BASE_URL, "http://ml:1/predict");
});

test("with no ML address at all the API refuses to start and says what is missing", () => {
  const r = config({ ...noMl, ML_SERVICE_URL: null });
  assert.notEqual(r.status, 0);
  assert.match(r.err, /Missing required environment variable: NLP_BASE_URL/);
});

test("API_BASE_PATH is normalised and validated", () => {
  assert.equal(config({ API_BASE_PATH: "/api/" }).out.API_BASE_PATH, "/api");
  assert.equal(config({ API_BASE_PATH: null }).out.API_BASE_PATH, "");
  const bad = config({ API_BASE_PATH: "api" });
  assert.notEqual(bad.status, 0);
  assert.match(bad.err, /API_BASE_PATH must start with/);
});

test("the allowed origin defaults to Render's public URL, then to the local dev server", () => {
  assert.deepEqual(config({ CLIENT_ORIGINS: null, RENDER_EXTERNAL_URL: "https://cirrh0.onrender.com" }).out.CLIENT_ORIGINS, ["https://cirrh0.onrender.com"]);
  assert.deepEqual(config({ CLIENT_ORIGINS: "https://app.example.com, https://b.example.com", RENDER_EXTERNAL_URL: "https://cirrh0.onrender.com" }).out.CLIENT_ORIGINS, ["https://app.example.com", "https://b.example.com"]);
  assert.deepEqual(config({ CLIENT_ORIGINS: null, RENDER_EXTERNAL_URL: null }).out.CLIENT_ORIGINS, ["http://localhost:3000"]);
});

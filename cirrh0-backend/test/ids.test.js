require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { isUuid } = require("../utils/ids");

test("accepts UUIDs and rejects everything else", () => {
  assert.equal(isUuid("3f2b8c1e-9a4d-4e57-8b6a-1c2d3e4f5a6b"), true);
  assert.equal(isUuid("3F2B8C1E-9A4D-4E57-8B6A-1C2D3E4F5A6B"), true);
  for (const bad of ["64b7f0f2a1b2c3d4e5f60718", "not-a-uuid", "", "new-report", undefined, null, 42, {}, ["3f2b8c1e-9a4d-4e57-8b6a-1c2d3e4f5a6b"], "3f2b8c1e-9a4d-4e57-8b6a-1c2d3e4f5a6b'; DROP TABLE users;--"]) {
    assert.equal(isUuid(bad), false, String(bad));
  }
});

require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateLabData, isAllowedUploadUrl, validateRegistration } = require("../utils/validate");

const lab = {
  age: "55", bilirubin: "1.2", albumin: "3.8", prothrombin: "11", copper: "80", alk_phos: "300",
  platelets: "200", sgot: "40", tryglycerides: "120", cholesterol: "180",
  ascites: "N", spiders: "N", hepatomegaly: "Y", edema: "N", sex: "male",
};

test("accepts a complete set of lab values and coerces numbers", () => {
  const r = validateLabData(lab);
  assert.equal(r.ok, true);
  assert.equal(r.value.bilirubin, 1.2);
  assert.equal(typeof r.value.age, "number");
});

test("rejects missing, non-numeric and out-of-range values with a useful message", () => {
  assert.match(validateLabData({ ...lab, copper: "" }).error, /copper/);
  assert.match(validateLabData({ ...lab, sgot: "<5" }).error, /sgot/);
  assert.match(validateLabData({ ...lab, platelets: "200000" }).error, /platelets must be between/);
  assert.match(validateLabData({ ...lab, albumin: "NaN" }).error, /albumin/);
  assert.match(validateLabData({ ...lab, age: -1 }).error, /age/);
});

test("rejects invalid categorical values", () => {
  assert.match(validateLabData({ ...lab, ascites: "maybe" }).error, /ascites/);
  assert.match(validateLabData({ ...lab, edema: "X" }).error, /edema/);
  assert.match(validateLabData({ ...lab, sex: "robot" }).error, /sex/);
  assert.equal(validateLabData(null).ok, false);
});

test("upload URL allowlist blocks SSRF-style URLs", () => {
  assert.equal(isAllowedUploadUrl("https://res.cloudinary.com/demo/raw/upload/a.pdf"), true);
  for (const url of [
    "http://res.cloudinary.com/a.pdf",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost:8000/x",
    "https://res.cloudinary.com.evil.io/a.pdf",
    "https://user@evil.io@res.cloudinary.com/a.pdf",
    "https://res.cloudinary.com:8443/a.pdf",
    "file:///etc/passwd",
    "not a url",
    undefined,
  ]) {
    assert.equal(isAllowedUploadUrl(url), false, String(url));
  }
});

test("registration validation", () => {
  const ok = { username: "abc_1", email: "a@b.co", password: "12345678", fullName: "A B", gender: "female", age: 30 };
  assert.equal(validateRegistration(ok), null);
  assert.match(validateRegistration({ ...ok, username: "ab" }), /Username/);
  assert.match(validateRegistration({ ...ok, email: "nope" }), /email/i);
  assert.match(validateRegistration({ ...ok, password: "short" }), /Password/);
  assert.match(validateRegistration({ ...ok, gender: "x" }), /gender/i);
  assert.match(validateRegistration({ ...ok, age: 5 }), /Age/);
  assert.match(validateRegistration({ ...ok, username: { $ne: "" } }), /Username/); // NoSQL operator injection
});

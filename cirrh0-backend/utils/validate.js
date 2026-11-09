const { UPLOAD_HOSTS } = require("../env/dotenv");

const NUMERIC_RANGES = {
  age: [1, 120],
  bilirubin: [0, 100],
  albumin: [0, 10],
  prothrombin: [0, 100],
  copper: [0, 1000],
  alk_phos: [0, 20000],
  platelets: [0, 2000],
  sgot: [0, 5000],
  tryglycerides: [0, 5000],
  cholesterol: [0, 2000],
};
// Optional: not needed by the stage model, but it enables the FIB-4 score.
const OPTIONAL_NUMERIC_RANGES = { alt: [0, 5000] };
const YES_NO = ["Y", "N"];
const EDEMA = ["Y", "S", "N"];
const SEX = ["male", "female", "other"];

// Returns { ok: true, value } with numbers coerced, or { ok: false, error }.
exports.validateLabData = (input) => {
  if (!input || typeof input !== "object") return { ok: false, error: "Missing lab values" };
  const value = {};
  for (const [field, [min, max]] of Object.entries(NUMERIC_RANGES)) {
    const raw = input[field];
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
    if (raw === "" || raw === null || raw === undefined || !Number.isFinite(n)) {
      return { ok: false, error: `${field} must be a number` };
    }
    if (n < min || n > max) {
      return { ok: false, error: `${field} must be between ${min} and ${max}` };
    }
    value[field] = n;
  }
  for (const [field, [min, max]] of Object.entries(OPTIONAL_NUMERIC_RANGES)) {
    const raw = input[field];
    if (raw === "" || raw === null || raw === undefined) continue;
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (!Number.isFinite(n) || n < min || n > max) {
      return { ok: false, error: `${field} must be a number between ${min} and ${max}, or left empty` };
    }
    value[field] = n;
  }
  for (const field of ["ascites", "spiders", "hepatomegaly"]) {
    if (!YES_NO.includes(input[field])) return { ok: false, error: `${field} must be Y or N` };
    value[field] = input[field];
  }
  if (!EDEMA.includes(input.edema)) return { ok: false, error: "edema must be Y, S or N" };
  value.edema = input.edema;
  if (!SEX.includes(input.sex)) return { ok: false, error: "sex must be male, female or other" };
  value.sex = input.sex;
  return { ok: true, value };
};

// Only https URLs on the configured upload hosts may be forwarded to the ML service.
exports.isAllowedUploadUrl = (candidate) => {
  try {
    const url = new URL(candidate);
    return (
      url.protocol === "https:" &&
      UPLOAD_HOSTS.includes(url.hostname.toLowerCase()) &&
      !url.username &&
      !url.password &&
      (url.port === "" || url.port === "443")
    );
  } catch (e) {
    return false;
  }
};

exports.validateRegistration = (body) => {
  const { username, email, password, fullName, gender, age } = body || {};
  const str = (v) => typeof v === "string";
  if (!str(username) || !/^[A-Za-z0-9_.-]{3,30}$/.test(username))
    return "Username must be 3-30 characters (letters, numbers, . _ -)";
  if (!str(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return "Invalid email format";
  if (!str(password) || password.length < 8 || password.length > 128)
    return "Password must be 8-128 characters";
  if (!str(fullName) || fullName.trim().length < 1 || fullName.length > 100)
    return "Full name is required";
  if (!SEX.includes(gender)) return "Invalid gender";
  const n = Number(age);
  if (!Number.isFinite(n) || n < 10 || n > 120) return "Age must be between 10 and 120";
  return null;
};

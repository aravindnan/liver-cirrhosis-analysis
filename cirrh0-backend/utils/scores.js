// Guideline scores computed deterministically from the user's own lab values.
// No machine learning and no LLM is involved: the same inputs always give the same numbers.
//
// Bands describe the level of concern: "low", "intermediate" or "high". They support a
// conversation with a doctor and are not a diagnosis.

const SCORES_VERSION = "2026-11";

// Most labs use about 40 U/L as the upper limit of normal for AST; APRI needs the lab's own value.
const AST_ULN_DEFAULT = 40;
// bilirubin: mg/dL x 17.104 = umol/L. albumin: g/dL x 10 = g/L.
const BILIRUBIN_MGDL_TO_UMOLL = 17.104;

const round = (n, places = 2) => Number(n.toFixed(places));

const unavailable = (id, name, reason) => ({ id, name, value: null, band: null, unavailableReason: reason });

// FIB-4 (Sterling 2006). Age x AST / (platelets x sqrt(ALT)). Platelets in 10^9/L (= 10^3/uL).
// Cut-offs follow McPherson 2017: below 1.3 low, above 2.67 high, and below 2.0 counts as low from
// age 65 because the age term pushes scores up in older adults. Sterling's original cut-offs were
// 1.45 and 3.25 (HIV/hepatitis C). Less reliable under 35 and during acute illness.
const fib4 = ({ age, sgot, alt, platelets }) => {
  if (alt === undefined || alt === null) {
    return unavailable("fib4", "FIB-4", "Add your ALT (SGPT) result to calculate FIB-4.");
  }
  if (!(alt > 0) || !(platelets > 0)) return unavailable("fib4", "FIB-4", "ALT and platelets must be above zero.");
  // Bands use the displayed (2 decimal) value so a shown score always agrees with its band.
  const value = round((age * sgot) / (platelets * Math.sqrt(alt)));
  const lowCutoff = age >= 65 ? 2.0 : 1.3;
  const highCutoff = 2.67;
  const band = value < lowCutoff ? "low" : value > highCutoff ? "high" : "intermediate";
  return {
    id: "fib4",
    name: "FIB-4",
    purpose: "Screens for advanced liver scarring (fibrosis) using age, AST, ALT and platelets.",
    value,
    band,
    bandLabel: { low: "Low risk of advanced fibrosis", intermediate: "Indeterminate", high: "High risk of advanced fibrosis" }[band],
    meaning: {
      low: "Advanced scarring is unlikely. Your doctor may repeat the test every few years.",
      intermediate: "The result does not settle the question. A second test such as an elastography scan is usually suggested.",
      high: "Advanced scarring is more likely. Please see a liver specialist for further tests.",
    }[band],
    formula: "Age × AST ÷ (platelets × √ALT)",
    cutoffs: `Below ${lowCutoff}: low. ${lowCutoff} to ${highCutoff}: indeterminate. Above ${highCutoff}: high.${age >= 65 ? " The lower cut-off is 2.0 from age 65." : ""}`,
    inputs: { age, "AST (U/L)": sgot, "ALT (U/L)": alt, "Platelets (10³/µL)": platelets },
    caveats: [
      "Validated mainly in hepatitis C and fatty liver disease, not in primary biliary cholangitis.",
      "Less reliable under age 35 and during acute illness.",
    ],
    source: "Sterling 2006, Hepatology; cut-offs from McPherson 2017, Gut",
  };
};

// APRI (Wai 2003). (AST / upper limit of normal) / platelets x 100. Platelets in 10^9/L.
// Thresholds follow the WHO hepatitis B guidance: above 0.5 suggests significant fibrosis and
// above 2.0 suggests cirrhosis. They vary by cause of liver disease and between studies.
const apri = ({ sgot, platelets }) => {
  if (!(platelets > 0)) return unavailable("apri", "APRI", "Platelets must be above zero.");
  const value = round((sgot / AST_ULN_DEFAULT / platelets) * 100);
  const band = value < 0.5 ? "low" : value > 2.0 ? "high" : "intermediate";
  return {
    id: "apri",
    name: "APRI",
    purpose: "Estimates liver scarring from AST and platelets.",
    value,
    band,
    bandLabel: { low: "Below the screening threshold", intermediate: "Possible significant fibrosis", high: "Possible cirrhosis" }[band],
    meaning: {
      low: "Significant scarring is less likely.",
      intermediate: "Some scarring is possible. Confirmation with another test is usually suggested.",
      high: "Cirrhosis is possible. Please see a liver specialist.",
    }[band],
    formula: `(AST ÷ ${AST_ULN_DEFAULT}) ÷ platelets × 100`,
    cutoffs: "Below 0.5: low. 0.5 to 2.0: intermediate. Above 2.0: high.",
    inputs: { "AST (U/L)": sgot, "AST upper limit of normal (U/L), assumed": AST_ULN_DEFAULT, "Platelets (10³/µL)": platelets },
    caveats: [
      `Assumes an AST upper limit of normal of ${AST_ULN_DEFAULT} U/L. Your lab's own limit may differ.`,
      "Thresholds depend on the cause of liver disease and the study, and can miss or over-call fibrosis.",
    ],
    source: "Wai 2003, Hepatology; thresholds from WHO hepatitis B guidance",
  };
};

// ALBI (Johnson 2015). 0.66 x log10(bilirubin umol/L) - 0.085 x albumin g/L.
// Grade 1: -2.60 or lower. Grade 2: above -2.60 up to -1.39. Grade 3: above -1.39.
// It describes how well the liver is working, not how scarred it is.
const albi = ({ bilirubin, albumin }) => {
  if (!(bilirubin > 0) || !(albumin > 0)) return unavailable("albi", "ALBI", "Bilirubin and albumin must be above zero.");
  const value = round(0.66 * Math.log10(bilirubin * BILIRUBIN_MGDL_TO_UMOLL) - 0.085 * (albumin * 10));
  const grade = value <= -2.6 ? 1 : value <= -1.39 ? 2 : 3;
  const band = { 1: "low", 2: "intermediate", 3: "high" }[grade];
  return {
    id: "albi",
    name: "ALBI",
    purpose: "Describes how well the liver is working, from bilirubin and albumin.",
    value,
    band,
    grade,
    bandLabel: `Grade ${grade}`,
    meaning: {
      1: "Liver function looks well preserved on these two tests.",
      2: "Liver function is somewhat reduced. Discuss it with your doctor.",
      3: "Liver function is markedly reduced. Please see a liver specialist soon.",
    }[grade],
    formula: "0.66 × log10(bilirubin in µmol/L) − 0.085 × (albumin in g/L)",
    cutoffs: "Grade 1: −2.60 or lower. Grade 2: above −2.60 to −1.39. Grade 3: above −1.39.",
    inputs: { "Bilirubin (mg/dL)": bilirubin, "Albumin (g/dL)": albumin },
    caveats: ["Developed in liver cancer patients and used more widely since. It does not measure scarring."],
    source: "Johnson 2015, Journal of Clinical Oncology",
  };
};

// Returns every score; ones that cannot be calculated say why.
const computeScores = (labs) => [fib4(labs), apri(labs), albi(labs)];

module.exports = { computeScores, fib4, apri, albi, SCORES_VERSION, AST_ULN_DEFAULT };

// Maps database rows to the JSON the web app consumes, and back for lab values.
// The database uses camelCase and `id`; the HTTP API keeps its existing snake_case field names.
// Nothing sensitive (password hash, draft timers) is ever copied into a response.

const list = (v) => (Array.isArray(v) ? v : []);

const serializeReport = (r) => ({
  id: r.id,
  userId: r.userId,
  age: r.age ?? null,
  sex: r.sex ?? null,
  files: list(r.files),
  date: r.date,
  ascites: r.ascites ?? null,
  edema: r.edema ?? null,
  spiders: r.spiders ?? null,
  hepatomegaly: r.hepatomegaly ?? null,
  bilirubin: r.bilirubin ?? null,
  albumin: r.albumin ?? null,
  prothrombin: r.prothrombin ?? null,
  platelets: r.platelets ?? null,
  sgot: r.sgot ?? null,
  alt: r.alt ?? null,
  copper: r.copper ?? null,
  alk_phos: r.alkPhos ?? null,
  tryglycerides: r.triglycerides ?? null, // API name kept for the web app; the column is spelled correctly
  cholesterol: r.cholesterol ?? null,
  stage: r.stage ?? null,
  model_version: r.modelVersion ?? null,
  analysis: r.analysis ?? null,
  lifestyle_recommendations: list(r.lifestyleRecommendations),
  precautions: list(r.precautions),
  self_treatment_plan: list(r.selfTreatmentPlan),
  doctor_type: list(r.doctorType),
  scores: Array.isArray(r.scores) ? r.scores : [],
  scores_version: r.scoresVersion ?? null,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const serializeImage = (i) => ({
  id: i.id,
  userId: i.userId,
  age: i.age ?? null,
  sex: i.sex ?? null,
  file: i.file ?? null,
  date: i.date,
  analysis: i.analysis ?? null,
  diagnosis: list(i.diagnosis),
  lifestyle_recommendations: list(i.lifestyleRecommendations),
  precautions: list(i.precautions),
  medical_treatments: list(i.medicalTreatments),
  doctor_type: list(i.doctorType),
  createdAt: i.createdAt,
});

// Profile with the user's completed analyses, the shape the profile page reads.
const serializeUser = (u, reports = [], images = []) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  fullName: u.fullName,
  age: u.age ?? null,
  gender: u.gender ?? null,
  lastLoginDate: u.lastLoginAt ?? null,
  createdAt: u.createdAt,
  reportAnalysisSet: reports.map(serializeReport),
  mriAnalysisSet: images.map(serializeImage),
});

// Validated lab values (API names) to database column values.
const labsToColumns = (labs) => {
  const { alk_phos, tryglycerides, ...rest } = labs;
  return {
    ...rest,
    age: Math.round(labs.age), // the column is an integer; ages are whole years
    alkPhos: alk_phos,
    triglycerides: tryglycerides,
  };
};

module.exports = { serializeReport, serializeImage, serializeUser, labsToColumns };

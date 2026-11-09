const { db } = require("../db/client");
const { NLP_BASE_URL, REPORT_BASE_URL } = require("../env/dotenv");
const { validateLabData, isAllowedUploadUrl } = require("../utils/validate");
const ml = require("../utils/mlClient");
const { buildReportFields, validStage } = require("../utils/reportFields");
const { serializeReport } = require("../utils/serializers");
const { buildTrends } = require("../utils/trends");
const { isUuid } = require("../utils/ids");
const { DRAFT_TTL_MS } = require("../utils/drafts");
const { safeError } = require("../utils/logger");

const MAX_FILES = 10;

exports.report_add_files = async (req, res) => {
  try {
    const { fileURLSet } = req.body || {};
    if (
      !Array.isArray(fileURLSet) ||
      fileURLSet.length < 1 ||
      fileURLSet.length > MAX_FILES ||
      !fileURLSet.every(isAllowedUploadUrl)
    ) {
      return res
        .status(400)
        .json({ extractSuccess: false, error: `Provide 1-${MAX_FILES} uploaded report files` });
    }

    // Extract first so a failed extraction does not leave an empty record behind.
    const { data: extractedData } = await ml.post(NLP_BASE_URL, { pdf_urls: fileURLSet }, 60000);

    const report = await db.reportAnalysis.create({
      data: {
        userId: req.userId,
        files: fileURLSet,
        date: new Date(),
        draftExpiresAt: new Date(Date.now() + DRAFT_TTL_MS),
      },
    });

    res.json({ extractSuccess: true, extractedData, reportId: report.id });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "report extraction failed");
    res.status(502).json({ extractSuccess: false, error: "Could not read the uploaded reports" });
  }
};

exports.analyze_report = async (req, res) => {
  try {
    const { reportId, validatedData } = req.body || {};

    const checked = validateLabData(validatedData);
    if (!checked.ok) return res.status(400).json({ analysisSuccess: false, error: checked.error });

    let existing = null;
    if (reportId !== "new-report") {
      if (!isUuid(reportId)) return res.status(404).json({ error: "Report not found" });
      existing = await db.reportAnalysis.findFirst({ where: { id: reportId, userId: req.userId } });
      if (!existing) return res.status(404).json({ error: "Report not found" });
    }

    // The guideline scores need no ML, so a model outage must not lose the analysis: save the scores
    // and report that the model estimate was unavailable.
    let prediction = null;
    try {
      ({ data: prediction } = await ml.post(REPORT_BASE_URL, checked.value, 60000));
      if (!validStage(prediction)) throw new Error("Prediction service returned an invalid stage");
    } catch (mlError) {
      prediction = null;
      req.log.warn({ err: safeError(mlError) }, "stage model unavailable; saving guideline scores only");
    }
    const modelAvailable = prediction !== null;

    const fields = buildReportFields(checked.value, prediction);
    // Analysed, so it is no longer a draft.
    const report = existing
      ? await db.reportAnalysis.update({ where: { id: existing.id }, data: { ...fields, draftExpiresAt: null } })
      : await db.reportAnalysis.create({ data: { ...fields, userId: req.userId, files: [], draftExpiresAt: null } });

    res.json({ reportResult: serializeReport(report), analysisSuccess: true, reportId: report.id, modelAvailable });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "report analysis failed");
    res.status(502).json({ analysisSuccess: false, error: "Analysis failed. Please try again." });
  }
};

// Score and lab history for the signed-in user, for the trends page.
exports.get_trends = async (req, res) => {
  try {
    const rows = await db.reportAnalysis.findMany({
      where: { userId: req.userId, draftExpiresAt: null },
      orderBy: { date: "asc" },
      take: 200,
    });
    res.status(200).json(buildTrends(rows.map(serializeReport)));
  } catch (error) {
    req.log.error({ err: safeError(error) }, "trends request failed");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.get_report = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = isUuid(reportId)
      ? await db.reportAnalysis.findFirst({ where: { id: reportId, userId: req.userId } })
      : null;
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.status(200).json({ report: serializeReport(report) });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "report request failed");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.delete_report = async (req, res) => {
  try {
    const { reportId } = req.params;
    // Scoped to the owner in the query itself, so another user's id simply matches nothing.
    const { count } = isUuid(reportId)
      ? await db.reportAnalysis.deleteMany({ where: { id: reportId, userId: req.userId } })
      : { count: 0 };
    if (count === 0) return res.status(404).json({ message: "Report not found", deleteSuccess: false });
    res.status(200).json({ message: "Report deleted successfully", deleteSuccess: true });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "report delete failed");
    res.status(500).json({ error: "Internal Server Error", deleteSuccess: false });
  }
};

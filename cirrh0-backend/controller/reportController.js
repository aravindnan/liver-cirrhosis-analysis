const mongoose = require("mongoose");
const ReportAnalysis = require("../model/reportsAnalysis");
const User = require("../model/user");
const { NLP_BASE_URL, REPORT_BASE_URL } = require("../env/dotenv");
const { validateLabData, isAllowedUploadUrl } = require("../utils/validate");
const ml = require("../utils/mlClient");

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

    const report = await new ReportAnalysis({
      userId: req.userId,
      files: fileURLSet,
      date: new Date(),
    }).save();
    await User.findByIdAndUpdate(req.userId, { $push: { reportAnalysisSet: report._id } });

    res.json({ extractSuccess: true, extractedData, reportId: report._id });
  } catch (error) {
    console.error("Extract failure:", error.message);
    res.status(502).json({ extractSuccess: false, error: "Could not read the uploaded reports" });
  }
};

exports.analyze_report = async (req, res) => {
  try {
    const { reportId, validatedData } = req.body || {};

    const checked = validateLabData(validatedData);
    if (!checked.ok) return res.status(400).json({ analysisSuccess: false, error: checked.error });

    let report = null;
    if (reportId !== "new-report") {
      if (!mongoose.isValidObjectId(reportId)) return res.status(404).json({ error: "Report not found" });
      report = await ReportAnalysis.findOne({ _id: reportId, userId: req.userId });
      if (!report) return res.status(404).json({ error: "Report not found" });
    }

    // Predict before writing anything so a failure leaves no half-filled record.
    const { data: prediction } = await ml.post(REPORT_BASE_URL, checked.value, 60000);
    if (!prediction || !Number.isInteger(prediction.stage) || prediction.stage < 1 || prediction.stage > 4) {
      throw new Error("Prediction service returned an invalid stage");
    }

    const fields = {
      ...checked.value,
      date: new Date(),
      analysis: typeof prediction.analysis === "string" ? prediction.analysis : "",
      stage: prediction.stage,
      lifestyle_recommendations: ml.asList(prediction.lifestyle_recommendations),
      precautions: ml.asList(prediction.precautions),
      self_treatment_plan: ml.asList(prediction.self_treatment_plan),
      doctor_type: ml.asList(prediction.doctor_type),
    };

    if (report) {
      report.set(fields);
    } else {
      report = new ReportAnalysis({ ...fields, userId: req.userId, files: [] });
    }
    const isNew = report.isNew;
    await report.save();
    if (isNew) await User.findByIdAndUpdate(req.userId, { $push: { reportAnalysisSet: report._id } });

    res.json({ reportResult: report, analysisSuccess: true, reportId: report._id });
  } catch (error) {
    console.error("Analyze report failure:", error.message);
    res.status(502).json({ analysisSuccess: false, error: "Analysis failed. Please try again." });
  }
};

exports.get_report = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = mongoose.isValidObjectId(reportId)
      ? await ReportAnalysis.findOne({ _id: reportId, userId: req.userId })
      : null;
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.status(200).json({ report });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.delete_report = async (req, res) => {
  try {
    const { reportId } = req.params;
    const deleted = mongoose.isValidObjectId(reportId)
      ? await ReportAnalysis.findOneAndDelete({ _id: reportId, userId: req.userId })
      : null;
    if (!deleted) return res.status(404).json({ message: "Report not found", deleteSuccess: false });

    await User.findByIdAndUpdate(req.userId, { $pull: { reportAnalysisSet: deleted._id } });
    res.status(200).json({ message: "Report deleted successfully", deleteSuccess: true });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error", deleteSuccess: false });
  }
};

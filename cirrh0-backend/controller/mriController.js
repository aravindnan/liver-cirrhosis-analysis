const mongoose = require("mongoose");
const MRIAnalysis = require("../model/mriAnalysis");
const User = require("../model/user");
const { IMAGE_BASE_URL } = require("../env/dotenv");
const { isAllowedUploadUrl } = require("../utils/validate");
const ml = require("../utils/mlClient");

exports.analyze_mri = async (req, res) => {
  try {
    const { imageURL, sex, age } = req.body || {};
    if (!isAllowedUploadUrl(imageURL)) {
      return res.status(400).json({ analysisSuccess: false, error: "Provide an uploaded image" });
    }

    // Analyse first so a failure does not leave an empty record behind.
    const { data: result } = await ml.post(IMAGE_BASE_URL, { image_url: imageURL, age, sex }, 90000);
    if (!result || typeof result !== "object" || typeof result.analysis !== "string") {
      throw new Error("Image service returned an invalid response");
    }

    const mri = await new MRIAnalysis({
      userId: req.userId,
      file: imageURL,
      age: Number.isFinite(Number(age)) ? Number(age) : undefined,
      sex: typeof sex === "string" ? sex : undefined,
      date: new Date(),
      analysis: result.analysis,
      diagnosis: ml.asList(result.diagnosis),
      lifestyle_recommendations: ml.asList(result.lifestyle_recommendations),
      precautions: ml.asList(result.precautions),
      medical_treatments: ml.asList(result.medical_treatments),
      doctor_type: ml.asList(result.doctor_type),
    }).save();
    await User.findByIdAndUpdate(req.userId, { $push: { mriAnalysisSet: mri._id } });

    res.json({ mriResult: mri, analysisSuccess: true, mriId: mri._id });
  } catch (error) {
    console.error("Analyze image failure:", error.message);
    res.status(502).json({ analysisSuccess: false, error: "Analysis failed. Please try again." });
  }
};

exports.get_mri = async (req, res) => {
  try {
    const { mriId } = req.params;
    const mriReport = mongoose.isValidObjectId(mriId)
      ? await MRIAnalysis.findOne({ _id: mriId, userId: req.userId })
      : null;
    if (!mriReport) return res.status(404).json({ message: "MRI report not found" });
    res.status(200).json({ mriReport });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.delete_mri = async (req, res) => {
  try {
    const { mriId } = req.params;
    const deleted = mongoose.isValidObjectId(mriId)
      ? await MRIAnalysis.findOneAndDelete({ _id: mriId, userId: req.userId })
      : null;
    if (!deleted) return res.status(404).json({ message: "MRI report not found", deleteSuccess: false });

    await User.findByIdAndUpdate(req.userId, { $pull: { mriAnalysisSet: deleted._id } });
    res.status(200).json({ message: "MRI report was deleted successfully", deleteSuccess: true });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error", deleteSuccess: false });
  }
};

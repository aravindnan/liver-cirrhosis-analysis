const { db } = require("../db/client");
const { IMAGE_BASE_URL } = require("../env/dotenv");
const { isAllowedUploadUrl } = require("../utils/validate");
const ml = require("../utils/mlClient");
const { serializeImage } = require("../utils/serializers");
const { isUuid } = require("../utils/ids");
const { safeError } = require("../utils/logger");

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

    const numericAge = Number(age);
    const image = await db.imageAnalysis.create({
      data: {
        userId: req.userId,
        file: imageURL,
        age: Number.isFinite(numericAge) ? Math.round(numericAge) : null,
        sex: typeof sex === "string" ? sex : null,
        date: new Date(),
        analysis: result.analysis,
        diagnosis: ml.asList(result.diagnosis),
        lifestyleRecommendations: ml.asList(result.lifestyle_recommendations),
        precautions: ml.asList(result.precautions),
        medicalTreatments: ml.asList(result.medical_treatments),
        doctorType: ml.asList(result.doctor_type),
      },
    });

    res.json({ mriResult: serializeImage(image), analysisSuccess: true, mriId: image.id });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "image analysis failed");
    res.status(502).json({ analysisSuccess: false, error: "Analysis failed. Please try again." });
  }
};

exports.get_mri = async (req, res) => {
  try {
    const { mriId } = req.params;
    const image = isUuid(mriId)
      ? await db.imageAnalysis.findFirst({ where: { id: mriId, userId: req.userId } })
      : null;
    if (!image) return res.status(404).json({ message: "MRI report not found" });
    res.status(200).json({ mriReport: serializeImage(image) });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "image request failed");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.delete_mri = async (req, res) => {
  try {
    const { mriId } = req.params;
    const { count } = isUuid(mriId)
      ? await db.imageAnalysis.deleteMany({ where: { id: mriId, userId: req.userId } })
      : { count: 0 };
    if (count === 0) return res.status(404).json({ message: "MRI report not found", deleteSuccess: false });
    res.status(200).json({ message: "MRI report was deleted successfully", deleteSuccess: true });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "image delete failed");
    res.status(500).json({ error: "Internal Server Error", deleteSuccess: false });
  }
};

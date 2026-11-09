const express = require("express");
const mriController = require("../controller/mriController");
const { requireAuth, requireSelf } = require("../middleware/auth");

const mriRouter = express.Router();

mriRouter.post("/analyze-mri/:userId", requireAuth, requireSelf, mriController.analyze_mri);
mriRouter.get("/get-mri-by-id/:mriId", requireAuth, mriController.get_mri);
mriRouter.delete("/delete-mri-by-id/:mriId", requireAuth, mriController.delete_mri);

module.exports = mriRouter;

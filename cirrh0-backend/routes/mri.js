const express = require("express");
const mriRouter = express.Router();
const mriController = require("../controller/mriController");

// Register a new user
mriRouter.post("/analyze-mri/:userId", mriController.analyze_mri)

// get mri
mriRouter.get("/get-mri-by-id/:mriId",mriController.get_mri)

// Delete  report
mriRouter.delete("/delete-mri-by-id/:mriId",mriController.delete_mri)

module.exports = mriRouter;

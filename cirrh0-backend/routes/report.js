const express = require("express");
const reportRouter = express.Router();
const reportController = require("../controller/reportController");

// Add file to report
reportRouter.post("/add-files-to-report/:userId", reportController.report_add_files);

// analyse report
reportRouter.post("/analyze-report", reportController.analyze_report);

// get report
reportRouter.get("/get-report-by-id/:reportId",reportController.get_report)

// Delete  report
reportRouter.delete("/delete-report-by-id/:reportId",reportController.delete_report)

module.exports = reportRouter;

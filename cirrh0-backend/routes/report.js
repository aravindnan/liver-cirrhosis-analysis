const express = require("express");
const reportController = require("../controller/reportController");
const { requireAuth, requireSelf } = require("../middleware/auth");

const reportRouter = express.Router();

reportRouter.post("/add-files-to-report/:userId", requireAuth, requireSelf, reportController.report_add_files);
reportRouter.post("/analyze-report", requireAuth, reportController.analyze_report);
reportRouter.get("/get-report-by-id/:reportId", requireAuth, reportController.get_report);
reportRouter.delete("/delete-report-by-id/:reportId", requireAuth, reportController.delete_report);

module.exports = reportRouter;

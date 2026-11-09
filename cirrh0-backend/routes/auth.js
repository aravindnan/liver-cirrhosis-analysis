const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controller/authController");
const { requireAuth } = require("../middleware/auth");

const authRouter = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

authRouter.post("/register", authLimiter, authController.register);
authRouter.post("/login", authLimiter, authController.login);
authRouter.post("/logout", requireAuth, authController.logout);

module.exports = authRouter;

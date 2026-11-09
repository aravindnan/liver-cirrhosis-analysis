const express = require("express");
const { createAuthLimiter } = require("../middleware/rateLimit");
const { AUTH_RATE_LIMIT } = require("../env/dotenv");
const authController = require("../controller/authController");
const { requireAuth } = require("../middleware/auth");

const authRouter = express.Router();

const authLimiter = createAuthLimiter(AUTH_RATE_LIMIT);

authRouter.post("/register", authLimiter, authController.register);
authRouter.post("/login", authLimiter, authController.login);
authRouter.post("/logout", requireAuth, authController.logout);

module.exports = authRouter;

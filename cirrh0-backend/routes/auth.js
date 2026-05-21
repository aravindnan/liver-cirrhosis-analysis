const express = require("express");
const authRouter = express.Router();
const authController = require("../controller/authController");

// Register a new user
authRouter.post("/register", authController.register);

// Login
authRouter.post("/login", authController.login);

// Logout
authRouter.post("/logout",authController.logout)

// Delete ALL Data
authRouter.delete("/delete-all-data",authController.delete_all_data)

module.exports = authRouter;
const express = require("express");
const userController = require("../controller/userController");
const { requireAuth, requireSelf } = require("../middleware/auth");

const userRouter = express.Router();

userRouter.get("/get-user-by-id/:userId", requireAuth, requireSelf, userController.get_user_by_id);

module.exports = userRouter;

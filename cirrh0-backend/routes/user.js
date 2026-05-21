const express = require("express");
const userRouter = express.Router();
const userController = require("../controller/userController");

userRouter.get("/get-user-by-id/:userId", userController.get_user_by_id);//

module.exports = userRouter;
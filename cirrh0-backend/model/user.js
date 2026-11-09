const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Never returned by default; select it explicitly (+password) when verifying a login.
    password: { type: String, required: true, select: false },
    fullName: { type: String, trim: true },
    age: Number,
    gender: { type: String, enum: ["male", "female", "other"] },
    lastLoginDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
    },
    token: {type: String},
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    fullName: {
        type: String,
    },
    age: {
        type: Number,
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
    },
    lastLoginDate: {
        type: Date,
    },
    loginStatus: {
        type: Boolean,
    },
    reportAnalysisSet: [{type: mongoose.Schema.Types.ObjectId, ref: "ReportAnalysis"}],
    mriAnalysisSet: [{type: mongoose.Schema.Types.ObjectId, ref: "MRIAnalysis"}],
});
// Add any additional user-related fields here

const User = mongoose.model("User", userSchema);

module.exports = User;

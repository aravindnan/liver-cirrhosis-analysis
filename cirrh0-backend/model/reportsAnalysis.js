const mongoose = require("mongoose");
const reportAnalysisSchema = new mongoose.Schema({

    userId: { type: mongoose.Schema.Types.ObjectId,ref: 'User',},
    age:{type:Number},
    sex:{type:String},
    files: [{type: String}],
    analysis:{ type: String },
    stage:{type:Number},
    ascites:{type:String},
    edema:{type:String},
    tryglycerides:{type:String},
    cholesterol:{type:String},
    spiders:{type:String},
    hepatomegaly:{type:String},
    bilirubin:{type:Number},
    albumin:{type:Number},
    prothrombin:{type:Number},
    platelets:{type:Number},
    sgot:{type:Number},
    date:{type:Date},
    copper:{type:Number},
    alk_phos:{type:Number},
    lifestyle_recommendations:[{type:String}],
    precautions:[{type:String}],
    self_treatment_plan:[{type:String}],
    doctor_type:[{type:String}]
});

const ReportAnalysis = mongoose.model("ReportAnalysis", reportAnalysisSchema);

module.exports = ReportAnalysis;

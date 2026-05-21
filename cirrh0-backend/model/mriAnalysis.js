    const mongoose = require("mongoose");
    const mriAnalysisSchema = new mongoose.Schema({

        userId: { type: mongoose.Schema.Types.ObjectId,ref: 'User'},
        age:{type:Number},
        sex:{type:String},
        file: { type: String },
        analysis: {type: String},
        diagnosis:[{type:String}],
        lifestyle_recommendations:[{type:String}],
        precautions:[{type:String}],
        date:{type:Date},
        medical_treatments:[{type:String}],
        doctor_type:[{type:String}]
        
    });
    // Add any additional user-related fields here

    const MRIAnalysis = mongoose.model("MRIAnalysis", mriAnalysisSchema);

    module.exports = MRIAnalysis;
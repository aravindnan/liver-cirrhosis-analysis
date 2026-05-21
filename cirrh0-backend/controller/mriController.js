const axios = require('axios');
const { IMAGE_BASE_URL } = require('../env/dotenv');
const MRIAnalysis = require('../model/mriAnalysis');
const User = require('../model/user');

exports.analyze_mri = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { imageURL , sex ,age } = req.body;

    // Create a new MRI analysis document
    const newMRIReport = new MRIAnalysis({
      userId: userId,
      file: imageURL,
      age:age,
      sex:sex,
      analysis: null,
      diagnosis: [],
      lifestyle_recommendations: [],
      precautions: [],
      date: `${new Date()}`, // Corrected: new Date() gives the current date and time
      medical_treatments: [],
      doctor_type: []
    });

    // Save the new MRI report
    await newMRIReport.save();

    // Update the user document by adding the MRI report ID to the mriAnalysisSet array
    await User.findByIdAndUpdate(
      userId,
      { $push: { mriAnalysisSet: newMRIReport._id } }, // Assuming mriAnalysisSet is the correct field name
      { new: true }
    );

    const dataToSend = {
      image_url:imageURL,
      age:age,
      sex:sex
    }
    // Send the imageURL to the Python server for analysis
    const pythonResponse = await axios.post(IMAGE_BASE_URL, dataToSend);

    // Update the MRI report with the analysis results from the Python server
    var updatedMRI = await MRIAnalysis.findById(newMRIReport._id)
          updatedMRI.analysis=pythonResponse.data.analysis
          updatedMRI.diagnosis=pythonResponse.data.diagnosis
          updatedMRI.lifestyle_recommendations=pythonResponse.data.lifestyle_recommendations
          updatedMRI.precautions=pythonResponse.data.precautions
          updatedMRI.medical_treatments=pythonResponse.data.medical_treatments
          updatedMRI.doctor_type=pythonResponse.data.doctor_type
    
    await updatedMRI.save()

    // Return the updated MRI report
    res.json({ mriResult: updatedMRI, analysisSuccess: true ,mriId:updatedMRI._id});

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.get_mri = async (req, res) => {
  try {
    const mriId = req.params.mriId; // Assuming the MRI report ID is passed as a URL parameter

    // Find the MRI report by ID
    const mriReport = await MRIAnalysis.findById(mriId);

    if (!mriReport) {
      return res.status(404).json({ message: 'MRI report not found' });
    }

    // Respond with the found MRI report
    res.status(200).json({ mriReport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



exports.delete_mri = async (req, res) => {
  try {
    const mriId = req.params.mriId; // Assuming the MRI report ID is passed as a URL parameter

    // Find and delete the MRI report by ID
    const deleteMRI = await MRIAnalysis.findById(mriId);
    const userId = deleteMRI.userId

    if (!deleteMRI) {
      return res.status(404).json({ message: 'MRI report not found',deleteSuccess:false });
    }

    // Remove the MRI ID from the user's mriAnalysisSet array
    await User.findByIdAndUpdate(
      userId,
      { $pull: { mriAnalysisSet: mriId } }, // Assuming mriAnalysisSet is the correct field name
      { new: true }
    );

    res.status(200).json({ message: 'MRI report was deleted successfully',deleteSuccess:true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error',deleteSuccess:false });
  }
};
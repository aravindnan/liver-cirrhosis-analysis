const mongoose = require("mongoose")
const User = require("../model/user"); 


exports.get_user_by_id = async(req,res)=>{
    try {
        const userId = req.params.userId;
        // console.log(userId);
        
        // Check if the provided userId is a valid ObjectId
        if (!mongoose.isValidObjectId(userId)) {
          return res.status(400).json({ error: "Invalid userId format" });
        }
    
        const user = await User.findById(userId).populate('reportAnalysisSet').populate('mriAnalysisSet')
    
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

    
        res.status(200).json(user);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
}
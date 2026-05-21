const jwt = require("jsonwebtoken");
const uuid = require("uuid")
const bcrypt = require("bcryptjs");
const User = require("../model/user"); // Assuming you have a User model


exports.register = async (req, res) => {
    // console.log("Registering new user...")
    try {
      // Extract data from request body
      const { username, email, password, fullName, gender, age } = req.body;
  
      // Check if the user already exists by username or email
      const existingUserByUsername = await User.findOne({ username });
      const existingUserByEmail = await User.findOne({ email });
  
      if (existingUserByUsername) {
        return res.status(400).json({ error: "Username already exists", registerSuccess: false });
      }
  
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Email already exists", registerSuccess: false });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user
      const newUser = new User({ // Set userId using uuid4
        username:username,//
        email:email,//
        password: hashedPassword,
        fullName:fullName,//
        age:age,//
        gender:gender,
        reportAnalysisSet:[],
        mriAnalysisSet:[],
        loginStatus: false, // Assuming the user is not logged in initially
      });
      await newUser.save();
  
      // Respond with success
      res.status(201).json({ message: "User registered successfully" ,registerSuccess: true});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" ,registerSuccess: false});
    }
  };

exports.login = async (req, res) => {
    try {
      // Extract data from request body
      // console.log(" Inside Backend Login \n Login Request Body : ",req.body);
      const {username, password } = req.body;
      if (!(username && password)) {
        res.status(400).send("All input is required");
      }
  
      // Check if the user exists
      const userLog = await User.findOne({username});
  
      if (!userLog) {
        return res.status(401).json({ error: "User Does Not Exist" ,success:false });
      }
  
      // Check if the password is correct
      const passwordMatch = await bcrypt.compare(password, userLog.password);
  
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" ,success:false });
      }
  
      if((userLog&&passwordMatch)){
        // Generate a JWT token
        const token = jwt.sign({ _id: userLog._id },
          "sdfghjklkjhgfdsdfghjklkjgfrtyuiolnbfr567ujbvcder6yujbvcdertyuikjnbvxdfgh", 
          { expiresIn: "2h" });
  
        userLog.token = token;
        userLog.loginStatus = true
          res.status(200).json({
              success:true,
              loginStatus:true,
              token: token,
              message:"Login Successful",
              userId:userLog._id
  
          });
  
      }
      // Respond with the token
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  
exports.logout = async(req,res)=>{
    try {
      // Extract user ID from the token
      const{ userId }= req.body;
  
      // Find the user in the database
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Invalidate the user's token (optional, depending on your authentication mechanism)
      // You might have a blacklist of tokens or a mechanism to handle token invalidation
  
      // For example, you can set the user's login status to false and clear the token
      user.loginStatus = false;
      user.token = null;
  
      // Save the changes to the user document
      await user.save();
  
      // Respond with success message
      return res.status(200).json({ message: 'Logout successful',logoutStatus:true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error',logoutStatus:false });
    }
  }

exports.delete_all_data = async (req, res) => {
    try {
        
      await User.deleteMany();
  
      res.status(200).json({ message: 'All tasks, projects, and users deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };



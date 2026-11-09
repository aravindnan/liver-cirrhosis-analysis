const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../model/user");
const { JWT_SECRET } = require("../env/dotenv");
const { validateRegistration } = require("../utils/validate");
const { setSessionCookie, clearSessionCookie } = require("../middleware/auth");

exports.register = async (req, res) => {
  try {
    const problem = validateRegistration(req.body);
    if (problem) return res.status(400).json({ error: problem, registerSuccess: false });

    const { username, email, password, fullName, gender, age } = req.body;

    if (await User.findOne({ username })) {
      return res.status(400).json({ error: "Username already exists", registerSuccess: false });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ error: "Email already exists", registerSuccess: false });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName: fullName.trim(),
      age: Number(age),
      gender,
    }).save();

    res.status(201).json({ message: "User registered successfully", registerSuccess: true });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error", registerSuccess: false });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return res.status(400).json({ error: "Username and password are required", success: false });
    }

    const user = await User.findOne({ username }).select("+password");
    // Same response for unknown user and wrong password so usernames cannot be enumerated.
    const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials", success: false });
    }

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { algorithm: "HS256", expiresIn: "2h" });
    user.lastLoginDate = new Date();
    await user.save();

    // The token is delivered only as an HttpOnly cookie, never in the response body.
    setSessionCookie(res, token);
    res.status(200).json({
      success: true,
      loginStatus: true,
      message: "Login Successful",
      userId: user._id,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

// Tokens are stateless and expire after 2h; logout clears the session cookie.
exports.logout = async (req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ message: "Logout successful", logoutStatus: true });
};

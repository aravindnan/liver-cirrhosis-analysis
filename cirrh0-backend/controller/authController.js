const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { db, Prisma } = require("../db/client");
const { JWT_SECRET } = require("../env/dotenv");
const { validateRegistration } = require("../utils/validate");
const { setSessionCookie, clearSessionCookie } = require("../middleware/auth");
const { safeError } = require("../utils/logger");

const BCRYPT_COST = 12;
// Compared against when the username does not exist, so a login for an unknown user takes as long as
// one with a wrong password and usernames cannot be discovered by timing.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

const isUniqueViolation = (error) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

exports.register = async (req, res) => {
  try {
    const problem = validateRegistration(req.body);
    if (problem) return res.status(400).json({ error: problem, registerSuccess: false });

    const { username, password, fullName, gender, age } = req.body;
    const email = req.body.email.toLowerCase();

    if (await db.user.findUnique({ where: { username } })) {
      return res.status(400).json({ error: "Username already exists", registerSuccess: false });
    }
    if (await db.user.findUnique({ where: { email } })) {
      return res.status(400).json({ error: "Email already exists", registerSuccess: false });
    }

    try {
      await db.user.create({
        data: {
          username,
          email,
          passwordHash: await bcrypt.hash(password, BCRYPT_COST),
          fullName: fullName.trim(),
          age: Math.round(Number(age)),
          gender,
        },
      });
    } catch (error) {
      // Two sign-ups racing past the checks above: the unique indexes are the real guarantee.
      if (isUniqueViolation(error)) {
        return res.status(400).json({ error: "Username or email already exists", registerSuccess: false });
      }
      throw error;
    }

    res.status(201).json({ message: "User registered successfully", registerSuccess: true });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "register failed");
    res.status(500).json({ error: "Internal Server Error", registerSuccess: false });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return res.status(400).json({ error: "Username and password are required", success: false });
    }

    const user = await db.user.findUnique({ where: { username } });
    const passwordMatch = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials", success: false });
    }

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { algorithm: "HS256", expiresIn: "2h" });
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // The token is delivered only as an HttpOnly cookie, never in the response body.
    setSessionCookie(res, token);
    res.status(200).json({
      success: true,
      loginStatus: true,
      message: "Login Successful",
      userId: user.id,
    });
  } catch (error) {
    req.log.error({ err: safeError(error) }, "login failed");
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

// Tokens are stateless and expire after 2h; logout clears the session cookie.
exports.logout = async (req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ message: "Logout successful", logoutStatus: true });
};

const router = (module.exports = require("express").Router());
const bcrypt = require("bcryptjs");
const passport = require("passport");
const crypto = require("crypto");
const isProduction = process.env.NODE_ENV === 'production';

const {
  saveUser,
  getUserByEmail,
  updateUser,
  getUserById,
  getUserByReftoken,
  getUserBy,
  sendPasswordResetEmail,
} = require("../controller/userController");
const {
  generateTokens,
  verifyToken,
} = require("../controller/tokenController");

//Register
//POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, surname } = req.body;
    //check if email exists
    const existingUser = await getUserByEmail(email);
    console.log("workflow here");
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    //hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    //save user object to DB
    const newUser = await saveUser({
      email,
      password: hashedPassword,
      name,
      surname,
    });

    //generate tokens for new user and save them to DB
    const { accessToken: token, refreshToken: reftoken } =
      generateTokens(newUser);
    const updatedUser = await updateUser(newUser.id, { token, reftoken });

    res.status(201).json({ message: "User created successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error registering user" });
  }
});

// Login with Google (also registers if not)
// POST /api/auth/google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google Callback Endpoint
// GET /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    // Extract tokens from the user object passed in done() from Google strategy
    const { token, reftoken } = req.user;
    const frontendURL = process.env.FRONTEND_URL;

    // Set tokens in HttpOnly cookies
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: isProduction, // production ortamında true olacak
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie("refreshToken", reftoken, {
      httpOnly: true,
      secure: isProduction, // production ortamında true olacak
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to your frontend page or respond with a message
    res.redirect(`${frontendURL}/auth/profile`); // or res.json({ message: 'Login successful' });
  }
);

// Login
// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) return res.status(400).json({ message: "Invalid email" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    // Generate new access and refresh tokens and update user
    const { token, reftoken } = generateTokens(user);
    const updatedUser = await updateUser(user.id, { token, reftoken });

    // Set tokens in HttpOnly cookies
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: isProduction, // production ortamında true olacak
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 60 * 60 * 1000, // 60 minutes
    });

    res.cookie("refreshToken", reftoken, {
      httpOnly: true,
      secure: isProduction, // production ortamında true olacak
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Admin kontrolü varsa ekstra cookie gönder
    if (user.isAdmin === "admin") {
      res.cookie("isAdmin", "admin", {
        httpOnly: true,
        secure: isProduction, // production ortamında true olacak
        sameSite: isProduction ? 'None' : 'Lax',
        maxAge: 60 * 60 * 1000,
      });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      address: user.address,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      isAuthenticated: user.isAuthenticated,
      isPaid: user.isPaid,
      isAdmin: user.isAdmin,
    };

    res.json({data: safeUser, message: "Login successful" });
  } catch (error) {
    res.status(500).json({ message: "Error logging in" });
  }
});

// Logout
// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const user = req.user;
  console.log("user:", user);
  try {
    // find user in DB
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Clear tokens from DB
    const updatedUser = await updateUser(
      { token: null, reftoken: null },
      { where: { id: user.id } }
    );

    // Clear tokens from cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.clearCookie("userCart");

    res.json({ message: "Logout successful!" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
});

// Refresh token
// POST /api/auth/refresh-token
router.post("/refresh-token", async (req, res) => {
  try {
    const providedToken = req.cookies.refreshToken;
    if (!providedToken)
      return res.status(401).json({ message: "No token provided" });

    // Search for reftoken in DB
    const user = await getUserByReftoken(providedToken);
    if (!user)
      return res.status(403).json({ message: "No user with provided token" });

    // Verify reftoken
    const verification = await verifyToken(providedToken);
    if (!verification)
      return res.status(403).json({ message: "Verification failed" });

    // Generate new accessToken
    const { token, reftoken } = generateTokens(user);

    // save both tokens to DB
    const updatedUser = await updateUser(user.id, { token, reftoken });

    // Set tokens in HttpOnly cookies
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: isProduction, // production ortamında true olacak
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 59 * 60 * 1000, // 60 minutes
    });
    res.cookie("refreshToken", reftoken, {
      httpOnly: true,
      secure: isProduction, // production ortamında true olacak
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.status(200).json({ message: "Tokens updated" });
  } catch (error) {
    res.status(500).json({ message: "Refresh token renewal failed" });
  }
});

// Email verification
// GET /api/auth/verification/:token

// Forgot pasword
// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const genericMessage = "If that email address is in our system, we have sent a link to reset your password.";
  try {
    const { email } = req.body;
    if (!email) return res.status(200).json({ message: genericMessage });

    const user = await getUserByEmail(email);
    if (!user) return res.status(200).json({ message: genericMessage });

    try {
      await sendPasswordResetEmail(user);
      console.log("Reset email sent to:", user.email);
    } catch (err) {
      return res.status(200).json({ err });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(200).json({ message: genericMessage });
  }
});

// Reset password
// POST /api/auth/reset-password/:token
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await getUserBy({ emailVerifyToken: hashedToken });
    if (!user || !user.emailVerifyTokenExpire || user.emailVerifyTokenExpire < new Date()) {
      return res.status(400).json({ message: "Token invalid or expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await updateUser(user.id, {
      password: hashedPassword,
      emailVerifyToken: null,
      emailVerifyTokenExpire: null,
    });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Password reset failed" });
  }
});

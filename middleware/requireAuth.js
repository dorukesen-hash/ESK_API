const jwt = require("jsonwebtoken");

const requireAuth = async (req, res, next) => {
    const accessToken = req.cookies?.accessToken;

    // Check if access token exists
    if (!accessToken) {
        return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    // Verify the token
    try {
        req.user = jwt.verify(accessToken, process.env.JWT_SECRET);
        console.log("Middleware: User authenticated successfully!");
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = requireAuth;

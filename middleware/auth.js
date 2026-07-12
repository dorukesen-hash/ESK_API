const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
    const accessToken = req.cookies?.accessToken;
    const userCart = req.cookies?.userCart;

    // Login user with access token
    if (accessToken) {
        try {
            req.user = jwt.verify(accessToken, process.env.JWT_SECRET);
            console.log("Middleware: login with accessToken success!");
        } catch (error) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    }

    // Create temporary cart in cookies
    if (!userCart) {
        const tempCart = []
        res.cookie("userCart", JSON.stringify(tempCart), {
            httpOnly: false,
            maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
        });
    } else {

    }

    next();
};

module.exports = authMiddleware;

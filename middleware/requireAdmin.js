const { User } = require("../db/models");

// Must run after requireAuth (relies on req.user.id from the verified access token)
const requireAdmin = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user?.id);

        if (!user || user.isAdmin !== "admin") {
            return res.status(403).json({ message: "Admin access required." });
        }

        next();
    } catch (error) {
        return res.status(403).json({ message: "Admin access required." });
    }
};

module.exports = requireAdmin;

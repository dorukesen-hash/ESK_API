const router = (module.exports = require('express').Router())

const authMiddleware = require("../middleware/auth");
const {getUserById} = require('../controller/userController')


// Check if the user is authenticated and return user details
//GET api/user/user-detail
router.get("/user-details", authMiddleware, async (req, res) => {
    const user = req.user

    try {

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userObject = await getUserById(user.id)
        res.json({ userObject });

    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Error retrieving user data" });
    }
});

//update

//delete

//all



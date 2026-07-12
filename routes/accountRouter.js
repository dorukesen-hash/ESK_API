const router = (module.exports = require('express').Router());

const requireAuth = require("../middleware/requireAuth");
const { getAccountOrders, getAccountShipments, getAccountInvoices } = require('../controller/accountController');

// Get orders for the authenticated user
// GET /api/account/orders
router.get("/orders", requireAuth, async (req, res) => {
    const user = req.user;

    try {
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const orders = await getAccountOrders(user.id);
        res.json({ orders });

    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Error retrieving user orders" });
    }
});

// Get shipments for the authenticated user
// GET /api/account/shipments
router.get("/shipments", requireAuth, async (req, res) => {
    const user = req.user;

    try {
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const shipments = await getAccountShipments(user.id);
        res.json({ shipments });

    } catch (error) {
        console.error("Error fetching user shipments:", error);
        res.status(500).json({ message: "Error retrieving user shipments" });
    }
});

// Get invoices for the authenticated user
// GET /api/account/invoices
router.get("/invoices", requireAuth, async (req, res) => {
    const user = req.user;

    try {
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const invoices = await getAccountInvoices(user.id);
        res.json({ invoices });

    } catch (error) {
        console.error("Error fetching user invoices:", error);
        res.status(500).json({ message: "Error retrieving user invoices" });
    }
});

module.exports = router;

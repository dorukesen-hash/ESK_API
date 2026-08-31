const express = require("express");
const router = express.Router();
const { createPaymentIntent, calculateTax } = require("../controller/stripeController");



// Stripe payment intent creates secret for FE to secure payment. Amount is
// computed server-side from req.body.items/shipping - see stripeController.
router.post("/create-payment-intent", async (req, res, next) => {
    try {
        const data = await createPaymentIntent(req.body, req.user)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
} );

// Stripe tax calculation endpoint
router.post("/calculate-tax", async (req, res, next) => {
    try {
        const taxData = await calculateTax(req.body);
        res.status(200).send(taxData);
    } catch (error) {
        next(error);
    }
});



module.exports = router;

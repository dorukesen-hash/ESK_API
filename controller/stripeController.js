const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const models = require("../db/models");
const { resolveOrderPricing } = require("../utils/pricing");
const AppError = require("../utils/appError");

// The charge amount is computed here, server-side, from real catalog prices -
// never trust a raw dollar amount from the client (that was the previous
// behavior: the browser could set `amount` to anything). `discountCode` (an
// explicitly-typed code) is optional - resolveOrderPricing also auto-tries a
// firstOrderOnly code for logged-in users, same as createOrder, so the two
// stay in agreement on the final amount.
exports.createPaymentIntent = async (data, reqUser) => {
    const { items, shipping, currency = "usd", discountCode } = data;

    if (!Array.isArray(items) || items.length === 0) {
        throw new AppError("Cart is empty.", 400);
    }

    // req.user is only the decoded JWT payload (id/email - see
    // tokenController's getSender()), not a full row: discountPercent isn't
    // in it, so a logged-in customer's blanket discount would silently be
    // dropped from this endpoint's math while still applying in createOrder
    // (which re-fetches the full user). Re-fetch here so both agree.
    const user = reqUser?.id ? await models.User.findByPk(reqUser.id) : null;

    const { subtotal } = await resolveOrderPricing({ items, user, discountCode, models });

    const shippingPrice = Number(shipping?.price) || 0;
    const amount = Math.round((subtotal + shippingPrice) * 100); // cents

    const paymentIntent = await stripe.paymentIntents.create({ amount, currency });
    return { clientSecret: paymentIntent.client_secret };
};

exports.calculateTax = async (data) => {
    const { recipient, line_items } = data;
    try {
        const taxCalculation = await stripe.tax.calculations.create({
            currency: "usd",
            customer_details: {
                address: {
                    postal_code: "10001",
                    country: "US",
                },
                address_source: "shipping",
            },
            line_items: [
                {
                    amount: 5000,
                    reference: "custom_service",
                    tax_behavior: "exclusive",
                    tax_code: "txcd_10000000",
                },
            ],
        });
        return taxCalculation;
    } catch (error) {
        console.error("❌ Error calculating tax:", error);
        throw error;
    }
};

// Registered directly on `app` (not through the JSON-parsed apiRouter) with
// express.raw() so req.body here is the raw byte buffer stripe.webhooks.
// constructEvent needs for signature verification - see app.js.
exports.handleStripeWebhook = async (req, res) => {
    const signature = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === "payment_intent.succeeded") {
            const { confirmOrderPayment } = require("./orderController");
            await confirmOrderPayment(event.data.object);
        }
        res.status(200).json({ received: true });
    } catch (err) {
        console.error("Webhook handler error:", err);
        res.status(500).json({ message: "Webhook handler failed." });
    }
};

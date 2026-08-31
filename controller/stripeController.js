const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { Variant } = require("../db/models");
const { resolveVariantPrice } = require("../utils/pricing");
const AppError = require("../utils/appError");

// The charge amount is computed here, server-side, from real catalog prices -
// never trust a raw dollar amount from the client (that was the previous
// behavior: the browser could set `amount` to anything). `discountCode` is
// accepted now but not yet validated/applied - a no-op until discount codes
// are built, so this endpoint's request shape doesn't need to change twice.
exports.createPaymentIntent = async (data, user) => {
    const { items, shipping, currency = "usd" } = data;

    if (!Array.isArray(items) || items.length === 0) {
        throw new AppError("Cart is empty.", 400);
    }

    let subtotal = 0;
    for (const item of items) {
        const variant = await Variant.findByPk(item.variantId ?? item.id);
        if (!variant) {
            throw new AppError(`Variant ${item.variantId ?? item.id} not found.`, 400);
        }
        const unitPrice = await resolveVariantPrice(variant, item.quantity, user);
        subtotal += (unitPrice || 0) * item.quantity;
    }

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

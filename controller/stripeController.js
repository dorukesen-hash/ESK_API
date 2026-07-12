const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (data) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create(data);
        console.log(paymentIntent)
        return { clientSecret: paymentIntent.client_secret };
    } catch (error) {
        console.error("❌ Error creating payment intent:", error);
    }
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

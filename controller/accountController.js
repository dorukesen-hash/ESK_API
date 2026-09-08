const { Order, OrderItem, Customer, Shipment, OrderStatus, Billing, Carrier, ShipmentStatus, Invoice } = require('../db/models');
const { attachRefundTotals } = require('./orderController');

const getAccountOrders = async (userId) => {
    try {
        // Find customer by userId
        const customer = await Customer.findOne({ where: { userId } });
        if (!customer) {
            throw new Error('Customer not found for userId: ' + userId);
        }
        const customerId = customer.id;

        // Find orders by customerId
        const orders = await Order.findAll({
            where: { customerId },
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: OrderItem,
                    attributes: [
                        "id",
                        "title",
                        "code",
                        "variant",
                        "variant_id",
                        "category",
                        "price",
                        "quantity",
                        "note",
                        "imgurl",
                    ],
                },
                {
                    model: Customer,
                    attributes: [
                        "id",
                        "name",
                        "surname",
                        "email"
                    ],
                },
                {
                    model: Shipment,
                    attributes: [
                        "id",
                        "name",
                        "firstline",
                        "secondline",
                        "city",
                        "state",
                        "zip",
                        "tracking",
                        "extra_informations"
                    ],
                    include: [
                        { model: Carrier, attributes: ["id", "name"] },
                        { model: ShipmentStatus, attributes: ["id", "name"] },
                    ],
                },
                {
                    model: OrderStatus,
                    attributes: ["id", "name"],
                },
                {
                    model: Billing,
                    attributes: [
                        "id",
                        "name",
                        "firstline",
                        "secondline",
                        "city",
                        "state",
                        "zip",
                        "phone"
                    ],
                }
            ],
        });

        // Refund totals are never stored (see attachRefundTotals in
        // orderController.js) - fetched live from Stripe per order so the
        // account order history can show partial/full refunds, same as the
        // admin single-order view already does. Cheap no-op for orders with
        // no stripePaymentIntentId (manual orders, or none placed yet).
        return await Promise.all(orders.map((order) => attachRefundTotals(order)));
    } catch (error) {
        console.error("Error fetching user orders:", error);
        throw error;
    }
};

const getAccountShipments = async (userId) => {
    try {
        const shipments = await Shipment.findAll({
            where: { userId },
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: Carrier,
                    attributes: ["id", "name", "vkn"],
                },
                {
                    model: ShipmentStatus,
                    attributes: ["id", "name"],
                },
            ],
        });

        return shipments;
    } catch (error) {
        console.error("Error fetching user shipments:", error);
        throw error;
    }
};

const getAccountInvoices = async (userId) => {
    try {
        const invoices = await Invoice.findAll({
            where: { userId },
            // Order included so the FE can link to /invoices/pdf/:orderId -
            // the PDF endpoint is keyed by order, not invoice.
            include: [{ model: Order, attributes: ["id", "orderNumber"] }],
            order: [["createdAt", "DESC"]],
        });

        return invoices;
    } catch (error) {
        console.error("Error fetching user invoices:", error);
        throw error;
    }
};

module.exports = {
    getAccountOrders,
    getAccountShipments,
    getAccountInvoices
};

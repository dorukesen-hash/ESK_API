const Sequelize = require('sequelize')
const db = require('../index.js')

// Immutable log of item-level refunds - never mutates OrderItem.quantity/
// price (the original order record stays intact; "remaining quantity" is
// always quantity - sum(these rows) for that item, computed on read).
// stripeRefundId is null for manual (non-Stripe) orders - there's nothing
// to call Stripe for, this row is just the internal record of a refund
// handled outside the system (wire transfer, etc.).
const OrderItemRefund = db.define('order_item_refund', {
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
    },
    stripeRefundId: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    note: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
}, { timestamps: true, updatedAt: false })

module.exports = OrderItemRefund

const Sequelize = require('sequelize')
const db = require('../index.js')

// One row per pricing-relevant change NOT already covered by
// variant_audit_log: a customer's SpecialPrices override (type
// 'special_price'), or their blanket discountPercent (type
// 'discount_percent'). Both are scoped to the CUSTOMER (targetUserId), not
// a variant, so they surface on that customer's page - answers "why is
// this customer's price X" after the fact, which neither field was
// tracked for before.
const PricingAuditLog = db.define('pricing_audit_log', {
    type: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    action: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    oldValue: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
    newValue: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
}, { timestamps: true, updatedAt: false })

module.exports = PricingAuditLog

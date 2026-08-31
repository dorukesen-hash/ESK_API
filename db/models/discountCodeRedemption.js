const Sequelize = require('sequelize')
const db = require('../index.js')

// One row per order a discount code was actually applied to - enforces
// maxUsesPerCustomer and gives the migrated first-order discount (and any
// future code) a real audit trail, which the old hardcoded version had none of.
const DiscountCodeRedemption = db.define(
    'discount_code_redemption',
    {
        redeemedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
        },
    },
    { updatedAt: false }
)

module.exports = DiscountCodeRedemption

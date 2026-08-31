const Sequelize = require('sequelize')
const db = require('../index.js')

const DiscountCode = db.define(
    'discount_code',
    {
        code: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
        },
        // 'percent' | 'fixed' - kept as a plain STRING (no other model in
        // this codebase uses Sequelize ENUM) and validated at the controller.
        type: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'percent',
        },
        value: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
        },
        minOrderAmount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        },
        validFrom: {
            type: Sequelize.DATE,
            allowNull: true,
        },
        validUntil: {
            type: Sequelize.DATE,
            allowNull: true,
        },
        maxUses: {
            type: Sequelize.INTEGER,
            allowNull: true,
        },
        maxUsesPerCustomer: {
            type: Sequelize.INTEGER,
            allowNull: true,
        },
        timesUsed: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        // Auto-applied (no code entry needed) to a customer's first order,
        // instead of the customer typing it in - the migrated replacement
        // for the old hardcoded 10% first-order discount.
        firstOrderOnly: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    }
)

module.exports = DiscountCode

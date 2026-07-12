const Sequelize = require('sequelize')
const db = require('../index.js')

const Transaction = db.define('transaction', {
    payment_id: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    customer_id: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    currency: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    createdTime: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    status: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    payment_method: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    description: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    email: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    billing_address: {
        type: Sequelize.JSONB,
        allowNull: true,
    }, 
    shipping_address: {
        type: Sequelize.JSONB,
        allowNull: true,
    }, 
})

module.exports = Transaction
const Sequelize = require('sequelize')
const db = require('../index.js')

const Order = db.define(
    'order',
    {
        address: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        ordertime: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        price: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        },
        shippingCharges: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        },
        orderNumber: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        firstline: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        secondline: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        email: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        phone: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        city: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        state: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        zip: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        messagefrombuyer: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        isPaid: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        closure: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        name: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        labelNo: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        extra_informations: {
            type: Sequelize.JSONB,
            allowNull: true,
        },
        shipment_date: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        date_of_closure: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        user_note: {
            type: Sequelize.STRING(500),
            allowNull: true,
        },
        uniqueId: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
        },
        trackingNumber: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        stripePaymentIntentId: {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true,
        },
        discountAmount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        }
    },
    {
        paranoid: true,
    }
)

module.exports = Order

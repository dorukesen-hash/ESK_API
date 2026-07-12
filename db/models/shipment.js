const Sequelize = require('sequelize')
const db = require('../index.js')

const Shipment = db.define('shipment', {
    name: {
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
    totalDeci: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
    },
    totalWeight: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
    },
    totalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    totalCustomsPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    purpose: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    taxId: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    exportType: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    type: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    pickup: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
    extra_informations: {
        type: Sequelize.JSONB,
        allowNull: true,
    },
    tracking: {
        type: Sequelize.STRING,
        allowNull: true,
    },
})

module.exports = Shipment

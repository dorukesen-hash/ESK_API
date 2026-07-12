const Sequelize = require('sequelize')
const db = require('../index.js')

const Billing = db.define('billing', {
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
    extra_informations: {
        type: Sequelize.JSONB,
        allowNull: true,
    },
})

module.exports = Billing

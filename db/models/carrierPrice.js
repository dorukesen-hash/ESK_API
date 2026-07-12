const Sequelize = require('sequelize')
const db = require('../index.js')

const CarrierPrice = db.define('carrierprice', {
    price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
    },
})

module.exports = CarrierPrice
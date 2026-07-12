const Sequelize = require('sequelize')
const db = require('../index.js')

const SpecialPrices = db.define(
    'special_prices',
    {
        price: {
            type: Sequelize.DECIMAL(10,2),
            allowNull: true,
          }
    },
    { createdAt: false, updatedAt: false }
)

module.exports = SpecialPrices
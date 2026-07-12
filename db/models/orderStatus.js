const Sequelize = require('sequelize')
const db = require('../index.js')

const OrderStatus = db.define(
    'orderstatus',
    {
        name: {
            type: Sequelize.STRING,
            allowNull: false,
        },
    },
    {
        timestamps: false,
    }
)
module.exports = OrderStatus
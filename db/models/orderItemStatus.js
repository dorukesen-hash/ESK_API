const Sequelize = require('sequelize')
const db = require('../index.js')

const OrderItemStatus = db.define(
    'orderitemstatus',
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

module.exports = OrderItemStatus
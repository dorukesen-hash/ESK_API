const Sequelize = require('sequelize')
const db = require('../index.js')

const OrderItem = db.define(
    'orderitem',
    {
        title: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        code: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        variant: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        category: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        price: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        },
        quantity: {
            type: Sequelize.INTEGER,
            allowNull: true,
        },
        note: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        costprice: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        },
        imgurl: {
                type: Sequelize.STRING,
                allowNull: true,
        }
    },
    {
        paranoid: true,
    }
)

module.exports = OrderItem

const Sequelize = require('sequelize')
const db = require('../index.js')

const SubCategory = db.define(
    'subcategory',
    {
        name: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        imgurl: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        available: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
        },
        sellProduct: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
        }
    },
    { createdAt: false, updatedAt: false }
)

module.exports = SubCategory
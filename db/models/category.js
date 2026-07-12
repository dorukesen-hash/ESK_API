const Sequelize = require('sequelize')
const db = require('../index.js')

const Category = db.define(
    'category',
    {
        name: {
            type: Sequelize.STRING,
            allowNull: true,
        },
    },
    { createdAt: false, updatedAt: false }
)

module.exports = Category
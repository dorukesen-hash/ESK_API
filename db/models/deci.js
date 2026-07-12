const Sequelize = require('sequelize')
const db = require('../index.js')

const Deci = db.define(
    'deci',
    {
        min: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
        },

        max: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
        },
    },
    { createdAt: false, updatedAt: false }
)

module.exports = Deci

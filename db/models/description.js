const Sequelize = require('sequelize')
const db = require('../index.js')

const Description = db.define(
    'description',
    {
        text: {
            type: Sequelize.TEXT,
            allowNull: true,
        },

        list_items: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
        },
    },
    { createdAt: false, updatedAt: false }
)

module.exports = Description
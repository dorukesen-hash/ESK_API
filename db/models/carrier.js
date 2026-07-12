const Sequelize = require('sequelize')
const db = require('../index.js')

const Carrier = db.define('carrier', {
    name: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    vkn: {
        type: Sequelize.STRING,
        allowNull: true,
    },
})

module.exports = Carrier
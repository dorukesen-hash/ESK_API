const Sequelize = require('sequelize')
const db = require('../index.js')

const Image = db.define('image', {
    data: {
        type: Sequelize.BLOB,
        allowNull: true,
    },
    thumb: {
        type: Sequelize.BLOB,
        allowNull: true,
    },
    url: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
})

module.exports = Image
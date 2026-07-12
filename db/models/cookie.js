const Sequelize = require('sequelize')
const db = require('../index.js')

const Cookie = db.define('cookie', {
    ip: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    browser: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    date: {
        type: Sequelize.DATE,
        allowNull: true,
    }
})

module.exports = Cookie;
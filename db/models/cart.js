const Sequelize = require('sequelize')
const db = require('../index.js')

const Cart = db.define('cart', {
    productArray: {
        type: Sequelize.JSONB,
        allowNull: true
      },

})

module.exports = Cart
const Sequelize = require('sequelize')
const db = require('../index.js')

const ProductImages   = db.define("product_images", {
    position: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
}, { timestamps: false });

module.exports = ProductImages  
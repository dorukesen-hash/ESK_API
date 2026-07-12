const Sequelize = require('sequelize')
const db = require('../index.js')

const ProductImages   = db.define("product_images", {}, { timestamps: false });

module.exports = ProductImages  
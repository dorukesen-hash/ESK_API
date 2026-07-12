const Sequelize = require('sequelize')
const db = require('../index.js')

const VariantImages  = db.define('variant_images', {}, { timestamps: false });

module.exports = VariantImages 
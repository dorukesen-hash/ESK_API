const Sequelize = require('sequelize')
const db = require('../index.js')

const SubcategoryImages   = db.define("subcategory_images", {}, { timestamps: false });

module.exports = SubcategoryImages  
const Sequelize = require('sequelize')
const db = require('../index.js')

const SpesificationImages   = db.define("spesification_images", {}, { timestamps: false });

module.exports = SpesificationImages 
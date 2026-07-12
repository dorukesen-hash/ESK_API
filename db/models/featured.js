const Sequelize = require('sequelize')
const db = require('../index.js')


const Featured = db.define("featured", {});


module.exports = Featured
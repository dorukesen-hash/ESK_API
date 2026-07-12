const Sequelize = require('sequelize')
const db = require('../index.js')

const Claim = db.define('claim', {
  account: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  companyName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  contactName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: true,
    validate: { isEmail: true },
  },
  orderNo: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  read: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  }
})

module.exports = Claim

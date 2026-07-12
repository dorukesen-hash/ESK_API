const Sequelize = require('sequelize');
const db = require('../index.js');

const ShipmentStatus = db.define(
  'shipmentstatus',
  {
    name: {
      type: Sequelize.STRING,
      allowNull: true
    }
  },
  { createdAt: false, updatedAt: false }
);

module.exports = ShipmentStatus;

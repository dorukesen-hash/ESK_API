const Sequelize = require('sequelize')
const db = require('../index.js')

const ShippingProfiles = db.define(
  "shipping_profies",
  {
	title: {
		type: Sequelize.TEXT,
		allowNull: true,
	  },
	firstline: {
	  type: Sequelize.TEXT,
	  allowNull: true,
	},
	secondline: {
	  type: Sequelize.TEXT,
	  allowNull: true,
	},
	phone: {
	  type: Sequelize.STRING,
	  allowNull: true,
	},
	city: {
	  type: Sequelize.STRING,
	  allowNull: true,
	},
	state: {
	  type: Sequelize.STRING,
	  allowNull: true,
	},
	zip: {
	  type: Sequelize.STRING,
	  allowNull: true,
	},
  },
  { createdAt: false, updatedAt: false }
);

module.exports = ShippingProfiles
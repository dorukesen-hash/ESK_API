const Sequelize = require('sequelize')
const db = require('../index.js')

const Price = db.define(
  "price",
  {
	single: {
	  type: Sequelize.DECIMAL(10, 2),
	  allowNull: true,
	},
	five: {
	  type: Sequelize.DECIMAL(10, 2),
	  allowNull: true,
	},
	ten: {
	  type: Sequelize.DECIMAL(10, 2),
	  allowNull: true,
	},
	pallet: {
		type: Sequelize.DECIMAL(10, 2),
		allowNull: true,
	  },
  },
  {
	timestamps: false,
  }
);
module.exports = Price
const Sequelize = require('sequelize')
const db = require('../index.js')

const Spesification = db.define(
  "spesification",
  {
	text: {
	  type: Sequelize.TEXT,
	  allowNull: true,
	},
	line_items: {
	  type: Sequelize.ARRAY(Sequelize.STRING),
	  allowNull: true,
	},
	data: {
	   type: Sequelize.JSONB,
	   allowNull: true,
	 },
  },
  {
	timestamps: false,
  }
);
module.exports = Spesification
const Sequelize = require('sequelize')
const db = require('../index.js')

const Dimension = db.define(
	'dimension',
	{
		weight: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  width: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  length: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  height: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  deci: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  other: {
			type: Sequelize.JSONB,
			allowNull: true
		  }
	},
	{ createdAt: false, updatedAt: false }
)

module.exports = Dimension
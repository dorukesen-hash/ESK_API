const Sequelize = require('sequelize')
const db = require('../index.js')

const PackageInfo = db.define(
	'package_info',
	{
		units: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  box_width: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  box_length: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  box_height: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  box_weight: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		  },
		  box_deci: {
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

module.exports = PackageInfo
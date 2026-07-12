const Sequelize = require('sequelize')
const db = require('../index.js')

const Product = db.define('product', {
	title: {
		type: Sequelize.TEXT,
		allowNull: true,
	},
	sku: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	description: {
			type: Sequelize.TEXT,
			allowNull: true,
		},
	stockLevel: {
		type: Sequelize.INTEGER,
		allowNull: true,
	},
	stockAlertLevel :{
		type: Sequelize.INTEGER,
		allowNull: true,
	},
	extradata: {
		type: Sequelize.JSONB,
		allowNull: true,
	},
	 imgurl: {
			type: Sequelize.STRING,
			allowNull: true,
	},
	available: {
		type: Sequelize.BOOLEAN,
		allowNull: true,
},
})

module.exports = Product

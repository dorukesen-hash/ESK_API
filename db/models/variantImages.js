const Sequelize = require('sequelize')
const db = require('../index.js')

const VariantImages  = db.define('variant_images', {
    position: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
}, { timestamps: false });

module.exports = VariantImages 
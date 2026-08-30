const Sequelize = require('sequelize')
const db = require('../index.js')

const SubcategoryImages   = db.define("subcategory_images", {
    position: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
}, { timestamps: false });

module.exports = SubcategoryImages  
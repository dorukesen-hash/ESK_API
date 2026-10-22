const Sequelize = require('sequelize')
const db = require('../index.js')

// Replaces SubcategoryImages/ProductImages - one join table instead of two,
// since catalog_node replaces Subcategory/Product. `position` drives the
// same reorder behavior as the existing reorderProductImages /
// reorderSubCategoryImages (see controller/catalogNodeController.js).
const CatalogNodeImages = db.define('catalog_node_images', {
  position: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
})

module.exports = CatalogNodeImages

const Sequelize = require('sequelize')
const db = require('../index.js')

// Replaces Category/Subcategory/Product (see
// docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md):
// one self-referencing table instead of three fixed-depth ones. `parentId`
// (added via the self-association in models/index.js, not declared here -
// matching how every other FK column in this codebase is added purely
// through an association, never a field definition) is what makes depth
// unlimited: null means a root node, otherwise it's a child of another
// catalog_node row at any depth.
const CatalogNode = db.define('catalog_node', {
  name: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  sku: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  available: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  stockLevel: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  stockAlertLevel: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  extradata: {
    type: Sequelize.JSONB,
    allowNull: true,
  },
})

module.exports = CatalogNode

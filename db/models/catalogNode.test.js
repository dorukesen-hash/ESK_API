const test = require('node:test')
const assert = require('node:assert/strict')
const { CatalogNode, CatalogNodeImages, Variant } = require('../models')

test('CatalogNode defines its own scalar fields', () => {
  const attrs = CatalogNode.rawAttributes
  for (const field of ['name', 'description', 'sku', 'available', 'stockLevel', 'stockAlertLevel', 'extradata']) {
    assert.ok(field in attrs, `expected CatalogNode to define ${field}`)
  }
})

test('CatalogNode self-references via parent/children', () => {
  assert.equal(CatalogNode.associations.parent.target, CatalogNode)
  assert.equal(CatalogNode.associations.parent.foreignKey, 'parentId')
  assert.equal(CatalogNode.associations.children.target, CatalogNode)
})

test('CatalogNode has a variants association, and Variant points back via nodeId', () => {
  assert.equal(CatalogNode.associations.variants.target, Variant)
  assert.equal(Variant.associations.catalogNode.target, CatalogNode)
  assert.equal(Variant.associations.catalogNode.foreignKey, 'nodeId')
})

test('CatalogNode has an images association to CatalogNodeImages', () => {
  assert.equal(CatalogNode.associations.images.target, CatalogNodeImages)
  assert.equal(CatalogNodeImages.associations.catalogNode.target, CatalogNode)
})

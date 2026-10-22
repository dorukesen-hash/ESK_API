#!/usr/bin/env node
// One-time backfill: Category/Subcategory/Product -> catalog_node,
// Variant.categoryId/subcategoryId/productId -> Variant.nodeId.
// Defaults to a dry run (report only, no writes). Pass --apply to write.
// See docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md.
//
// Prerequisite: scripts/addVariantNodeIdColumn.js must have been run
// against this database first (sync() never adds a column to the
// pre-existing variant table on its own).

// db/index.js's module.exports IS the Sequelize instance itself, not
// { sequelize } - see the Task 5 ruling in this plan's ledger.
const sequelize = require('../db/index.js')
const {
  Category,
  Subcategory,
  Product,
  Variant,
  SubcategoryImages,
  ProductImages,
  CatalogNode,
  CatalogNodeImages,
} = require('../db/models')
const { resolveLegacyNodeKey } = require('../controller/catalogNodeTree')

const APPLY = process.argv.includes('--apply')

async function run() {
  const categories = await Category.findAll({ raw: true })
  const subcategories = await Subcategory.findAll({ raw: true })
  const products = await Product.findAll({ raw: true })
  const variants = await Variant.findAll({ raw: true })
  const subcategoryImages = await SubcategoryImages.findAll({ raw: true })
  const productImages = await ProductImages.findAll({ raw: true })

  console.log(
    `Found ${categories.length} categories, ${subcategories.length} subcategories, ` +
      `${products.length} products, ${variants.length} variants.`
  )
  console.log(`Expected new catalog_node rows: ${categories.length + subcategories.length + products.length}`)

  if (!APPLY) {
    console.log('Dry run only - pass --apply to write. No changes made.')
    return
  }

  await sequelize.transaction(async (t) => {
    const categoryNodeIdByOldId = new Map()
    for (const category of categories) {
      const node = await CatalogNode.create({ name: category.name, parentId: null }, { transaction: t })
      categoryNodeIdByOldId.set(category.id, node.id)
    }

    const subcategoryNodeIdByOldId = new Map()
    for (const subcategory of subcategories) {
      const parentNodeId = categoryNodeIdByOldId.get(subcategory.categoryId)
      const node = await CatalogNode.create(
        { name: subcategory.name, available: subcategory.available, parentId: parentNodeId },
        { transaction: t }
      )
      subcategoryNodeIdByOldId.set(subcategory.id, node.id)
    }

    const productNodeIdByOldId = new Map()
    for (const product of products) {
      const parentNodeId = subcategoryNodeIdByOldId.get(product.subcategoryId)
      const node = await CatalogNode.create(
        {
          name: product.title,
          description: product.description,
          sku: product.sku,
          available: product.available,
          stockLevel: product.stockLevel,
          stockAlertLevel: product.stockAlertLevel,
          extradata: product.extradata,
          parentId: parentNodeId,
        },
        { transaction: t }
      )
      productNodeIdByOldId.set(product.id, node.id)
    }

    for (const image of subcategoryImages) {
      const nodeId = subcategoryNodeIdByOldId.get(image.subcategoryId)
      if (nodeId == null) continue
      await CatalogNodeImages.create({ nodeId, imageId: image.imageId, position: image.position }, { transaction: t })
    }

    for (const image of productImages) {
      const nodeId = productNodeIdByOldId.get(image.productId)
      if (nodeId == null) continue
      await CatalogNodeImages.create({ nodeId, imageId: image.imageId, position: image.position }, { transaction: t })
    }

    let resolvedCount = 0
    let unresolvedCount = 0
    for (const variant of variants) {
      const key = resolveLegacyNodeKey(variant)
      if (!key) {
        unresolvedCount += 1
        continue
      }
      const nodeId =
        key.type === 'product'
          ? productNodeIdByOldId.get(key.legacyId)
          : key.type === 'subcategory'
          ? subcategoryNodeIdByOldId.get(key.legacyId)
          : categoryNodeIdByOldId.get(key.legacyId)
      if (nodeId == null) {
        unresolvedCount += 1
        continue
      }
      await Variant.update({ nodeId }, { where: { id: variant.id }, transaction: t })
      resolvedCount += 1
    }

    console.log(
      `Backfilled ${categoryNodeIdByOldId.size + subcategoryNodeIdByOldId.size + productNodeIdByOldId.size} catalog_node rows.`
    )
    console.log(`Resolved nodeId for ${resolvedCount} variants, ${unresolvedCount} left unresolved.`)
  })

  const nodeCount = await CatalogNode.count()
  const legacyCount = categories.length + subcategories.length + products.length
  console.log(
    nodeCount === legacyCount
      ? `OK: catalog_node count (${nodeCount}) matches legacy total (${legacyCount}).`
      : `MISMATCH: catalog_node count (${nodeCount}) != legacy total (${legacyCount}).`
  )
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

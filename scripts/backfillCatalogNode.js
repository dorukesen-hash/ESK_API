#!/usr/bin/env node
// One-time backfill: Category/Subcategory/Product -> catalog_node,
// Variant.categoryId/subcategoryId/productId -> Variant.nodeId.
// Defaults to a dry run (report only, no writes). Pass --apply to write.
// Pass --force together with --apply to re-run against a catalog_node
// table that already has rows (otherwise refuses, to avoid duplicating
// everything on a second run).
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
const FORCE = process.argv.includes('--force')

async function run() {
  if (APPLY) {
    const existingNodeCount = await CatalogNode.count()
    if (existingNodeCount > 0 && !FORCE) {
      console.log(
        `Refusing to run: catalog_node already has ${existingNodeCount} row(s). ` +
          `Re-running would duplicate every node and image. Pass --force to proceed anyway.`
      )
      process.exit(1)
    }
  }

  const categories = await Category.findAll({ raw: true })
  const subcategories = await Subcategory.findAll({ raw: true })
  const products = await Product.findAll({ raw: true })
  const variants = await Variant.findAll({ raw: true })
  const subcategoryImages = await SubcategoryImages.findAll({ raw: true })
  const productImages = await ProductImages.findAll({ raw: true })

  // A subcategory/product whose parent id is missing or points at nothing
  // we migrated is dangling legacy data. Rather than silently promoting it
  // to a new top-level category (which would surface as a brand-new root
  // category that never existed before), skip creating a node for it and
  // report it so a human decides what to do. Any variant that would have
  // resolved to a skipped entity falls through to "unresolved" below.
  const categoryIds = new Set(categories.map((c) => c.id))
  const orphanedSubcategories = subcategories.filter(
    (s) => s.categoryId == null || !categoryIds.has(s.categoryId)
  )
  const orphanedSubcategoryIds = new Set(orphanedSubcategories.map((s) => s.id))
  const validSubcategoryIds = new Set(
    subcategories.filter((s) => !orphanedSubcategoryIds.has(s.id)).map((s) => s.id)
  )
  const orphanedProducts = products.filter(
    (p) => p.subcategoryId == null || !validSubcategoryIds.has(p.subcategoryId)
  )
  const orphanedProductIds = new Set(orphanedProducts.map((p) => p.id))

  const expectedNodeCount =
    categories.length +
    (subcategories.length - orphanedSubcategories.length) +
    (products.length - orphanedProducts.length)

  console.log(
    `Found ${categories.length} categories, ${subcategories.length} subcategories, ` +
      `${products.length} products, ${variants.length} variants.`
  )
  if (orphanedSubcategories.length > 0) {
    console.log(
      `WARNING: ${orphanedSubcategories.length} subcategor${orphanedSubcategories.length === 1 ? 'y' : 'ies'} ` +
        `have no valid parent category and will be SKIPPED (not migrated, not promoted to root): ` +
        orphanedSubcategories.map((s) => `${s.id}:"${s.name}"`).join(', ')
    )
  }
  if (orphanedProducts.length > 0) {
    console.log(
      `WARNING: ${orphanedProducts.length} product${orphanedProducts.length === 1 ? '' : 's'} ` +
        `have no valid parent subcategory and will be SKIPPED (not migrated, not promoted to root): ` +
        orphanedProducts.map((p) => `${p.id}:"${p.title}"`).join(', ')
    )
  }
  console.log(`Expected new catalog_node rows: ${expectedNodeCount}`)

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
      if (orphanedSubcategoryIds.has(subcategory.id)) continue
      const parentNodeId = categoryNodeIdByOldId.get(subcategory.categoryId)
      const node = await CatalogNode.create(
        {
          name: subcategory.name,
          available: subcategory.available,
          description_id: subcategory.description_id,
          parentId: parentNodeId,
        },
        { transaction: t }
      )
      subcategoryNodeIdByOldId.set(subcategory.id, node.id)
    }

    const productNodeIdByOldId = new Map()
    for (const product of products) {
      if (orphanedProductIds.has(product.id)) continue
      const parentNodeId = subcategoryNodeIdByOldId.get(product.subcategoryId)
      const node = await CatalogNode.create(
        {
          name: product.title,
          description: product.description,
          description_id: product.description_id,
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

    // Parity: the row count created in this run must match what we set out
    // to create. Checked inside the transaction so a mismatch rolls
    // everything back instead of leaving a half-migrated table.
    const nodeCountThisRun =
      categoryNodeIdByOldId.size + subcategoryNodeIdByOldId.size + productNodeIdByOldId.size
    if (nodeCountThisRun !== expectedNodeCount) {
      throw new Error(
        `MISMATCH: created ${nodeCountThisRun} catalog_node rows, expected ${expectedNodeCount}. Rolling back.`
      )
    }

    // Spot-check: every variant we resolved must point at a node whose
    // name matches the legacy entity it was migrated from - catches a
    // corrupted id mapping, not just "something got written".
    for (const variant of variants) {
      const key = resolveLegacyNodeKey(variant)
      if (!key) continue
      const nodeId =
        key.type === 'product'
          ? productNodeIdByOldId.get(key.legacyId)
          : key.type === 'subcategory'
          ? subcategoryNodeIdByOldId.get(key.legacyId)
          : categoryNodeIdByOldId.get(key.legacyId)
      if (nodeId == null) continue
      const expectedName =
        key.type === 'product'
          ? products.find((p) => p.id === key.legacyId)?.title
          : key.type === 'subcategory'
          ? subcategories.find((s) => s.id === key.legacyId)?.name
          : categories.find((c) => c.id === key.legacyId)?.name
      const createdNode = await CatalogNode.findByPk(nodeId, { transaction: t })
      if (!createdNode || createdNode.name !== expectedName) {
        throw new Error(
          `Spot-check failed for variant ${variant.id}: node ${nodeId} has name ` +
            `"${createdNode?.name}", expected "${expectedName}". Rolling back.`
        )
      }
    }
    console.log('Spot-check passed: every resolved variant traces back to the correct legacy entity by name.')
  })

  const nodeCount = await CatalogNode.count()
  console.log(
    nodeCount === expectedNodeCount
      ? `OK: catalog_node count (${nodeCount}) matches expected (${expectedNodeCount}).`
      : `MISMATCH: catalog_node count (${nodeCount}) != expected (${expectedNodeCount}).`
  )
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

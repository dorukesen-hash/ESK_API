const { Op } = require('sequelize')
const { CatalogNode, CatalogNodeImages, Variant, Image } = require('../db/models')
// db/index.js's module.exports IS the Sequelize instance itself (not
// { sequelize }) - destructuring `sequelize` off it gives undefined. The
// existing reorderProductImages/reorderSubCategoryImages/reorderVariantImages
// functions make this same mistake (unexercised so far); don't repeat it here.
const sequelize = require('../db/index.js')
const AppError = require('../utils/appError')
const {
  buildTree,
  ancestorChain,
  collectDescendantIds,
  attachVariantsToTree,
  attachImagesToTree,
  toNodeId,
} = require('./catalogNodeTree')

// Lightweight tree - variant fields trimmed to what a tree/nav view needs.
// Do not use this for anything that renders a variant (price, description,
// images) to an end user - see getFullTree.
const getTree = async () => {
  const nodes = await CatalogNode.findAll({ raw: true })
  const variants = await Variant.findAll({
    raw: true,
    attributes: ['id', 'title', 'sku', 'nodeId'],
  })
  return attachVariantsToTree(buildTree(nodes), variants)
}

// Full tree - every variant column, plus each node's images - this is what
// the legacy /category shim (categoryController.js) needs to reproduce the
// exact payload ESK_FE/ESK_FE_V2 already render against; getTree's trimmed
// variant shape silently drops price, description, and featured fields.
const getFullTree = async () => {
  const nodes = await CatalogNode.findAll({ raw: true })
  const variants = await Variant.findAll({ raw: true })
  const imageRows = await CatalogNodeImages.findAll({
    include: [{ model: Image }],
    order: [['position', 'ASC']],
  })
  const images = imageRows.map((row) => row.get({ plain: true }))
  return attachImagesToTree(attachVariantsToTree(buildTree(nodes), variants), images)
}

const getNode = async (id) => {
  const nodeId = parseInt(id)
  const nodes = await CatalogNode.findAll({ raw: true })
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) throw new AppError('Node not found', 404)

  const ancestors = ancestorChain(nodeId, nodes).slice(0, -1)
  const children = nodes.filter((n) => n.parentId === nodeId)
  const variants = await Variant.findAll({ where: { nodeId }, raw: true })

  return { ...node, ancestors, children, variants }
}

const NODE_FIELDS = [
  'name',
  'description',
  'sku',
  'available',
  'stockLevel',
  'stockAlertLevel',
  'extradata',
  'parentId',
]

function pickNodeFields(data) {
  const fields = {}
  for (const key of NODE_FIELDS) {
    if (data[key] !== undefined) fields[key] = data[key]
  }
  return fields
}

const createNode = async (data) => {
  const fields = pickNodeFields(data)
  if (!fields.name) throw new AppError('name is required', 400)
  return await CatalogNode.create(fields)
}

const updateNode = async (id, data) => {
  const nodeId = parseInt(id)
  const fields = pickNodeFields(data)

  if (fields.parentId !== undefined && fields.parentId !== null) {
    // fields.parentId may be a string here (e.g. a form-encoded request
    // body) - compare it against collectDescendantIds' numeric ids with
    // strict equality and a cycle slips straight past the guard. Normalize
    // first, and reject anything that isn't a real id outright.
    const parentId = toNodeId(fields.parentId)
    if (parentId === null) throw new AppError('parentId must be a number', 400)
    fields.parentId = parentId

    const nodes = await CatalogNode.findAll({ raw: true })
    const descendantIds = collectDescendantIds(nodes, nodeId)
    if (descendantIds.includes(parentId)) {
      throw new AppError('A node cannot be moved under itself or one of its own descendants', 400)
    }
  }

  await CatalogNode.update(fields, { where: { id: nodeId } })
  return { success: true, id: nodeId }
}

const deleteNode = async (id) => {
  const nodeId = parseInt(id)
  const nodes = await CatalogNode.findAll({ raw: true })
  const idsToDelete = collectDescendantIds(nodes, nodeId)

  return await sequelize.transaction(async (t) => {
    await Variant.destroy({ where: { nodeId: { [Op.in]: idsToDelete } }, transaction: t })
    await CatalogNodeImages.destroy({ where: { nodeId: { [Op.in]: idsToDelete } }, transaction: t })
    await CatalogNode.destroy({ where: { id: { [Op.in]: idsToDelete } }, transaction: t })
    return { success: true, deletedNodeIds: idsToDelete }
  })
}

const attachNodeImage = async (nodeId, imageId) => {
  const existingCount = await CatalogNodeImages.count({ where: { nodeId: parseInt(nodeId) } })
  return await CatalogNodeImages.create({
    nodeId: parseInt(nodeId),
    imageId: parseInt(imageId),
    position: existingCount,
  })
}

const reorderNodeImages = async (nodeId, images) => {
  const positions = images.map((img) => img.position)
  const uniquePositions = new Set(positions)
  if (positions.length !== uniquePositions.size) {
    throw new AppError('Duplicate position values found. Each image must have a unique position.', 400)
  }

  const existingAssociations = await CatalogNodeImages.findAll({
    where: {
      nodeId: parseInt(nodeId),
      imageId: images.map((img) => img.imageId),
    },
  })

  if (existingAssociations.length !== images.length) {
    throw new AppError('One or more images are not associated with this node', 400)
  }

  await sequelize.transaction(async (t) => {
    for (const img of images) {
      await CatalogNodeImages.update(
        { position: img.position },
        { where: { nodeId: parseInt(nodeId), imageId: img.imageId }, transaction: t }
      )
    }
  })

  return { success: true, message: 'Node images reordered successfully' }
}

module.exports = {
  getTree,
  getFullTree,
  getNode,
  createNode,
  updateNode,
  deleteNode,
  attachNodeImage,
  reorderNodeImages,
  pickNodeFields,
}

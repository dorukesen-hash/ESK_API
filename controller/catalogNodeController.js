const { CatalogNode, Variant } = require('../db/models')
const AppError = require('../utils/appError')
const { buildTree, ancestorChain, attachVariantsToTree } = require('./catalogNodeTree')

const getTree = async () => {
  const nodes = await CatalogNode.findAll({ raw: true })
  const variants = await Variant.findAll({
    raw: true,
    attributes: ['id', 'title', 'sku', 'nodeId'],
  })
  return attachVariantsToTree(buildTree(nodes), variants)
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

module.exports = { getTree, getNode }

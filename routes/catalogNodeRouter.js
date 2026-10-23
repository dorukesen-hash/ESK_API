const router = (module.exports = require('express').Router())
const { getFullTree, getNode } = require('../controller/catalogNodeController')

// GET /api/catalog-node
// Full tree (variant prices/images included), not the lightweight getTree -
// the storefront's product/category pages need the same fidelity the legacy
// /category shim already exposes publicly (full variant rows, no auth), so
// this discloses nothing new. See the ESK_FE_V2 catalog_node foundation spec.
router.get('/', async (req, res, next) => {
  try {
    const data = await getFullTree()
    res.status(200).send(data)
  } catch (error) {
    next(error)
  }
})

// GET /api/catalog-node/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const data = await getNode(id)
    res.status(200).send(data)
  } catch (error) {
    next(error)
  }
})

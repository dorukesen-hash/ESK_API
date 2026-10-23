const router = (module.exports = require('express').Router())
const { getTree, getNode } = require('../controller/catalogNodeController')

// GET /api/catalog-node
router.get('/', async (req, res, next) => {
  try {
    const data = await getTree()
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

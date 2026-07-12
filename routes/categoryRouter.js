const router = (module.exports = require('express').Router())
const { getCategories, getCategory, addCategory, deleteCategory } = require('../controller/categoryController')
const AppError = require('../utils/appError')


// Description
// GET /api/category
router.get('/', async (req, res, next) => {
    try {
        const data = await getCategories()
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Get category
// GET /api/category/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const data = await getCategory(id)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Save product
// POST /api/category/
router.post('/', async (req, res, next) => {
    try {
        const data = await addCategory(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete product
// DELETE /api/category/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        await deleteCategory(id)
        res.status(200).send({ success: true, id })
    } catch (error) {
        next(error)
    }
})
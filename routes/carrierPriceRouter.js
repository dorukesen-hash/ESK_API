const router = (module.exports = require('express').Router())
const AppError = require('../utils/appError')

// Description
// GET /api/carrierprice
router.get('/', async (req, res, next) => {
    try {
        const { query } = req.headers
        if (!query) throw new AppError('Parametre Bulunamadi', 500)
        const data = await getProducts(query, req.userData)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Get product
// GET /api/product/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const data = await getProduct(id)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Save product
// POST /api/product/:id
router.post('/', async (req, res, next) => {
    try {
        const data = await saveProduct(req.body, req.userData)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete product
// DELETE /api/product/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        await deleteProduct(id, req.userData)
        res.status(200).send({ success: true, id })
    } catch (error) {
        next(error)
    }
})
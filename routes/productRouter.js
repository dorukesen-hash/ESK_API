const router = (module.exports = require('express').Router())
const { getProducts, getProduct, saveProduct, deleteProduct, getProductsforSubCategory, getProductsFromSubCategoryName,
    getProductDetails,
    reorderProductImages
} = require('../controller/productController')
const AppError = require('../utils/appError')
const {User, Cart} = require("../db/models");
const requireAuth = require('../middleware/requireAuth')
const requireAdmin = require('../middleware/requireAdmin')

// Description
// GET /api/product
router.get('/', async (req, res, next) => {
    try {
        const data = await getProducts(query, req.userData)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// GET /api/product/name
router.get('/name/', async (req, res, next) => {
    try {
        const { query } = req.headers
        if (!query) throw new AppError(`No parameter found!`, 500)
        const data = await getProductsFromSubCategoryName(query)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Get product
// GET /api/product/:id
router.get('/:id', async (req, res, next) => {
    const { id } = req.params
    console.log(id)
    try {
        const data = await getProductsforSubCategory(id)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})
// Get product Detail to Display FE
// GET /api/product/details/:id
router.get('/details/:id', async (req, res, next) => {
    const { id } = req.params
    try {
        const data = await getProductDetails(id)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})


// Save product
// POST /api/product/
router.post('/', async (req, res, next) => {
    try {
        const data = await saveProduct(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Reorder product images (Admin only)
// POST /api/product/:id/images/reorder
router.post('/:id/images/reorder', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params
        const { images } = req.body
        
        if (!images || !Array.isArray(images)) {
            throw new AppError('Images array is required', 400)
        }
        
        const data = await reorderProductImages(id, images)
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
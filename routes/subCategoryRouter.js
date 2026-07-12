const router = (module.exports = require('express').Router())
const AppError = require('../utils/appError')
const { getSubCategories, addSubCategory, deleteSubCategory, getSubCategoriesPerCategory, getSubCategoriesByCategoryName, getSubcategoryDetails } = require('../controller/subCategoryController')
const { CloudHSM } = require('aws-sdk')

// Description
// GET /api/subcategory
router.get('/', async (req, res, next) => {
    try {
        const data = await getSubCategories()
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Get subcategory
// GET /api/subcategory/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const data = await getSubCategoriesPerCategory(id)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Get subcategory Detail to Display FE
// GET /api/subcategory/details/:id
router.get('/details/:id', async (req, res, next) => {
    const { id } = req.params
    try {
        const data = await getSubcategoryDetails(id)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// GET /api/subcategory
router.get('/name/', async (req, res, next) => {
    const { query } = req.headers
    try {
        const data = await getSubCategoriesByCategoryName(query)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})




// Save subcategory
// POST /api/subcategory/
router.post('/', async (req, res, next) => {
    try {
        const data = await addSubCategory(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete subcategory
// DELETE /api/subcategory/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        await deleteSubCategory(id)
        res.status(200).send({ success: true, id })
    } catch (error) {
        next(error)
    }
})
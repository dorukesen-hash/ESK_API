const router = (module.exports = require('express').Router())
const AppError = require('../utils/appError')
const { getVariants, getVariant, saveVariant, deleteVariant, updateVariant, getVariantOfProduct, dataForExcelDropdown, getVariantByIdList, reorderVariantImages} = require('../controller/variantController')
const {PalletInfo} = require("../db/models");
const requireAuth = require('../middleware/requireAuth')
const requireAdmin = require('../middleware/requireAdmin')


// Description
// GET /api/variant
router.get('/', async (req, res, next) => {
	try {
		const data = await getVariants()
		res.status(200).json(data)
	} catch (error) {
		next(error)
	}
})

// Get variant
// GET /api/variant/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getVariant(id, req.user)
		if(data){
			res.status(200).json(data)
		}
	} catch (error) {
		next(error)
	}
})
// Get variants
// GET /api/variant/id-list
router.post('/id-list', async (req, res, next) => {
	const { ids } = req.body
	try {
		const data = await getVariantByIdList(ids, req.user)
		if(data){
			res.status(200).json(data)
		}
	} catch (error) {
		next(error)
	}
})

// Get variant fo a product
//variant/productId/:id
router.get('/productId/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getVariantOfProduct(id)


		if(data){
			res.status(200).json(data)
		}
	} catch (error) {
		next(error)
	}
})

// Save variant
// POST /api/variant/
router.post('/', async (req, res, next) => {
	try {
		const data = await saveVariant(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Save variant
// PUT /api/variant/
router.put('/', async (req, res, next) => {
    try {
        const data = await updateVariant(req.body)
        res.status(200).send({message: "Variant updated!"})
    } catch (error) {
        next(error)
    }
})

// Reorder variant images (Admin only)
// POST /api/variant/:id/images/reorder
router.post('/:id/images/reorder', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params
        const { images } = req.body
        
        if (!images || !Array.isArray(images)) {
            throw new AppError('Images array is required', 400)
        }
        
        const data = await reorderVariantImages(id, images)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete variant
// DELETE /api/variant/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deleteVariant(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})


// Get variant
// GET /api/variant/drop/:id
router.get('/drop/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await dataForExcelDropdown(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})
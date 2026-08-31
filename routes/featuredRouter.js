const router = (module.exports = require('express').Router())
const { getVariantsForFeatured, getFeaturedSources, getFeaturedProduct, saveFeaturedProducts, editFeaturedProducts, deleteFeaturedProducts } = require('../controller/featuredController')
const AppError = require('../utils/appError')


// Description
// GET /api/featured
router.get('/', async (req, res, next) => {
	try {
		if (!req.query) throw new AppError('No parameter found', 500)
		const data = await getVariantsForFeatured(req.query)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Distinct source variants that already have FBT targets configured - must
// stay ABOVE the /:id route below, or Express matches "sources" as :id first.
// GET /api/featured/sources
router.get('/sources', async (req, res, next) => {
	try {
		const data = await getFeaturedSources()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Get featured
// GET /api/featured/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getFeaturedProduct(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Save featured
// POST /api/featured
router.post('/', async (req, res, next) => {
	try {
		const data = await saveFeaturedProducts(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})



// Delete featured
// DELETE /api/featured
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deleteFeaturedProducts(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})



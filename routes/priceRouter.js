const router = (module.exports = require('express').Router())
const { getPrices, getPrice, savePrice, editPrice, deletePrice } = require('../controller/priceController')

// Description
// GET /api/price
router.get('/', async (req, res, next) => {
	try {
		const data = await getPrices()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Get price
// GET /api/price/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getPrice(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Save price
// POST /api/price
router.post('/', async (req, res, next) => {
	try {
		const data = await savePrice(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Edit price
// PUT /api/price
router.put('/', async (req, res, next) => {
    try {
        const data = await editPrice(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete price
// DELETE /api/price/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deletePrice(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})
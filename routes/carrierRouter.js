const router = (module.exports = require('express').Router())
const { getCarriers, getCarrier, saveCarrier, editCarrier, deleteCarrier } = require('../controller/carrierController')

// Description
// GET /api/carriers
router.get('/', async (req, res, next) => {
	try {
		const data = await getCarriers()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Get carriers
// GET /api/carriers/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getCarrier(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Save carriers
// POST /api/carriers/
router.post('/', async (req, res, next) => {
	try {
		const data = await saveCarrier(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Edit carriers
// PUT /api/carriers/:id
router.put('/', async (req, res, next) => {
    try {
        const data = await editCarrier(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete carriers
// DELETE /api/carriers/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deleteCarrier(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})
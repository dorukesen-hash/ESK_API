const router = (module.exports = require('express').Router())
const { getSpecifications, getSpecification, saveSpecification, editSpecification, deleteSpecification } = require('../controller/specificationController')

// Description
// GET /api/specification
router.get('/', async (req, res, next) => {
	try {
		const data = await getSpecifications()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Get specification
// GET /api/specification/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getSpecification(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Save specification
// POST /api/specification
router.post('/', async (req, res, next) => {
	try {
		const data = await saveSpecification(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Edit specification
// PUT /api/specification
router.put('/', async (req, res, next) => {
    try {
        const data = await editSpecification(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete specification
// DELETE /api/specification/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deleteSpecification(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})
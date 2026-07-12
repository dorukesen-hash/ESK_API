const router = (module.exports = require('express').Router())
const { getDimensions, getDimension, saveDimension, editDimension, deleteDimension } = require('../controller/dimensionController')
const AppError = require('../utils/appError')

// Description 
// GET /api/dimension
router.get('/', async (req, res, next) => {
	try {
		const data = await getDimensions()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Get dimension
// GET /api/dimension/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getDimension(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Save dimension
// POST /api/dimension/:id
router.post('/', async (req, res, next) => {
	try {
		const data = await saveDimension(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Edit dimension
// PUT /api/dimension/:id
router.put('/', async (req, res, next) => {
    try {
        const data = await editDimension(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete dimension
// DELETE /api/dimension/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deleteDimension(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})
const router = (module.exports = require('express').Router())
const { editPackage, getPackages, getPackage, savePackage, deletePackage } = require('../controller/packageController')
const AppError = require('../utils/appError')

// Description
// GET /api/package
router.get('/', async (req, res, next) => {
	try {
		const data = await getPackages()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Get package_info
// GET /api/package/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getPackage(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Save package
// POST /api/package/:id
router.post('/', async (req, res, next) => {
	try {
		const data = await savePackage(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Edit package
// PUT /api/package/:id
router.put('/', async (req, res, next) => {
    try {
        const data = await editPackage(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete package
// DELETE /api/package/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deletePackage(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})
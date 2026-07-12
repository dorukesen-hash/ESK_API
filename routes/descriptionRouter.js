const router = (module.exports = require('express').Router())
const { getDescriptions, getDescription, saveDescription, editDescription, deleteDescription } = require('../controller/descriptionController')

// Description
// GET /api/description
router.get('/', async (req, res, next) => {
	try {
		const data = await getDescriptions()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Get description
// GET /api/description/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getDescription(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Save description
// POST /api/description/:id
router.post('/', async (req, res, next) => {
	try {
		const data = await saveDescription(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Edit description
// PUT /api/description/:id
router.put('/', async (req, res, next) => {
    try {
        const data = await editDescription(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete description
// DELETE /api/description/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deleteDescription(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})
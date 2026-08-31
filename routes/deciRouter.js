const router = (module.exports = require('express').Router())
const AppError = require('../utils/appError')
const { getDecis, getDeci, saveDeci, editDeci, deleteDeci } = require('../controller/deciController')

// GET /api/deci
router.get('/', async (req, res, next) => {
	try {
		const data = await getDecis()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/deci/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getDeci(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/deci
router.post('/', async (req, res, next) => {
	try {
		const data = await saveDeci(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/deci
router.put('/', async (req, res, next) => {
	try {
		const data = await editDeci(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/deci/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		if (!id) throw new AppError('Id not found', 500)
		await deleteDeci(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})

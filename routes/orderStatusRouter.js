const router = (module.exports = require('express').Router())
const { getOrderStatuses, getOrderStatus, saveOrderStatus, editOrderStatus, deleteOrderStatus } = require('../controller/orderStatusController')

// GET /api/orderstatuses
router.get('/', async (req, res, next) => {
	try {
		const data = await getOrderStatuses()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/orderstatuses/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getOrderStatus(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/orderstatuses
router.post('/', async (req, res, next) => {
	try {
		const data = await saveOrderStatus(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/orderstatuses
router.put('/', async (req, res, next) => {
	try {
		const data = await editOrderStatus(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/orderstatuses/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		if (!id) throw new AppError('Id not found', 500)
		await deleteOrderStatus(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})

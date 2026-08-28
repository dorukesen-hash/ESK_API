const router = (module.exports = require('express').Router())
const { getOrderItemStatuses, getOrderItemStatus, saveOrderItemStatus, editOrderItemStatus, deleteOrderItemStatus } = require('../controller/orderItemStatusController')

// GET /api/orderitemstatuses
router.get('/', async (req, res, next) => {
	try {
		const data = await getOrderItemStatuses()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/orderitemstatuses/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getOrderItemStatus(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/orderitemstatuses
router.post('/', async (req, res, next) => {
	try {
		const data = await saveOrderItemStatus(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/orderitemstatuses
router.put('/', async (req, res, next) => {
	try {
		const data = await editOrderItemStatus(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/orderitemstatuses/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		if (!id) throw new AppError('Id not found', 500)
		await deleteOrderItemStatus(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})

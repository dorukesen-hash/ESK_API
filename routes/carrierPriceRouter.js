const router = (module.exports = require('express').Router())
const AppError = require('../utils/appError')
const { getCarrierPrices, getCarrierPrice, addCarrierPrices, editCarrierPrice, deleteCarrierPrice } = require('../controller/carrierPriceController')

// GET /api/carrierprice
router.get('/', async (req, res, next) => {
	try {
		const data = await getCarrierPrices()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/carrierprice/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getCarrierPrice(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/carrierprice
router.post('/', async (req, res, next) => {
	try {
		const data = await addCarrierPrices(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/carrierprice
router.put('/', async (req, res, next) => {
	try {
		const data = await editCarrierPrice(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/carrierprice/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		if (!id) throw new AppError('Id not found', 500)
		await deleteCarrierPrice(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})

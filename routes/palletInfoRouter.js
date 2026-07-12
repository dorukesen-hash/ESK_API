const router = (module.exports = require('express').Router())
const { getPallets, getPallet, savePallet, editPallet, deletePallet } = require('../controller/palletController')

// Description
// GET /api/pallet
router.get('/', async (req, res, next) => {
	try {
		const data = await getPallets()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Get pallet_info
// GET /api/pallet/:id
router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getPallet(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Save pallet
// POST /api/pallet
router.post('/', async (req, res, next) => {
	try {
		const data = await savePallet(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Edit pallet
// PUT /api/pallet
router.put('/', async (req, res, next) => {
    try {
        const data = await editPallet(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Delete pallet
// DELETE /api/pallet/:id
router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deletePallet(id)
		res.status(200).send({ success: true, id })
	} catch (error) {
		next(error)
	}
})
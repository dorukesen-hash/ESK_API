const router = (module.exports = require('express').Router())
const { getOrderitems, addOrderitems } = require('../controller/orderItemController')
const AppError = require('../utils/appError')



// Description
// GET /api/order/
router.get('/', async (req, res, next) => {
    try {
        const data = await getOrderitems()
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})


// Save order
// POST /api/orderitem/
router.post('/', async (req, res, next) => {
    try {
        const data = await addOrderitems(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})
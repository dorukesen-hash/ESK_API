const router = (module.exports = require('express').Router())
const { getOrders, createOrder } = require('../controller/orderController')
const AppError = require('../utils/appError')


// Description
// GET /api/orders/
router.get('/orders/', async (req, res, next) => {
    try {
        const { query } = req.headers
        if (!query) throw new AppError('Parametre Bulunamadi', 500)
        const data = await getOrders(query)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})


// Save order
// POST /api/orders
router.post('/', async (req, res, next) => {
    try {
        const { user, body } = req
        const data = await createOrder({userInfo:user, order:body})
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})
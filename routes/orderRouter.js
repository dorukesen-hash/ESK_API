const router = (module.exports = require('express').Router())
const rateLimit = require('express-rate-limit')
const { getOrders, createOrder, lookupGuestOrders } = require('../controller/orderController')
const AppError = require('../utils/appError')

const guestLookupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many lookup attempts. Please try again later.' },
})

// Guest order lookup - no auth. Registered before the /orders/ admin route
// below only to keep every /orders/* route grouped by how it's reached
// (public, then admin-header-driven, then the plain POST) rather than any
// functional requirement - the paths don't collide.
// GET /api/orders/lookup?email=...&orderNumber=...
router.get('/lookup', guestLookupLimiter, async (req, res, next) => {
    try {
        const data = await lookupGuestOrders(req.query)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})


// Description
// GET /api/orders/orders/
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

const { getCustomers, addCustomer } = require('../controller/customerController')
const router = (module.exports = require('express').Router())




// Description
// GET /api/admin/customer/
router.get('/', async (req, res, next) => {
    try {

        const data = await getCustomers()
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})


// Save customer
// POST /api/customer/
router.post('/', async (req, res, next) => {
    try {
        const data = await addCustomer(req.body)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})
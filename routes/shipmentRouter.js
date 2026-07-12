const router = (module.exports = require('express').Router())
const AppError = require('../utils/appError')
const { calculateShipping } = require('../utils/calculateShipping')


// Get subcategory Detail to Display FE
// GET /api/subcategory/details/:id
router.post('/calculate', async (req, res, next) => {
    const { isResidential,zipCode } = req.body
    try {
        const data = await calculateShipping(isResidential,zipCode)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})
const router = (module.exports = require('express').Router())
const { previewDiscountCode } = require('../controller/discountCodeController')

// Public (optionally-authenticated - req.user set if logged in) coupon
// preview for the cart page. Admin CRUD for discount codes lives under
// /api/admin/discount-codes instead (routes/adminRouter.js).
// POST /api/discount-codes/validate
router.post('/validate', async (req, res, next) => {
	try {
		const data = await previewDiscountCode(req.body, req.user)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

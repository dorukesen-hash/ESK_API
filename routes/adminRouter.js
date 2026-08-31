const router = (module.exports = require('express').Router())
const { getCategoriesforAdmin, getVariantsForAdmin, updateCategoryAdmin, addCategoryAdmin, deleteCategoryAdmin, getSubCategoriesforAdmin, addSubCategoryAdmin, updateSubCategoryAdmin, deleteSubCategoryAdmin, getProductsforAdmin, addProductAdmin, updateProductAdmin, deleteProductAdmin, updateVariantForAdmin, deleteVariantForAdmin, getFeaturedVariantsForAdmin } = require('../controller/adminController')
const { getCustomers, getCustomerDetailForAdmin } = require('../controller/customerController')
const { updateUserAdmin, sendPasswordResetEmail, getUserById } = require('../controller/userController')
const { saveShippingprofiles } = require('../controller/shippingProfile')
const { getSpecialPricesForUser, upsertSpecialPrice, deleteSpecialPrice } = require('../controller/specialPriceController')
const { deleteImageConnections } = require('../controller/imageController')
const { getOrders, getSingleOrder, updateOrder, updateOrderStatus, completeOrder } = require('../controller/orderController')
const { getShipments, getSingleShipment, updateShipment } = require('../controller/shipmentController')
const { uploadVariantExcel } = require('../controller/variantController')
const { exportVariantsExcel, bulkImportVariantsExcel } = require('../controller/variantBulkController')
const { getVariantAuditLog, getAllVariantAuditLog } = require('../controller/variantAuditController')
const { getDiscountCodes, createDiscountCode, updateDiscountCode, deleteDiscountCode, getDiscountCodeRedemptions } = require('../controller/discountCodeController')
const { getShippingprofiles } = require('../controller/shippingProfile')
const { OrderItem } = require('../db/models')
const AppError = require('../utils/appError');
const requireAuth = require('../middleware/requireAuth')
const requireAdmin = require('../middleware/requireAdmin')
const multer = require('multer')
const upload = multer({storage: multer.memoryStorage()})

// Every route below is admin-only: verified access token (requireAuth) + isAdmin === "admin" (requireAdmin)
router.use(requireAuth)
router.use(requireAdmin)


// Description
// GET /api/admin/orders
router.get('/orders/', async (req, res, next) => {
	try {
		if (!req.query) throw new AppError('Parametre Bulunamadi', 500)
		const data = await getOrders(req.query)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/admin/orders/:id
router.get('/orders/:id', async (req, res, next) => {
	try {
		const {id} = req.params
		if (!id) throw new AppError('Parametre Bulunamadi', 500)
		const data = await getSingleOrder(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/admin/orders/:id
router.put('/orders/:id', async (req, res, next) => {
	try {
		const {id} = req.params
		if (!id) throw new AppError('Parametre Bulunamadi', 500)
		const data = await updateOrder(id, req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/admin/orders/status/
router.post('/orders/status/', async (req, res, next) => {
	try {
		const data = await updateOrderStatus(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/admin/orders/complete/
router.post('/orders/complete/', async (req, res, next) => {
	try {
		const data = await completeOrder(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/admin/category/
router.get('/category/', async (req, res, next) => {
	try {
		const data = await getCategoriesforAdmin(req.query)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Description
// GET /api/admin/shipment
router.get('/shipment/', async (req, res, next) => {
	try {
		if (!req.query) throw new AppError('Parametre Bulunamadi', 500)
		const data = await getShipments(req.query)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/admin/shipment/:id
router.get('/shipment/:id', async (req, res, next) => {
	try {
		const {id} = req.params
		if (!id) throw new AppError('Parametre Bulunamadi', 500)
		const data = await getSingleShipment(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})


// PUT /api/admin/shipment/:id
router.put('/shipment/:id', async (req, res, next) => {
	try {
		const {id} = req.params
		if (!id) throw new AppError('Parametre Bulunamadi', 500)
		const data = await updateShipment(id,req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})



// POST /api/admin/orderitems/tracking
// Body: { orderItemId: number, note: string } OR { ids: [number], note: string }
router.post('/orderitems/tracking', async (req, res, next) => {
	try {
		const { orderItemId, ids, note } = req.body || {}
		if (!note || (!orderItemId && !(ids && ids.length))) throw new AppError('Missing parameters', 400)

		if (ids && Array.isArray(ids) && ids.length) {
			await OrderItem.update({ note }, { where: { id: ids } })
			const updated = await OrderItem.findAll({ where: { id: ids } })
			return res.status(200).json({ success: true, data: updated })
		}

		// single
		const item = await OrderItem.findByPk(orderItemId)
		if (!item) throw new AppError('OrderItem not found', 404)
		item.note = note
		await item.save()
		res.status(200).json({ success: true, data: item })
	} catch (error) {
		next(error)
	}
})

// POST /api/admin/category/
router.post('/category/', async (req, res, next) => {
	try {
		const data = await addCategoryAdmin(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/admin/category/
router.put('/category/', async (req, res, next) => {
	try {
		const data = await updateCategoryAdmin(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/admin/category/
router.delete('/category/:id', async (req, res, next) => {
	try {
		const {id} = req.params
		if (!id) throw new AppError('Id not found', 500) 
		await deleteCategoryAdmin(id)
		res.sendStatus(200)
	} catch (error) {
		next(error)
	}
})

// GET /api/admin/subcategory/
router.get('/subcategory', async (req, res, next) => {
	try {
		let {search} = req.query
		const data = await getSubCategoriesforAdmin(decodeURIComponent(search))
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/admin/subcategory/
router.post('/subcategory/', async (req, res, next) => {
	try {
		const data = await addSubCategoryAdmin(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/admin/subcategory/
router.put('/subcategory/', async (req, res, next) => {
	try {
		const data = await updateSubCategoryAdmin(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/admin/subcategory/
router.delete('/subcategory/:id', async (req, res, next) => {
	try {
		const {id} = req.params
		if (!id) throw new AppError('Id not found', 500)
		await deleteImageConnections('subcategory',id)
		await deleteSubCategoryAdmin(id)
		res.sendStatus(200)
	} catch (error) {
		next(error)
	}
})

// GET /api/admin/product
router.get('/product', async (req, res, next) => {
	try {
		let {search} = req.query
		const data = await getProductsforAdmin(decodeURIComponent(search))
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/admin/product/
router.post('/product/', async (req, res, next) => {
	try {
		const data = await addProductAdmin(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/admin/product/
router.put('/product/', async (req, res, next) => {
	try {
		const data = await updateProductAdmin(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/admin/product/
router.delete('/product/:id', async (req, res, next) => {
	try {
		const {id} = req.params
		if (!id) throw new AppError('Id not found', 500) 
		await deleteProductAdmin(id)
		await deleteImageConnections('product',id)
		res.sendStatus(200)
	} catch (error) {
		next(error)
	}
})

// GET VARIANTS
// GET /api/admin/variant/
router.get('/variant/', async (req, res, next) => {
	try {
		const data = await getVariantsForAdmin(req.query)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/admin/product/
router.put('/variant/', async (req, res, next) => {
	
	try {
		const data = await updateVariantForAdmin(req.body, req.user.id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/admin/variant/
router.delete('/variant/:id', async (req, res, next) => {
	try {
		const {id} = req.params
		if (!id) throw new AppError('Id not found', 500)
		await deleteImageConnections('variant',id)
		await deleteVariantForAdmin(id, req.user.id)
		res.sendStatus(200)
	} catch (error) {
		next(error)
	}
})


// GET CUSTOMERS
// GET /api/admin/customers/
router.get('/customers/', async (req, res, next) => {
	try {
		const data = await getCustomers(req.query)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/admin/customers/:userId/shipping-profiles
router.get('/customers/:userId/shipping-profiles', async (req, res, next) => {
	try {
		const { userId } = req.params
		const data = await getShippingprofiles(userId)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Create a new address for a customer - admin-initiated version of the
// self-service POST /api/shippingprofiles/, which only accepts req.user's
// own id. Here the admin names the target userId explicitly.
// POST /api/admin/customers/:userId/shipping-profiles
router.post('/customers/:userId/shipping-profiles', async (req, res, next) => {
	try {
		const { userId } = req.params
		const data = await saveShippingprofiles({ user: { id: userId }, body: req.body })
		res.status(201).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/admin/customers/:userId/special-prices
router.get('/customers/:userId/special-prices', async (req, res, next) => {
	try {
		const { userId } = req.params
		const data = await getSpecialPricesForUser(userId)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Create/update a per-variant price override for a customer.
// POST /api/admin/customers/:userId/special-prices
router.post('/customers/:userId/special-prices', async (req, res, next) => {
	try {
		const { userId } = req.params
		const { variantId, price } = req.body
		const data = await upsertSpecialPrice({ userId, variantId, price })
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/admin/special-prices/:id
router.delete('/special-prices/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deleteSpecialPrice(id)
		res.sendStatus(200)
	} catch (error) {
		next(error)
	}
})

// Full customer detail - Customer row + linked User + address book + order
// history + special prices, for the admin Customer detail page. Registered
// after the more-specific /customers/:userId/... routes above so ":id" here
// (a different path depth) can't shadow them either way, but keeping this
// ordering for readability.
// GET /api/admin/customers/:id
router.get('/customers/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getCustomerDetailForAdmin(id)
		if (!data) return res.status(404).json({ message: 'Customer not found.' })
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Update a User's account-identity fields (name/surname/email/phone/isActive/
// discountPercent/isAdmin). Password can never be set through this endpoint;
// isAdmin is normalized+guarded in updateUserAdmin (can't unset your own).
// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await updateUserAdmin(id, req.body, req.user?.id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// Admin-triggered password reset - reuses the exact same token/email flow as
// the public "forgot password" (routes/authRouter.js), just skipping the
// email-ownership step since the admin already knows which user.
// POST /api/admin/users/:id/send-reset
router.post('/users/:id/send-reset', async (req, res, next) => {
	try {
		const { id } = req.params
		const user = await getUserById(id)
		if (!user) return res.status(404).json({ message: 'User not found.' })
		await sendPasswordResetEmail(user)
		res.status(200).json({ message: 'Reset email sent.' })
	} catch (error) {
		next(error)
	}
})

// VARIANT UPLOAD EXCEL
// POST /api/admin//variant-upload
router.post('/variant-upload',upload.single('file'), async(req,res,next) => {

	const {hierarchy_type, hierarchy_id } =req.headers;
	try {
		const data = await uploadVariantExcel(hierarchy_type,hierarchy_id, req.file, req.user.id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
} )

// VARIANT BULK EXPORT
// GET /api/admin/variant/export
router.get('/variant/export', async (req, res, next) => {
	try {
		const buffer = await exportVariantsExcel()
		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
		res.setHeader('Content-Disposition', 'attachment; filename="variants.xlsx"')
		res.status(200).send(buffer)
	} catch (error) {
		next(error)
	}
})

// VARIANT BULK IMPORT (create rows with no ID, update rows with one)
// POST /api/admin/variant/bulk-import
router.post('/variant/bulk-import', upload.single('file'), async (req, res, next) => {
	try {
		if (!req.file) throw new AppError('Yüklenecek dosya bulunamadı.', 400)
		const result = await bulkImportVariantsExcel(req.file, req.user.id)
		res.status(200).send(result)
	} catch (error) {
		next(error)
	}
})

// VARIANT AUDIT LOG
// GET /api/admin/variant/:id/audit-log
router.get('/variant/:id/audit-log', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getVariantAuditLog(parseInt(id))
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GLOBAL, CROSS-VARIANT AUDIT LOG
// GET /api/admin/variant-audit-log
router.get('/variant-audit-log', async (req, res, next) => {
	try {
		const data = await getAllVariantAuditLog(req.query)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DISCOUNT CODES
// GET /api/admin/discount-codes
router.get('/discount-codes', async (req, res, next) => {
	try {
		const data = await getDiscountCodes()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/admin/discount-codes
router.post('/discount-codes', async (req, res, next) => {
	try {
		const data = await createDiscountCode(req.body)
		res.status(201).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/admin/discount-codes/:id
router.put('/discount-codes/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await updateDiscountCode(id, req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/admin/discount-codes/:id
router.delete('/discount-codes/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		await deleteDiscountCode(id)
		res.sendStatus(200)
	} catch (error) {
		next(error)
	}
})

// GET /api/admin/discount-codes/:id/redemptions
router.get('/discount-codes/:id/redemptions', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getDiscountCodeRedemptions(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// ADMIN-CURATED FEATURED VARIANTS
// GET /api/admin/variant/featured
router.get('/variant/featured', async (req, res, next) => {
	try {
		const data = await getFeaturedVariantsForAdmin()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})






const api = (module.exports = require('express').Router())

const checklogin = require('../middleware/checkLogin')

// router files
const accountRouter = require('./accountRouter');
const adminRouter = require('./adminRouter');
const authRouter = require('./authRouter');
const carrierPriceRouter = require('./carrierPriceRouter');
const carrierRouter = require('./carrierRouter');
const categoryRouter = require('./categoryRouter');
const cookieRouter = require('./cookieRouter');
const customerRouter = require('./customerRouter');
const deciRouter = require('./deciRouter');
const discountCodeRouter = require('./discountCodeRouter');
const descriptionRouter = require('./descriptionRouter');
const dimensionRouter = require('./dimensionRouter');
const invoiceRouter = require('./invoiceRouter');
const claimRouter = require('./claimRouter');
const orderItemRouter = require('./orderItemRouter');
const orderItemStatusRouter = require('./orderItemStatusRouter');
const orderRouter = require('./orderRouter');
const orderStatusRouter = require('./orderStatusRouter');
const packageInfoRouter = require('./packageInfoRouter');
const palletInfoRouter = require('./palletInfoRouter');
const priceRouter = require('./priceRouter');
const productRouter = require('./productRouter');
const r2Router = require('./r2Router');
const shipmentRouter = require('./shipmentRouter');
const specificationRouter = require('./specificationRouter');
const subCategoryController = require('./subCategoryRouter');
const userRouter = require('./userRouter');
const variantRouter = require('./variantRouter');
const imageRouter = require('./imageRouter');
const cartRouter = require('./cartRouter');
const servicesRouter = require('./servicesRouter');
const stripeRouter = require('./stripeRouter')
const shippingProfile = require('./shippingProfile')
const featuredRouter = require('./featuredRouter')
const searchRouter = require('./searchRouter')

/// Routers
// A
api.use('/account', accountRouter)
api.use('/auth', authRouter)
api.use('/admin', adminRouter)
// B
// C
api.use('/carriers',  carrierRouter)
api.use('/cart', cartRouter)
api.use('/carrierprice',  carrierPriceRouter)
api.use('/category',  categoryRouter)
api.use('/customer',  customerRouter)
api.use('/cookie', cookieRouter)
// D
api.use('/deci', deciRouter)
api.use('/discount-codes', discountCodeRouter)
api.use('/description', descriptionRouter)
api.use('/dimension', dimensionRouter)
// F
api.use('/featured',featuredRouter )
// G
// I
api.use('/invoices',invoiceRouter)
api.use('/images', imageRouter)
api.use('/claims', claimRouter)
// M
// O
api.use('/orders', orderRouter)
api.use('/orderitem', orderItemRouter)
api.use('/orderstatuses', orderStatusRouter)
api.use('/orderitemstatuses', orderItemStatusRouter)
// P
api.use('/package', packageInfoRouter)
api.use('/pallet', palletInfoRouter)
api.use('/price', priceRouter)
api.use('/product', productRouter)
// Q
// R
api.use('/r2', r2Router)
// S
api.use('/search', searchRouter)
api.use('/shipments',shipmentRouter)
api.use('/shippingprofiles',shippingProfile)
api.use('/specification', specificationRouter)
api.use('/subcategory',subCategoryController)
api.use('/stripe',stripeRouter)

api.use('/services', servicesRouter)
// U
api.use('/user',userRouter)
// v
api.use('/variant',variantRouter)

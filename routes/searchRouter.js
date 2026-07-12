const router = (module.exports = require('express').Router())

const { searchBarFunc } = require('../controller/searchController')
const AppError = require('../utils/appError')


// Description
// GET /api/featured
router.get('/', async (req, res, next) => {
	try {
		if (!req.query) throw new AppError('No parameter found', 500)
		const data = await searchBarFunc(req.query)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})
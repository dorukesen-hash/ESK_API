const express = require('express')
const router = express.Router()
const claimController = require('../controller/claimController')
const requireAuth = require('../middleware/requireAuth')

// create claim (authenticated)
router.post('/', claimController.createClaim)

// admin routes
// Supports query params: ?limit=20&offset=0&searchTerm=text
router.get('/', claimController.adminListClaims)
router.get('/:id', claimController.getClaim)
router.put('/:id/read', claimController.markRead)
router.delete('/:id', claimController.deleteClaim)

module.exports = router

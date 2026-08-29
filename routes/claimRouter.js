const express = require('express')
const router = express.Router()
const claimController = require('../controller/claimController')
const requireAuth = require('../middleware/requireAuth')
const requireAdmin = require('../middleware/requireAdmin')

// create claim (authenticated)
router.post('/', claimController.createClaim)

// admin routes
// Supports query params: ?limit=20&offset=0&searchTerm=text
router.get('/', requireAuth, requireAdmin, claimController.adminListClaims)
router.get('/:id', requireAuth, requireAdmin, claimController.getClaim)
router.put('/:id/read', requireAuth, requireAdmin, claimController.markRead)
router.delete('/:id', requireAuth, requireAdmin, claimController.deleteClaim)

module.exports = router

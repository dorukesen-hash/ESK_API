const { Claim, User } = require('../db/models')
const { Op } = require('sequelize')
const sendEmail = require('../utils/sendEmail')
const AppError = require('../utils/appError')

const createClaim = async (req, res, next) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    const {
      account,
      companyName,
      contactName,
      email,
      orderNo,
      description,
      read
    } = req.body

    const claim = await Claim.create({
      userId: req.user?.id,
      account,
      companyName,
      contactName,
      email,
      orderNo,
      description,
      read: !!read
    })
      const claimPlain = claim.get ? claim.get({ plain: true }) : claim

    // fetch user info to include in admin email
    let customer = null
    try {
      customer = await User.findByPk(userId, { attributes: ['id', 'name', 'email'] })
    } catch (e) {
      // ignore - email will still be sent without customer details
      console.error('Failed to load user for claim email', e)
    }

    // send notification email to admin
    try {
      await sendEmail({
        email: "info@eskpackaging.com",
        subject: 'New Customer Claim Received',
        username: contactName || req.user.name || 'Customer',
        orderNumber: orderNo || '',
        subtotal: '',
        items: [],
        price: '',
        shipping: '',
        message: 'A new customer claim has been submitted.',
        // include claim data and customer info in template via replacements
          claim: claimPlain,
        customer: customer ? customer.get({ plain: true }) : null
      })
    } catch (err) {
      console.error('Failed to send claim notification email', err)
    }

    res.status(201).json({ success: true, data: claim })
  } catch (err) {
    next(err)
  }
}

const adminListClaims = async (req, res, next) => {
  try {
    // admin check
    if (!req.user || req.user.isAdmin !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    // pagination & search
    const limit = Math.max(1, parseInt(req.query.limit)) || 20
    const offset = Math.max(0, parseInt(req.query.offset)) || 0
    const searchTerm = (req.query.searchTerm || '').trim()

    const where = {}
    if (searchTerm) {
      const like = { [Op.like]: `%${searchTerm}%` }
      where[Op.or] = [
        { account: like },
        { companyName: like },
        { contactName: like },
        { email: like },
        { orderNo: like },
        { description: like }
      ]
    }

    const { count, rows } = await Claim.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{ model: User, attributes: ['id', 'name', 'email'] }]
    })

    res.json({ success: true, data: rows, total: count, limit, offset })
  } catch (err) {
    next(err)
  }
}

const getClaim = async (req, res, next) => {
  try {
    const id = req.params.id
    const claim = await Claim.findByPk(id)
    if (!claim) return res.status(404).json({ message: 'Not found' })
    res.json({ success: true, data: claim })
  } catch (err) {
    next(err)
  }
}

const markRead = async (req, res, next) => {
  try {
    if (!req.user || req.user.isAdmin !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const id = req.params.id
    const claim = await Claim.findByPk(id)
    if (!claim) return res.status(404).json({ message: 'Not found' })
    claim.read = true
    await claim.save()
    res.json({ success: true, data: claim })
  } catch (err) {
    next(err)
  }
}

const deleteClaim = async (req, res, next) => {
  try {
    if (!req.user || req.user.isAdmin !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const id = req.params.id
    const claim = await Claim.findByPk(id)
    if (!claim) return res.status(404).json({ message: 'Not found' })
    await claim.destroy()
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createClaim,
  adminListClaims,
  getClaim,
  markRead,
  deleteClaim
}

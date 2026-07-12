const { getShippingprofiles, saveShippingprofiles, editShippingprofiles, deleteShippingprofiles } = require('../controller/shippingProfile')
const AppError = require('../utils/appError')

const router = (module.exports = require('express').Router())

// GET /api/shippingprofiles/
router.get('/', async (req, res, next) => {
    try {
        const { user} = req
        const data = await getShippingprofiles(user.id)
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})


// Save shippingprofile
// POST /api/shippingprofiles/
router.post('/', async (req, res, next) => {
    try {
        const {user, body} = req
        const data = await saveShippingprofiles({user, body})
        res.status(200).send(data)
    } catch (error) {
        next(error)
    }
})

// Update shippingprofile
// PUT /api/shippingprofiles/:id
router.put('/:id', async (req, res, next) => {
    try {
        const {id} = req.params
        const addressInfo = req.body
		if (!id) throw new AppError('No parameter found', 500)
        const data = await editShippingprofiles({id, addressInfo})
        if (data === 1 || (Array.isArray(data) && data[0] === 1)) {
            res.status(200).send({ message: 'address update successful' })
        } else {
            res.status(404).send({ message: 'Update failed' })
        }
    } catch (error) {
        next(error)
    }
})

// Delete shippingprofile
// DELETE /api/shippingprofiles/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const {id} = req.params
        console.log("deleting address:",id)
        const data = await deleteShippingprofiles(id)
        res.status(200).send({ message: 'address delete successful' })
    } catch (error) {
        next(error)
    }
})

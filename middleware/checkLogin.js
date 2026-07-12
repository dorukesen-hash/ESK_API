// 3rd party
const jwt = require('jsonwebtoken')
const AppError = require('../utils/appError')
const { ifExistToken } = require('../controller/userController')

module.exports = async (req, res, next) => {
    const token = req.headers.authorization
    try {
        if (!token) throw new AppError('No token, authorization denied', 401)
        const estoken = jwt.verify(token, process.env.USER_TOKEN_KEY)
        const loginUser = await ifExistToken(estoken.id, token)
        if (!loginUser)
            throw new AppError('No token, authorization denied', 401)
        req.userData = estoken
        next()
    } catch (err) {
        //! Wrong JWT error
        if (err.name === 'JsonWebTokenError') {
            const message = `Json web Token is invalid, try again`
            res.status(401).json({ message })
            //! JWT EXPIRE error
        } else if (err.name === 'TokenExpiredError') {
            const message = `Json web Token is expired, try again`
            res.status(498).json({ message })
        } else {
            next(err)
        }
    }
}
const AppError = require('../utils/appError')
const { getUserBy } = require('./userController')
const jwt = require('jsonwebtoken')
const TOKEN_KEY = process.env.JWT_SECRET
const REF_TOKEN_KEY = process.env.JWT_REFRESH_SECRET
const crypto = require('crypto')

const generateTokens = (user) => {
    const token = jwt.sign(
        { id: user.id, email: user.email },
        TOKEN_KEY,
        { expiresIn: '1h' } // Access Token 1 hour
    );

    const reftoken = jwt.sign(
        { id: user.id },
        REF_TOKEN_KEY,
        { expiresIn: '7d' } // Refresh Token 7 days
    );

    return { token, reftoken };
};

const verifyToken = (reftoken) => {
    return jwt.verify(reftoken, REF_TOKEN_KEY)
}





const createToken = (user) => {
    return jwt.sign(
        {
            ...user.getSender(),
        },
        TOKEN_KEY,
        { expiresIn: '4h' }
    )
}
const createRefToken = (user) => {
    return jwt.sign({ id: user.id }, REF_TOKEN_KEY, { expiresIn: '8h' })
}


const verifyRefToken = (reftoken) => {
    return jwt.verify(reftoken, REF_TOKEN_KEY)
}
const emailVerificationToken = () => {
    return {
        verificationToken: crypto.randomBytes(20).toString('hex'),
        tokenExpire: Date.now() + 15 * 60 * 1000,
    }
}
const emailVerifyToken = async (emailVerifyToken) => {
    const user = await getUserBy({ emailVerifyToken })
    if (!user) throw new AppError('verification not found', 500)
    user.emailVerifyToken = null
    user.emailVerifyTokenExpire = null
    user.isAuthenticated = true
    user.isActive = true
    await user.save()
    return true
}
module.exports = {
    generateTokens,
    emailVerifyToken,
    createRefToken,
    createToken,
    verifyToken,
    verifyRefToken,
    emailVerificationToken
}
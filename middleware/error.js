/* eslint-disable no-unused-vars */
// NODE_ENV declaration
const NODE_ENV = process.env.NODE_ENV
// const { ErrorLog } = require('../db/models');

// Sending errors in development mode
const sendErrorDevelopment = (error, res) => {
    return res.status(!isNaN(error.statusCode) ? error.statusCode : 500).json({
        success: false,
        message: error.message,
        data: null,
        dev: {
            status: error.status,
            error: error,
            stack: error.stack,
        },
    })
}

// Sending errors in production mode
const sendErrorProduction = (error, res) => {
    // Operational errors that we can detect
    if (error.isOperational) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
            data: null,
            dev: {
                status: error.status,
                error: error,
                stack: error.stack,
            },
        })
    } else {
        // Errors we cannot detect
        res.status(500).json({
            success: false,
            message: error.message,
            data: null,
            dev: {
                status: error.status,
                error: error,
                stack: error.stack,
            },
        })
    }
}

const globalErrorHandler = (error, req, res, next) => {
    console.log(error)
    // statusCode means the code of the status of the request and status is the actual status of the request(coming from the Error class)
    error.statusCode = error.statusCode || 500
    error.status = error.status || 'error'

    //! Wrong JWT error
    if (error.name === 'JsonWebTokenError') {
        error.message = `Json web Token is invalid, try again`
    }

    //! JWT EXPIRE error
    if (error.name === 'TokenExpiredError') {
        error.message = `Json web Token is expired, try again`
    }

    // // Logging errors to database
    // error.statusCode >= 500 && logErrorToDatabase(error);

    if (NODE_ENV == 'development') {
        sendErrorDevelopment(error, res)
    } else if (NODE_ENV == 'production') {
        sendErrorProduction(error, res)
    }
}

module.exports = globalErrorHandler

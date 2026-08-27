const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const apiRouter = require('./routes')
const errorMiddleware = require('./middleware/error')
const passport = require('./middleware/passport');
const authMiddleware = require('./middleware/auth')
const cookieParser = require("cookie-parser");

require('./db')
const app = express()

// Middleware Order: First Logging, Then Parsers, Then Authentication
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.json({ limit: '50mb' }))

// Use cookie-parser to read cookies from requests
app.use(cookieParser());

app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "https://esk-packaging-fe.vercel.app",
            "https://www.eskpackaging.com",
            // ESK_ADMIN (standalone admin panel, separate origin from ESK_FE)
            "http://localhost:3002",
            "https://admin.eskpackaging.com"
        ],
        credentials: true, // Required for cookies to work
        methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        exposedHeaders: ["x-total-count"],
    })
)

// Middleware
app.use(passport.initialize());
app.use(authMiddleware);

// Apply Routes (API Handlers)
app.use('/api', apiRouter)

// Error Handling Middleware
app.use(errorMiddleware);

// Export app
module.exports = app
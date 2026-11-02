const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const apiRouter = require('./routes')
const errorMiddleware = require('./middleware/error')
const passport = require('./middleware/passport');
const authMiddleware = require('./middleware/auth')
const cookieParser = require("cookie-parser");
const { handleStripeWebhook } = require('./controller/stripeController');

require('./db')
const app = express()

// Deployed behind Railway's edge proxy (NEXT_PUBLIC_API_URL points at
// eskapi-production.up.railway.app) - every request arrives at this
// process via that one proxy hop. Without this, Express's req.ip (and
// anything keyed on it, like the /orders/lookup rate limiter) resolves
// to the proxy's own address for every visitor, not the real client's.
// `1`, not `true` - trusting exactly one hop reads X-Forwarded-For's
// last entry as the real client; `true` would trust the whole chain,
// letting a client spoof its own address via the header.
app.set('trust proxy', 1)

// Middleware Order: First Logging, Then Parsers, Then Authentication
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'))

// Stripe webhook needs the RAW request body for signature verification, so
// it's registered before express.json() would otherwise parse/consume it -
// and outside apiRouter/authMiddleware, since Stripe authenticates via the
// Stripe-Signature header, not cookies.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)

app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.json({ limit: '50mb' }))

// Use cookie-parser to read cookies from requests
app.use(cookieParser());

app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "http://localhost:3001",
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
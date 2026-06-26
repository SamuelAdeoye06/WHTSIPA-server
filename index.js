import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import mongoose from 'mongoose'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import authRoutes from './routes/auth.route.js'
import reportRoutes from './routes/reports.route.js'
import contactRoutes from './routes/contact.route.js'

const app = express()
const isProd = process.env.NODE_ENV === 'production'

/* ── Security headers (helmet) ── */
app.use(helmet({
  // Content-Security-Policy — tight in prod, relaxed in dev
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],
      imgSrc:         ["'self'", 'data:', 'https:'],
      connectSrc:     ["'self'", process.env.CLIENT_URL],
      fontSrc:        ["'self'", 'https:', 'data:'],
      objectSrc:      ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false,
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  // Hide X-Powered-By: Express
  hidePoweredBy: true,
  // Force HTTPS in prod
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  // Prevent MIME sniffing
  noSniff: true,
  // XSS filter for older browsers
  xssFilter: true,
  // Disable caching for API responses
  noCache: false,
}))

/* ── CORS — only allow your frontend origin ── */
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173', // Vite dev server
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile apps, Postman)
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

/* ── Body parsing ── */
app.use(express.json({ limit: '10kb' }))        // reject bodies > 10 KB
app.use(express.urlencoded({ extended: false }))

/* ── Request logging ── */
app.use(morgan(isProd ? 'combined' : 'dev'))

/* ── Global rate limit — 100 req / 15 min per IP ── */
app.use(rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: 'Too many requests. Please try again later.' },
}))

/* ── Routes ── */
app.use('/api/auth',    authRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/contact', contactRoutes)

/* ── Health check ── */
app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }))

/* ── 404 handler for unknown routes ── */
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' })
})

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  // CORS errors
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ message: err.message })
  }
  console.error('Unhandled error:', err)
  res.status(500).json({ message: isProd ? 'Internal server error.' : err.message })
})

/* ── Database + server start ── */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 5000} [${process.env.NODE_ENV || 'development'}]`)
    )
  })
  .catch(err => {
    console.error('❌ DB connection failed:', err.message)
    process.exit(1)
  })
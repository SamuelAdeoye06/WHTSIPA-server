import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { protect } from '../middleware/auth.middleware.js'
import {
  register,
  verifyEmail,
  login,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js'

const router = Router()

// Tighter rate limit for auth endpoints — 10 requests per 15 min
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again later.' },
})

router.post('/register',        authLimit, register)
router.get('/verify-email',                verifyEmail)
router.post('/login',           authLimit, login)
router.get('/me',               protect,   getMe)
router.post('/forgot-password', authLimit, forgotPassword)
router.post('/reset-password',             resetPassword)

export default router
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { protect } from '../middleware/auth.middleware.js'
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/auth.controller.js'

const router = Router()

// Tighter rate limit for auth endpoints — 10 requests per 15 min
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again later.' },
})

// OTP checks are brute-forceable by nature — separate, slightly looser limiter
// since a legitimate user may fumble the 6-digit code a couple of times.
const otpVerifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts. Please try again later.' },
})

// Resend is throttled hard here (per-IP) on top of the per-account cooldown
// enforced inside resendOtp itself.
const otpResendLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: { message: 'Too many attempts. Please try again later.' },
})

router.post('/register',        authLimit,      register)
router.post('/verify-otp',      otpVerifyLimit, verifyOtp)
router.post('/resend-otp',      otpResendLimit, resendOtp)
router.post('/login',           authLimit,      login)
router.get('/me',               protect,        getMe)
router.post('/forgot-password', authLimit,      forgotPassword)
router.post('/reset-password',                  resetPassword)
router.post('/change-password', protect,        changePassword)

export default router
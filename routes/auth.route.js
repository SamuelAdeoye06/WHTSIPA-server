import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  logoutAllSessions,
} from '../controllers/auth.controller.js'
import {
  setup2FA,
  confirmSetup2FA,
  disable2FA,
  regenerateBackupCodes,
  verifyLogin2FA,
} from '../controllers/twoFactor.controller.js'

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

// Same reasoning as otpVerifyLimit — a 6-digit TOTP/backup code is
// brute-forceable by nature, so this is deliberately tighter than the
// general authLimit but still forgiving of a couple of mistyped codes.
const twoFactorVerifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
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
router.post('/logout-all-sessions', protect,    logoutAllSessions)

// ── Two-factor auth ──
// verify-login is deliberately public (no `protect`) — it's called
// mid-login, before the admin has a real session; the pendingToken it
// requires is what stands in for auth at that point.
router.post('/2fa/verify-login',            twoFactorVerifyLimit, verifyLogin2FA)
router.post('/2fa/setup',                   protect, requireAdmin, setup2FA)
router.post('/2fa/confirm-setup',           protect, requireAdmin, twoFactorVerifyLimit, confirmSetup2FA)
router.post('/2fa/disable',                 protect, requireAdmin, disable2FA)
router.post('/2fa/regenerate-backup-codes', protect, requireAdmin, regenerateBackupCodes)

export default router
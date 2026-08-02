import crypto from 'crypto'
import User from '../models/user.model.js'
import { signToken } from '../utils/jwt.js'
import { sendOtpEmail, sendPasswordResetEmail } from '../utils/mailer.js'

const OTP_EXPIRY_MS   = 10 * 60 * 1000   // 10 minutes
const OTP_RESEND_MS   = 60 * 1000        // 60s cooldown between sends
const OTP_MAX_ATTEMPTS = 5               // wrong tries before a resend is required

/* Generate a random 6-digit OTP, e.g. "042917" (keeps leading zeros) */
function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

/* We never store the raw OTP — only its SHA-256 hash — so a DB
   leak doesn't expose active codes (same principle as password hashing,
   just without bcrypt's cost factor since OTPs are short-lived). */
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

/* Attach a fresh OTP to a user doc (mutates in place) and returns the raw code to email out */
function issueOtp(user) {
  const otp = generateOtp()
  user.otpHash       = hashOtp(otp)
  user.otpExpiry     = new Date(Date.now() + OTP_EXPIRY_MS)
  user.otpAttempts    = 0
  user.otpLastSentAt = new Date()
  return otp
}

/* ── POST /api/auth/register ── */
export async function register(req, res) {
  try {
    const { firstName, lastName, email, country, phone, password } = req.body

    if (!firstName || !lastName || !email || !country || !phone || !password)
      return res.status(400).json({ message: 'All fields are required.' })

    if (!/^[A-Za-z\s'-]+$/.test(firstName) || !/^[A-Za-z\s'-]+$/.test(lastName))
      return res.status(400).json({ message: 'Names must contain letters only.' })

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Enter a valid email address.' })

    if (
      password.length < 12 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) return res.status(400).json({ message: 'Password must be at least 12 characters with uppercase, number, and symbol.' })

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await User.findOne({ email: normalizedEmail })

    let user
    if (existing) {
      // Already fully verified — this email is taken.
      if (existing.isVerified)
        return res.status(409).json({ message: 'An account with this email already exists.' })

      // Unverified account from an abandoned signup — overwrite their details
      // and issue a fresh OTP rather than blocking them with a dead-end error.
      existing.firstName = firstName.trim()
      existing.lastName  = lastName.trim()
      existing.country   = country
      existing.phone      = phone
      existing.password  = password // re-hashed by the pre-save hook
      user = existing
    } else {
      user = new User({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     normalizedEmail,
        country, phone, password,
      })
    }

    const otp = issueOtp(user)
    await user.save()
    await sendOtpEmail(normalizedEmail, otp, user.firstName)

    return res.status(201).json({
      message: 'Account created. We\'ve sent a 6-digit code to your email — enter it to verify your account.',
      email:   normalizedEmail,
    })
  } catch (err) {
    console.error('register error:', err)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

/* ── POST /api/auth/verify-otp ── */
export async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body
    if (!email || !otp)
      return res.status(400).json({ message: 'Email and code are required.' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) return res.status(400).json({ message: 'Invalid email or code.' })

    if (user.isVerified)
      return res.status(400).json({ message: 'This account is already verified. Please sign in.' })

    if (!user.otpHash || !user.otpExpiry || user.otpExpiry < new Date())
      return res.status(400).json({ message: 'Code expired. Please request a new one.' })

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS)
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.' })

    if (hashOtp(String(otp).trim()) !== user.otpHash) {
      user.otpAttempts += 1
      await user.save()
      const remaining = OTP_MAX_ATTEMPTS - user.otpAttempts
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Incorrect code. Please request a new one.',
      })
    }

    user.isVerified   = true
    user.otpHash      = undefined
    user.otpExpiry    = undefined
    user.otpAttempts  = 0
    user.otpLastSentAt = undefined
    await user.save()

    // Auto sign-in on successful verification — no need to make them log in again.
    const token = signToken({ id: user._id })
    return res.json({
      message: 'Email verified successfully.',
      token,
      user: {
        id:        user._id,
        name:      user.name,
        firstName: user.firstName,
        email:     user.email,
        country:   user.country,
        role:      user.role,
      },
    })
  } catch (err) {
    console.error('verifyOtp error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── POST /api/auth/resend-otp ── */
export async function resendOtp(req, res) {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required.' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    // Generic message to avoid confirming/denying account existence,
    // consistent with the forgot-password flow below.
    const successMsg = 'If this account is pending verification, a new code has been sent.'
    if (!user || user.isVerified) return res.json({ message: successMsg })

    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_MS) {
      const secondsLeft = Math.ceil((OTP_RESEND_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000)
      return res.status(429).json({ message: `Please wait ${secondsLeft}s before requesting another code.`, secondsLeft })
    }

    const otp = issueOtp(user)
    await user.save()
    await sendOtpEmail(user.email, otp, user.firstName)

    return res.json({ message: successMsg })
  } catch (err) {
    console.error('resendOtp error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── POST /api/auth/login ── */
export async function login(req, res) {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password.' })

    if (!user.isVerified)
      return res.status(403).json({ message: 'Please verify your email before signing in.' })

    const token = signToken({ id: user._id })

    return res.json({
      token,
      user: {
        id:        user._id,
        name:      user.name,
        firstName: user.firstName,
        email:     user.email,
        country:   user.country,
        role:      user.role,
      },
    })
  } catch (err) {
    console.error('login error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── GET /api/auth/me ── */
export function getMe(req, res) {
  const u = req.user
  return res.json({
    id:        u._id,
    name:      u.name,
    firstName: u.firstName,
    email:     u.email,
    country:   u.country,
    role:      u.role,
  })
}

/* ── POST /api/auth/forgot-password ── */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body
    const user = await User.findOne({ email: email?.toLowerCase() })

    // Always return the same message to prevent email enumeration
    const successMsg = 'If that email is registered, a reset link has been sent.'
    if (!user) return res.json({ message: successMsg })

    const resetToken  = crypto.randomBytes(32).toString('hex')
    user.resetToken   = resetToken
    user.resetExpiry  = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    await sendPasswordResetEmail(user.email, resetToken)
    return res.json({ message: successMsg })
  } catch (err) {
    console.error('forgotPassword error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── POST /api/auth/reset-password ── */
export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body
    if (!token || !password)
      return res.status(400).json({ message: 'Token and new password are required.' })

    const user = await User.findOne({
      resetToken:  token,
      resetExpiry: { $gt: new Date() },
    })
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset link.' })

    if (
      password.length < 12 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) return res.status(400).json({ message: 'Password must be at least 12 characters with uppercase, number, and symbol.' })

    user.password    = password
    user.resetToken  = undefined
    user.resetExpiry = undefined
    await user.save()

    return res.json({ message: 'Password reset successfully. You can now sign in.' })
  } catch (err) {
    console.error('resetPassword error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── POST /api/auth/change-password ──
   Protected — for a logged-in user (namely, the admin from the
   Settings page) to change their own password, given they already
   know the current one. Different from resetPassword, which is for
   someone who's locked out and uses an emailed token instead. */
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Current and new password are required.' })

    if (
      newPassword.length < 12 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) return res.status(400).json({ message: 'New password must be at least 12 characters with uppercase, number, and symbol.' })

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect.' })

    user.password = newPassword   // re-hashed by the pre-save hook
    await user.save()

    return res.json({ message: 'Password changed successfully.' })
  } catch (err) {
    console.error('changePassword error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}
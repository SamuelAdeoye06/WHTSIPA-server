import crypto from 'crypto'
import User from '../models/user.model.js'
import { signToken } from '../utils/jwt.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/mailer.js'

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

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' })

    const verifyToken  = crypto.randomBytes(32).toString('hex')
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await User.create({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.toLowerCase().trim(),
      country, phone, password,
      verifyToken, verifyExpiry,
    })

    await sendVerificationEmail(email.toLowerCase().trim(), verifyToken)

    return res.status(201).json({
      message: 'Account created. Please check your email to confirm your account before signing in.',
    })
  } catch (err) {
    console.error('register error:', err)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

/* ── GET /api/auth/verify-email?token=... ── */
export async function verifyEmail(req, res) {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ message: 'Verification token is missing.' })

    const user = await User.findOne({
      verifyToken: token,
      verifyExpiry: { $gt: new Date() },
    })
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification link.' })

    user.isVerified   = true
    user.verifyToken  = undefined
    user.verifyExpiry = undefined
    await user.save()

    return res.json({ message: 'Email verified successfully. You can now sign in.' })
  } catch (err) {
    console.error('verifyEmail error:', err)
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
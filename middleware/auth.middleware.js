import { verifyToken } from '../utils/jwt.js'
import User from '../models/user.model.js'
import { signAuthToken } from '../controllers/auth.controller.js'

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authenticated' })
    const token = header.split(' ')[1]
    const payload = verifyToken(token)
    req.user = await User.findById(payload.id).select('-password')
    if (!req.user) return res.status(401).json({ message: 'User not found' })
    if (req.user.isRestricted) {
      return res.status(403).json({ message: 'This account has been restricted. Please contact support for assistance.' })
    }
    // A password change or "log out all sessions" bumps tokenVersion on the
    // user record — any token issued before that bump carries the old value
    // and is rejected here, which is what actually invalidates old sessions
    // (the token itself isn't revocable otherwise, since JWTs are stateless).
    const tokenVersion = payload.tokenVersion || 0
    if (tokenVersion !== (req.user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Your session has ended. Please sign in again.' })
    }

    // Admin sessions are short and sliding: every authenticated admin
    // request reissues a fresh token with a renewed expiry, so an admin
    // who's actively using the panel stays logged in, but one who walks
    // away has their token quietly expire on its own after the configured
    // idle window — no separate session store needed.
    if (req.user.role === 'admin') {
      try {
        const refreshed = await signAuthToken(req.user)
        res.set('X-Refreshed-Token', refreshed)
      } catch (err) {
        console.error('Failed to refresh admin session token:', err)
        // Non-fatal — the current token is still valid until it expires.
      }
    }

    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

/* Use after `protect` on any admin-only route. Single shared check so
   every controller enforces the same rule instead of repeating
   `if (req.user.role !== 'admin')` inline in each one. */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' })
  }
  next()
}
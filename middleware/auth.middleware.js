import { verifyToken } from '../utils/jwt.js'
import User from '../models/user.model.js'

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authenticated' })
    const token = header.split(' ')[1]
    const payload = verifyToken(token)
    req.user = await User.findById(payload.id).select('-password')
    if (!req.user) return res.status(401).json({ message: 'User not found' })
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
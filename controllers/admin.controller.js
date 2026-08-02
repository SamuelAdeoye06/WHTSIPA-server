import User from '../models/user.model.js'

/* ── GET /api/admin/users ──
   Admin only (enforced by protect + requireAdmin middleware on the route).
   Returns every registered user's account info for the admin panel.
   Password is never selected — it's a one-way bcrypt hash and cannot
   and should not be exposed, even to an admin. */
export async function getAllUsers(req, res) {
  try {
    const users = await User.find()
      .select('-password -otpHash -resetToken')
      .sort({ createdAt: -1 })
    return res.json(users)
  } catch (err) {
    console.error('getAllUsers error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

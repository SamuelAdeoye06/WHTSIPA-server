import User from '../models/user.model.js'
import { verifyToken } from '../utils/jwt.js'
import { signAuthToken } from './auth.controller.js'
import {
  generateTotpSecret,
  generateQrCodeDataUrl,
  verifyTotpCode,
  generateBackupCodes,
  matchBackupCode,
} from '../utils/twoFactor.js'


/* ── POST /api/auth/2fa/setup ── (protected, admin)
   Generates a new secret and QR code. Does NOT enable 2FA yet — that
   only happens once the admin proves they actually scanned it by
   submitting a real code to confirmSetup2FA below. Safe to call again
   before confirming (e.g. the admin wants to rescan) — it just replaces
   the pending secret. */
export async function setup2FA(req, res) {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is already enabled. Disable it first to set up again.' })
    }

    const secret = generateTotpSecret()
    user.twoFactorPendingSecret = secret
    await user.save()

    const qrCodeDataUrl = await generateQrCodeDataUrl(user.email, secret)
    return res.json({ qrCodeDataUrl, secret })
  } catch (err) {
    console.error('setup2FA error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── POST /api/auth/2fa/confirm-setup ── (protected, admin)
   Body: { code }. Proves the admin's authenticator app is actually
   working before 2FA becomes active — activating on the secret alone
   (without this confirmation) risks the admin locking themselves out if
   they scanned it wrong or the app shows a different account. */
export async function confirmSetup2FA(req, res) {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ message: 'Enter the 6-digit code from your authenticator app.' })

    const user = await User.findById(req.user._id).select('+twoFactorPendingSecret')
    if (!user) return res.status(404).json({ message: 'User not found.' })

    if (!user.twoFactorPendingSecret) {
      return res.status(400).json({ message: 'No 2FA setup in progress. Start setup again.' })
    }

    if (!(await verifyTotpCode(code, user.twoFactorPendingSecret))) {
      return res.status(400).json({ message: 'Incorrect code. Check your authenticator app and try again.' })
    }

    const { raw, hashed } = generateBackupCodes()

    user.twoFactorSecret        = user.twoFactorPendingSecret
    user.twoFactorPendingSecret = undefined
    user.twoFactorEnabled       = true
    user.twoFactorBackupCodes   = hashed
    await user.save()

    return res.json({
      message: 'Two-factor authentication is now enabled.',
      // Shown exactly once — never retrievable again after this response.
      backupCodes: raw,
    })
  } catch (err) {
    console.error('confirmSetup2FA error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── POST /api/auth/2fa/disable ── (protected, admin)
   Body: { currentPassword }. Requires the password again — 2FA is a
   security boundary, so turning it off shouldn't be possible from just
   an already-open session (e.g. an unattended unlocked laptop). */
export async function disable2FA(req, res) {
  try {
    const { currentPassword } = req.body
    if (!currentPassword) return res.status(400).json({ message: 'Enter your current password to continue.' })

    const user = await User.findById(req.user._id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found.' })

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Incorrect password.' })
    }

    user.twoFactorEnabled       = false
    user.twoFactorSecret        = undefined
    user.twoFactorPendingSecret = undefined
    user.twoFactorBackupCodes   = undefined
    await user.save()

    return res.json({ message: 'Two-factor authentication has been disabled.' })
  } catch (err) {
    console.error('disable2FA error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── POST /api/auth/2fa/regenerate-backup-codes ── (protected, admin)
   Body: { currentPassword }. Invalidates all existing backup codes and
   issues a fresh set — for when the admin has used several and wants a
   full set again, or suspects the old ones were exposed. */
export async function regenerateBackupCodes(req, res) {
  try {
    const { currentPassword } = req.body
    if (!currentPassword) return res.status(400).json({ message: 'Enter your current password to continue.' })

    const user = await User.findById(req.user._id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found.' })

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled.' })
    }

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Incorrect password.' })
    }

    const { raw, hashed } = generateBackupCodes()
    user.twoFactorBackupCodes = hashed
    await user.save()

    return res.json({ message: 'New backup codes generated.', backupCodes: raw })
  } catch (err) {
    console.error('regenerateBackupCodes error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── POST /api/auth/2fa/verify-login ── (public — called mid-login,
   before the admin has a real session)
   Body: { pendingToken, code }. pendingToken is what login() issues
   instead of a full session token when the account has 2FA enabled.
   Accepts either a TOTP code or a backup code. */
export async function verifyLogin2FA(req, res) {
  try {
    const { pendingToken, code } = req.body
    if (!pendingToken || !code)
      return res.status(400).json({ message: 'Missing verification code.' })

    let payload
    try {
      payload = verifyToken(pendingToken)
    } catch {
      return res.status(401).json({ message: 'Your session expired. Please sign in again.' })
    }
    if (payload.purpose !== '2fa-pending') {
      return res.status(401).json({ message: 'Invalid verification request.' })
    }

    const user = await User.findById(payload.id).select('+twoFactorSecret +twoFactorBackupCodes')
    if (!user || !user.twoFactorEnabled) {
      return res.status(401).json({ message: 'Invalid verification request.' })
    }

    if (await verifyTotpCode(code, user.twoFactorSecret)) {
      const token = await signAuthToken(user)
      return res.json({
        token,
        user: {
          id: user._id, name: user.name, firstName: user.firstName,
          email: user.email, country: user.country, role: user.role,
        },
      })
    }

    // Not a valid TOTP code — try it as a backup code instead.
    const backupIndex = matchBackupCode(code, user.twoFactorBackupCodes || [])
    if (backupIndex !== -1) {
      user.twoFactorBackupCodes.splice(backupIndex, 1) // single-use — remove once matched
      await user.save()
      const token = await signAuthToken(user)
      return res.json({
        token,
        usedBackupCode: true,
        backupCodesRemaining: user.twoFactorBackupCodes.length,
        user: {
          id: user._id, name: user.name, firstName: user.firstName,
          email: user.email, country: user.country, role: user.role,
        },
      })
    }

    return res.status(400).json({ message: 'Incorrect code. Please try again.' })
  } catch (err) {
    console.error('verifyLogin2FA error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

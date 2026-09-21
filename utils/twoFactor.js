import crypto from 'crypto'
import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'

const ISSUER = 'WHTSIPA Admin'
const BACKUP_CODE_COUNT = 8

/* Generates a new base32 TOTP secret — used during setup, before the
   admin has confirmed it (see twoFactorPendingSecret on the User model). */
export function generateTotpSecret() {
  return generateSecret()
}

/* Builds the otpauth:// URI and renders it as a QR code data URL the
   frontend can drop straight into an <img src>. accountLabel is what
   shows up under the entry in the authenticator app (email is clearest). */
export async function generateQrCodeDataUrl(accountLabel, secret) {
  const otpauthUrl = generateURI({ issuer: ISSUER, label: accountLabel, secret })
  return QRCode.toDataURL(otpauthUrl)
}

/* Verifies a 6-digit code against a secret. otplib checks a small window
   of adjacent 30s time-steps by default, tolerating minor clock drift
   between the server and the admin's phone. Async in otplib v13 —
   callers must await this. */
export async function verifyTotpCode(code, secret) {
  if (!code || !secret) return false
  try {
    const result = await verify({ token: String(code).trim(), secret })
    return !!result.valid
  } catch {
    return false
  }
}

/* Same hashing approach as OTPs elsewhere in this codebase — store only
   the hash, never the raw code, so a DB leak doesn't hand out working
   backup codes. */
function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

/* Generates a fresh set of one-time backup codes. Returns both the raw
   codes (shown to the admin exactly once, never persisted) and their
   hashes (what actually gets saved to the User doc). */
export function generateBackupCodes(count = BACKUP_CODE_COUNT) {
  const raw = Array.from({ length: count }, () =>
    // e.g. "7F3K-9QXZ" — short enough to type by hand if needed, long
    // enough to not be brute-forceable within any reasonable rate limit.
    crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g).join('-')
  )
  return { raw, hashed: raw.map(hashBackupCode) }
}

/* Checks a submitted backup code against the stored hashes and returns
   the index that matched (or -1) — the caller is responsible for
   removing that entry from the array so each code only works once. */
export function matchBackupCode(code, hashedCodes = []) {
  if (!code) return -1
  const hash = hashBackupCode(String(code).trim().toUpperCase())
  return hashedCodes.indexOf(hash)
}

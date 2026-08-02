/**
 * One-time admin seed script.
 *
 * Usage (from WHTS-server/):
 *   ADMIN_SEED_EMAIL="admin@example.com" ADMIN_SEED_PASSWORD="Something@Strong123" node scripts/seedAdmin.js
 *
 * Or add ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD to your .env file
 * temporarily, run the script once, then remove those two lines from
 * .env again — don't leave real credentials sitting in a file that
 * might get committed.
 *
 * Requires MONGO_URI in your .env (same one your server already uses —
 * point this at whatever database your deployed app is actually using,
 * production or local, depending on which one you want the admin
 * account to exist in).
 *
 * Safe to re-run: if the email already exists, it just promotes that
 * account to role: 'admin' and resets its password to the one you
 * pass in, instead of creating a duplicate. If it doesn't exist yet,
 * it creates a fresh, already-verified admin account.
 *
 * The password is never written anywhere in plaintext — creating the
 * user through the Mongoose model triggers the same bcrypt pre-save
 * hook used for normal signups, so it's hashed exactly the same way.
 * Nothing in this file itself contains a real credential — it only
 * ever reads them from environment variables at run time.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/user.model.js'

const ADMIN_EMAIL    = process.env.ADMIN_SEED_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD

async function seedAdmin() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set — check your .env file.')
    process.exit(1)
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      'ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are not set.\n' +
      'Pass them inline, e.g.:\n' +
      '  ADMIN_SEED_EMAIL="you@example.com" ADMIN_SEED_PASSWORD="Something@Strong123" node scripts/seedAdmin.js'
    )
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB.')

  const existing = await User.findOne({ email: ADMIN_EMAIL })

  if (existing) {
    existing.role       = 'admin'
    existing.isVerified = true
    existing.password   = ADMIN_PASSWORD   // re-hashed by the pre-save hook
    await existing.save()
    console.log(`Existing account ${ADMIN_EMAIL} promoted to admin and password reset.`)
  } else {
    await User.create({
      firstName:  'WHTSIPA',
      lastName:   'Admin',
      email:      ADMIN_EMAIL,
      country:    'US',
      phone:      '+10000000000',   // placeholder — not used for admin login, only email + password are
      password:   ADMIN_PASSWORD,   // hashed by the pre-save hook
      isVerified: true,
      role:       'admin',
    })
    console.log(`Admin account created: ${ADMIN_EMAIL}`)
  }

  await mongoose.disconnect()
  console.log('Done. You can log in at /signin with this email and the password you just set.')
  console.log('Change the password from the admin panel Settings page once you\'re logged in.')
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

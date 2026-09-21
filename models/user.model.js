import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  firstName:    { type: String, required: true, trim: true },
  lastName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  country:      { type: String, required: true },
  phone:        { type: String, required: true },
  password:     { type: String, required: true, minlength: 12 },
  isVerified:   { type: Boolean, default: false },
  otpHash:      { type: String },
  otpExpiry:    { type: Date },
  otpAttempts:  { type: Number, default: 0 },
  otpLastSentAt:{ type: Date },
  resetToken:   { type: String },
  resetExpiry:  { type: Date },
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  isRestricted: { type: Boolean, default: false },
  // Bumped on password change or "log out all sessions" — any JWT issued
  // before the bump carries the old value and gets rejected by protect
  // middleware, effectively invalidating every session at once.
  tokenVersion: { type: Number, default: 0 },

  // ── Two-factor auth (TOTP via Google Authenticator / any authenticator
  // app) — optional, self-enabled from the admin Settings page. ──
  twoFactorEnabled:  { type: Boolean, default: false },
  // The active, confirmed secret — only set once setup is completed.
  twoFactorSecret:   { type: String, select: false },
  // Holds a freshly generated secret during setup, before the admin has
  // confirmed it with a real code from their app. Never activated on its
  // own — confirmSetup2FA is what promotes this to twoFactorSecret.
  twoFactorPendingSecret: { type: String, select: false },
  // One-time recovery codes for "lost/wiped my authenticator" — stored as
  // SHA-256 hashes only (same principle as OTP hashing above), each
  // removed from the array the moment it's used.
  twoFactorBackupCodes: { type: [String], select: false, default: undefined },
}, { timestamps: true })

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`
})

export default mongoose.model('User', userSchema)
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
  verifyToken:  { type: String },
  verifyExpiry: { type: Date },
  resetToken:   { type: String },
  resetExpiry:  { type: Date },
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
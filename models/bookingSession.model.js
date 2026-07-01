import mongoose from 'mongoose'

const bookingSessionSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, trim: true, lowercase: true },
  phone:         { type: String, required: true, trim: true },
  preferredDate: { type: String, required: true },   // ISO date string e.g. "2026-07-10"
  preferredTime: { type: String, required: true },   // e.g. "02:00 PM"
  notes:         { type: String, trim: true, default: '' },
  status:        { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
}, { timestamps: true })

export default mongoose.model('BookingSession', bookingSessionSchema)

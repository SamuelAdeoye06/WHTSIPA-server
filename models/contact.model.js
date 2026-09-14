import mongoose from 'mongoose'

const contactSchema = new mongoose.Schema({
  // Not required — older messages predate this field and won't have it.
  // Always set going forward (the submit route is behind `protect`, so
  // req.user is always available at submit time). Lets account deletion
  // cascade-clean new contact messages the same way it does Reports/
  // Tickets/Bookings.
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:    { type: String, required: true },
  email:   { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status:  { type: String, enum: ['unread', 'read', 'replied'], default: 'unread' },
}, { timestamps: true })

export default mongoose.model('Contact', contactSchema)
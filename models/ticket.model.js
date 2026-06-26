import mongoose from 'mongoose'

const ticketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['report', 'hire', 'request', 'livechat'],
    required: true
  },
  threatTitle: {
    type: String
  },
  summary: {
    type: String,
    required: true
  },
  goals: {
    type: String
  },
  services: {
    type: [String],
    default: []
  },
  duration: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  contactMethod: {
    type: String,
    enum: ['WhatsApp', 'Telegram', 'Email', 'Live Chat'],
    default: 'WhatsApp'
  },
  evidenceFiles: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved'],
    default: 'open'
  }
}, { timestamps: true })

export default mongoose.model('Ticket', ticketSchema)

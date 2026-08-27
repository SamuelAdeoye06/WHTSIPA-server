import mongoose from 'mongoose'

const reactionUserRecordSchema = new mongoose.Schema({
  clientKey: { type: String, required: true }, // Hash of IP or userId or anonymous client UUID
  action: { type: String, enum: ['like', 'dislike'], required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const reactionSchema = new mongoose.Schema({
  entityId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  page: {
    type: String,
    enum: ['about', 'about-officials'],
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  abbr: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    trim: true,
  },
  // Likes
  boostLikes: {
    type: Number,
    default: 0,
    min: 0,
  },
  userLikes: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Dislikes
  boostDislikes: {
    type: Number,
    default: 0,
    min: 0,
  },
  userDislikes: {
    type: Number,
    default: 0,
    min: 0,
  },
  // 2-week throttling for dislikes
  lastDislikeReflectedAt: {
    type: Date,
    default: null,
  },
  queuedDislikes: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Individual user reaction tracking for toggle state
  userRecords: [reactionUserRecordSchema],
}, {
  timestamps: true,
})

// Virtual properties for total counts
reactionSchema.virtual('totalLikes').get(function() {
  return (this.boostLikes || 0) + (this.userLikes || 0)
})

reactionSchema.virtual('totalDislikes').get(function() {
  return (this.boostDislikes || 0) + (this.userDislikes || 0)
})

reactionSchema.set('toJSON', { virtuals: true })
reactionSchema.set('toObject', { virtuals: true })

const Reaction = mongoose.model('Reaction', reactionSchema)
export default Reaction


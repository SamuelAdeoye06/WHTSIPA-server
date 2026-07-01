import mongoose from 'mongoose'

// A single-document config store for admin-editable settings.
// Only one document should ever exist (use upsert with key: 'main').
const adminConfigSchema = new mongoose.Schema({
  key:            { type: String, default: 'main', unique: true },
  callbackNumber: { type: String, default: '+1 (650) 221-7654' },
}, { timestamps: true })

export default mongoose.model('AdminConfig', adminConfigSchema)

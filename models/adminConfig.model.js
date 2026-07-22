import mongoose from 'mongoose'

// Single-document config store for admin-editable site settings
const adminConfigSchema = new mongoose.Schema({
  key:                      { type: String, default: 'main', unique: true },
  callbackNumber:           { type: String, default: '+1 (650) 221-7654' },
  telegramCommunityLink:   { type: String, default: 'https://t.me/WHTSIPADigitalSecurityWorld' },
  facebookCommunityLink:   { type: String, default: '' },
  whtsipaToolsTelegramLink: { type: String, default: 'https://t.me/WHTSIPADigitalSecurityWorld' },
  findUsTelegramLink:       { type: String, default: 'https://t.me/WHTSIPADigitalSecurityWorld' },
  whatsappLink:             { type: String, default: 'https://wa.me/16502184673' },
  supportEmail:             { type: String, default: 'support@whtsipa.com' },
}, { timestamps: true })

export default mongoose.model('AdminConfig', adminConfigSchema)

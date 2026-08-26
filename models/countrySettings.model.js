import mongoose from 'mongoose'

const countrySettingsSchema = new mongoose.Schema({
  code:            { type: String, required: true, unique: true, uppercase: true, trim: true }, // ISO 3166-1 alpha-2
  name:            { type: String, required: true },
  dial:            { type: String, required: true }, // e.g. '+234'
  signupAllowed:   { type: Boolean, default: true },
  showInDropdown:  { type: Boolean, default: true },
}, { timestamps: true })

countrySettingsSchema.index({ code: 1 })

export default mongoose.model('CountrySettings', countrySettingsSchema)

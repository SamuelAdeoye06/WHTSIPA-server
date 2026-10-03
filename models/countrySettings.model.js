import mongoose from 'mongoose'

const countrySettingsSchema = new mongoose.Schema({
  code:            { type: String, required: true, unique: true, uppercase: true, trim: true }, // ISO 3166-1 alpha-2
  name:            { type: String, required: true },
  dial:            { type: String, required: true }, // e.g. '+234'
  signupAllowed:   { type: Boolean, default: true },
  showInDropdown:  { type: Boolean, default: true },
  // Blocks the public site from loading at all for visitors whose IP
  // geolocates to this country (enforced at the edge by
  // WHTSIPA-client/middleware.js, via GET /api/countries/blocked below) —
  // separate from signupAllowed, which only blocks the signup action for
  // someone already using the site.
  pageAccessAllowed: { type: Boolean, default: true },
}, { timestamps: true })

countrySettingsSchema.index({ code: 1 })

export default mongoose.model('CountrySettings', countrySettingsSchema)

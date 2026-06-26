import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportType:    { type: String, enum: ['personal', 'public'], required: true },
  incidentType:  { type: String, required: true },
  fullName:      { type: String, required: true },
  email:         { type: String, required: true },
  phone:         { type: String },
  country:       { type: String },
  organization:  { type: String },
  targetedName:  { type: String },
  socialHandles: { type: String },
  detail:        { type: String, required: true },
  status:        { type: String, enum: ['open','in-review','resolved'], default: 'open' },
  // New fields
  communicationMethod:   { type: String },
  financialLoss:         { type: String },
  consentShareAnonymized:{ type: Boolean },
  contactedAuthorities:  { type: String },
  incidentStatus:        { type: String },
  effectsOfIncident:     { type: String },
  linksImposterDetails:  { type: String },
  evidenceFiles:         { type: [String], default: [] },
}, { timestamps: true })

export default mongoose.model('Report', reportSchema)
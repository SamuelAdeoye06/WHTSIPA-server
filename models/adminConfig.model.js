import mongoose from 'mongoose'

/* A single contact person that can be assigned to a page's channels.
   Multiple workers can exist per page-context, but only ONE is ever
   "active" (i.e. actually shown to visitors) at a time — see
   activeThreatsWorkerId / activeContactWorkerId below. This lets the
   admin swap who's live on a page without redeploying code. */
const workerSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  whatsapp:       { type: String, default: '', trim: true }, // digits only, e.g. 16502184673
  telegramHandle: { type: String, default: '', trim: true }, // no @ or URL, e.g. WHTSIPA_DigitalTools
  email:          { type: String, default: '', trim: true },
})

// Single-document config store for admin-editable site settings
const adminConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },

  /* ── Navbar / site-wide community links (Footer) ── */
  telegramCommunityLink: { type: String, default: 'https://t.me/WHTSIPADigitalSecurityWorld' },
  facebookCommunityLink: { type: String, default: '' },
  whatsappLink:          { type: String, default: 'https://wa.me/16502184673' },

  /* ── About Officials page ── */
  findUsTelegramLink: { type: String, default: 'https://t.me/WHTSIPADigitalSecurityWorld' },

  /* ── Essential Eight page ── */
  callbackNumber: { type: String, default: '+1 (650) 221-7654' },

  /* ── Threats page — "Other Ways to Reach Us" channels ──
     One active worker at a time; display behaviour on the page itself
     is unchanged — this only controls WHO is shown. */
  threatsPageWorkers:    { type: [workerSchema], default: [] },
  activeThreatsWorkerId: { type: String, default: '' },

  /* ── Contact page — support channels + live chat handoff ──
     Same one-active-worker-at-a-time model as Threats. */
  contactPageWorkers:    { type: [workerSchema], default: [] },
  activeContactWorkerId: { type: String, default: '' },

  /* ── Internal admin notifications (not public-facing) ──
     Address that receives "new submission" alerts. Empty string =
     fall back to process.env.MAIL_USER (see mailer.js). */
  notificationEmail: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('AdminConfig', adminConfigSchema)

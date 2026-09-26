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
  phone:          { type: String, default: '', trim: true }, // digits only (with country code), for a plain "Call Us" link — separate from WhatsApp since some contacts want a distinct callable line
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

  /* ── "Hire Our Team" / "Reach Us Instantly" quick-connect menu ──
     Shown from the WhatsipModal picker (Threats page "Hire Our Team" and
     "Reach Us Instantly" flows). Same one-active-worker model. */
  hirePageWorkers:           { type: [workerSchema], default: [] },
  activeHirePageWorkerId:    { type: String, default: '' },

  /* ── "Request Security Tools" modal (Threats page) ──
     Just a Telegram link — no per-worker split requested for this one. */
  toolsTelegramLink: { type: String, default: 'https://t.me/WHTSIPA_DigitalTools' },

  /* ── "You Need Help" scenario-failure prompt (Threats page quiz) ──
     Shown after a visitor fails 3 quiz scenarios. Was hardcoded to a
     broken/nonexistent Telegram username before this field existed —
     default below reuses a known-working handle as a safe placeholder
     until the admin sets the real one via Settings. */
  scenarioActiveRepLink: { type: String, default: 'https://t.me/WHTSIPA_DigitalTools' },

  /* The button's visible label/username on that same "You Need Help"
     prompt — separate from the link above, which only controls where it
     goes, not what it says. Defaults to the text that was hardcoded
     before this field existed, so nothing changes on the public site
     until the admin actually sets a real username here. */
  scenarioActiveRepText: { type: String, default: 'Contact Active Representative' },

  /* ── "Need personalised recovery support?" prompt (Recovery Steps view,
     reached from Threats → View Recovery Steps) ──
     Previously this had NO dedicated field at all — WhatsipModal's
     recovery-mode WhatsApp/Telegram buttons were silently reusing whichever
     worker was active in "Hire Our Team Channels" (hirePageWorkers), which
     is a different, unrelated admin section. That mismatch is why editing
     other channel settings never appeared to change this screen. These two
     fields give it its own admin-editable home. */
  recoveryWhatsappNumber: { type: String, default: '19293816441', trim: true }, // digits only, e.g. 19293816441
  recoveryTelegramHandle: { type: String, default: 'WHTSIPA_DigitalTools', trim: true }, // no @ or URL

  /* ── Internal admin notifications (not public-facing) ──
     Address that receives "new submission" alerts. Empty string =
     fall back to process.env.MAIL_USER (see mailer.js). */
  notificationEmail: { type: String, default: '' },

  /* ── Admin panel session rules ──
     Applies only to accounts with role 'admin' — regular user sessions
     are untouched. Default is deliberately the shortest allowed value
     (30s) until an admin explicitly picks something longer, per the
     client's explicit request for a safe-by-default starting point. */
  adminSessionSeconds: { type: Number, default: 30, min: 30, max: 1800 },
}, { timestamps: true })

export default mongoose.model('AdminConfig', adminConfigSchema)

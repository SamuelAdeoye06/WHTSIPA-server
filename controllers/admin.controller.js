import User from '../models/user.model.js'
import Report from '../models/report.model.js'
import Ticket from '../models/ticket.model.js'
import Contact from '../models/contact.model.js'
import BookingSession from '../models/bookingSession.model.js'
import { sendRecordEmail } from '../utils/mailer.js'

/* Field labels per record type — mirrors what the admin detail pages show.
   Keep in sync with FIELD_LABELS in the corresponding *Detail.jsx files. */
const RECORD_TYPES = {
  report: {
    Model: Report,
    title: r => `Cybercrime Report — ${r.incidentType}`,
    fields: r => [
      { label: 'Full Name', value: r.fullName },
      { label: 'Email', value: r.email },
      { label: 'Phone', value: r.phone },
      { label: 'Country', value: r.country },
      { label: 'Organization', value: r.organization },
      { label: 'Report Type', value: r.reportType },
      { label: 'Incident Type', value: r.incidentType },
      { label: 'Targeted Name / Entity', value: r.targetedName },
      { label: 'Social Handles', value: r.socialHandles },
      { label: 'Communication Method', value: r.communicationMethod },
      { label: 'Communication Value', value: r.communicationValue },
      { label: 'Financial Loss', value: r.financialLoss },
      { label: 'Contacted Authorities', value: r.contactedAuthorities },
      { label: 'Incident Status', value: r.incidentStatus },
      { label: 'Effects of Incident', value: r.effectsOfIncident },
      { label: 'Imposter Links / Details', value: r.linksImposterDetails },
      { label: 'Full Detail', value: r.detail },
      { label: 'Status', value: r.status },
      { label: 'Submitted', value: new Date(r.createdAt).toLocaleString() },
    ],
  },
  ticket: {
    Model: Ticket,
    title: t => `Ticket ${t.ticketId} — ${t.threatTitle || t.type}`,
    fields: t => [
      { label: 'Ticket ID', value: t.ticketId },
      { label: 'Type', value: t.type },
      { label: 'Threat Title', value: t.threatTitle },
      { label: 'Summary', value: t.summary },
      { label: 'Goals', value: t.goals },
      { label: 'Services', value: (t.services || []).join(', ') },
      { label: 'Duration', value: t.duration },
      { label: 'Name', value: t.name },
      { label: 'Email', value: t.email },
      { label: 'Phone', value: t.phone },
      { label: 'Preferred Contact Method', value: t.contactMethod },
      { label: 'Status', value: t.status },
      { label: 'Submitted', value: new Date(t.createdAt).toLocaleString() },
    ],
  },
  contact: {
    Model: Contact,
    title: c => `Contact Message — ${c.subject}`,
    fields: c => [
      { label: 'Name', value: c.name },
      { label: 'Email', value: c.email },
      { label: 'Subject', value: c.subject },
      { label: 'Message', value: c.message },
      { label: 'Status', value: c.status },
      { label: 'Submitted', value: new Date(c.createdAt).toLocaleString() },
    ],
  },
  booking: {
    Model: BookingSession,
    title: b => `Call Session Booking — ${b.name}`,
    fields: b => [
      { label: 'Name', value: b.name },
      { label: 'Email', value: b.email },
      { label: 'Phone', value: b.phone },
      { label: 'Preferred Date', value: b.preferredDate },
      { label: 'Preferred Time', value: b.preferredTime },
      { label: 'Notes', value: b.notes },
      { label: 'Status', value: b.status },
      { label: 'Submitted', value: new Date(b.createdAt).toLocaleString() },
    ],
  },
}

/* ── POST /api/admin/send-email ──
   Admin only — manual, deliberate action, separate from the automatic
   notification emails. Sends the FULL record content to a chosen
   address in a boxed/grid HTML layout. Never generates a PDF. */
export async function sendRecordToEmail(req, res) {
  try {
    const { recordType, recordId, to } = req.body

    if (!RECORD_TYPES[recordType]) {
      return res.status(400).json({ message: 'Unknown record type.' })
    }
    if (!to?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      return res.status(400).json({ message: 'Enter a valid recipient email address.' })
    }

    const { Model, title, fields } = RECORD_TYPES[recordType]
    const record = await Model.findById(recordId)
    if (!record) return res.status(404).json({ message: 'Record not found.' })

    await sendRecordEmail({
      to: to.trim(),
      title: title(record),
      fields: fields(record),
    })

    return res.json({ message: 'Sent.' })
  } catch (err) {
    console.error('sendRecordToEmail error:', err)
    return res.status(500).json({ message: 'Could not send email. Please try again.' })
  }
}

/* ── GET /api/admin/users ──
   Admin only (enforced by protect + requireAdmin middleware on the route).
   Returns every registered user's account info for the admin panel.
   Password is never selected — it's a one-way bcrypt hash and cannot
   and should not be exposed, even to an admin. */
export async function getAllUsers(req, res) {
  try {
    const users = await User.find()
      .select('-password -otpHash -resetToken')
      .sort({ createdAt: -1 })
    return res.json(users)
  } catch (err) {
    console.error('getAllUsers error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── PATCH /api/admin/users/:id/restrict ──
   Admin only — restrict or unrestrict a user's ability to log in.
   A restricted user cannot start a live chat session or have chat
   records stored, since that requires being logged in at all. */
export async function setUserRestriction(req, res) {
  try {
    const { restricted } = req.body
    if (typeof restricted !== 'boolean') {
      return res.status(400).json({ message: '"restricted" must be true or false.' })
    }

    // An admin can never restrict their own account — avoids accidentally
    // locking yourself out of the panel with no other admin to undo it.
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot restrict your own account.' })
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isRestricted: restricted },
      { new: true }
    ).select('-password -otpHash -resetToken')

    if (!user) return res.status(404).json({ message: 'User not found.' })
    return res.json(user)
  } catch (err) {
    console.error('setUserRestriction error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── DELETE /api/admin/users/:id ──
   Admin only — permanently deletes a user's account.
   Deliberately does NOT cascade-delete their reports/tickets/bookings —
   those may still be needed (e.g. handed to law enforcement) even after
   the account itself is gone. Only the account record is removed. */
export async function deleteUser(req, res) {
  try {
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' })
    }

    const deleted = await User.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'User not found.' })
    return res.json({ message: 'User account deleted.' })
  } catch (err) {
    console.error('deleteUser error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

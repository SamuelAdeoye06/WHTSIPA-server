import Contact from '../models/contact.model.js'
import { sendContactNotification } from '../utils/mailer.js'

/* ── POST /api/contact/submit ── */
export async function submitContact(req, res) {
  try {
    const { name, subject, message } = req.body
    // Email is never taken from the request body for a logged-in
    // submission — always the account's own verified address. The
    // frontend already disables this field once signed in, but that's
    // only a UI convenience; this is the actual enforcement, since a
    // disabled input is trivially bypassed via devtools or a direct API
    // call. Per client: submissions must be reliably traceable to one
    // verified account, so the email on file is authoritative, not
    // whatever the client happens to send.
    const email = req.user.email

    if (!name || !email || !subject || !message)
      return res.status(400).json({ message: 'All fields are required.' })

    // Save to DB
    const contact = await Contact.create({ user: req.user._id, name, email, subject, message })

    // Email notification (fire-and-forget — don't block the response)
    const panelLink = `${process.env.CLIENT_URL}/admin/contact-messages/${contact._id}`
    sendContactNotification({ name, email, subject, message, panelLink }).catch(err =>
      console.error('Contact email notification failed:', err)
    )

    return res.status(201).json({
      message: 'Message received. Our team will get back to you within 48 hours.',
      id: contact._id,
    })
  } catch (err) {
    console.error('submitContact error:', err)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

/* ── GET /api/contact/all ──
   Admin only (enforced by protect + requireAdmin middleware on the route). */
export async function getAllContacts(req, res) {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 })
    return res.json(contacts)
  } catch (err) {
    console.error('getAllContacts error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── PATCH /api/contact/:id/status ──
   Admin only — mark a message unread / read / replied. */
export async function updateContactStatus(req, res) {
  try {
    const { status } = req.body
    if (!['unread', 'read', 'replied'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' })
    }
    const contact = await Contact.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!contact) return res.status(404).json({ message: 'Message not found.' })
    return res.json(contact)
  } catch (err) {
    console.error('updateContactStatus error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── DELETE /api/contact/:id ──
   Admin only — permanently deletes a contact message. Manual action
   from the admin panel; not tied to or triggered by a PDF download. */
export async function deleteContact(req, res) {
  try {
    const deleted = await Contact.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Message not found.' })
    return res.json({ message: 'Message deleted.' })
  } catch (err) {
    console.error('deleteContact error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}
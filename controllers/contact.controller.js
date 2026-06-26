import Contact from '../models/contact.model.js'
import { sendContactNotification } from '../utils/mailer.js'

/* ── POST /api/contact/submit ── */
export async function submitContact(req, res) {
  try {
    const { name, email, subject, message } = req.body

    if (!name || !email || !subject || !message)
      return res.status(400).json({ message: 'All fields are required.' })

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Enter a valid email address.' })

    // Save to DB
    const contact = await Contact.create({ name, email, subject, message })

    // Email notification (fire-and-forget — don't block the response)
    sendContactNotification({ name, email, subject, message }).catch(err =>
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

/* ── GET /api/contact/all  (admin only — wired up later) ── */
export async function getAllContacts(req, res) {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 })
    return res.json(contacts)
  } catch (err) {
    console.error('getAllContacts error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}
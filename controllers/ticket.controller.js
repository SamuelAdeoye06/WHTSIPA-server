import Ticket from '../models/ticket.model.js'

/* ── POST /api/tickets/create ── */
export async function createTicket(req, res) {
  try {
    const {
      ticketId,
      type,
      threatTitle,
      summary,
      goals,
      services,
      duration,
      name,
      email,
      phone,
      contactMethod,
      evidenceFiles
    } = req.body

    if (!ticketId || !type || !summary || !name || !email) {
      return res.status(400).json({ message: 'Required fields are missing.' })
    }

    // Upsert/Create ticket. If it's a livechat pre-creation, we might want to update it if the user keeps using the chatbot,
    // but in this case, since ticketId is unique, we can search if a ticket with ticketId already exists.
    // If it exists, we can update it or just create a new one. Since a session is unique, let's do a findOneAndUpdate with upsert
    // to allow updating livechat tickets as the chat proceeds, or just simple find and update.
    const ticket = await Ticket.findOneAndUpdate(
      { ticketId },
      {
        user: req.user._id,
        type,
        threatTitle,
        summary,
        goals,
        services: services || [],
        duration,
        name,
        email,
        phone,
        contactMethod,
        evidenceFiles: evidenceFiles || []
      },
      { new: true, upsert: true }
    )

    return res.status(201).json({
      message: 'Ticket recorded successfully.',
      ticketId: ticket.ticketId,
      id: ticket._id
    })
  } catch (err) {
    console.error('createTicket error:', err)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

/* ── GET /api/tickets/mine ── */
export async function getMyTickets(req, res) {
  try {
    const tickets = await Ticket.find({ user: req.user._id }).sort({ createdAt: -1 })
    return res.json(tickets)
  } catch (err) {
    console.error('getMyTickets error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── GET /api/tickets/all (admin only — retrieved for admin panel lookup) ── */
export async function getAllTickets(req, res) {
  try {
    const tickets = await Ticket.find()
      .populate('user', 'firstName lastName email role')
      .sort({ createdAt: -1 })
    return res.json(tickets)
  } catch (err) {
    console.error('getAllTickets error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

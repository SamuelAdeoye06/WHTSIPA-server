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

/* ── GET /api/tickets/all ──
   Admin only (enforced by protect + requireAdmin middleware on the route). */
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

/* ── PATCH /api/tickets/:id/status ──
   Admin only — update status: open / in-progress / resolved. */
export async function updateTicketStatus(req, res) {
  try {
    const { status } = req.body
    if (!['open', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' })
    }
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' })
    return res.json(ticket)
  } catch (err) {
    console.error('updateTicketStatus error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── DELETE /api/tickets/:id ──
   Admin only — permanently deletes a ticket. Manual action from the
   admin panel; not tied to or triggered by a PDF download. */
export async function deleteTicket(req, res) {
  try {
    const deleted = await Ticket.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Ticket not found.' })
    return res.json({ message: 'Ticket deleted.' })
  } catch (err) {
    console.error('deleteTicket error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

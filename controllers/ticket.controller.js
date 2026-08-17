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

/* Varied auto-close messages — the client specifically asked that these NOT
   repeat the exact same line every time. One is picked at random per ticket. */
const AUTO_CLOSE_MESSAGES = [
  "Due to our chat becoming inactive, I'll go ahead and end this chat session. If you still need any assistance, feel free to contact us. Thanks for reaching out.",
  "It looks like this conversation has gone quiet for a while, so I've closed it out for now. If anything's still unresolved, just start a new chat and we'll pick it back up.",
  "Since we haven't heard back in a while, this session has been marked as closed. Feel free to reach out again anytime if you still need help.",
  "This chat has been closed after a period of inactivity. If your issue isn't fully resolved, please don't hesitate to start a new conversation with us.",
]

/* ── Helper: Auto-close tickets after 12 hours of inactivity ── */
async function autoCloseInactiveTickets(tickets) {
  const TWELVE_HOURS = 12 * 60 * 60 * 1000
  const now = Date.now()

  for (const t of tickets) {
    if (t.status !== 'ended' && t.status !== 'resolved') {
      const lastActive = t.lastActivityAt ? new Date(t.lastActivityAt).getTime() : new Date(t.updatedAt || t.createdAt).getTime()
      if (now - lastActive >= TWELVE_HOURS) {
        t.status = 'ended'
        if (!t.closingSummary) {
          t.closingSummary = AUTO_CLOSE_MESSAGES[Math.floor(Math.random() * AUTO_CLOSE_MESSAGES.length)]
        }
        // The closing message is new information even if the visitor
        // already read the conversation before it auto-closed.
        t.isReadByVisitor = false
        await t.save()
      }
    }
  }
}

/* ── GET /api/tickets/mine ── */
export async function getMyTickets(req, res) {
  try {
    const tickets = await Ticket.find({ user: req.user._id }).sort({ createdAt: -1 })
    await autoCloseInactiveTickets(tickets)
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
    await autoCloseInactiveTickets(tickets)
    return res.json(tickets)
  } catch (err) {
    console.error('getAllTickets error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── PATCH /api/tickets/:id/status ──
   Admin only — update status: open / in-progress / resolved / ended. */
export async function updateTicketStatus(req, res) {
  try {
    const { status, closingSummary, hasHumanAgent, messageCount, isReadByVisitor } = req.body
    if (!['open', 'in-progress', 'resolved', 'ended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' })
    }

    const updates = { status, lastActivityAt: new Date() }
    if (closingSummary !== undefined) updates.closingSummary = closingSummary
    if (hasHumanAgent !== undefined) updates.hasHumanAgent = hasHumanAgent
    if (messageCount !== undefined) updates.messageCount = messageCount
    if (isReadByVisitor !== undefined) updates.isReadByVisitor = isReadByVisitor

    // Default automated closing response if status is set to ended without custom summary
    if (status === 'ended' && !updates.closingSummary) {
      updates.closingSummary = "Thank you for contacting WHTSIPA Active Support. If you need anything further, please reach out to us. Have a great day!"
    }

    // The closing message itself is new information, even if the visitor
    // already read the conversation before it closed — so mark it unread
    // again on close, unless the caller explicitly said otherwise above.
    if (status === 'ended' && isReadByVisitor === undefined) {
      updates.isReadByVisitor = false
    }

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updates, { new: true })
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

/* ── PATCH /api/tickets/:id/activity ──
   Authenticated user — updates lastActivityAt, messageCount, hasHumanAgent,
   and isReadByVisitor during active AI/live chat sessions.

   IMPORTANT: lastActivityAt must only be touched by genuine activity
   (a new message sent, or a human agent joining) — never by a passive
   "mark as read" action. Bumping it on every read would mean simply
   opening the chat history resets the 12-hour inactivity clock every
   time, so a ticket could never actually reach the auto-close
   threshold as long as anyone keeps glancing at it. */
export async function updateTicketActivity(req, res) {
  try {
    const { messageCount, hasHumanAgent, isReadByVisitor } = req.body
    const updates = {}

    const isGenuineActivity = messageCount !== undefined || hasHumanAgent !== undefined
    if (isGenuineActivity) updates.lastActivityAt = new Date()

    if (messageCount    !== undefined) updates.messageCount    = messageCount
    if (hasHumanAgent   !== undefined) updates.hasHumanAgent   = hasHumanAgent
    if (isReadByVisitor !== undefined) updates.isReadByVisitor = isReadByVisitor

    // Only allow the ticket owner to call this
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true }
    )
    if (!ticket) return res.status(404).json({ message: 'Ticket not found or not yours.' })
    return res.json(ticket)
  } catch (err) {
    console.error('updateTicketActivity error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

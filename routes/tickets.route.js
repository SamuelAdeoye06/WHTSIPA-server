import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import { createTicket, getMyTickets, getAllTickets, updateTicketStatus, deleteTicket } from '../controllers/ticket.controller.js'

const router = Router()

router.post('/create',      protect,               createTicket)
router.get('/mine',         protect,               getMyTickets)
router.get('/all',          protect, requireAdmin, getAllTickets)
router.patch('/:id/status', protect, requireAdmin, updateTicketStatus)
router.delete('/:id',       protect, requireAdmin, deleteTicket)

export default router

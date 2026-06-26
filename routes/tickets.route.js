import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { createTicket, getMyTickets, getAllTickets } from '../controllers/ticket.controller.js'

const router = Router()

router.post('/create', protect, createTicket)
router.get('/mine',    protect, getMyTickets)
router.get('/all',     protect, getAllTickets) // future admin dashboard retrieve endpoint

export default router

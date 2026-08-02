import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import { submitContact, getAllContacts, updateContactStatus, deleteContact } from '../controllers/contact.controller.js'

const router = Router()

const contactLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many messages sent. Please try again later.' },
})

router.post('/submit',            protect, contactLimit, submitContact)
router.get('/all',                protect, requireAdmin, getAllContacts)
router.patch('/:id/status',       protect, requireAdmin, updateContactStatus)
router.delete('/:id',             protect, requireAdmin, deleteContact)

export default router
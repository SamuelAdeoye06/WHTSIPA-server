import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { submitContact, getAllContacts } from '../controllers/contact.controller.js'

const router = Router()

const contactLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many messages sent. Please try again later.' },
})

router.post('/submit', contactLimit, submitContact)
router.get('/all', getAllContacts)   // will add admin protect middleware later

export default router
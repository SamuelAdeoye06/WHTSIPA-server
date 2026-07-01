import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import {
  getCallbackNumber,
  updateCallbackNumber,
  submitBooking,
  getMyBookings,
  getAllBookings,
} from '../controllers/booking.controller.js'

const router = Router()

router.get('/callback-number', getCallbackNumber)            // public
router.put('/callback-number', protect, updateCallbackNumber) // admin only (checked in controller)

router.post('/submit', protect, submitBooking)
router.get('/mine',    protect, getMyBookings)
router.get('/all',     protect, getAllBookings)               // admin only (checked in controller)

export default router

import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import {
  getCallbackNumber,
  updateCallbackNumber,
  submitBooking,
  getMyBookings,
  getAllBookings,
  deleteBooking,
  updateBookingStatus,
} from '../controllers/booking.controller.js'

const router = Router()

router.get('/callback-number',    getCallbackNumber)                          // public
router.put('/callback-number',    protect, requireAdmin, updateCallbackNumber)

router.post('/submit',            protect,               submitBooking)
router.get('/mine',               protect,               getMyBookings)
router.get('/all',                protect, requireAdmin, getAllBookings)
router.patch('/:id/status',       protect, requireAdmin, updateBookingStatus)
router.delete('/:id',             protect, requireAdmin, deleteBooking)

export default router

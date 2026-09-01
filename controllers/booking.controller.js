import BookingSession from '../models/bookingSession.model.js'
import AdminConfig    from '../models/adminConfig.model.js'
import { sendBookingNotification } from '../utils/mailer.js'

const FALLBACK_CALLBACK_NUMBER = '+1 (650) 221-7654'

/* ── GET /api/booking/callback-number ──
   Public — returns the current admin-configured callback number
   so the frontend can display it dynamically. */
export async function getCallbackNumber(req, res) {
  try {
    const config = await AdminConfig.findOne({ key: 'main' })
    return res.json({ callbackNumber: config?.callbackNumber || FALLBACK_CALLBACK_NUMBER })
  } catch (err) {
    console.error('getCallbackNumber error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── PUT /api/booking/callback-number ──
   Admin only (enforced by requireAdmin middleware on the route) —
   update the callback number used for all future bookings. */
export async function updateCallbackNumber(req, res) {
  try {
    const { callbackNumber } = req.body
    if (!callbackNumber?.trim()) {
      return res.status(400).json({ message: 'callbackNumber is required.' })
    }

    const config = await AdminConfig.findOneAndUpdate(
      { key: 'main' },
      { callbackNumber: callbackNumber.trim() },
      { upsert: true, new: true }
    )

    return res.json({ message: 'Callback number updated.', callbackNumber: config.callbackNumber })
  } catch (err) {
    console.error('updateCallbackNumber error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── POST /api/booking/submit ──
   Protected — authenticated user books a call session. */
export async function submitBooking(req, res) {
  try {
    const { name, email, phone, preferredDate, preferredTime, notes } = req.body

    if (!name?.trim())   return res.status(400).json({ message: 'Full name is required.' })
    if (!email?.trim())  return res.status(400).json({ message: 'Email is required.' })
    if (!phone?.trim())  return res.status(400).json({ message: 'Phone number is required.' })
    if (!preferredDate)  return res.status(400).json({ message: 'Preferred date is required.' })
    if (!preferredTime)  return res.status(400).json({ message: 'Preferred time is required.' })

    const session = await BookingSession.create({
      user:  req.user._id,
      name:  name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      preferredDate,
      preferredTime,
      notes: notes?.trim() || '',
    })

    const config         = await AdminConfig.findOne({ key: 'main' })
    const callbackNumber = config?.callbackNumber || FALLBACK_CALLBACK_NUMBER

    // Fire admin notification email (non-blocking)
    const panelLink = `${process.env.CLIENT_URL}/admin/bookings/${session._id}`
    sendBookingNotification({ name, email, panelLink })
      .catch(err => console.error('Booking email notification failed:', err))

    return res.status(201).json({
      message:    'Booking confirmed.',
      bookingId:  session._id,
      callbackNumber,
    })
  } catch (err) {
    console.error('submitBooking error:', err)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

/* ── GET /api/booking/mine ──
   Protected — list the current user's own booking sessions. */
export async function getMyBookings(req, res) {
  try {
    const bookings = await BookingSession.find({ user: req.user._id }).sort({ createdAt: -1 })
    return res.json(bookings)
  } catch (err) {
    console.error('getMyBookings error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── GET /api/booking/all ──
   Admin only (enforced by requireAdmin middleware on the route) —
   list every booking session for the admin panel. */
export async function getAllBookings(req, res) {
  try {
    const bookings = await BookingSession.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })

    return res.json(bookings)
  } catch (err) {
    console.error('getAllBookings error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── DELETE /api/booking/:id ──
   Admin only — permanently deletes a booking record. Manual action
   from the admin panel; not tied to or triggered by a PDF download. */
export async function deleteBooking(req, res) {
  try {
    const deleted = await BookingSession.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Booking not found.' })
    return res.json({ message: 'Booking deleted.' })
  } catch (err) {
    console.error('deleteBooking error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── PATCH /api/booking/:id/status ──
   Admin only — update status: pending / confirmed / completed / cancelled. */
export async function updateBookingStatus(req, res) {
  try {
    const { status } = req.body
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' })
    }
    const booking = await BookingSession.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    return res.json(booking)
  } catch (err) {
    console.error('updateBookingStatus error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

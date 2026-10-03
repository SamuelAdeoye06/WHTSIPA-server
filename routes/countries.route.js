import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import {
  getPublicCountries,
  getAdminCountries,
  patchCountry,
  getBlockedCountries,
} from '../controllers/countries.controller.js'

const router = Router()

// Public — used by frontend dropdowns on page load
router.get('/', getPublicCountries)

// Public, unauthenticated by design — called by the Vercel edge
// middleware (WHTSIPA-client/middleware.js), not a logged-in browser.
// See getBlockedCountries in the controller for why this is safe to
// leave open.
router.get('/blocked', getBlockedCountries)

// Admin only
router.get('/admin', protect, requireAdmin, getAdminCountries)
router.patch('/:code', protect, requireAdmin, patchCountry)

export default router

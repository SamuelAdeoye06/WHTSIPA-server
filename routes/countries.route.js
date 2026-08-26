import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import {
  getPublicCountries,
  getAdminCountries,
  patchCountry,
} from '../controllers/countries.controller.js'

const router = Router()

// Public — used by frontend dropdowns on page load
router.get('/', getPublicCountries)

// Admin only
router.get('/admin', protect, requireAdmin, getAdminCountries)
router.patch('/:code', protect, requireAdmin, patchCountry)

export default router

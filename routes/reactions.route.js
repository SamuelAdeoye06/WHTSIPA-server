import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import {
  getReactions,
  toggleReaction,
  getAdminReactions,
  updateAdminReaction,
} from '../controllers/reaction.controller.js'

const router = Router()

// Public endpoint for viewing counts
router.get('/', getReactions)

// Signed-in users only for reacting
router.post('/:entityId', protect, toggleReaction)

// Admin endpoints
router.get('/admin', protect, requireAdmin, getAdminReactions)
router.patch('/admin/:entityId', protect, requireAdmin, updateAdminReaction)

export default router


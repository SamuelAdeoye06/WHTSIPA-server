import express from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import { getConfig, updateConfig } from '../controllers/config.controller.js'

const router = express.Router()

router.get('/', getConfig)                          // public — Footer/site reads it
router.put('/', protect, requireAdmin, updateConfig) // admin only

export default router

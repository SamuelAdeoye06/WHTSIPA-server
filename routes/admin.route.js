import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import { getAllUsers } from '../controllers/admin.controller.js'

const router = Router()

router.get('/users', protect, requireAdmin, getAllUsers)

export default router

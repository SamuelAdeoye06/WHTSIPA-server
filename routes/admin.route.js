import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import { getAllUsers, setUserRestriction, deleteUser, sendRecordToEmail } from '../controllers/admin.controller.js'

const router = Router()

router.get('/users',                protect, requireAdmin, getAllUsers)
router.patch('/users/:id/restrict', protect, requireAdmin, setUserRestriction)
router.delete('/users/:id',         protect, requireAdmin, deleteUser)
router.post('/send-email',          protect, requireAdmin, sendRecordToEmail)

export default router

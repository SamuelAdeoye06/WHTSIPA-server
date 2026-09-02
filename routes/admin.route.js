import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import {
  getAllUsers, setUserRestriction, deleteUser, sendRecordToEmail,
  addWorker, updateWorker, deleteWorker, setActiveWorker,
  sendAttachmentToEmail,
} from '../controllers/admin.controller.js'

const router = Router()

router.get('/users',                protect, requireAdmin, getAllUsers)
router.patch('/users/:id/restrict', protect, requireAdmin, setUserRestriction)
router.delete('/users/:id',         protect, requireAdmin, deleteUser)
router.post('/send-email',          protect, requireAdmin, sendRecordToEmail)
router.post('/send-attachment',     protect, requireAdmin, sendAttachmentToEmail)

// Page-scoped contact workers (Threats / Contact page channels) — :context is 'threats' | 'contact'
router.post('/config/:context/workers',              protect, requireAdmin, addWorker)
router.put('/config/:context/workers/:workerId',     protect, requireAdmin, updateWorker)
router.delete('/config/:context/workers/:workerId',  protect, requireAdmin, deleteWorker)
router.patch('/config/:context/active-worker',       protect, requireAdmin, setActiveWorker)

export default router

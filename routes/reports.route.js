import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { submitReport, getMyReports } from '../controllers/report.controller.js'

const router = Router()

router.post('/submit', protect, submitReport)
router.get('/mine',    protect, getMyReports)

export default router
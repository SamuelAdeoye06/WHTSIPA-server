import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { submitReport, getMyReports, getAllReports } from '../controllers/report.controller.js'

const router = Router()

router.post('/submit', protect, submitReport)
router.get('/mine',    protect, getMyReports)
router.get('/all',     protect, getAllReports) // future admin dashboard retrieve endpoint

export default router
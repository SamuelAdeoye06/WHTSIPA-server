import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.middleware.js'
import { submitReport, getMyReports, getAllReports, updateReportStatus, deleteReport } from '../controllers/report.controller.js'

const router = Router()

router.post('/submit',      protect,               submitReport)
router.get('/mine',         protect,               getMyReports)
router.get('/all',          protect, requireAdmin, getAllReports)
router.patch('/:id/status', protect, requireAdmin, updateReportStatus)
router.delete('/:id',       protect, requireAdmin, deleteReport)

export default router
import { Router } from 'express'
import multer from 'multer'
import { protect } from '../middleware/auth.middleware.js'
import { uploadFiles } from '../controllers/upload.controller.js'

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const upload = multer({
  storage: multer.memoryStorage(), // never touches disk — Render's disk is ephemeral anyway
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB per file, max 5 files
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(null, true)
    cb(new Error('Unsupported file type. Only images, PDF, and Word documents are allowed.'))
  },
})

const router = Router()

router.post('/', protect, upload.array('files', 5), uploadFiles)

// Multer errors (file too large, too many files, wrong type) land here
// instead of crashing — surface them as a normal 400 response.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ message: err.message || 'File upload error.' })
  }
  next()
})

export default router

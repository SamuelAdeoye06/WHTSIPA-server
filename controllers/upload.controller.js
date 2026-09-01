import cloudinary from '../utils/cloudinary.js'

/* Wraps Cloudinary's upload_stream (callback-based) in a Promise so we can
   await it cleanly per file. resource_type: 'auto' lets Cloudinary handle
   images, PDFs, and docs all through the same call. */
function uploadBufferToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'whtsipa/evidence',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      }
    )
    stream.end(buffer)
  })
}

/* ── POST /api/uploads ──
   Protected — logged-in users only. Accepts up to 5 files under the
   `files` field (multipart/form-data), uploads each to Cloudinary, and
   returns their secure URLs. The caller then includes those URLs (not
   the raw files) in whatever form submission needs them — this is a
   separate step from submitting the report/ticket itself. */
export async function uploadFiles(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files were provided.' })
    }

    const uploads = await Promise.all(
      req.files.map(file => uploadBufferToCloudinary(file.buffer, file.originalname))
    )

    const urls = uploads.map(u => u.secure_url)
    return res.status(201).json({ urls })
  } catch (err) {
    console.error('uploadFiles error:', err)
    return res.status(500).json({ message: 'File upload failed. Please try again.' })
  }
}

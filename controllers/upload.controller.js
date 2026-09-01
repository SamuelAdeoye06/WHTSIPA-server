import cloudinary from '../utils/cloudinary.js'

/* Wraps Cloudinary's upload_stream (callback-based) in a Promise so we can
   await it cleanly per file.

   Images/videos go through resource_type: 'auto' — Cloudinary appends the
   correct format/extension to the delivery URL automatically for those.

   Everything else (PDF, Word docs, etc.) is uploaded as resource_type: 'raw'.
   Raw files behave differently: Cloudinary does NOT separate "format" from
   the public ID the way it does for images — the file extension has to be
   part of the public_id itself, or the delivered URL has no extension at
   all. A .docx with no extension in its URL gets served with no reliable
   Content-Type, so browsers fall back to sniffing the actual bytes — and
   since .docx is a ZIP container under the hood, it gets downloaded/opened
   as a plain .zip instead of a Word document. Explicitly building the
   public_id with the extension attached fixes that. */
function uploadBufferToCloudinary(buffer, originalName, mimetype) {
  const isMedia = mimetype.startsWith('image/') || mimetype.startsWith('video/')

  const lastDot = originalName.lastIndexOf('.')
  const ext = lastDot !== -1 ? originalName.slice(lastDot + 1).toLowerCase() : ''
  const baseName = (lastDot !== -1 ? originalName.slice(0, lastDot) : originalName)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80) // keep public_id sane even for long original filenames

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'whtsipa/evidence',
        resource_type: isMedia ? 'auto' : 'raw',
        use_filename: true,
        unique_filename: true,
        // Raw files only: bake the extension into the public_id so the
        // delivered URL ends in .docx / .pdf / etc, not a bare hash.
        ...(isMedia ? {} : { public_id: `${baseName}-${Date.now()}.${ext}` }),
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
      req.files.map(file => uploadBufferToCloudinary(file.buffer, file.originalname, file.mimetype))
    )

    const urls = uploads.map(u => u.secure_url)
    return res.status(201).json({ urls })
  } catch (err) {
    console.error('uploadFiles error:', err)
    return res.status(500).json({ message: 'File upload failed. Please try again.' })
  }
}

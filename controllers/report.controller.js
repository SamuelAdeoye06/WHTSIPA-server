import Report from '../models/report.model.js'
import { sendReportNotification } from '../utils/mailer.js'

/* ── POST /api/reports/submit ── */
export async function submitReport(req, res) {
  try {
    const {
      reportType, incidentType, fullName, email,
      phone, country, organization, targetedName, socialHandles, detail,
      communicationMethod, communicationValue, financialLoss, consentShareAnonymized,
      contactedAuthorities, incidentStatus, effectsOfIncident, linksImposterDetails,
      evidenceFiles
    } = req.body

    if (!reportType || !incidentType || !detail)
      return res.status(400).json({ message: 'Required fields are missing.' })

    const report = await Report.create({
      user: req.user._id,
      reportType, incidentType, fullName, email,
      phone, country, organization, targetedName, socialHandles, detail,
      communicationMethod, communicationValue, financialLoss, consentShareAnonymized,
      contactedAuthorities, incidentStatus, effectsOfIncident, linksImposterDetails,
      evidenceFiles: Array.isArray(evidenceFiles) ? evidenceFiles : []
    })

    // Fire admin notification email (non-blocking)
    sendReportNotification({ fullName, email, reportType, incidentType, phone, country })
      .catch(err => console.error('Report email notification failed:', err))

    return res.status(201).json({
      message:  'Report submitted successfully.',
      reportId: report._id,
    })
  } catch (err) {
    console.error('submitReport error:', err)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

/* ── GET /api/reports/mine ── */
export async function getMyReports(req, res) {
  try {
    const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 })
    return res.json(reports)
  } catch (err) {
    console.error('getMyReports error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── GET /api/reports/all ──
   Admin only (enforced by protect + requireAdmin middleware on the route). */
export async function getAllReports(req, res) {
  try {
    const reports = await Report.find()
      .populate('user', 'firstName lastName email role')
      .sort({ createdAt: -1 })
    return res.json(reports)
  } catch (err) {
    console.error('getAllReports error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── PATCH /api/reports/:id/status ──
   Admin only — update case status: open / in-review / resolved. */
export async function updateReportStatus(req, res) {
  try {
    const { status } = req.body
    if (!['open', 'in-review', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' })
    }
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    return res.json(report)
  } catch (err) {
    console.error('updateReportStatus error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}

/* ── DELETE /api/reports/:id ──
   Admin only — permanently deletes a report. Manual action from the
   admin panel; not tied to or triggered by a PDF download. */
export async function deleteReport(req, res) {
  try {
    const deleted = await Report.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Report not found.' })
    return res.json({ message: 'Report deleted.' })
  } catch (err) {
    console.error('deleteReport error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}
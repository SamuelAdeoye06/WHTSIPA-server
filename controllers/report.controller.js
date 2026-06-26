import Report from '../models/report.model.js'

/* ── POST /api/reports/submit ── */
export async function submitReport(req, res) {
  try {
    const {
      reportType, incidentType, fullName, email,
      phone, country, organization, targetedName, socialHandles, detail,
      communicationMethod, financialLoss, consentShareAnonymized,
      contactedAuthorities, incidentStatus, effectsOfIncident, linksImposterDetails
    } = req.body

    if (!reportType || !incidentType || !fullName || !email || !detail)
      return res.status(400).json({ message: 'Required fields are missing.' })

    const report = await Report.create({
      user: req.user._id,
      reportType, incidentType, fullName, email,
      phone, country, organization, targetedName, socialHandles, detail,
      communicationMethod, financialLoss, consentShareAnonymized,
      contactedAuthorities, incidentStatus, effectsOfIncident, linksImposterDetails
    })

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
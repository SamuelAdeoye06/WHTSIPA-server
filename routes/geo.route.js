import express from 'express'
const router = express.Router()

/**
 * GET /api/geo
 * Returns the country_code for the calling IP.
 * Tries multiple services in sequence for reliability.
 * Called by the client to auto-fill country on the Report form.
 */
router.get('/', async (req, res) => {
  // Extract real IP (works behind proxies/Nginx)
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip

  // Skip lookup for loopback IPs (local dev) — return null so client shows nothing
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return res.json({ country_code: null, local: true })
  }

  const endpoints = [
    async () => {
      const r = await fetch(`https://ipwho.is/${ip}`, { signal: AbortSignal.timeout(5000) })
      const d = await r.json()
      return d.success ? d.country_code : null
    },
    async () => {
      const r = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,status`, { signal: AbortSignal.timeout(5000) })
      const d = await r.json()
      return d.status === 'success' ? d.countryCode : null
    },
    async () => {
      const r = await fetch(`https://ipapi.co/${ip}/country/`, { signal: AbortSignal.timeout(5000) })
      const text = await r.text()
      return (text && text.trim().length === 2) ? text.trim() : null
    },
  ]

  for (const fn of endpoints) {
    try {
      const code = await fn()
      if (code && code.length === 2) {
        return res.json({ country_code: code })
      }
    } catch { /* try next */ }
  }

  res.json({ country_code: null })
})

export default router

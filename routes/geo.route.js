import express from 'express'
const router = express.Router()

/**
 * GET /api/geo
 * Returns the country_code for the calling IP.
 *
 * Priority order:
 *  1. Platform-level pre-resolved country headers (Vercel, Cloudflare, AWS, etc.)
 *     These are already correctly resolved by the edge and are always accurate.
 *  2. Rightmost non-private IP in x-forwarded-for (the real client, not the CDN)
 *  3. Direct socket IP (for local dev)
 *  4. Multiple fallback IP lookup services
 */
router.get('/', async (req, res) => {
  // ── 1. Platform-resolved country headers (most reliable on production) ──
  // Vercel sets x-vercel-ip-country, Cloudflare sets cf-ipcountry
  // AWS CloudFront sets cloudfront-viewer-country
  const platformCountry =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['cloudfront-viewer-country'] ||
    req.headers['x-country-code'] || // Nginx custom header
    null

  if (platformCountry && platformCountry.length === 2 && platformCountry !== 'XX') {
    return res.json({ country_code: platformCountry.toUpperCase(), source: 'platform-header' })
  }

  // ── 2. Parse x-forwarded-for for the real client IP ──
  // IMPORTANT: Take the rightmost non-private IP, not the leftmost.
  // The leftmost can be spoofed; the rightmost is added by a trusted proxy.
  const forwardedFor = req.headers['x-forwarded-for'] || ''
  const isPrivate = (ip) =>
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)

  let clientIp = null
  if (forwardedFor) {
    // Try rightmost non-private first (most reliable against spoofing)
    const ips = forwardedFor.split(',').map(s => s.trim()).filter(Boolean)
    for (let i = ips.length - 1; i >= 0; i--) {
      if (!isPrivate(ips[i])) { clientIp = ips[i]; break }
    }
    // Fallback: leftmost if all were private (local dev tunnels etc.)
    if (!clientIp && ips.length > 0) clientIp = ips[0]
  }

  if (!clientIp) {
    clientIp = req.socket?.remoteAddress || req.ip
  }

  // Skip lookup for local loopback / private network IPs
  if (isPrivate(clientIp)) {
    return res.json({ country_code: null, local: true })
  }

  // ── 3. IP lookup services ──
  const endpoints = [
    async () => {
      const r = await fetch(`https://ipwho.is/${clientIp}`, { signal: AbortSignal.timeout(5000) })
      const d = await r.json()
      return d.success ? d.country_code : null
    },
    async () => {
      const r = await fetch(`http://ip-api.com/json/${clientIp}?fields=countryCode,status`, { signal: AbortSignal.timeout(5000) })
      const d = await r.json()
      return d.status === 'success' ? d.countryCode : null
    },
    async () => {
      const r = await fetch(`https://ipapi.co/${clientIp}/country/`, { signal: AbortSignal.timeout(5000) })
      const text = await r.text()
      return (text && text.trim().length === 2) ? text.trim() : null
    },
  ]

  for (const fn of endpoints) {
    try {
      const code = await fn()
      if (code && code.length === 2) {
        return res.json({ country_code: code, source: 'ip-lookup', ip: clientIp })
      }
    } catch { /* try next */ }
  }

  res.json({ country_code: null })
})

export default router

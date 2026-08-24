import express from 'express'
const router = express.Router()

/**
 * GET /api/geo
 * Returns the country_code for the calling IP.
 *
 * Priority order:
 *  1. Platform-level pre-resolved country headers (Vercel, Cloudflare, AWS, etc.)
 *  2. Real client IP from proxy headers (cf-connecting-ip, x-real-ip, x-forwarded-for leftmost)
 *  3. Local dev fallback — calls IP service to detect developer's public IP
 *  4. Fallback IP lookup services
 */
router.get('/', async (req, res) => {
  // ── 1. Platform-resolved country headers (most reliable on production edge) ──
  const platformCountry =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['cloudfront-viewer-country'] ||
    req.headers['x-country-code'] ||
    null

  if (platformCountry && platformCountry.length === 2 && platformCountry !== 'XX') {
    return res.json({ country_code: platformCountry.toUpperCase(), source: 'platform-header' })
  }

  // ── 2. Determine real client IP address ──
  const isPrivate = (ip) =>
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)

  // Direct headers set by edge proxies for real client IP:
  let clientIp =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-client-ip'] ||
    null

  if (!clientIp && req.headers['x-forwarded-for']) {
    // The FIRST (leftmost) non-private IP in x-forwarded-for is the real client IP!
    const ips = req.headers['x-forwarded-for'].split(',').map(s => s.trim()).filter(Boolean)
    for (const ip of ips) {
      if (!isPrivate(ip)) { clientIp = ip; break }
    }
    if (!clientIp && ips.length > 0) clientIp = ips[0]
  }

  if (!clientIp) {
    clientIp = req.socket?.remoteAddress || req.ip
  }

  // ── 3. If local dev (loopback/private IP), query IP service directly for dev's public IP ──
  if (isPrivate(clientIp)) {
    try {
      const r = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) })
      const d = await r.json()
      if (d.success && d.country_code) {
        return res.json({ country_code: d.country_code, source: 'local-dev-public-ip' })
      }
    } catch { /* fall through */ }

    try {
      const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) })
      const d = await r.json()
      if (d.country_code) {
        return res.json({ country_code: d.country_code, source: 'local-dev-public-ip' })
      }
    } catch { /* fall through */ }

    return res.json({ country_code: null, local: true })
  }

  // ── 4. Query IP lookup services for public client IP ──
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

import express from 'express'
const router = express.Router()

/**
 * Check if IP is private, loopback, or cloud internal proxy
 */
const isPrivateOrProxy = (ip) => {
  if (!ip || typeof ip !== 'string') return true
  const clean = ip.trim().replace(/^::ffff:/, '')
  return (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('100.') || // Carrier-grade NAT / Render internal
    /^172\.(1[6-9]|2\d|3[01])\./.test(clean)
  )
}

/**
 * GET /api/geo
 * Returns country_code for calling client IP.
 */
router.get('/', async (req, res) => {
  // 1. Edge-resolved country headers (Vercel, Cloudflare, AWS, etc.)
  const platformCountry =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['cloudfront-viewer-country'] ||
    req.headers['x-country-code'] ||
    null

  if (platformCountry && platformCountry.length === 2 && platformCountry !== 'XX') {
    return res.json({ country_code: platformCountry.toUpperCase(), source: 'platform-header' })
  }

  // 2. Extract real client IP
  // On Render & proxy platforms, x-forwarded-for FIRST IP is the true end-user client IP!
  let clientIp = null

  if (req.headers['cf-connecting-ip'] && !isPrivateOrProxy(req.headers['cf-connecting-ip'])) {
    clientIp = req.headers['cf-connecting-ip'].trim()
  } else if (req.headers['x-forwarded-for']) {
    const ips = req.headers['x-forwarded-for'].split(',').map(s => s.trim()).filter(Boolean)
    for (const ip of ips) {
      if (!isPrivateOrProxy(ip)) { clientIp = ip; break }
    }
  }

  if (!clientIp && req.headers['x-real-ip'] && !isPrivateOrProxy(req.headers['x-real-ip'])) {
    clientIp = req.headers['x-real-ip'].trim()
  }

  if (!clientIp && req.ip && !isPrivateOrProxy(req.ip)) {
    clientIp = req.ip.replace(/^::ffff:/, '')
  }

  // 3. Local dev fallback (when clientIp is private/loopback)
  if (!clientIp || isPrivateOrProxy(clientIp)) {
    try {
      const r = await fetch('https://api.country.is/', { signal: AbortSignal.timeout(4000) })
      const d = await r.json()
      if (d.country) {
        return res.json({ country_code: d.country, source: 'local-dev-public-ip', ip: d.ip })
      }
    } catch { /* fall through */ }

    try {
      const r = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) })
      const d = await r.json()
      if (d.success && d.country_code) {
        return res.json({ country_code: d.country_code, source: 'local-dev-public-ip' })
      }
    } catch { /* fall through */ }

    return res.json({ country_code: null, local: true })
  }

  // 4. Query geolocation endpoints for public client IP
  const endpoints = [
    // api.country.is — fast microservice dedicated to country code resolution
    async () => {
      const r = await fetch(`https://api.country.is/${clientIp}`, { signal: AbortSignal.timeout(4000) })
      const d = await r.json()
      return d.country || null
    },
    async () => {
      const r = await fetch(`https://freeipapi.com/api/json/${clientIp}`, { signal: AbortSignal.timeout(4000) })
      const d = await r.json()
      return d.countryCode || null
    },
    async () => {
      const r = await fetch(`https://ipwho.is/${clientIp}`, { signal: AbortSignal.timeout(4000) })
      const d = await r.json()
      return d.success ? d.country_code : null
    },
    async () => {
      const r = await fetch(`http://ip-api.com/json/${clientIp}?fields=countryCode,status`, { signal: AbortSignal.timeout(4000) })
      const d = await r.json()
      return d.status === 'success' ? d.countryCode : null
    },
  ]

  for (const fn of endpoints) {
    try {
      const code = await fn()
      if (code && code.length === 2) {
        return res.json({ country_code: code.toUpperCase(), source: 'ip-lookup', ip: clientIp })
      }
    } catch { /* try next */ }
  }

  res.json({ country_code: null, ip: clientIp })
})

export default router

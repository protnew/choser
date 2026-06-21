/**
 * In-memory rate limiter (per API key or IP)
 * Resets on restart — acceptable per P0 spec
 */

const windows = new Map() // key → { count, start }
const WINDOW_MS = 60_000 // 1 minute

const DEFAULT_LIMITS = {
  // API key/IP → max requests per minute
  default: 100,
  council: 30,    // council_decide is expensive but 10 was too aggressive
  mcp: 60,
  auth: 20
}

function cleanup() {
  const now = Date.now()
  for (const [key, val] of windows) {
    if (now - val.start > WINDOW_MS * 2) windows.delete(key)
  }
}

// Periodic cleanup every 5 min
setInterval(cleanup, 5 * 60_000).unref()

/**
 * Rate limit middleware for Hono
 * @param {string} category - 'default' | 'council' | 'mcp' | 'auth'
 */
export function rateLimit(category = 'default') {
  return async (c, next) => {
    const key = c.req.header('x-api-key') || c.req.header('x-forwarded-for') || 'anon'
    const limit = DEFAULT_LIMITS[category] || DEFAULT_LIMITS.default
    const rateKey = `${category}:${key}`

    const now = Date.now()
    let entry = windows.get(rateKey)

    if (!entry || now - entry.start > WINDOW_MS) {
      entry = { count: 0, start: now }
      windows.set(rateKey, entry)
    }

    entry.count++

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(limit))
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - entry.count)))
    c.header('X-RateLimit-Reset', String(Math.ceil((entry.start + WINDOW_MS) / 1000)))

    if (entry.count > limit) {
      return c.json({ error: 'Too many requests', retry_after_ms: WINDOW_MS }, 429)
    }

    await next()
  }
}

export { DEFAULT_LIMITS }

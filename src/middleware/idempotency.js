/**
 * Idempotency middleware — checks X-Idempotency-Key header
 * Stores response hash in idempotency_keys table (TTL 24h)
 */

import { createHash } from 'node:crypto'

const IDEMPOTENCY_TTL_HOURS = 24

/**
 * Idempotency middleware for Hono
 * Usage: app.post('/council/decide', idempotency(), handler)
 */
export function idempotency() {
  return async (c, next) => {
    const key = c.req.header('X-Idempotency-Key')
    if (!key) {
      // No key — skip idempotency check
      await next()
      return
    }

    // Validate key format
    if (key.length > 200 || !/^[\w-]+$/.test(key)) {
      return c.json({ error: 'Invalid idempotency key format' }, 400)
    }

    const db = c.get('db')
    if (!db) {
      await next()
      return
    }

    // Check existing
    const existing = db.prepare(
      "SELECT response_hash FROM idempotency_keys WHERE key = ? AND expires_at > datetime('now')"
    ).get(key)

    if (existing) {
      // Previously processed — return 409 Conflict with cached result hint
      return c.json({
        error: 'Idempotent request already processed',
        hint: 'The same idempotency key was used recently. Result was already returned.'
      }, 409)
    }

    // Process normally
    await next()

    // Store key after successful response
    if (c.res.status >= 200 && c.res.status < 300) {
      try {
        const responseHash = createHash('sha256')
          .update(key + Date.now())
          .digest('hex')

        db.prepare(
          "INSERT OR IGNORE INTO idempotency_keys (key, response_hash, expires_at) VALUES (?, ?, datetime('now', '+24 hours'))"
        ).run(key, responseHash)
      } catch (e) {
        // Non-critical — log but don't fail
        const log = c.get('log')
        if (log) log.warn({ err: e.message }, 'Failed to store idempotency key')
      }
    }
  }
}

/**
 * Cleanup expired idempotency keys (call at startup)
 */
export function cleanupIdempotencyKeys(db) {
  try {
    const result = db.prepare("DELETE FROM idempotency_keys WHERE expires_at <= datetime('now')").run()
    return result.changes
  } catch (e) {
    return 0
  }
}

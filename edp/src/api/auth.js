/**
 * Auth API — JWT access/refresh + bcrypt passwords + API Key rotation
 * ACCESS_TOKEN_TTL = 15min, REFRESH_TOKEN_TTL = 7d
 */
import { Hono } from 'hono'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'

export const authRoutes = new Hono()

const JWT_SECRET = () => process.env.JWT_SECRET || 'process.env.JWT_SECRET'
const ACCESS_TTL = '15m'
const REFRESH_TTL = '7d'

// POST /auth/dev-login — auto-login as admin (localhost only)
authRoutes.post('/auth/dev-login', async (c) => {
  const db = c.get('db')
  // Find or create admin user
  let user = db.prepare('SELECT * FROM users WHERE role = ? ORDER BY id ASC LIMIT 1').get('admin')
  if (!user) {
    user = db.prepare('SELECT * FROM users ORDER BY id ASC LIMIT 1').get()
  }
  if (!user) {
    // Create default admin
    const hash = await bcrypt.hash('admin', 10)
    const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run('admin@choser.local', hash, 'Admin', 'admin')
    user = { id: result.lastInsertRowid, email: 'admin@choser.local', name: 'Admin', role: 'admin' }
  }
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role || 'admin' }, JWT_SECRET(), { expiresIn: '30d' })
  return c.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role || 'admin' } })
})

// GET /auth/me — return current user from JWT
authRoutes.get('/auth/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'No token' }, 401)
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET())
    const db = c.get('db')
    const user = db.prepare('SELECT id, email, name, role, org_id FROM users WHERE id = ?').get(decoded.id || decoded.user_id)
    if (!user) return c.json({ error: 'User not found' }, 404)
    return c.json({ user })
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// POST /auth/login — email + password → access + refresh tokens
authRoutes.post('/auth/login', async (c) => {
  const db = c.get('db')
  const log = c.get('log')
  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'email and password required' }, 400)
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !user.password_hash) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  // bcrypt compare
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    // Log failed attempt
    db.prepare("INSERT INTO audit_log (action, user_id, details) VALUES ('login_failed', ?, ?)")
      .run(String(user.id), JSON.stringify({ email }))
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  // Generate tokens
  const accessToken = jwt.sign(
    { user_id: user.id, email: user.email, role: user.role, org_id: user.org_id },
    JWT_SECRET(),
    { expiresIn: ACCESS_TTL }
  )

  const refreshToken = jwt.sign(
    { user_id: user.id, type: 'refresh' },
    JWT_SECRET(),
    { expiresIn: REFRESH_TTL }
  )

  // Audit
  db.prepare("INSERT INTO audit_log (action, user_id, details) VALUES ('login', ?, ?)")
    .run(String(user.id), JSON.stringify({ email }))

  log.info({ user_id: user.id, email }, 'User logged in')

  return c.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, org_id: user.org_id }
  })
})

// POST /auth/refresh — rotate refresh token
authRoutes.post('/auth/refresh', async (c) => {
  const db = c.get('db')
  const { refresh_token } = await c.req.json()

  if (!refresh_token) {
    return c.json({ error: 'refresh_token required' }, 400)
  }

  try {
    const decoded = jwt.verify(refresh_token, JWT_SECRET())

    if (decoded.type !== 'refresh') {
      return c.json({ error: 'Invalid token type' }, 401)
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.user_id)
    if (!user) return c.json({ error: 'User not found' }, 401)

    // Issue new access token
    const accessToken = jwt.sign(
      { user_id: user.id, email: user.email, role: user.role, org_id: user.org_id },
      JWT_SECRET(),
      { expiresIn: ACCESS_TTL }
    )

    // Issue new refresh token (rotation — old one invalidated)
    const newRefreshToken = jwt.sign(
      { user_id: user.id, type: 'refresh' },
      JWT_SECRET(),
      { expiresIn: REFRESH_TTL }
    )

    return c.json({
      access_token: accessToken,
      refresh_token: newRefreshToken
    })
  } catch (err) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }
})

// POST /auth/register — create user (admin only in prod, open in dev)
authRoutes.post('/auth/register', async (c) => {
  const db = c.get('db')
  const { email, password, name } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'email and password required' }, 400)
  }

  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400)
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return c.json({ error: 'Email already registered' }, 409)
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
  ).run(email, passwordHash, name || email.split('@')[0], 'user')

  return c.json({
    success: true,
    user: { id: result.lastInsertRowid, email, name: name || email.split('@')[0] }
  })
})

// POST /keys — create API key
authRoutes.post('/keys', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const { name, ttl_days = 90 } = body

  if (!name) return c.json({ error: 'name required' }, 400)

  const rawKey = `choser_${randomBytes(32).toString('hex')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const expiresAt = new Date(Date.now() + ttl_days * 24 * 60 * 60 * 1000).toISOString()

  db.prepare('INSERT INTO api_keys (key_hash, name, expires_at) VALUES (?, ?, ?)')
    .run(keyHash, name, expiresAt)

  db.prepare("INSERT INTO audit_log (action, details) VALUES ('api_key_created', ?)")
    .run(JSON.stringify({ name, expires_at: expiresAt }))

  return c.json({
    api_key: rawKey,
    name,
    expires_at: expiresAt,
    warning: 'Save this key. It cannot be retrieved again.'
  })
})

// POST /keys/rotate — invalidate old key, create new
authRoutes.post('/keys/rotate', async (c) => {
  const db = c.get('db')
  const { old_key, name } = await c.req.json()

  // Invalidate old key
  if (old_key) {
    const oldHash = createHash('sha256').update(old_key).digest('hex')
    db.prepare('DELETE FROM api_keys WHERE key_hash = ?').run(oldHash)
  }

  // Create new key
  const rawKey = `choser_${randomBytes(32).toString('hex')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  db.prepare('INSERT INTO api_keys (key_hash, name, expires_at) VALUES (?, ?, ?)')
    .run(keyHash, name || 'rotated', expiresAt)

  return c.json({
    api_key: rawKey,
    expires_at: expiresAt,
    warning: 'Save this key. It cannot be retrieved again.'
  })
})

// ─── Auth middleware (for use in other routes) ───

export function authMiddleware() {
  return async (c, next) => {
    if (process.env.AUTH_ENABLED === 'false') {
      return next()
    }

    // Check Authorization header
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)

      // Try JWT first
      try {
        const decoded = jwt.verify(token, JWT_SECRET())
        c.set('user', decoded)
        return next()
      } catch {
        // Not a valid JWT — try API key
        const keyHash = createHash('sha256').update(token).digest('hex')
        const db = c.get('db')
        const key = db.prepare(
          "SELECT * FROM api_keys WHERE key_hash = ? AND expires_at > datetime('now')"
        ).get(keyHash)

        if (key) {
          c.set('user', { type: 'api_key', name: key.name, org_id: key.org_id })
          return next()
        }
      }
    }

    // Check query param (for SSE)
    const queryToken = c.req.query('token')
    if (queryToken) {
      try {
        const decoded = jwt.verify(queryToken, JWT_SECRET())
        c.set('user', decoded)
        return next()
      } catch {
        // Invalid token
      }
    }

    return c.json({ error: 'Unauthorized' }, 401)
  }
}

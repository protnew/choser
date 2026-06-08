import { Hono } from 'hono'
import { hashPassword, comparePassword, createToken, authMiddleware, verifyToken } from '../auth.js'

const auth = new Hono()

auth.post('/register', async (c) => {
    const { email, password, name } = await c.req.json()
    const db = c.env.DB

    // Input validation
    if (!email || !password) return c.json({ error: 'Email and password are required' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Invalid email format' }, 400)
    if (password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400)
    if (name && name.length > 100) return c.json({ error: 'Name too long' }, 400)

    // Check if user exists
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (existing) {
        return c.json({ error: 'User already exists' }, 400)
    }

    const hashedPassword = await hashPassword(password)

    // First user is Admin, others are User
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').first()
    const role = userCount.count === 0 ? 'admin' : 'user'

    try {
        await db.prepare(
            'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
        ).bind(email, hashedPassword, name, role).run()

        return c.json({ success: true })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()
    const db = c.env.DB

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    if (!user || !user.password_hash || user.is_deleted) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    const isValid = await comparePassword(password, user.password_hash)
    if (!isValid) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    const token = await createToken(user, c.env.JWT_SECRET || process.env.JWT_SECRET || 'CHANGE-ME')

    // Return token and user info (excluding hash)
    const { password_hash, ...userInfo } = user
    return c.json({ token, user: userInfo })
})

auth.post('/dev-login', async (c) => {
    // SECURITY: Только для dev-окружения
    if (c.env.ENVIRONMENT === 'production') {
        return c.json({ error: 'Dev login disabled in production' }, 403)
    }
    const { role } = await c.req.json()
    const mockUser = {
        id: role === 'admin' ? 1 : (role === 'moderator' ? 2 : 3),
        email: role + '@dev.local',
        name: 'Dev ' + role.charAt(0).toUpperCase() + role.slice(1),
        role: role,
        is_deleted: 0
    }
    const token = await createToken(mockUser, c.env.JWT_SECRET || process.env.JWT_SECRET || 'CHANGE-ME')
    return c.json({ token, user: mockUser })
})

auth.get('/me', authMiddleware, (c) => {
    const user = c.get('user')
    return c.json({ user })
})

export default auth

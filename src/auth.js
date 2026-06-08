
import { sign, verify } from 'hono/jwt'
import bcrypt from 'bcryptjs'

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10) // 10 rounds
}

export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash)
}

export const createToken = async (user, secret) => {
    if (!secret || secret === process.env.JWT_SECRET || 'CHANGE-ME') {
        console.warn('[SECURITY] Using fallback JWT secret! Set JWT_SECRET in env.');
    }
    const payload = {
        sub: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }
    return await sign(payload, secret || process.env.JWT_SECRET || 'CHANGE-ME', 'HS256')
}

export const verifyToken = async (token, secret) => {
    return await verify(token, secret, 'HS256')
}

export const authMiddleware = async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const token = authHeader.split(' ')[1]
    const secret = c.env.JWT_SECRET || process.env.JWT_SECRET || 'CHANGE-ME'
    if (secret === process.env.JWT_SECRET || 'CHANGE-ME' && c.env.ENVIRONMENT === 'production') {
        console.error('[SECURITY] JWT_SECRET not set in production!');
        return c.json({ error: 'Server misconfigured' }, 500)
    }
    try {
        const payload = await verify(token, secret, 'HS256')
        c.set('user', payload)
        await next()
    } catch (e) {
        return c.json({ error: 'Invalid token' }, 401)
    }
}

export const requireRole = (roles) => {
    return async (c, next) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        if (!roles.includes(user.role)) {
            return c.json({ error: 'Forbidden' }, 403)
        }
        await next()
    }
}

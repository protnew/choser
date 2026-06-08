import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Import API Modules
import auth from './api/auth.js'
import admin from './api/admin.js'
import tables from './api/tables.js'
import ai from './api/ai.js'
import mcp from './api/mcp.js'
import research from './api/research.js'
import council from './api/council.js'

/**
 * Create and configure the Hono application.
 * Shared between Worker mode (src/index.js) and Pages Functions (functions/api/[[route]].js).
 */
export function createApp() {
    const app = new Hono()

    // CORS — restrict in production
    app.use('/*', cors({
        origin: (origin, c) => {
            const allowed = c?.env?.ALLOWED_ORIGIN;
            if (allowed) return origin === allowed ? origin : null;
            return origin || '*'; // dev: allow all
        },
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    }))

    // Global Error Handler — safe for production
    app.onError((err, c) => {
        console.error(`[Server Error] ${err.message}`, err.stack)
        return c.json({ error: err.message || 'Internal Server Error' }, 500)
    })

    // Mount API Modules
    app.route('/api/auth', auth)
    app.route('/api/admin', admin)
    app.route('/api', tables)
    app.route('/api', ai)
    app.route('/mcp', mcp)
    app.route('/api/research', research)
    app.route('/api/council', council)

    // #25: Health Check endpoint
    app.get('/api/health', async (c) => {
        let dbOk = false;
        try {
            if (c.env.DB) {
                await c.env.DB.prepare('SELECT 1').first();
                dbOk = true;
            }
        } catch (e) { /* db down */ }
        return c.json({
            ok: dbOk,
            version: '2.1.0',
            ts: Date.now(),
            db: dbOk ? 'connected' : 'unavailable',
            env: c.env.ENVIRONMENT || 'development'
        });
    })

    // Favicon (prevent 404 on Worker)
    const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#3b82f6"/><stop offset="100%" style="stop-color:#8b5cf6"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#g)"/><text x="16" y="23" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">C</text></svg>`;

    app.get('/favicon.ico', (c) => c.body(FAVICON_SVG, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }))
    app.get('/favicon.svg', (c) => c.body(FAVICON_SVG, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }))

    // Default Root Route
    app.get('/', (c) => {
        return c.json({
            name: 'Choser API',
            version: '2.0.0',
            status: 'running',
            modules: ['auth', 'admin', 'tables', 'ai', 'mcp']
        })
    })

    // API root info
    app.get('/api', (c) => {
        return c.json({
            name: 'Choser API',
            version: '2.0.0',
            db_connected: !!c.env.DB,
        })
    })

    // Fallback for /api/* to prevent HTML 404
    app.all('/api/*', (c) => {
        return c.json({ error: `Not Found: ${c.req.method} ${c.req.url}`, path: c.req.path }, 404)
    })

    return app
}

/**
 * Choser EDP — Enterprise Decision Platform
 * Single-process Node.js server: API + MCP + Static + SQLite
 *
 * Architecture: Single thread, better-sqlite3 (synchronous), Hono.js
 * Port: 3000 (configurable via PORT env or .env)
 */

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import pkg from '../package.json' with { type: 'json' }

// Load .env manually (no dotenv dependency)
const __dirname = dirname(fileURLToPath(import.meta.url))
try {
  const envPath = resolve(__dirname, '..', '.env')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const val = trimmed.slice(eqIndex + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
  console.log('[ENV] Loaded', envPath)
} catch (e) {
  console.warn('[ENV] No .env file found, using system env')
}

// Libs
import { initDb, getDb } from './lib/db.js'
import { migrate } from './lib/migrate.js'
import { loadPersonas } from './lib/personas-loader.js'
import { createLogger } from './lib/log.js'
import { startBackupTimer } from './lib/backup.js'
import { startHealthCheckTimer } from './lib/llm-health.js'

// Middleware
import { rateLimit } from './middleware/rate-limit.js'
import { idempotency, cleanupIdempotencyKeys } from './middleware/idempotency.js'

// API routes
import { healthRoutes } from './api/health.js'
import { tablesRoutes } from './api/tables.js'
import { exportXlsxRoutes } from './api/export-xlsx.js'
import { councilRoutes } from './api/council.js'
import { councilDecideRoutes } from './api/councilDecide.js'
import { authRoutes, authMiddleware } from './api/auth.js'
import { adminRoutes } from './api/admin.js'
import { financialRoutes } from './api/financial.js'
import { poolRoutes } from './api/pool.js'
import { historyRoutes } from './api/history.js'
import { exportRoutes } from './api/export.js'
import { exportPdfRoutes } from './api/export-pdf.js'
import { researchRoutes } from './api/research.js'
import { hermesRoutes } from './api/hermes.js'
import { templateRoutes } from './api/adminTemplates.js'
import { heatmapRoutes } from './api/adminHeatmap.js'
import { weightSuggestRoutes } from './api/adminWeightSuggest.js'
import { autofillRoutes } from './api/adminAutofill.js'
import { collabRoutes, initCollaborationWebSocket, closeAllConnections } from './api/collaboration.js'
import { tokenRoutes } from './api/adminTokens.js'
import { councilStreamRoutes } from './api/councilStream.js'
import { councilResultRoutes } from './api/councilResults.js'
import { detectLang, getAvailableLocales, getLocale, t, createTranslator, SUPPORTED, DEFAULT } from './i18n/server.js'
import { adminInteractiveRoutes } from './api/adminInteractive.js'
import { adminSensitivityCoreRoutes } from './api/adminSensitivityCore.js'

// MCP
import { mcpHandler } from './mcp/handler.js'

// ─── Config ───
const PORT = parseInt(process.env.PORT || '3000', 10)
const CORS_ORIGINS = process.env.CORS_ORIGINS || '*'
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
const DB_PATH = process.env.DB_PATH || './data/choser.db'

const log = createLogger(LOG_LEVEL)

// ─── Graceful Shutdown State ───
let shuttingDown = false

async function gracefulShutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  log.info({ signal }, 'Shutting down...')

  // Close collaboration WebSockets
  try { closeAllConnections() } catch {}

  // Mark running council_jobs as interrupted
  try {
    const db = getDb()
    const result = db.prepare(
      "UPDATE council_jobs SET status = 'interrupted' WHERE status = 'running'"
    ).run()
    if (result.changes > 0) {
      log.info({ interrupted: result.changes }, 'Marked running councils as interrupted')
    }
  } catch (e) {
    log.error({ err: e.message }, 'Failed to mark interrupted councils')
  }

  log.info('Goodbye.')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// ─── Init ───
async function main() {
  log.info({ version: pkg.version, port: PORT, node: process.version }, 'Choser EDP starting...')

  // 1. Init SQLite
  log.info({ path: DB_PATH }, 'Initializing database...')
  const db = initDb(DB_PATH)

  // 2. Run migrations
  log.info('Running migrations...')
  migrate(db)

  // 3. Load personas
  log.info('Loading personas...')
  const personas = loadPersonas()
  log.info({ count: Object.keys(personas).length, names: Object.keys(personas) }, 'Personas loaded')

  // 4. Start background timers
  startBackupTimer(db, log)
  startHealthCheckTimer(log)

  // 5. Cleanup stale data
  const cleanedKeys = cleanupIdempotencyKeys(db)
  if (cleanedKeys > 0) log.info({ cleaned: cleanedKeys }, 'Cleaned expired idempotency keys')

  // 6. Create Hono app
  const app = new Hono()

  // Global middleware
  app.use('*', logger())
  app.use('*', cors({
    origin: CORS_ORIGINS === '*' ? '*' : CORS_ORIGINS.split(',').map(s => s.trim()),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    maxAge: 86400,
  }))

  // Security headers
  app.use('*', async (c, next) => {
    await next()
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Content-Security-Policy', "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'")
  })

  // Inject db + personas + log into context
  app.use('*', async (c, next) => {
    c.set('db', db)
    c.set('personas', personas)
    c.set('log', log)
    await next()
  })

  // ─── JSON body normalization ───
  // Fixes curl.exe on Windows: UTF-8 BOM, \r\n, PowerShell encoding issues
  app.use('*', async (c, next) => {
    const ct = c.req.header('Content-Type') || ''
    if (!ct.includes('application/json')) return next()

    const origJson = c.req.json.bind(c.req)
    c.req.json = async () => {
      const raw = await c.req.text()
      // Strip UTF-8 BOM (U+FEFF) — curl.exe + files saved with BOM
      let cleaned = raw.replace(/^\uFEFF/, '')
      // Normalize Windows \r\n
      cleaned = cleaned.replace(/\r\n/g, '\n')
      try {
        return JSON.parse(cleaned)
      } catch (parseErr) {
        console.warn(`[JSON] Parse error: ${parseErr.message}, body[${cleaned.length}]=${cleaned.slice(0, 100)}`)
        throw parseErr
      }
    }
    return next()
  })

  // ─── Global error handler ───
  app.onError((err, c) => {
    if (err instanceof SyntaxError && err.message.includes('JSON')) {
      return c.json({ error: 'Invalid JSON body', detail: err.message }, 400)
    }
    console.error(`[Server] Unhandled error on ${c.req.method} ${c.req.path}:`, err.message)
    return c.json({ error: 'Internal server error' }, 500)
  })

  // ─── Versioned API (v1) ───
  app.route('/v1/api', healthRoutes)
  app.route('/v1/api', authRoutes)
  app.route('/v1/api', tablesRoutes)
  app.route('/v1/api', financialRoutes)
  app.use('/v1/api/council/*', rateLimit('council'))
  app.route('/v1/api', councilRoutes)
  app.route('/v1/api', councilDecideRoutes)
  app.route('/v1/api', poolRoutes)
  app.route('/v1/api', historyRoutes)
  app.route('/v1/api', exportRoutes)
  app.route('/v1/api', adminRoutes)
  app.route('/v1/api', exportXlsxRoutes)
  app.route("/v1/api", exportPdfRoutes)
  app.route('/v1/api', templateRoutes)
  app.route('/v1/api', heatmapRoutes)
  app.route('/v1/api', weightSuggestRoutes)
  app.route('/v1/api', autofillRoutes)
  app.route('/v1/api', collabRoutes)
  app.route('/v1/api', tokenRoutes)
  app.route('/v1/api', councilStreamRoutes)
  app.route('/v1/api', councilResultRoutes)
  app.route('/v1/api', adminInteractiveRoutes)
  app.route('/v1/api', adminSensitivityCoreRoutes)

  // i18n endpoints
  app.get('/v1/api/i18n/locales', (c) => c.json({ locales: getAvailableLocales(), default: DEFAULT }))
  app.get('/v1/api/i18n/:lang', (c) => {
    const lang = c.req.param('lang')
    if (!SUPPORTED.includes(lang)) return c.json({ error: 'Unsupported language', supported: SUPPORTED }, 400)
    return c.json(getLocale(lang))
  })
  app.get('/v1/api/i18n/:lang/:key', (c) => {
    const lang = c.req.param('lang')
    const key = c.req.param('key')
    return c.json({ key, value: t(lang, key), lang })
  })
  app.use('/v1/api/*', async (c, next) => {
    const lang = detectLang(c.req.raw)
    c.set('lang', lang)
    c.set('t', createTranslator(lang))
    await next()
  })

  // ─── Backward Compat Routes (legacy frontend) ───
  // /api/tables → returns flat array (frontend expects array, not {data:[]})
  // Filters: visibility=open only (hidden from public listing)
  app.get('/api/tables', async (c) => {
    const db = c.get('db')
    const search = c.req.query('search') || c.req.query('q')
    const limit = Math.min(parseInt(c.req.query("limit") || "2000"), 5000)
    try {
      let results
      if (search && search.trim().length > 0) {
        try {
          const safeSearch = search.replace(/"/g, '""').trim()
          results = db.prepare(`
            SELECT t.* FROM tables t
            JOIN tables_fts f ON t.id = f.id
            WHERE tables_fts MATCH ? AND t.state != 'deleted' 
            ORDER BY rank LIMIT ?
          `).all(`"${safeSearch}"*`, limit)
        } catch {
          const likeSearch = `%${search.trim()}%`
          results = db.prepare(`
            SELECT * FROM tables
            WHERE (title LIKE ? OR description LIKE ? OR tags LIKE ?) AND state != 'deleted' 
            ORDER BY updated_at DESC LIMIT ?
          `).all(likeSearch, likeSearch, likeSearch, limit)
        }
      } else {
        results = db.prepare(`
          SELECT * FROM tables WHERE state != 'deleted' 
          ORDER BY updated_at DESC LIMIT ?
        `).all(limit)
      }
      return c.json(results)
    } catch (e) {
      return c.json([])
    }
  })

  // POST /api/table → alias for /api/tables (frontend sends /api/table)
  // Simple: re-mount tablesRoutes POST handler under /api/table too
  // The tablesRoutes POST '/tables' → we need '/table' (singular)
  // Easiest: just register a pass-through
  app.post('/api/table', async (c) => {
    // Forward to /api/tables by reading body and calling the same logic
    // Actually, let's just rewrite the path internally
    const url = new URL(c.req.url)
    url.pathname = '/api/tables'
    // Use fetch to self-call (works in Hono)
    const newReq = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
      // @ts-ignore
      duplex: 'half'
    })
    return app.fetch(newReq)
  })

  app.route('/api', tablesRoutes)
  app.route('/api', councilRoutes)
  app.route('/api', councilDecideRoutes)
  app.route('/api', healthRoutes)
  app.route('/api', exportXlsxRoutes)
  app.route("/api", exportPdfRoutes)
  app.route('/api', exportRoutes)
  app.route('/api', adminRoutes)
  app.route('/api', authRoutes)
  app.route('/api', researchRoutes)
  app.route('/api', hermesRoutes)
  app.route('/api', autofillRoutes)
  app.route('/api', collabRoutes)
  app.route('/api', tokenRoutes)
  app.route('/api', templateRoutes)
  app.route('/api', heatmapRoutes)
  app.route('/api', weightSuggestRoutes)
  app.route('/api', poolRoutes)
  app.route('/api', historyRoutes)
  app.route('/api', councilStreamRoutes)
  app.route('/api', adminInteractiveRoutes)
  app.route('/api', adminSensitivityCoreRoutes)

  // MCP endpoint (SSE + JSON-RPC) — rate limited
  app.use('/mcp/*', rateLimit('mcp'))
  app.all('/mcp', mcpHandler)
  app.get('/mcp/sse', mcpHandler) // SSE transport

  // ─── Serve Static (React SPA) ───
  const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public')


  // ─── n8n Proxy (for Council n8n feature) ───
  app.all('/n8n-proxy/*', async (c) => {
    const url = new URL(c.req.url)
    const proxyPath = url.pathname.replace('/n8n-proxy', '') || '/'
    const targetUrl = 'http://host.docker.internal:5678' + proxyPath + url.search
    
    try {
      const fetchOpts = { method: c.req.method }
      if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
        const bodyText = await c.req.text()
        fetchOpts.headers = { 'Content-Type': c.req.header('Content-Type') || 'application/json' }
        fetchOpts.body = bodyText
      }
      const proxyResp = await fetch(targetUrl, fetchOpts)
      const respText = await proxyResp.text()
      const ct = proxyResp.headers.get('content-type') || 'application/json'
      return c.body(respText, proxyResp.status, { 'Content-Type': ct })
    } catch (e) {
      return c.json({ error: 'n8n unavailable', detail: e.message }, 502)
    }
  })

  // Cache control: index.html = no-cache, assets with hash = 1 year
  app.use('/*', async (c, next) => {
    await next()
    const path = new URL(c.req.url).pathname
    if (path.endsWith('.html') || path === '/' || (!path.includes('.') && !path.startsWith('/v1/api'))) {
      c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
      c.header('Pragma', 'no-cache')
    } else if (path.includes('/assets/')) {
      c.header('Cache-Control', 'public, max-age=31536000, immutable')
    }
  })

  app.use('/*', serveStatic({ root: publicDir }))
  // SPA fallback: all non-API routes → index.html
  app.get('*', serveStatic({ root: publicDir, path: 'index.html' }))

  // ─── Start Server ───
  const server = serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
    log.info({ url: `http://localhost:${info.port}` }, '🚀 Choser EDP ready')
    log.info({ health: `http://localhost:${info.port}/v1/api/health` }, 'Health check')
    log.info({ mcp: `http://localhost:${info.port}/mcp` }, 'MCP endpoint')
    log.info({ tables: `${info.port}/v1/api/tables?limit=5` }, 'Tables API')
    log.info({ dashboard: `http://localhost:${info.port}/v1/api/pool/dashboard` }, 'Dashboard')
    log.info({ collab: `ws://localhost:${info.port}/collab/ws` }, 'Collaboration WebSocket')
  })

  // Initialize WebSocket collaboration server
  initCollaborationWebSocket(server)
  log.info('📡 Collaboration WebSocket ready at /collab/ws')
}

main().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})

export { shuttingDown }

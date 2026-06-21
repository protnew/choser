/**
 * Health + Version endpoints
 */
import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import { getHealthStatus } from '../lib/llm-health.js'
import pkg from '../../package.json' with { type: 'json' }

export const healthRoutes = new Hono()

healthRoutes.get('/health', (c) => {
  const db = getDb()
  let dbOk = false
  let dbSizeMb = 0

  try {
    db.prepare('SELECT 1').get()
    dbOk = true

    const stat = db.pragma('page_count')[0]
    const pageSize = db.pragma('page_size')[0]
    dbSizeMb = Math.round((stat.page_count * pageSize.page_size) / 1024 / 1024 * 10) / 10
  } catch (e) { /* db down */ }

  const llmProviders = getHealthStatus()

  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    version: pkg.version,
    uptime_sec: Math.floor(process.uptime()),
    db: dbOk ? 'connected' : 'error',
    db_size_mb: dbSizeMb,
    llm_providers: llmProviders,
    node_version: process.version
  })
})

healthRoutes.get('/version', (c) => {
  return c.json({
    version: pkg.version,
    build_date: process.env.BUILD_DATE || 'dev',
    node_version: process.version,
    sqlite_version: getDb().prepare('select sqlite_version() as v').get().v
  })
})

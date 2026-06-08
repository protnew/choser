/**
 * Admin Core API — stats, users, settings, backup, FTS, cache, personas
 */
import { Hono } from 'hono'
import { runBackup } from '../lib/backup.js'
import { circuitState } from '../council/engine.js'
import { callWithChain } from '../llm/providers.js'

export const adminCoreRoutes = new Hono()

// GET /admin/stats — overview for admin dashboard
adminCoreRoutes.get('/admin/stats', (c) => {
  const db = c.get('db')
  try {
    const tableCount = db.prepare("SELECT COUNT(*) as cnt FROM tables WHERE state != 'deleted'").get().cnt
    const rowCount = db.prepare('SELECT COUNT(*) as cnt FROM rows').get().cnt
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt
    const councilCount = db.prepare("SELECT COUNT(*) as cnt FROM council_jobs WHERE status = 'completed'").get().cnt
    const totalTokens = db.prepare('SELECT COALESCE(SUM(tokens_used), 0) as total FROM council_jobs').get().total
    const totalCost = db.prepare('SELECT COALESCE(SUM(cost_usd), 0) as total FROM council_jobs').get().total
    const lastUpdated = db.prepare('SELECT MAX(updated_at) as d FROM tables').get()?.d || null

    return c.json({
      tables: tableCount,
      rows: rowCount,
      users: userCount,
      councils_completed: councilCount,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      last_updated: lastUpdated,
      db_size_mb: Math.round(
        (db.pragma('page_count')[0]?.page_count || 0) *
        (db.pragma('page_size')[0]?.page_size || 4096) / 1024 / 1024 * 10
      ) / 10
    })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /admin/snapshots — list table versions
adminCoreRoutes.get('/admin/snapshots', (c) => {
  const db = c.get('db')
  const tableId = c.req.query('table_id')
  try {
    if (tableId) {
      const versions = db.prepare('SELECT * FROM table_versions WHERE table_id = ? ORDER BY created_at DESC').all(tableId)
      return c.json(versions)
    }
    const all = db.prepare('SELECT * FROM table_versions ORDER BY created_at DESC LIMIT 100').all()
    return c.json(all)
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /admin/users — list users
adminCoreRoutes.get('/admin/users', (c) => {
  const db = c.get('db')
  try {
    const users = db.prepare('SELECT id, email, name, role, created_at, org_id FROM users').all()
    return c.json(users)
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /admin/promote — promote table version
adminCoreRoutes.post('/admin/promote', async (c) => {
  const db = c.get('db')
  const { table_id, version } = await c.req.json()
  if (!table_id || !version) return c.json({ error: 'table_id and version required' }, 400)

  try {
    const ver = db.prepare('SELECT * FROM table_versions WHERE table_id = ? AND version = ?').get(table_id, version)
    if (!ver) return c.json({ error: 'Version not found' }, 404)

    const data = JSON.parse(ver.data)
    // Restore table to this version
    if (data.rows) {
      db.prepare('DELETE FROM rows WHERE table_id = ?').run(table_id)
      const insert = db.prepare('INSERT INTO rows (table_id, data) VALUES (?, ?)')
      for (const row of data.rows) {
        insert.run(table_id, typeof row === 'string' ? row : JSON.stringify(row))
      }
    }
    db.prepare('UPDATE tables SET updated_at = date(?) WHERE id = ?').run(ver.created_at, table_id)
    return c.json({ success: true, table_id, promoted_to: version })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /admin/archive — archive/soft-delete tables
adminCoreRoutes.post('/admin/archive', async (c) => {
  const db = c.get('db')
  const { table_ids, action } = await c.req.json()
  if (!table_ids || !Array.isArray(table_ids)) return c.json({ error: 'table_ids array required' }, 400)

  const state = action === 'restore' ? 'active' : 'archived'
  const stmt = db.prepare('UPDATE tables SET state = ? WHERE id = ?')
  let count = 0
  db.transaction(() => {
    for (const id of table_ids) {
      const r = stmt.run(state, id)
      count += r.changes
    }
  })()
  return c.json({ success: true, archived: count, action: state })
})

// Rebuild FTS index
adminCoreRoutes.post('/admin/fts-rebuild', (c) => {
  const db = c.get('db')
  const log = c.get('log')

  try {
    db.transaction(() => {
      db.exec('DELETE FROM tables_fts')
      db.exec(`INSERT INTO tables_fts(rowid, id, title, description, tags)
        SELECT rowid, id, title, description, tags FROM tables WHERE state != 'deleted'`)
    })()

    const count = db.prepare('SELECT COUNT(*) as cnt FROM tables_fts').get().cnt
    log.info({ count }, 'FTS index rebuilt')
    return c.json({ success: true, indexed: count })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// Clear LLM cache
adminCoreRoutes.post('/admin/cache-clear', (c) => {
  const db = c.get('db')
  const result = db.prepare('DELETE FROM llm_cache').run()
  return c.json({ success: true, cleared: result.changes })
})

// Reset circuit breaker for provider
adminCoreRoutes.post('/admin/circuit-reset/:provider', (c) => {
  const { provider } = c.req.param()
  if (circuitState[provider]) {
    circuitState[provider] = { failures: 0, open: false }
  }
  return c.json({ success: true, provider, circuit: 'closed' })
})

// Trigger manual backup
adminCoreRoutes.get('/admin/backup', async (c) => {
  const db = c.get('db')
  const log = c.get('log')

  try {
    await runBackup(db, log)
    return c.json({ success: true, message: 'Backup completed' })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// GET full backup data (tables + rows + columns) — used by DistributionAnalysis
adminCoreRoutes.get('/admin/backup-data', (c) => {
  const db = c.get('db')
  try {
    const tables = db.prepare("SELECT * FROM tables WHERE state != 'deleted'").all()
    const columns = db.prepare("SELECT c.* FROM columns c INNER JOIN tables t ON c.table_id = t.id WHERE t.state IS NULL OR t.state != 'deleted'").all()
    const rows = db.prepare("SELECT r.* FROM rows r INNER JOIN tables t ON r.table_id = t.id WHERE t.state IS NULL OR t.state != 'deleted'").all()
    return c.json({ tables, columns, rows })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// Update exchange rates
adminCoreRoutes.post('/admin/exchange-rates', async (c) => {
  const db = c.get('db')
  const rates = await c.req.json()

  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('exchange_rates', ?, datetime('now'))")
    .run(JSON.stringify(rates))

  return c.json({ success: true, rates })
})

// Generate persona via LLM — creates YAML
adminCoreRoutes.post('/admin/generate-persona', async (c) => {
  const log = c.get('log')
  const role = c.req.query('role')
  if (!role) return c.json({ error: 'role query param required' }, 400)

  const systemPrompt = `You are a persona generator for an AI decision council.
Generate a YAML persona definition for the role "${role}".
The persona should have deep expertise and a clear decision-making perspective.

Output ONLY valid YAML with these fields:
name: Full Role Title
role: short_role_key
temperature: 0.7
system_prompt: |
  Detailed system prompt (3-5 sentences) explaining how this role evaluates decisions.
  Include specific criteria they focus on, scoring methodology (1-10), and output format.
  Must instruct to respond in JSON with: scores, confidence (1-10), reasoning, sources.`

  try {
    const result = await callWithChain(process.env, systemPrompt, `Generate persona for: ${role}`, 0.7)
    log.info({ role }, 'Persona generated via LLM')

    return c.json({
      role,
      yaml: typeof result === 'string' ? result : result.text,
      provider: 'zai',
      note: 'Save to edp/personas/ directory as <role>.yaml'
    })
  } catch (err) {
    log.error({ err: err.message, role }, 'Persona generation failed')
    return c.json({ error: `LLM call failed: ${err.message}` }, 500)
  }
})

// GET /admin/settings — all config settings
adminCoreRoutes.get('/admin/settings', (c) => {
  const db = c.get('db')
  const settings = db.prepare('SELECT key, value, updated_at FROM settings').all()
  return c.json({
    settings: Object.fromEntries(settings.map(s => {
      let parsed = s.value
      try { parsed = JSON.parse(s.value) } catch { parsed = s.value }
      return [s.key, { value: parsed, updated_at: s.updated_at }]
    }))
  })
})

// PUT /admin/settings/:key — update config
adminCoreRoutes.put('/admin/settings/:key', async (c) => {
  const db = c.get('db')
  const { key } = c.req.param()
  const { value } = await c.req.json()

  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))")
    .run(key, JSON.stringify(value))

  return c.json({ success: true, key, value })
})

// GET /admin/archive — list deleted/archived tables
adminCoreRoutes.get('/admin/archive', (c) => {
  const db = c.get('db')
  try {
    const archived = db.prepare("SELECT * FROM tables WHERE state = 'deleted' OR state = 'archived' ORDER BY updated_at DESC").all()
    return c.json(archived)
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /admin/restore-table/:id
adminCoreRoutes.post('/admin/restore-table/:id', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()
  try {
    db.prepare("UPDATE tables SET state = 'active' WHERE id = ?").run(id)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

/**
 * Tables Read API - GET routes + autocomplete
 */
import { Hono } from 'hono'
import { extractTCO } from './tablesWrite.js'


export const tablesReadRoutes = new Hono()
const TABLE_STATE_DELETED = 'deleted'
const TABLE_STATE_HIDDEN = '\u0441\u043a\u0440\u044b\u0442\u0430\u044f'

tablesReadRoutes.get('/tables', (c) => {
  const db = c.get('db')
  const log = c.get('log')

  const cursor = c.req.query('cursor')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200)
  const tag = c.req.query('tag')
  const status = c.req.query('status') || 'active'
  const search = c.req.query('q')

  try {
    let results

    if (search && search.trim().length > 0) {
      // FTS5 search
      try {
        const safeSearch = search.replace(/"/g, '""').trim()
        const ftsQuery = `"${safeSearch}"*`

        results = db.prepare(`
          SELECT t.* FROM tables t
          JOIN tables_fts f ON t.id = f.id
          WHERE tables_fts MATCH ? AND t.state NOT IN (?, ?)
          ORDER BY rank
          LIMIT ?
        `).all(ftsQuery, TABLE_STATE_DELETED, TABLE_STATE_HIDDEN, limit)
      } catch (ftsErr) {
        // Fallback to LIKE
        const likeSearch = `%${search.trim()}%`
        results = db.prepare(`
          SELECT * FROM tables
          WHERE (title LIKE ? OR description LIKE ? OR tags LIKE ?) AND state NOT IN (?, ?)
          ORDER BY updated_at DESC LIMIT ?
        `).all(likeSearch, likeSearch, likeSearch, TABLE_STATE_DELETED, TABLE_STATE_HIDDEN, limit)
      }
    } else {
      // Cursor-based pagination
      if (cursor) {
        results = db.prepare(`
          SELECT * FROM tables
          WHERE id > ? AND state NOT IN (?, ?)
          ORDER BY id LIMIT ?
        `).all(cursor, TABLE_STATE_DELETED, TABLE_STATE_HIDDEN, limit)
      } else {
        results = db.prepare(`
          SELECT * FROM tables
          WHERE state NOT IN (?, ?)
          ORDER BY updated_at DESC LIMIT ?
        `).all(TABLE_STATE_DELETED, TABLE_STATE_HIDDEN, limit)
      }
    }

    // Tag filter (post-filter since tags is TEXT, not indexed)
    if (tag) {
      results = results.filter(t => t.tags && t.tags.includes(tag))
    }

    // Build next cursor
    const nextCursor = results.length === limit && results.length > 0
      ? results[results.length - 1].id
      : null

    return c.json({
      data: results,
      cursor: nextCursor,
      count: results.length
    })
  } catch (e) {
    log.error({ err: e.message }, 'List tables failed')
    return c.json({ error: e.message }, 500)
  }
})

// Get single table with rows + columns
tablesReadRoutes.get('/tables/:id', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()

  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
    if (!table) return c.json({ error: 'Not found' }, 404)

    // Increment views
    db.prepare('UPDATE tables SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(id)

    const columns = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(id)
    const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(id)

    // Parse JSON fields
    const meta = { ...table }
    if (columns?.definition) {
      meta.columns = typeof columns.definition === 'string'
        ? JSON.parse(columns.definition)
        : columns.definition
    }

    const parsedRows = rows.map(r => ({
      ...r,
      data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data
    }))

    return c.json({ meta, data: parsedRows })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// Create or update table
tablesReadRoutes.post('/tables', async (c) => {
  const db = c.get('db')
  const log = c.get('log')
  const body = await c.req.json()

  const { id, title, description, columns: colsData, data: rowsData } = body

  if (!id || !title) {
    return c.json({ error: 'id and title required' }, 400)
  }

  try {
    db.transaction(() => {
      const existing = db.prepare('SELECT id FROM tables WHERE id = ?').get(id)

      if (existing) {
        // Update
        db.prepare(`UPDATE tables SET title = ?, description = ?, updated_at = date('now')
          WHERE id = ?`).run(title, description || '', id)
        db.prepare('DELETE FROM columns WHERE table_id = ?').run(id)
        db.prepare('DELETE FROM rows WHERE table_id = ?').run(id)
      } else {
        // Insert
        db.prepare(`INSERT INTO tables (id, title, description) VALUES (?, ?, ?)`)
          .run(id, title, description || '')
      }

      // Columns
      if (colsData) {
        db.prepare('INSERT INTO columns (table_id, definition) VALUES (?, ?)')
          .run(id, JSON.stringify(colsData))
      }

      // Rows + materialized TCO
      if (rowsData && Array.isArray(rowsData)) {
        const insertRow = db.prepare(`INSERT INTO rows (table_id, data, tco_1y, tco_3y, tco_5y, currency)
          VALUES (?, ?, ?, ?, ?, ?)`)

        for (const row of rowsData) {
          const data = typeof row === 'string' ? row : JSON.stringify(row)
          const parsed = typeof row === 'string' ? JSON.parse(row) : row

          // Extract materialized TCO from data
          const tco = extractTCO(parsed)
          insertRow.run(id, data, tco.tco_1y, tco.tco_3y, tco.tco_5y, tco.currency || 'RUB')
        }
      }

      // Save snapshot
      const snapshotData = JSON.stringify({ title, description, columns: colsData, rows: rowsData || [] })
      const versionCount = db.prepare('SELECT COUNT(*) as cnt FROM snapshots WHERE table_id = ?').get(id).cnt

      db.prepare('INSERT INTO snapshots (table_id, version, data_json) VALUES (?, ?, ?)')
        .run(id, versionCount + 1, snapshotData)

      // Retention: keep last 10 snapshots
      const oldest = db.prepare('SELECT id FROM snapshots WHERE table_id = ? ORDER BY version ASC').all(id)
      if (oldest.length > 10) {
        const toDelete = oldest.slice(0, oldest.length - 10)
        for (const s of toDelete) {
          db.prepare('DELETE FROM snapshots WHERE id = ?').run(s.id)
        }
      }
    })()

    log.info({ table_id: id, title }, 'Table saved')
    return c.json({ success: true, id })
  } catch (e) {
    log.error({ err: e.message, table_id: id }, 'Save table failed')
    return c.json({ error: e.message }, 500)
  }
})

// Get snapshots
tablesReadRoutes.get('/tables/:id/snapshots', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()

  const snapshots = db.prepare(
    'SELECT id, version, created_at FROM snapshots WHERE table_id = ? ORDER BY version DESC LIMIT 10'
  ).all(id)

  return c.json({ data: snapshots })
})

// Get specific snapshot
tablesReadRoutes.get('/tables/:id/snapshots/:ver', (c) => {
  const db = c.get('db')
  const { id, ver } = c.req.param()

  const snapshot = db.prepare(
    'SELECT * FROM snapshots WHERE table_id = ? AND version = ?'
  ).get(id, parseInt(ver))

  if (!snapshot) return c.json({ error: 'Snapshot not found' }, 404)

  return c.json({
    version: snapshot.version,
    created_at: snapshot.created_at,
    data: JSON.parse(snapshot.data_json)
  })
})

// Backward compat: frontend uses /api/table/:id (singular)
// Frontend expects: { meta: {...}, columns: [...], data: [{name, p0, p1, ...}] }
// where each row is the INNER data object (not the DB row wrapper)
tablesReadRoutes.get('/table/:id', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()

  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
    if (!table) return c.json({ error: 'Not found' }, 404)

    db.prepare('UPDATE tables SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(id)

    const columns = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(id)
    const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(id)

    const meta = { ...table }
    let parsedColumns = []
    if (columns?.definition) {
      parsedColumns = typeof columns.definition === 'string'
        ? JSON.parse(columns.definition)
        : columns.definition
      meta.columns = parsedColumns
    }

    // Flatten: frontend expects each row as {name, p0, p1, ...} directly
    const flatRows = rows.map(r => {
      const inner = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
      return { ...inner }
    })

    return c.json({ meta, columns: parsedColumns, data: flatRows })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// Backward compat: versions → snapshots
tablesReadRoutes.get('/table/:id/versions', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()
  const snapshots = db.prepare(
    'SELECT id, version, created_at FROM snapshots WHERE table_id = ? ORDER BY version DESC LIMIT 10'
  ).all(id)
  return c.json({ data: snapshots })
})

tablesReadRoutes.get('/table/:id/version/:ver', (c) => {
  const db = c.get('db')
  const { id, ver } = c.req.param()
  const snapshot = db.prepare(
    'SELECT * FROM snapshots WHERE table_id = ? AND version = ?'
  ).get(id, parseInt(ver))
  if (!snapshot) return c.json({ error: 'Snapshot not found' }, 404)
  return c.json({ version: snapshot.version, created_at: snapshot.created_at, data: JSON.parse(snapshot.data_json) })
})

// Autocomplete endpoint (stub — returns matching table titles)
tablesReadRoutes.get('/autocomplete', (c) => {
  const db = c.get('db')
  const field = c.req.query('field') || 'title'
  const q = c.req.query('q') || ''
  if (!q || q.length < 2) return c.json([])

  try {
    const likeSearch = `%${q}%`
    const results = db.prepare(
      'SELECT DISTINCT title as value FROM tables WHERE title LIKE ? AND state NOT IN (?, ?) LIMIT 10'
    ).all(likeSearch, TABLE_STATE_DELETED, TABLE_STATE_HIDDEN)
    return c.json(results.map(r => r.value))
  } catch (e) {
    return c.json([])
  }
})

/**
 * Admin Templates Library API
 * CRUD + use-count for comparison templates
 */
import { Hono } from 'hono'
import { getDb } from '../lib/db.js'

export const templateRoutes = new Hono()

// GET /admin/templates — list all, optionally grouped by category
templateRoutes.get('/admin/templates', (c) => {
  const db = getDb()
  const category = c.req.query('category')

  let rows
  if (category) {
    rows = db.prepare(
      "SELECT * FROM templates WHERE category LIKE ? ORDER BY category, name"
    ).all(`%${category}%`)
  } else {
    rows = db.prepare(
      "SELECT * FROM templates ORDER BY category, name"
    ).all()
  }

  // Group by category
  const grouped = {}
  for (const row of rows) {
    const cat = row.category || 'Другое'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(row)
  }

  return c.json({ templates: rows, grouped })
})

// GET /admin/templates/:id — single template
templateRoutes.get('/admin/templates/:id', (c) => {
  const db = getDb()
  const id = c.req.param('id')

  const row = db.prepare("SELECT * FROM templates WHERE id = ?").get(id)
  if (!row) {
    return c.json({ error: "Template not found" }, 404)
  }

  return c.json(row)
})

// POST /admin/templates — create new template
templateRoutes.post('/admin/templates', async (c) => {
  const db = getDb()
  const body = await c.req.json()

  const { id, name, category, columns_json, description } = body

  if (!id || !name || !category || !columns_json) {
    return c.json({ error: "Missing required fields: id, name, category, columns_json" }, 400)
  }

  // Validate columns_json is valid JSON
  try {
    JSON.parse(columns_json)
  } catch {
    return c.json({ error: "columns_json must be valid JSON" }, 400)
  }

  try {
    db.prepare(`
      INSERT INTO templates (id, name, category, columns_json, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, category, columns_json, description || null)
  } catch (e) {
    if (e.message.includes("UNIQUE constraint")) {
      return c.json({ error: "Template with this id already exists" }, 409)
    }
    throw e
  }

  const row = db.prepare("SELECT * FROM templates WHERE id = ?").get(id)
  return c.json(row, 201)
})

// POST /admin/templates/:id/use — increment use_count and return template data
templateRoutes.post('/admin/templates/:id/use', (c) => {
  const db = getDb()
  const id = c.req.param('id')

  const row = db.prepare("SELECT * FROM templates WHERE id = ?").get(id)
  if (!row) {
    return c.json({ error: "Template not found" }, 404)
  }

  db.prepare("UPDATE templates SET use_count = use_count + 1 WHERE id = ?").run(id)

  const updated = db.prepare("SELECT * FROM templates WHERE id = ?").get(id)
  return c.json(updated)
})

// DELETE /admin/templates/:id — delete a template
templateRoutes.delete('/admin/templates/:id', (c) => {
  const db = getDb()
  const id = c.req.param('id')

  const row = db.prepare("SELECT * FROM templates WHERE id = ?").get(id)
  if (!row) {
    return c.json({ error: "Template not found" }, 404)
  }

  db.prepare("DELETE FROM templates WHERE id = ?").run(id)
  return c.json({ ok: true, deleted: id })
})

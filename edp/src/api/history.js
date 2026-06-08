/**
 * History API — Decision history, review, override
 */
import { Hono } from 'hono'

export const historyRoutes = new Hono()

// GET /tables/:id/history — decision history timeline
historyRoutes.get('/tables/:id/history', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
  if (!table) return c.json({ error: 'Not found' }, 404)

  const history = db.prepare(`
    SELECT * FROM decision_history
    WHERE table_id = ?
    ORDER BY created_at DESC
  `).all(id)

  const snapshots = db.prepare(`
    SELECT id, version, created_at FROM snapshots
    WHERE table_id = ?
    ORDER BY version DESC LIMIT 10
  `).all(id)

  return c.json({
    table_id: id,
    title: table.title,
    decisions: history.map(h => ({
      id: h.id,
      decision: h.decision,
      council_job_id: h.council_job_id,
      override_reason: h.override_reason,
      reviewed_at: h.reviewed_at,
      impact_actual: h.impact_actual,
      created_at: h.created_at
    })),
    snapshots
  })
})

// POST /tables/:id/review — trigger a new council review
historyRoutes.post('/tables/:id/review', async (c) => {
  const db = c.get('db')
  const log = c.get('log')
  const { id } = c.req.param()

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
  if (!table) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json().catch(() => ({}))
  const { impact_actual, notes } = body

  // Record review
  db.prepare(`INSERT INTO decision_history (table_id, decision, reviewed_at, impact_actual)
    VALUES (?, 'review', datetime('now'), ?)`).run(id, impact_actual || null)

  // Log audit
  db.prepare("INSERT INTO audit_log (action, details) VALUES ('review', ?)")
    .run(JSON.stringify({ table_id: id, impact_actual, notes }))

  log.info({ table_id: id }, 'Decision reviewed')

  return c.json({ success: true, message: 'Review recorded' })
})

// POST /tables/:id/override — manual override of council decision
historyRoutes.post('/tables/:id/override', async (c) => {
  const db = c.get('db')
  const log = c.get('log')
  const { id } = c.req.param()

  const body = await c.req.json()
  const { decision, override_reason, chosen_alternative } = body

  if (!override_reason) {
    return c.json({ error: 'override_reason is required (why council was overruled)' }, 400)
  }

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
  if (!table) return c.json({ error: 'Not found' }, 404)

  db.prepare(`INSERT INTO decision_history (table_id, decision, override_reason, reviewed_at)
    VALUES (?, 'override', ?, datetime('now'))`).run(id, override_reason)

  // If chosen_alternative provided, update table
  if (chosen_alternative) {
    db.prepare("INSERT INTO audit_log (action, details) VALUES ('override', ?)")
      .run(JSON.stringify({ table_id: id, chosen: chosen_alternative, reason: override_reason }))
  }

  log.info({ table_id: id, reason: override_reason }, 'Decision overridden')

  return c.json({ success: true, message: 'Override recorded' })
})

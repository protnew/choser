/**
 * Pool API — Dashboard, Dependencies, Timeline, Bubble
 * Decision pool = all tables with financial + status data
 */
import { Hono } from 'hono'

export const poolRoutes = new Hono()

// GET /pool/dashboard — summary of all decisions
poolRoutes.get('/pool/dashboard', (c) => {
  const db = c.get('db')

  const tables = db.prepare(`
    SELECT t.id, t.title, t.tags, t.utility, t.state,
           COUNT(r.id) as row_count,
           SUM(r.tco_3y) as total_tco_3y,
           SUM(r.tco_5y) as total_tco_5y
    FROM tables t
    LEFT JOIN rows r ON r.table_id = t.id
    WHERE t.state != 'deleted'
    GROUP BY t.id
    ORDER BY t.updated_at DESC
  `).all()

  // Aggregate stats
  const totalTables = tables.length
  const totalTco3y = tables.reduce((s, t) => s + (t.total_tco_3y || 0), 0)
  const totalTco5y = tables.reduce((s, t) => s + (t.total_tco_5y || 0), 0)
  const avgUtility = tables.length > 0
    ? Math.round(tables.reduce((s, t) => s + (t.utility || 0), 0) / tables.length * 100) / 100
    : 0

  // Group by tag
  const byTag = {}
  for (const t of tables) {
    const tags = (t.tags || '').split(',').map(s => s.trim()).filter(Boolean)
    for (const tag of tags) {
      if (!byTag[tag]) byTag[tag] = { count: 0, tco_3y: 0, tables: [] }
      byTag[tag].count++
      byTag[tag].tco_3y += t.total_tco_3y || 0
      byTag[tag].tables.push(t.id)
    }
  }

  // Decision status distribution
  const statusDist = {}
  for (const t of tables) {
    const st = t.state || 'open'
    statusDist[st] = (statusDist[st] || 0) + 1
  }

  // Recent councils
  const recentCouncils = db.prepare(`
    SELECT id, topic, status, tokens_used, cost_usd, created_at, completed_at
    FROM council_jobs ORDER BY id DESC LIMIT 10
  `).all()

  return c.json({
    summary: {
      total_decisions: totalTables,
      total_tco_3y: Math.round(totalTco3y),
      total_tco_5y: Math.round(totalTco5y),
      avg_utility: avgUtility,
      status_distribution: statusDist
    },
    by_tag: byTag,
    tables: tables.map(t => ({
      id: t.id,
      title: t.title,
      tags: t.tags,
      utility: t.utility,
      state: t.state,
      row_count: t.row_count,
      tco_3y: t.total_tco_3y,
      tco_5y: t.total_tco_5y
    })),
    recent_councils: recentCouncils
  })
})

// GET /pool/dependencies — DAG of table dependencies
poolRoutes.get('/pool/dependencies', (c) => {
  const db = c.get('db')

  const edges = db.prepare(`
    SELECT d.from_table_id, d.to_table_id, d.type, d.created_at,
           ft.title as from_title, tt.title as to_title
    FROM dependencies d
    LEFT JOIN tables ft ON ft.id = d.from_table_id
    LEFT JOIN tables tt ON tt.id = d.to_table_id
    ORDER BY d.created_at DESC
  `).all()

  // Detect cycles via DFS
  const adj = {}
  for (const e of edges) {
    if (!adj[e.from_table_id]) adj[e.from_table_id] = []
    adj[e.from_table_id].push(e.to_table_id)
  }

  const cycles = detectCycles(adj)

  return c.json({
    edges: edges.map(e => ({
      from: { id: e.from_table_id, title: e.from_title },
      to: { id: e.to_table_id, title: e.to_title },
      type: e.type,
      created_at: e.created_at
    })),
    cycle_warnings: cycles,
    total_edges: edges.length
  })
})

// POST /pool/dependencies — add dependency edge (with cycle detection)
poolRoutes.post('/pool/dependencies', (c) => {
  const db = c.get('db')
  return c.req.json().then(body => {
    const { from_table_id, to_table_id, type = 'blocks' } = body
    if (!from_table_id || !to_table_id) return c.json({ error: 'from_table_id and to_table_id required' }, 400)

    // Check cycle
    const edges = db.prepare('SELECT from_table_id, to_table_id FROM dependencies').all()
    const adj = {}
    for (const e of edges) {
      if (!adj[e.from_table_id]) adj[e.from_table_id] = []
      adj[e.from_table_id].push(e.to_table_id)
    }
    // Add proposed edge
    if (!adj[from_table_id]) adj[from_table_id] = []
    adj[from_table_id].push(to_table_id)

    const cycles = detectCycles(adj)
    if (cycles.length > 0) {
      return c.json({ error: 'Cycle detected', cycles }, 409)
    }

    db.prepare('INSERT OR IGNORE INTO dependencies (from_table_id, to_table_id, type) VALUES (?, ?, ?)')
      .run(from_table_id, to_table_id, type)

    return c.json({ success: true })
  })
})

// DELETE /pool/dependencies — remove edge
poolRoutes.delete('/pool/dependencies', async (c) => {
  const db = c.get('db')
  const { from_table_id, to_table_id } = await c.req.json()

  const result = db.prepare('DELETE FROM dependencies WHERE from_table_id = ? AND to_table_id = ?')
    .run(from_table_id, to_table_id)

  return c.json({ success: true, removed: result.changes })
})

// GET /pool/timeline — decisions over time (for Gantt-like view)
poolRoutes.get('/pool/timeline', (c) => {
  const db = c.get('db')

  const tables = db.prepare(`
    SELECT id, title, state, created_at, updated_at, tags, utility
    FROM tables WHERE state != 'deleted'
    ORDER BY created_at ASC
  `).all()

  const dependencies = db.prepare('SELECT from_table_id, to_table_id, type FROM dependencies').all()

  return c.json({
    decisions: tables.map(t => ({
      id: t.id,
      title: t.title,
      status: t.state,
      start: t.created_at,
      end: t.updated_at,
      tags: t.tags,
      utility: t.utility
    })),
    dependencies
  })
})

// GET /pool/bubble — bubble chart data (TCO vs Utility, size=Risk, color=Status)
poolRoutes.get('/pool/bubble', (c) => {
  const db = c.get('db')
  const category = c.req.query('category')

  let tables = db.prepare(`
    SELECT t.id, t.title, t.tags, t.utility, t.state,
           COUNT(r.id) as row_count,
           AVG(r.tco_3y) as avg_tco_3y,
           SUM(r.tco_3y) as total_tco_3y
    FROM tables t
    LEFT JOIN rows r ON r.table_id = t.id
    WHERE t.state != 'deleted'
    GROUP BY t.id
  `).all()

  if (category) {
    tables = tables.filter(t => t.tags && t.tags.includes(category))
  }

  return c.json({
    data: tables.map(t => ({
      id: t.id,
      title: t.title,
      x: t.total_tco_3y || 0,    // TCO = X axis
      y: t.utility || 0,          // Utility = Y axis
      size: t.row_count || 1,     // Row count = bubble size
      color: t.state,             // Status = color
      tags: t.tags
    }))
  })
})

// ─── Cycle detection (DFS) ───

function detectCycles(adj) {
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = {}
  const cycles = []

  function dfs(node, path) {
    color[node] = GRAY
    path.push(node)

    for (const neighbor of (adj[node] || [])) {
      if (color[neighbor] === GRAY) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor)
        cycles.push(path.slice(cycleStart).concat(neighbor))
      } else if (color[neighbor] !== BLACK) {
        dfs(neighbor, path)
      }
    }

    path.pop()
    color[node] = BLACK
  }

  for (const node of Object.keys(adj)) {
    if (color[node] !== BLACK) {
      dfs(node, [])
    }
  }

  return cycles
}

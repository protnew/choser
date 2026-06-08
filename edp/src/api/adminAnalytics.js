/**
 * Admin Analytics API — catalog, extended stats, metrics, observability
 */
import { Hono } from 'hono'
import { circuitState } from '../council/engine.js'
import { callWithChain } from '../llm/providers.js'

export const adminAnalyticsRoutes = new Hono()

// GET /catalog/objects — all objects (rows) across tables
adminAnalyticsRoutes.get('/catalog/objects', (c) => {
  const db = c.get('db')
  const q = c.req.query('q') || ''
  try {
    let rows
    if (q) {
      rows = db.prepare(`
        SELECT r.data, r.table_id, t.title as table_title
        FROM rows r
        INNER JOIN tables t ON r.table_id = t.id
        WHERE (t.state IS NULL OR t.state != 'deleted')
        AND (r.data LIKE ? OR t.title LIKE ?)
        LIMIT 500
      `).bind(`%${q}%`, `%${q}%`).all()
    } else {
      rows = db.prepare(`
        SELECT r.data, r.table_id, t.title as table_title
        FROM rows r
        INNER JOIN tables t ON r.table_id = t.id
        WHERE (t.state IS NULL OR t.state != 'deleted')
        LIMIT 500
      `).all()
    }
    const objects = rows.map(r => {
      let data = r.data
      if (typeof data === 'string') try { data = JSON.parse(data) } catch { data = {} }
      const name = data['Название'] || data['название'] || data['name'] || data['Name'] || Object.values(data)[0] || '—'
      const price = data['Цена'] || data['цена'] || data['price'] || data['Price'] || data['Стоимость'] || ''
      return { name, price, table_id: r.table_id, table_title: r.table_title, data }
    })
    return c.json(objects)
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /catalog/params — all unique parameters across tables
adminAnalyticsRoutes.get('/catalog/params', (c) => {
  const db = c.get('db')
  const q = c.req.query('q') || ''
  try {
    const columns = db.prepare(`
      SELECT c.table_id, c.definition, t.title as table_title
      FROM columns c
      INNER JOIN tables t ON c.table_id = t.id
      WHERE (t.state IS NULL OR t.state != 'deleted')
    `).all()
    const paramMap = {}
    for (const col of columns) {
      let defs
      if (typeof col.definition === 'string') try { defs = JSON.parse(col.definition) } catch { defs = [] }
      else defs = col.definition
      if (!Array.isArray(defs)) continue
      for (const d of defs) {
        const title = d.title || d.name || ''
        if (!title) continue
        if (q && !title.toLowerCase().includes(q.toLowerCase())) continue
        if (!paramMap[title]) {
          paramMap[title] = { title, count: 0, totalWeight: 0, tables: [] }
        }
        paramMap[title].count++
        paramMap[title].totalWeight += (d.weight || 0)
        paramMap[title].tables.push({ id: col.table_id, title: col.table_title })
      }
    }
    const params = Object.values(paramMap).map(p => ({
      ...p,
      avg_weight: p.count > 0 ? Math.round(p.totalWeight / p.count * 10) / 10 : 0
    })).sort((a, b) => b.count - a.count)
    return c.json(params)
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /admin/stats-full — extended stats for AnalyticsTab compatibility
adminAnalyticsRoutes.get('/admin/stats-full', (c) => {
  const db = c.get('db')
  try {
    const tableCount = db.prepare("SELECT COUNT(*) as cnt FROM tables WHERE state != 'deleted'").get().cnt
    const rowCount = db.prepare('SELECT COUNT(*) as cnt FROM rows').get().cnt
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt
    const columnCount = db.prepare('SELECT COUNT(DISTINCT table_id) as cnt FROM columns').get().cnt

    // Per-table stats
    const tables = db.prepare("SELECT id, title, object_count, param_count, views, tags, state, updated_at FROM tables WHERE state != 'deleted' ORDER BY updated_at DESC").all()
    const avgObjects = tables.length ? Math.round(tables.reduce((s, t) => s + (t.object_count || 0), 0) / tables.length * 10) / 10 : 0
    const avgParams = tables.length ? Math.round(tables.reduce((s, t) => s + (t.param_count || 0), 0) / tables.length * 10) / 10 : 0

    // Tag stats
    const tagMap = {}
    for (const t of tables) {
      if (!t.tags) continue
      const tags = typeof t.tags === 'string' ? t.tags.split(',').map(x => x.trim()).filter(Boolean) : t.tags
      for (const tag of tags) {
        tagMap[tag] = (tagMap[tag] || 0) + 1
      }
    }
    const tagStats = Object.entries(tagMap).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 30)

    // Object count distribution
    const objDist = [
      { range: '1-3', count: tables.filter(t => (t.object_count || 0) <= 3).length },
      { range: '4-5', count: tables.filter(t => (t.object_count || 0) >= 4 && (t.object_count || 0) <= 5).length },
      { range: '6-10', count: tables.filter(t => (t.object_count || 0) >= 6 && (t.object_count || 0) <= 10).length },
      { range: '11-20', count: tables.filter(t => (t.object_count || 0) >= 11 && (t.object_count || 0) <= 20).length },
      { range: '21+', count: tables.filter(t => (t.object_count || 0) >= 21).length },
    ]

    // State distribution
    const stateBreakdown = db.prepare('SELECT state, COUNT(*) as count FROM tables GROUP BY state').all()

    // Timeline
    const timeline = db.prepare(`
      SELECT substr(updated_at, 1, 7) as month, COUNT(*) as created, SUM(object_count) as objects
      FROM tables WHERE state != 'deleted' AND updated_at IS NOT NULL AND updated_at != ''
      GROUP BY month ORDER BY month
    `).all()

    // Top tables by views
    const topTables = tables.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 20).map(t => ({
      title: t.title, views: t.views || 0, objects: t.object_count || 0, params: t.param_count || 0, tags: t.tags
    }))

    return c.json({
      overview: {
        totalTables: tableCount, totalRows: rowCount, totalUsers: userCount, totalParams: columnCount,
        avgObjectsPerTable: avgObjects, avgParamsPerTable: avgParams,
        minObjects: Math.min(...tables.map(t => t.object_count || 0)),
        maxObjects: Math.max(...tables.map(t => t.object_count || 0)),
        minParams: Math.min(...tables.map(t => t.param_count || 0)),
        maxParams: Math.max(...tables.map(t => t.param_count || 0)),
      },
      distributions: { objectCounts: objDist, paramCounts: [], viewsCounts: [] },
      utilityStats: { avgUtility: 0, medianUtility: 0 },
      histograms: { cost: [], utility: [] },
      scatterCostUtility: [],
      perTableScatter: [],
      objParamScatter: tables.slice(0, 200).map(t => ({ title: t.title, objects: t.object_count || 0, params: t.param_count || 0 })),
      tableAnalytics: [],
      topTables,
      tagStats,
      stateBreakdown,
      userActivity: { totalAuthors: userCount, topAuthors: [] },
      timeline,
    })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /metrics — observability endpoint
adminAnalyticsRoutes.get('/metrics', (c) => {
  const db = c.get('db')

  const tableCount = db.prepare("SELECT COUNT(*) as cnt FROM tables WHERE state != 'deleted'").get().cnt
  const rowCount = db.prepare('SELECT COUNT(*) as cnt FROM rows').get().cnt
  const councilCompleted = db.prepare("SELECT COUNT(*) as cnt FROM council_jobs WHERE status = 'completed'").get().cnt
  const councilFailed = db.prepare("SELECT COUNT(*) as cnt FROM council_jobs WHERE status = 'failed'").get().cnt
  const councilRunning = db.prepare("SELECT COUNT(*) as cnt FROM council_jobs WHERE status = 'running'").get().cnt
  const totalTokens = db.prepare('SELECT COALESCE(SUM(tokens_used), 0) as total FROM council_jobs').get().total
  const totalCost = db.prepare('SELECT COALESCE(SUM(cost_usd), 0) as total FROM council_jobs').get().total
  const cacheEntries = db.prepare('SELECT COUNT(*) as cnt FROM llm_cache').get().cnt
  const cacheHits = db.prepare("SELECT value FROM settings WHERE key = 'cache_hits'").get()
  const cacheMisses = db.prepare("SELECT value FROM settings WHERE key = 'cache_misses'").get()

  const hits = cacheHits ? parseInt(cacheHits.value) : 0
  const misses = cacheMisses ? parseInt(cacheMisses.value) : 0
  const cacheHitRate = (hits + misses) > 0 ? Math.round(hits / (hits + misses) * 100) : 0

  let dbSizeMb = 0
  try {
    const pageCount = db.pragma('page_count')[0]?.page_count || 0
    const pageSize = db.pragma('page_size')[0]?.page_size || 4096
    dbSizeMb = Math.round(pageCount * pageSize / 1024 / 1024 * 10) / 10
  } catch { }

  return c.json({
    tables: tableCount,
    rows: rowCount,
    councils: {
      completed: councilCompleted,
      failed: councilFailed,
      running: councilRunning,
      total_tokens: totalTokens,
      total_cost_usd: totalCost
    },
    cache: {
      entries: cacheEntries,
      hit_rate_pct: cacheHitRate,
      hits,
      misses
    },
    db_size_mb: dbSizeMb,
    db_size_warning: dbSizeMb > 1000 ? 'CRITICAL: >1GB' : dbSizeMb > 500 ? 'WARN: >500MB' : null,
    uptime_sec: Math.floor(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    circuit_breakers: Object.fromEntries(
      Object.entries(circuitState).map(([k, v]) => [k, v.open ? 'open' : 'closed'])
    )
  })
})

// ============================================================
// Decision Analytics — AI vs Human + Sensitivity Analysis
// ============================================================

async function askLLMForObjects(query) {
  const systemPrompt = `Ты — аналитик. Назови объекты по заданной теме. Ответ: СТРОГО JSON массив строк с названиями. Без пояснений, без markdown. Пример: ["iPhone 15","Samsung S24"]`
  try {
    const result = await callWithChain(process.env, systemPrompt, query, 0.2)
    const text = typeof result === 'string' ? result : result.text
    if (text) {
      let jsonStr = text.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n```\s*$/, '')
      }
      const arr = JSON.parse(jsonStr)
      if (Array.isArray(arr)) return arr.map(s => String(s).trim())
    }
  } catch (e) {
    console.error('[DecisionAnalytics] LLM failed:', e.message)
  }
  return []
}

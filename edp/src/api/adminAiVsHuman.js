/**
 * Admin AI vs Human Analytics
 */
import { Hono } from 'hono'
import { callLLM } from '../council/engine.js'

export const adminAiVsHumanRoutes = new Hono()


async function askLLMForObjects(query) {
  const systemPrompt = `Ты — аналитик. Назови объекты по заданной теме. Ответ: СТРОГО JSON массив строк с названиями. Без пояснений, без markdown. Пример: ["iPhone 15","Samsung S24"]`

  if (process.env.ZAI_API_KEY) {
    try {
      const resp = await fetch('https://open.bigmodel.cn/api/coding/paas/v4/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.ZAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.ZAI_MODEL || 'GLM-5.1',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ],
          temperature: 0.2
        })
      })
      if (!resp.ok) throw new Error(`ZAI HTTP ${resp.status}`)
      const data = await resp.json()
      const text = data.choices?.[0]?.message?.content || ''
      if (text) {
        let jsonStr = text.trim()
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
        }
        const arr = JSON.parse(jsonStr)
        if (Array.isArray(arr)) return arr.map(s => String(s).trim())
      }
    } catch (e) {
      console.error('[DecisionAnalytics] LLM failed:', e.message)
    }
  }
  return []
}


// POST /admin/decision/ai-vs-human
adminAiVsHumanRoutes.post('/admin/decision/ai-vs-human', async (c) => {
  const db = c.get('db')
  const { count = 100, force = false } = await c.req.json().catch(() => ({}))

  // Incremental: skip tables already in DB unless force=true
  if (force) {
    db.prepare("DELETE FROM decision_analytics WHERE type = 'ai_vs_human'").run()
  }
  const existingIds = force ? new Set() : new Set(
    db.prepare("SELECT DISTINCT table_id FROM decision_analytics WHERE type = 'ai_vs_human'").all().map(r => r.table_id)
  )

  const allTables = db.prepare(`
    SELECT t.id, t.title, t.param_count, t.object_count
    FROM tables t
    WHERE t.state != 'deleted' AND t.object_count >= 2
      AND (t.tags IS NULL OR t.tags NOT LIKE '%эксперимент%')
      AND t.title NOT LIKE '%политич%' AND t.title NOT LIKE '%Сири%' AND t.title NOT LIKE '%сири%'
      AND t.title NOT LIKE '%Забастовк%'
    ORDER BY t.rowid ASC
  `).all()
  const tables = allTables.filter(t => !existingIds.has(t.id)).slice(0, count)

  if (!tables.length) {
    return c.json({ error: 'Нет подходящих таблиц' }, 400)
  }

  const results = []

  for (const table of tables) {
    const rows = db.prepare('SELECT data FROM rows WHERE table_id = ?').all(table.id)
    const humanObjects = rows.map(r => {
      try {
        const d = JSON.parse(r.data)
        return d['Название'] || d['name'] || d['Объект'] || Object.values(d)[0] || ''
      } catch { return '' }
    }).filter(Boolean)

    const aiQuery = `${humanObjects.length} лучших: ${table.title}`
    const aiObjects = await askLLMForObjects(aiQuery)

    // Normalize: strip URLs, extract domains, remove special chars
    const normalize = s => {
      if (typeof s !== 'string') return ''
      let r = s.toLowerCase().trim()
      try { if (r.includes('/') || (r.includes('.') && !r.includes(' '))) { const u = new URL(r.startsWith('http') ? r : 'https://' + r); r = u.hostname.replace(/^www\./, '').replace(/\.(ru|com|io|org|net|pro|info|co|dev)$/g, '') } } catch {}
      r = r.replace(/[-_]/g, ' ').replace(/[^a-zа-яё0-9 ]/g, '').replace(/\s+/g, ' ').trim()
      return r
    }
    const humanN = humanObjects.map(normalize)
    const aiN = aiObjects.map(normalize)

    const fuzzyMatch = (a, h) => {
      if (!a || !h) return false
      if (a === h || a.includes(h) || h.includes(a)) return true
      const aW = a.split(' ').filter(w => w.length > 3)
      const hW = h.split(' ').filter(w => w.length > 3)
      if (aW.length && hW.length) {
        const overlap = aW.filter(aw => hW.some(hw => aw.includes(hw) || hw.includes(aw)))
        if (overlap.length >= Math.min(aW.length, hW.length) * 0.5) return true
      }
      return false
    }

    const matches = aiN.filter(ai => humanN.some(h => fuzzyMatch(ai, h)))
    const matchPercent = humanObjects.length > 0
      ? Math.round((matches.length / Math.max(humanObjects.length, aiObjects.length)) * 100)
      : 0

    db.prepare(`
      INSERT INTO decision_analytics (type, table_id, table_title, ai_query, ai_objects, human_objects,
        match_count, ai_count, human_count, match_percent, details)
      VALUES ('ai_vs_human', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      table.id, table.title, aiQuery,
      JSON.stringify(aiObjects), JSON.stringify(humanObjects),
      matches.length, aiObjects.length, humanObjects.length, matchPercent,
      JSON.stringify({ matches, aiQuery, humanN, aiN })
    )

    results.push({
      table_id: table.id, table_title: table.title,
      ai_query: aiQuery, ai_objects: aiObjects, human_objects: humanObjects,
      match_count: matches.length, match_percent: matchPercent,
      ai_count: aiObjects.length, human_count: humanObjects.length
    })
  }

  return c.json({ results })
})

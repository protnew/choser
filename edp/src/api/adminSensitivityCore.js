/**
 * Admin Sensitivity Core Routes
 */
import { Hono } from 'hono'
import { callLLM, sanitizePrompt } from '../council/engine.js'

export const adminSensitivityCoreRoutes = new Hono()

adminSensitivityCoreRoutes.get('/admin/decision/ai-vs-human', async (c) => {
  const db = c.get('db')
  const rows = db.prepare(`
    SELECT * FROM decision_analytics WHERE type = 'ai_vs_human'
    ORDER BY created_at DESC LIMIT 500
  `).all()
  return c.json({ results: rows })
})

// POST /admin/decision/sensitivity
adminSensitivityCoreRoutes.post('/admin/decision/sensitivity', async (c) => {
  const db = c.get('db')

  // Clear old results before recalculating
  db.prepare("DELETE FROM decision_analytics WHERE type = 'sensitivity'").run()

  const tables = db.prepare(`
    SELECT t.id, t.title, t.object_count, t.param_count
    FROM tables t
    WHERE t.state != 'deleted' AND t.object_count >= 3 AND t.param_count >= 4
      AND (t.tags IS NULL OR t.tags NOT LIKE '%эксперимент%')
      AND t.title NOT LIKE '%политич%' AND t.title NOT LIKE '%Сири%' AND t.title NOT LIKE '%сири%'
      AND t.title NOT LIKE '%Забастовк%'
  `).all()

  const results = []

  let debugCount = 0
  for (const table of tables) {
    try {
      const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(table.id)
      const rows = db.prepare('SELECT data FROM rows WHERE table_id = ?').all(table.id)
      if (!colRow || !rows.length) continue

      const columns = JSON.parse(colRow.definition)
      const paramMap = new Map()
      for (const col of columns) {
        if ((col.weight > 0 || col.type === 'number') && col.key) {
          paramMap.set(col.key, col)
        }
      }
      if (paramMap.size < 4) continue

      const parsedRows = rows.map(r => { try { return JSON.parse(r.data) } catch { return null } }).filter(Boolean)

      debugCount++
      if (debugCount <= 3) console.log(`[Sensitivity] ${table.id}: ${paramMap.size} params, ${parsedRows.length} rows`)

      const calcScores = (paramKeys, rows, roundFn, useWeights) => {
        return rows.map(row => {
          let score = 0, totalWeight = 0
          for (const key of paramKeys) {
            const col = paramMap.get(key)
            const raw = row[key]
            // Handle both flat values and {value, grade} objects
            const val = raw && typeof raw === 'object' ? (parseFloat(raw.grade) || parseFloat(raw.value) || 0) : (parseFloat(raw) || 0)
            const w = useWeights ? (col?.weight || 1) : 1
            score += roundFn(val) * w
            totalWeight += w
          }
          const name = row['Название'] || row['name'] || row['Объект'] || Object.values(row)[0] || '?'
          return { name, score: totalWeight > 0 ? score / totalWeight : 0 }
        }).sort((a, b) => b.score - a.score)
      }

      const paramKeys = [...paramMap.keys()]
      const identity = v => v
      const roundTo3 = v => Math.max(0, Math.min(3, Math.round(v / 3.33)))
      const binary = v => v >= 7 ? 1 : 0  // >=7 out of 10 = 1, else 0

      const original = calcScores(paramKeys, parsedRows, identity, true)
      const originalTop3 = original.slice(0, 3).map(r => r.name)

      // Sort params by weight descending
      const sortedKeys = [...paramKeys].sort((a, b) => (paramMap.get(b)?.weight || 0) - (paramMap.get(a)?.weight || 0))

      // Level 1: half params, no weights, 3-point scale
      const halfCount = Math.max(2, Math.ceil(paramKeys.length / 2))
      const kept1 = sortedKeys.slice(0, halfCount)
      const sim1 = calcScores(kept1, parsedRows, roundTo3, false)
      const top3_1 = sim1.slice(0, 3).map(r => r.name)

      // Level 2: top-2 params only, no weights, 3-point scale
      const kept2 = sortedKeys.slice(0, Math.min(2, sortedKeys.length))
      const sim2 = calcScores(kept2, parsedRows, roundTo3, false)
      const top3_2 = sim2.slice(0, 3).map(r => r.name)

      // Level 3: half params, no weights, binary (good/bad)
      const sim3 = calcScores(kept1, parsedRows, binary, false)
      const top3_3 = sim3.slice(0, 3).map(r => r.name)

      const norm = s => typeof s === 'string' ? s.toLowerCase() : String(s || '').toLowerCase()
      const match1 = originalTop3.filter(n => top3_1.some(s => norm(s) === norm(n)))
      const match2 = originalTop3.filter(n => top3_2.some(s => norm(s) === norm(n)))
      const match3 = originalTop3.filter(n => top3_3.some(s => norm(s) === norm(n)))

      const pct1 = Math.round((match1.length / 3) * 100)
      const pct2 = Math.round((match2.length / 3) * 100)
      const pct3 = Math.round((match3.length / 3) * 100)

      db.prepare(`
        INSERT INTO decision_analytics (type, table_id, table_title, original_leaders, simplified_leaders,
          original_top3, simplified_top3, top3_match_percent, params_removed, params_kept, details)
        VALUES ('sensitivity', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        table.id, table.title,
        JSON.stringify(original.slice(0, 5).map(r => ({ name: r.name, score: +r.score.toFixed(2) }))),
        JSON.stringify(sim1.slice(0, 5).map(r => ({ name: r.name, score: +r.score.toFixed(2) }))),
        JSON.stringify(originalTop3), JSON.stringify(top3_1),
        pct1, paramKeys.length - halfCount, halfCount,
        JSON.stringify({ totalParams: paramKeys.length, keptParams: halfCount,
          levels: {
            'half_3point': { top3: top3_1, pct: pct1 },
            'top2_3point': { top3: top3_2, pct: pct2 },
            'half_binary': { top3: top3_3, pct: pct3 }
          }
        })
      )

      results.push({
        table_id: table.id, table_title: table.title,
        original_top3: originalTop3, simplified_top3: top3_1,
        top3_match_percent: pct1,
        pct_top2_3point: pct2,
        pct_half_binary: pct3,
        params_total: paramKeys.length, params_kept: halfCount
      })
    } catch (e) { console.error(`[Sensitivity] Error on ${table.id}:`, e.message) }
  }

  return c.json({ results, totalTables: tables.length, analyzed: results.length })
})

adminSensitivityCoreRoutes.get('/admin/decision/sensitivity', async (c) => {
  const db = c.get('db')
  const rows = db.prepare(`
    SELECT * FROM decision_analytics WHERE type = 'sensitivity'
    ORDER BY created_at DESC LIMIT 500
  `).all()
  return c.json({ results: rows })
})
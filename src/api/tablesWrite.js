/**
 * Tables Write API - POST/DELETE/PATCH routes
 */
import { Hono } from 'hono'
import { callLLM, sanitizePrompt } from '../council/engine.js'

export const tablesWriteRoutes = new Hono()

tablesWriteRoutes.post('/auto-update-row', async (c) => {
  const db = c.get('db')
  const log = c.get('log')
  const body = await c.req.json()
  const { table_id, row_name, columns, existing_data } = body

  if (!table_id || !row_name) {
    return c.json({ error: 'table_id and row_name required' }, 400)
  }

  try {
    // Get table info if not provided
    let cols = columns
    let currentData = existing_data

    if (!cols) {
      const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(table_id)
      if (!colRow) return c.json({ error: 'Table has no columns' }, 400)
      cols = JSON.parse(colRow.definition)
    }

    if (!currentData) {
      // Find existing row by name
      const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(table_id)
      const match = rows.find(r => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
        return d.name === row_name
      })
      currentData = match ? (typeof match.data === 'string' ? JSON.parse(match.data) : match.data) : { name: row_name }
    }

    // Only fill weighted columns (skip weight=0 meta columns)
    const gradableCols = cols.filter(c => c.weight > 0)
    if (gradableCols.length === 0) {
      return c.json({ row: currentData, updated: false, message: 'No gradable columns' })
    }

    // Build prompt for LLM
    const colList = gradableCols.map(c => `- ${c.title} (weight ${c.weight}%): оцени от 1 до 10`).join('\n')
    const contextInfo = Object.entries(currentData)
      .filter(([k, v]) => k !== 'name' && typeof v === 'string' && v.length > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')

    const prompt = `Оцени продукт/решение "${sanitizePrompt(row_name, 200)}" по следующим критериям.

Критерии:
${colList}

${contextInfo ? 'Известно: ' + contextInfo : ''}

Ответь ТОЛЬКО JSON (без markdown):
{"grades": {${gradableCols.map(c => `"${c.key}": N`).join(', ')}}}`

    const result = await callLLM(
      'Ты — технический эксперт. Оценивай решения объективно по шкале 1-10. Отвечай только JSON.',
      prompt,
      'zai',
      'glm-5.1'
    )

    // Parse LLM response
    let grades
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result.text)
      grades = parsed.grades || parsed
    } catch {
      return c.json({ row: currentData, updated: false, message: 'LLM response parse failed', raw: result.text })
    }

    // Apply grades to row data
    const updatedRow = { ...currentData }
    let gradesApplied = 0

    for (const col of gradableCols) {
      const grade = grades[col.key]
      if (grade !== undefined && typeof grade === 'number' && grade >= 1 && grade <= 10) {
        updatedRow[col.key] = { ...updatedRow[col.key], grade }
        gradesApplied++
      }
    }

    // Recalculate utility if calc function pattern matches
    if (gradesApplied > 0) {
      let utilitySum = 0, totalWeight = 0
      for (const col of gradableCols) {
        const entry = updatedRow[col.key]
        const grade = typeof entry === 'object' ? (entry.grade || 0) : (typeof entry === 'number' ? entry : 0)
        const w = col.weight || 0
        utilitySum += grade * w
        totalWeight += w
      }
      const rawScore = totalWeight > 0 ? (utilitySum / totalWeight) * 100 : utilitySum
      updatedRow.utility = Math.round(rawScore * 100) / 100
    }

    log.info({ table_id, row_name, grades_applied: gradesApplied, tokens: result.tokens?.input + result.tokens?.output }, 'AI auto-update')

    return c.json({
      row: updatedRow,
      updated: gradesApplied > 0,
      grades_applied: gradesApplied,
      tokens_used: (result.tokens?.input || 0) + (result.tokens?.output || 0)
    })
  } catch (err) {
    log.error({ err: err.message, table_id, row_name }, 'AI auto-update failed')
    return c.json({ error: err.message, updated: false }, 500)
  }
})

// AI generate table — frontend calls POST /api/generate with { prompt }
tablesWriteRoutes.post('/generate', async (c) => {
  const db = c.get('db')
  const log = c.get('log')
  const { prompt } = await c.req.json()

  if (!prompt) return c.json({ error: 'prompt required' }, 400)

  try {
    const result = await callLLM(
      `Ты — генератор таблиц сравнения. Создай JSON-таблицу по описанию пользователя.
Ответь ТОЛЬКО JSON (без markdown, без комментариев):
{
  "id": "url-slug-из-названия",
  "title": "Название таблицы",
  "description": "Описание",
  "columns": [{ "key": "col1", "title": "Критерий 1", "weight": 25, "type": "number", "max": 10 }],
  "rows": [{ "name": "Вариант 1", "col1": { "grade": 8, "comment": "почему" } }]
}

ПРАВИЛА:
- id = транслитерация title (строчные, дефисы)
- 4-8 столбцов-критериев с весами (сумма 100)
- 3-6 строк-вариантов
- Каждый grade: число 1-10
- type: number для оценок, text для описаний
- Вес (weight) показывает важность критерия`,
      `Создай таблицу сравнения: ${sanitizePrompt(prompt, 500)}`
    )

    // Parse response
    let tableData
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      tableData = JSON.parse(jsonMatch ? jsonMatch[0] : result.text)
    } catch {
      return c.json({ error: 'Не удалось распарсить ответ ИИ', raw: result.text }, 500)
    }

    if (!tableData.id || !tableData.title || !tableData.columns || !tableData.rows) {
      return c.json({ error: 'ИИ вернул неполные данные', data: tableData }, 500)
    }

    // Transform columns
    const colDefs = tableData.columns.map(col => ({
      key: col.key || col.title?.toLowerCase().replace(/\s+/g, '_'),
      title: col.title,
      weight: col.weight || 10,
      type: col.type || 'number',
      ...(col.max ? { max: col.max } : {})
    }))

    // Transform rows
    const rowsData = tableData.rows.map(row => {
      const data = { name: row.name }
      for (const col of colDefs) {
        if (row[col.key] !== undefined) data[col.key] = row[col.key]
      }
      return data
    })

    // Save to DB
    db.transaction(() => {
      const existing = db.prepare('SELECT id FROM tables WHERE id = ?').get(tableData.id)
      if (existing) {
        db.prepare('DELETE FROM columns WHERE table_id = ?').run(tableData.id)
        db.prepare('DELETE FROM rows WHERE table_id = ?').run(tableData.id)
      }

      db.prepare('INSERT OR REPLACE INTO tables (id, title, description, param_count, object_count) VALUES (?, ?, ?, ?, ?)')
        .run(tableData.id, tableData.title, tableData.description || '', colDefs.length, rowsData.length)

      db.prepare('INSERT INTO columns (table_id, definition) VALUES (?, ?)')
        .run(tableData.id, JSON.stringify(colDefs))

      const insertRow = db.prepare('INSERT INTO rows (table_id, data) VALUES (?, ?)')
      for (const row of rowsData) {
        insertRow.run(tableData.id, JSON.stringify(row))
      }
    })()

    log.info({ id: tableData.id, title: tableData.title, cols: colDefs.length, rows: rowsData.length }, 'AI generated table')

    return c.json({
      success: true,
      id: tableData.id,
      title: tableData.title,
      columns: colDefs.length,
      rows: rowsData.length,
      tokens_used: (result.tokens?.input || 0) + (result.tokens?.output || 0)
    })
  } catch (err) {
    log.error({ err: err.message }, 'AI generate failed')
    return c.json({ error: err.message }, 500)
  }
})

// Soft delete
tablesWriteRoutes.delete('/tables/:id', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()

  db.prepare("UPDATE tables SET state = 'deleted', updated_at = date('now') WHERE id = ?").run(id)
  return c.json({ success: true })
})

// Set visibility (open / link / private)
tablesWriteRoutes.patch('/tables/:id/visibility', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()
  const { visibility } = c.req.query()

  const valid = ['open', 'link', 'private']
  if (!valid.includes(visibility)) {
    return c.json({ error: 'visibility must be: open, link, or private' }, 400)
  }

  const result = db.prepare('UPDATE tables SET visibility = ?, updated_at = date(\'now\') WHERE id = ?')
    .run(visibility, id)

  if (result.changes === 0) return c.json({ error: 'Table not found' }, 404)
  return c.json({ success: true, id, visibility })
})

// ─── Helpers ───

export function extractTCO(rowData) {
  const tco = rowData?.tco || rowData?.TCO || {}
  const impl = Number(tco.implementation) || 0
  const lic = Number(tco.license_annual) || 0
  const infra = Number(tco.infrastructure_annual) || 0
  const train = Number(tco.training) || 0
  const support = Number(tco.support_annual) || 0
  const hidden = Number(tco.hidden?.total) || 0

  const annual = lic + infra + support
  return {
    tco_1y: impl + annual + train + hidden || null,
    tco_3y: impl + annual * 3 + train + hidden || null,
    tco_5y: impl + annual * 5 + train + hidden || null,
    currency: tco.currency || null
  }
}

// POST /tables/:id/decision-tags — save decision tags + note
tablesWriteRoutes.post('/tables/:id/decision-tags', async (c) => {
  const db = c.get('db')
  if (!db) return c.json({ error: 'DB not available' }, 500)
  const { id } = c.req.param()
  const body = await c.req.json()
  const { tags, note, winner, score, tokens } = body

  // Use INSERT OR REPLACE (table has UNIQUE on table_id)
  db.prepare(`INSERT OR REPLACE INTO decision_tags (table_id, tags, note, winner, score, tokens_input, tokens_output, decided_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
      id,
      JSON.stringify(tags || []),
      note || '',
      winner || null,
      score || null,
      tokens?.input || 0,
      tokens?.output || 0
    )

  return c.json({ ok: true, table_id: id })
})

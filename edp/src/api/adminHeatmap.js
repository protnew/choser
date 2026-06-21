/**
 * Admin Sensitivity Heatmap API
 *
 * GET /admin/heatmap/:tableId — returns heatmap data showing how
 * changing each criterion weight affects each object score.
 *
 * Delta = score_with_perturbed_weight - base_score
 * Perturbation: increase target criterion weight by 10% of its current value,
 * then proportionally rescale all weights so they still sum to the original total.
 */
import { Hono } from 'hono'

export const heatmapRoutes = new Hono()

/**
 * Extract numeric value from a cell.
 * Handles: number, string number, {value, grade} objects.
 */
function cellValue (raw) {
  if (raw == null) return 0
  if (typeof raw === 'number') return raw
  if (typeof raw === 'object') {
    const g = parseFloat(raw.grade)
    if (!isNaN(g)) return g
    const v = parseFloat(raw.value)
    if (!isNaN(v)) return v
    return 0
  }
  const n = parseFloat(raw)
  return isNaN(n) ? 0 : n
}

/**
 * Extract object name from a row.
 */
function objectName (row) {
  return row['Название'] || row['name'] || row['Объект'] || Object.values(row)[0] || '?'
}

/**
 * Min-max normalise an array of numbers to [0, 1].
 * If all values equal, returns 0.5 for each.
 */
function minMaxNorm (values) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 0.5)
  return values.map(v => (v - min) / (max - min))
}

/**
 * Compute weighted utility scores for all rows.
 * @param {Array} criteria - array of {key, weight} objects
 * @param {Array} rows     - array of parsed row objects
 * @returns {{ name: string, score: number }[]}
 */
function computeScores (criteria, rows) {
  // 1. Collect raw values per criterion
  const rawMatrix = criteria.map(col => rows.map(row => cellValue(row[col.key])))

  // 2. Normalise each column to [0, 1]
  const normMatrix = rawMatrix.map(minMaxNorm)

  // 3. Normalise weights to sum to 1
  const totalW = criteria.reduce((s, c) => s + c.weight, 0) || 1

  // 4. Compute weighted score per row (scaled 0–100)
  return rows.map((_row, ri) => {
    let score = 0
    for (let ci = 0; ci < criteria.length; ci++) {
      const w = criteria[ci].weight / totalW
      score += normMatrix[ci][ri] * w
    }
    return { name: objectName(rows[ri]), score: score * 100 }
  })
}

// ───────────────────────────────────────────────────────
// GET /admin/heatmap/:tableId
// ───────────────────────────────────────────────────────
heatmapRoutes.get('/admin/heatmap/:tableId', async (c) => {
  const db = c.get('db')
  const tableId = c.req.param('tableId')

  // 1. Load table meta
  const table = db
    .prepare("SELECT id, title FROM tables WHERE id = ? AND state != 'deleted'")
    .get(tableId)
  if (!table) {
    return c.json({ error: 'Table not found' }, 404)
  }

  // 2. Load column definitions
  const colRow = db
    .prepare('SELECT definition FROM columns WHERE table_id = ?')
    .get(tableId)
  if (!colRow) {
    return c.json({ error: 'No columns defined' }, 404)
  }

  let allColumns
  try {
    allColumns = JSON.parse(colRow.definition)
  } catch {
    return c.json({ error: 'Invalid column definition' }, 500)
  }

  // Filter to criteria with positive weight (skip zero-weight / display-only)
  const criteria = allColumns.filter(col => col.weight > 0 && col.key)
  if (criteria.length === 0) {
    return c.json({ error: 'No weighted criteria found' }, 400)
  }

  // 3. Load rows
  const rowRows = db
    .prepare('SELECT data FROM rows WHERE table_id = ?')
    .all(tableId)
  if (!rowRows.length) {
    return c.json({ error: 'No rows found' }, 404)
  }

  const rows = rowRows
    .map(r => { try { return JSON.parse(r.data) } catch { return null } })
    .filter(Boolean)
  if (!rows.length) {
    return c.json({ error: 'No valid rows' }, 404)
  }

  // 4. Compute base scores
  const baseResults = computeScores(criteria, rows)
  const baseScores = {}
  for (const r of baseResults) {
    baseScores[r.name] = +r.score.toFixed(2)
  }

  // 5. Sensitivity: perturb each criterion weight by +10%
  const heatmap = []
  const PERTURBATION = 0.10 // 10% relative increase

  for (const target of criteria) {
    // Build perturbed criteria: increase target weight by 10%
    const perturbed = criteria.map(col => {
      if (col.key === target.key) {
        return { ...col, weight: col.weight * (1 + PERTURBATION) }
      }
      return { ...col }
    })

    // Rescale so total weight stays the same as original
    const origTotal = criteria.reduce((s, c) => s + c.weight, 0)
    const perturbedTotal = perturbed.reduce((s, c) => s + c.weight, 0)
    if (perturbedTotal > 0) {
      const scale = origTotal / perturbedTotal
      for (const pc of perturbed) {
        pc.weight *= scale
      }
    }

    const perturbedResults = computeScores(perturbed, rows)

    for (let i = 0; i < perturbedResults.length; i++) {
      const delta = +(perturbedResults[i].score - baseResults[i].score).toFixed(2)
      heatmap.push({
        criterion: target.title,
        object: perturbedResults[i].name,
        delta
      })
    }
  }

  // 6. Build response
  const objectNames = baseResults.map(r => r.name)
  const criterionNames = criteria.map(c => c.title)

  return c.json({
    tableId: table.id,
    title: table.title,
    criteria: criterionNames,
    objects: objectNames,
    heatmap,
    baseScores
  })
})

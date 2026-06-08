/**
 * Seed — import backup/seed_2026-04-30.json into running Choser EDP
 * Usage: node scripts/seed-backup.js
 * 
 * This imports via the REST API so the running server isn't interrupted.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const SEED_FILE = resolve(__dir, '../../backup/seed_2026-04-30.json')
const BASE_URL = process.env.BASE_URL || 'http://localhost:3002'

console.log(`Seed file: ${SEED_FILE}`)
console.log(`Target: ${BASE_URL}`)

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf-8'))

// Build lookup maps
const columnsMap = new Map()
for (const col of seed.columns || []) {
  // col: { table_id, definition (string or object) }
  const def = typeof col.definition === 'string' ? JSON.parse(col.definition) : col.definition
  columnsMap.set(String(col.table_id), def)
}

const rowsMap = new Map()
for (const row of seed.rows || []) {
  const tid = String(row.table_id)
  if (!rowsMap.has(tid)) rowsMap.set(tid, [])
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  rowsMap.get(tid).push(data)
}

// Import tables in batches
const tables = seed.tables || []
const BATCH_SIZE = 10
let imported = 0
let errors = 0

for (let i = 0; i < tables.length; i += BATCH_SIZE) {
  const batch = tables.slice(i, i + BATCH_SIZE)
  
  const promises = batch.map(async (table) => {
    const id = String(table.id)
    const cols = columnsMap.get(id) || null
    const rows = rowsMap.get(id) || []

    const payload = {
      id,
      title: table.title || `Table ${id}`,
      description: table.description || '',
      columns: cols,
      data: rows
    }

    try {
      const res = await fetch(`${BASE_URL}/v1/api/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const text = await res.text()
        return { ok: false, id, error: `${res.status}: ${text.slice(0, 100)}` }
      }

      return { ok: true, id }
    } catch (err) {
      return { ok: false, id, error: err.message }
    }
  })

  const results = await Promise.all(promises)

  for (const r of results) {
    if (r.ok) {
      imported++
    } else {
      errors++
      if (errors <= 5) console.error(`  ✗ table ${r.id}: ${r.error}`)
    }
  }

  process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, tables.length)}/${tables.length} (${imported} ok, ${errors} err)`)
}

console.log(`\n\nDone: ${imported} tables imported, ${errors} errors`)

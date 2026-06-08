/**
 * Seed script — imports tables from backup JSON into SQLite
 * Usage: node scripts/seed.js backup/seed_2026-04-30.json
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dir = dirname(fileURLToPath(import.meta.url))
const DB_PATH = resolve(__dir, '../data/choser.db')
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const SEED_FILE = process.argv[2]

if (!SEED_FILE) {
  console.error('Usage: node seed.js <path-to-seed.json>')
  console.error('Example: node seed.js ../backup/seed_2026-04-30.json')
  process.exit(1)
}

console.log(`Seeding from: ${SEED_FILE}`)

const seed = JSON.parse(readFileSync(resolve(__dir, SEED_FILE), 'utf-8'))

// Apply schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    link TEXT,
    price REAL DEFAULT 0,
    views INTEGER DEFAULT 0,
    author TEXT DEFAULT 'Expert',
    state TEXT DEFAULT 'открытая',
    param_count INTEGER DEFAULT 0,
    object_count INTEGER DEFAULT 0,
    tags TEXT,
    description TEXT,
    utility REAL DEFAULT 0,
    utility_price REAL DEFAULT 0,
    weights TEXT,
    updated_at TEXT DEFAULT (date('now')),
    created_at INTEGER DEFAULT (unixepoch()),
    owner_id INTEGER,
    org_id TEXT DEFAULT 'default'
  );

  CREATE TABLE IF NOT EXISTS columns (
    table_id TEXT NOT NULL PRIMARY KEY REFERENCES tables(id) ON DELETE CASCADE,
    definition TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    tco_1y REAL,
    tco_3y REAL,
    tco_5y REAL,
    irr_3y REAL,
    irr_5y REAL,
    roic_3y REAL,
    roic_5y REAL,
    currency TEXT DEFAULT 'RUB',
    tco_calculated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  );
`)

// Seed tables
let tableCount = 0
let rowCount = 0
let colCount = 0

const insertTable = db.prepare(`INSERT OR REPLACE INTO tables
  (id, title, link, price, views, author, state, param_count, object_count, tags, description, utility, utility_price, weights, org_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'default')`)

const insertColumns = db.prepare('INSERT OR REPLACE INTO columns (table_id, definition) VALUES (?, ?)')
const insertRow = db.prepare('INSERT INTO rows (table_id, data) VALUES (?, ?)')

const seedTransaction = db.transaction(() => {
  if (Array.isArray(seed)) {
    // Array of table objects
    for (const table of seed) {
      if (!table.id || !table.title) continue

      insertTable.run(
        table.id,
        table.title,
        table.link || null,
        table.price || 0,
        table.views || 0,
        table.author || 'Expert',
        table.state || 'открытая',
        table.param_count || table.columns?.length || 0,
        table.object_count || table.data?.length || table.rows?.length || 0,
        table.tags || null,
        table.description || null,
        table.utility || 0,
        table.utility_price || 0,
        table.weights || null
      )

      if (table.columns) {
        insertColumns.run(table.id, JSON.stringify(table.columns))
        colCount++
      }

      const rows = table.data || table.rows || []
      for (const row of rows) {
        const data = typeof row === 'string' ? row : JSON.stringify(row)
        insertRow.run(table.id, data)
        rowCount++
      }

      tableCount++
    }
  } else if (seed.tables) {
    // Object with tables array
    for (const table of seed.tables) {
      if (!table.id || !table.title) continue

      insertTable.run(
        table.id,
        table.title,
        table.link || null,
        table.price || 0,
        table.views || 0,
        table.author || 'Expert',
        table.state || 'открытая',
        table.param_count || 0,
        table.object_count || 0,
        table.tags || null,
        table.description || null,
        table.utility || 0,
        table.utility_price || 0,
        table.weights || null
      )

      if (table.columns) {
        insertColumns.run(table.id, JSON.stringify(table.columns))
        colCount++
      }

      const rows = table.data || table.rows || []
      for (const row of rows) {
        const data = typeof row === 'string' ? row : JSON.stringify(row)
        insertRow.run(table.id, data)
        rowCount++
      }

      tableCount++
    }
  }
})

seedTransaction()

console.log(`Seeded: ${tableCount} tables, ${colCount} column sets, ${rowCount} rows`)
console.log(`Database: ${DB_PATH}`)

db.close()

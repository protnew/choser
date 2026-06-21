/**
 * Database — better-sqlite3 singleton
 * Single synchronous connection. Thread-safe by design.
 */
import Database from 'better-sqlite3'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Load .env if present
try {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim()
    }
  }
} catch { /* .env not found — use system env */ }

let _db = null

export function initDb(dbPath) {
  if (_db) return _db

  // Ensure directory exists
  mkdirSync(dirname(dbPath), { recursive: true })

  _db = new Database(dbPath)

  // Performance pragmas
  _db.pragma('journal_mode = WAL')        // Concurrent reads, serialized writes
  _db.pragma('synchronous = NORMAL')       // Safe + fast
  _db.pragma('foreign_keys = ON')
  _db.pragma('temp_store = MEMORY')
  _db.pragma('mmap_size = 268435456')      // 256MB memory-mapped I/O
  _db.pragma('cache_size = -8000')         // 8MB page cache

  return _db
}

export function getDb() {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.')
  return _db
}

export function closeDb() {
  if (_db) {
    _db.close()
    _db = null
  }
}

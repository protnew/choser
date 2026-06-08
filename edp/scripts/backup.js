/**
 * Standalone backup script: node scripts/backup.js
 * Creates a timestamped backup of choser.db with rotation
 */
import Database from 'better-sqlite3'
import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

const DB_PATH = process.env.DB_PATH || './data/choser.db'
const BACKUP_DIR = process.env.BACKUP_DIR || './backup'
const MAX_DAILY = 7
const MAX_WEEKLY = 4
const MAX_MONTHLY = 12

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function rotateBackups(dir, maxFiles, prefix) {
  if (!existsSync(dir)) return

  const files = readdirSync(dir)
    .filter(f => f.startsWith(prefix))
    .map(f => ({ name: f, time: statSync(join(dir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time)

  // Keep max files, delete rest
  for (let i = maxFiles; i < files.length; i++) {
    unlinkSync(join(dir, files[i].name))
  }
}

async function main() {
  ensureDir(BACKUP_DIR)

  const now = new Date()
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupFile = join(BACKUP_DIR, `choser-${ts}.db`)

  console.log(`Backing up ${DB_PATH} → ${backupFile}`)

  const db = new Database(DB_PATH, { readonly: true })

  await db.backup(backupFile)
  db.close()

  const size = statSync(backupFile).size
  console.log(`Backup done: ${(size / 1024 / 1024).toFixed(2)} MB`)

  // Rotation
  rotateBackups(BACKUP_DIR, MAX_DAILY, 'choser-')
  console.log('Rotation complete')
}

main().catch(err => {
  console.error('Backup failed:', err)
  process.exit(1)
})

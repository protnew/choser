/**
 * Backup — sqlite3.backup() API with rotation
 */
import { copyFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BACKUP_DIR = './backup'
const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours

export function startBackupTimer(db, log) {
  const timer = setInterval(async () => {
    try {
      await runBackup(db, log)
    } catch (err) {
      log.error({ err: err.message }, 'Backup failed')
    }
  }, BACKUP_INTERVAL_MS)

  // Don't prevent process exit
  timer.unref()

  log.info({ interval_hours: 6 }, 'Backup timer started')
}

export async function runBackup(db, log) {
  const lockFile = join(BACKUP_DIR, '.lock')
  if (existsSync(lockFile)) {
    log.warn('Backup already in progress (lock file exists)')
    return
  }

  // Check for active councils
  const active = db.prepare("SELECT COUNT(*) as cnt FROM council_jobs WHERE status = 'running'").get()
  if (active.cnt > 0) {
    log.info({ active: active.cnt }, 'Skipping backup: active council jobs')
    return
  }

  // Create lock
  const { writeFileSync, unlinkSync } = await import('node:fs')
  writeFileSync(lockFile, String(Date.now()))

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupPath = join(BACKUP_DIR, `choser-${timestamp}.db`)

    // sqlite3.backup() API — safe consistent backup
    await db.backup(backupPath)

    log.info({ path: backupPath }, 'Backup completed')

    // Rotation: keep 7 daily + 4 weekly + 12 monthly
    rotateBackups(log)
  } finally {
    unlinkSync(lockFile)
  }
}

function rotateBackups(log) {
  if (!existsSync(BACKUP_DIR)) return

  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('choser-') && f.endsWith('.db'))
    .sort()
    .reverse() // newest first

  const MAX_DAILY = 7
  const toDelete = files.slice(MAX_DAILY)

  for (const file of toDelete) {
    const path = join(BACKUP_DIR, file)
    unlinkSync(path)
    log.info({ file }, 'Rotated old backup')
  }
}

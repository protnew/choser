#!/bin/sh
# Auto-backup script for Choser DB
# Runs via cron: every 6 hours dump + weekly cleanup
# Backups older than 30 days are deleted

BACKUP_DIR="/app/backup"
DB_FILE="/app/data/choser.db"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%S")

# Only backup if DB exists and is non-empty
if [ -f "$DB_FILE" ] && [ -s "$DB_FILE" ]; then
  # Method 1: sqlite3 dump (text, portable, survives WAL issues)
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_FILE" ".dump" > "$BACKUP_DIR/choser-${TIMESTAMP}.sql" 2>/dev/null
    # Compress SQL dump
    gzip -f "$BACKUP_DIR/choser-${TIMESTAMP}.sql" 2>/dev/null
  fi

  # Method 2: binary copy (after checkpoint)
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null
  fi
  cp "$DB_FILE" "$BACKUP_DIR/choser-${TIMESTAMP}.db" 2>/dev/null

  echo "[backup] Created backup at $TIMESTAMP"
else
  echo "[backup] No database to backup"
fi

# Cleanup: delete backups older than 30 days
find "$BACKUP_DIR" -name "choser-*.db" -mtime +30 -delete 2>/dev/null
find "$BACKUP_DIR" -name "choser-*.sql.gz" -mtime +30 -delete 2>/dev/null

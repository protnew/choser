#!/bin/sh
# Choser EDP entrypoint: fix perms + auto-restore + cron + supervisord

# Fix volume ownership
chown -R choser:choser /app/data /app/backup 2>/dev/null

# If no DB exists, restore from latest backup
if [ ! -f /app/data/choser.db ] || [ ! -s /app/data/choser.db ]; then
  echo "[entrypoint] No database found, restoring from latest backup..."
  LATEST=$(ls -t /app/backup/choser-*.db 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    cp "$LATEST" /app/data/choser.db
    chown choser:choser /app/data/choser.db
    echo "[entrypoint] Restored from $LATEST"
  else
    echo "[entrypoint] No backup found, starting with empty database"
  fi
fi

# Start cron daemon for auto-backups
crond -b -l 8 2>/dev/null
echo "[entrypoint] Cron started (backup every 6h)"

# Symlink tests into public for HTTP access
ln -sf /tests /app/public/tests 2>/dev/null

# Start supervisord
exec supervisord -c /etc/supervisor.d/choser.ini -n

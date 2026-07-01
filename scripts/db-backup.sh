#!/usr/bin/env bash
# Daily Postgres backup for vrebaj-popust.
#
# The production DB is self-hosted on the VPS (localhost:5432), so it has no
# managed backups — this script provides them. It reads the DB credentials from
# the app's .env at runtime (nothing secret is stored here), dumps the database
# gzipped, and prunes anything older than RETENTION_DAYS.
#
# Deployed copy runs from /usr/local/bin/vrebaj-db-backup.sh via cron:
#   30 3 * * * /usr/local/bin/vrebaj-db-backup.sh >> /var/log/vrebaj-backup.log 2>&1
#
# NOTE: these backups live on the same droplet. For protection against total VPS
# loss, also enable DigitalOcean droplet Backups (control panel) and/or ship these
# dumps off-site (e.g. DO Spaces / S3).
set -euo pipefail

BACKUP_DIR=/var/backups/vrebaj
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"
DB_URL=$(grep -m1 '^DATABASE_URL=' /var/www/vrebaj-popust/.env | cut -d= -f2- | tr -d '"')
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/vrebaj_popust-$STAMP.sql.gz"

pg_dump "$DB_URL" | gzip > "$OUT"
find "$BACKUP_DIR" -name 'vrebaj_popust-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "$(date -Is) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"

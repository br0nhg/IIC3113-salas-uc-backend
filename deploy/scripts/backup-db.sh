#!/usr/bin/env bash
set -euo pipefail

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
backup_dir=${BACKUP_DIR:-"$project_dir/backups"}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_dir/salas-uc-$timestamp.sql.gz"

umask 077
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
temporary=$(mktemp "$backup_dir/.salas-uc-$timestamp.XXXXXX.sql")

cleanup() {
  rm -f -- "$temporary"
}
trap cleanup EXIT HUP INT TERM

cd "$project_dir"
docker compose -f compose.production.yml exec -T db sh -c \
  'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --clean --if-exists --no-owner --no-password' \
  > "$temporary"
gzip -9 -c "$temporary" > "$target"
chmod 600 "$target"
printf '%s\n' "$target"

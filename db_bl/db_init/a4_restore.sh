#!/bin/bash
set -e

echo "Restoring database from backup..."

# pg_restore --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" /docker-entrypoint-initdb.d/BLPVZ.backup
pg_restore --username="$POSTGRES_USER" --dbname="bl_main" /docker-entrypoint-initdb.d/BL_MAIN.backup

echo "Database restore finished!"
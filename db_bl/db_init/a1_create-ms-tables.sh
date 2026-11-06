#!/bin/bash

set -e

echo "Создание дополнительных баз данных для микросервисов..."

# Создаём базу данных для bl_main
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE bl_main;
    GRANT ALL PRIVILEGES ON DATABASE bl_main TO $POSTGRES_USER;
EOSQL

echo "Дополнительные базы данных созданы!"
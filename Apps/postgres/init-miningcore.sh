#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE USER miningcore WITH PASSWORD 'miningcore';
  CREATE DATABASE miningcore OWNER miningcore;
  GRANT ALL PRIVILEGES ON DATABASE miningcore TO miningcore;
EOSQL

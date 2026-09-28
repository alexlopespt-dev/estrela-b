#!/bin/sh
# Testa as regras de acesso num Postgres local (sem tocar no Supabase).
# Requer: postgresql (psql). Uso: PGHOST=/tmp PGPORT=55432 ./supabase/tests/correr.sh
set -e
D=$(dirname "$0")
psql -U postgres -qc "drop database if exists rls_teste" -c "create database rls_teste" >/dev/null
psql -U postgres -d rls_teste -q -v ON_ERROR_STOP=1 -f "$D/stub_supabase.sql" $(ls "$D"/../migrations/*.sql | sed 's/^/-f /') -f "$D/rls_test.sql" 2>&1 | grep -E "FALHOU|PASSARAM|ERROR"

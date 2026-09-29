#!/bin/sh
# Testa as regras de acesso num Postgres local (sem tocar no Supabase).
# Requer: postgresql (psql). Uso: PGHOST=/tmp PGPORT=55432 ./supabase/tests/correr.sh
# Sai com erro (código 1) se alguma verificação falhar — usado também pelo GitHub (.github/workflows/testes.yml).
D=$(dirname "$0")
psql -U postgres -qc "drop database if exists rls_teste" -c "create database rls_teste" >/dev/null || exit 1
OUT=$(psql -U postgres -d rls_teste -q -v ON_ERROR_STOP=1 -f "$D/stub_supabase.sql" $(ls "$D"/../migrations/*.sql | sed 's/^/-f /') -f "$D/rls_test.sql" 2>&1)
echo "$OUT" | grep -E "FALHOU|PASSARAM|ERROR|Problemas|RLS OK"
echo "$OUT" | grep -q "TODOS OS TESTES PASSARAM" || exit 1

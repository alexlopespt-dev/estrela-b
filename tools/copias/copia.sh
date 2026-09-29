#!/bin/sh
# Cópia de segurança da base de dados da versão para clubes (Supabase). Usado pelo GitHub todos os dias
# (.github/workflows/copia-diaria.yml) e pode correr à mão. Não altera nada na base de dados (só lê).
#   DB_URL  ligação à base de dados (no GitHub vem do Secret SUPABASE_DB_URL — nunca no código)
#   OUT     pasta onde fica a cópia (por omissão: copia)
# Resultado: public.sql (dados, com os gatilhos desligados no restauro), esquema.sql (estrutura, para consulta),
# utilizadores.csv (id, email, nome das contas), ficheiros.csv (lista das fotos) e contagens.json (para o restauro).
set -eu
: "${DB_URL:?falta DB_URL}"
OUT=${OUT:-copia}
mkdir -p "$OUT"
pg_dump "$DB_URL" --data-only --schema=public --no-owner --no-privileges --disable-triggers \
  --exclude-table-data=public.roles --exclude-table-data=public.role_perms -f "$OUT/public.sql"
pg_dump "$DB_URL" --schema-only --schema=public --no-owner --no-privileges -f "$OUT/esquema.sql"
psql "$DB_URL" -qAt -v ON_ERROR_STOP=1 -c "\copy (select id, email, raw_user_meta_data from auth.users order by id) to '$OUT/utilizadores.csv' csv"
psql "$DB_URL" -qAt -v ON_ERROR_STOP=1 -c "\copy (select name from storage.objects where bucket_id = 'equipa' order by name) to '$OUT/ficheiros.csv' csv"
Q=$(psql "$DB_URL" -qAt -v ON_ERROR_STOP=1 -f "$(dirname "$0")/contagens.sql")
psql "$DB_URL" -qAt -v ON_ERROR_STOP=1 -c "$Q" > "$OUT/contagens.json"
date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/feita_em.txt"
echo "Cópia em $OUT: $(cat "$OUT/contagens.json")"

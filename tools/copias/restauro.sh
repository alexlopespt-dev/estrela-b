#!/bin/sh
# Teste de restauro: repõe uma cópia (tools/copias/copia.sh) numa base de dados Postgres VAZIA e de testes,
# e confirma que ficou tudo: as mesmas contagens por tabela e as regras de acesso (RLS) ligadas.
# Nunca apontar para a produção. Usado pelo GitHub uma vez por mês (.github/workflows/restauro-mensal.yml).
#   RESTORE_URL  base de dados de testes, vazia (superutilizador)
#   DIR          pasta da cópia
set -eu
: "${RESTORE_URL:?falta RESTORE_URL}"; : "${DIR:?falta DIR}"
R=$(cd "$(dirname "$0")/../.." && pwd)
case "$RESTORE_URL" in *supabase.co*|*supabase.com*) echo "RESTORE_URL aponta para a Supabase — o restauro é só para uma base de testes." >&2; exit 2;; esac
MIG=$(ls "$R"/supabase/migrations/*.sql | sed 's/^/-f /')
# shellcheck disable=SC2086
psql "$RESTORE_URL" -q -v ON_ERROR_STOP=1 -c "set client_min_messages=warning" -f "$R/supabase/tests/stub_supabase.sql" $MIG >/dev/null
psql "$RESTORE_URL" -q -v ON_ERROR_STOP=1 -c "\copy auth.users (id, email, raw_user_meta_data) from '$DIR/utilizadores.csv' csv"
psql "$RESTORE_URL" -q -v ON_ERROR_STOP=1 -f "$DIR/public.sql" >/dev/null
Q=$(psql "$RESTORE_URL" -qAt -v ON_ERROR_STOP=1 -f "$R/tools/copias/contagens.sql")
psql "$RESTORE_URL" -qAt -v ON_ERROR_STOP=1 -c "$Q" > "$DIR/contagens_restauro.json"
python3 - "$DIR/contagens.json" "$DIR/contagens_restauro.json" <<'PY'
import json, sys
a, b = (json.load(open(f)) for f in sys.argv[1:3])
dif = {k: (a.get(k), b.get(k)) for k in set(a) | set(b) if a.get(k) != b.get(k)}
if dif:
    sys.exit("RESTAURO FALHOU — contagens diferentes (cópia, restauro): " + json.dumps(dif))
print("Contagens iguais:", json.dumps(a))
PY
psql "$RESTORE_URL" -q -v ON_ERROR_STOP=1 -f "$R/supabase/verificar_rls.sql"
echo "RESTAURO OK"

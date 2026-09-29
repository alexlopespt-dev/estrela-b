#!/usr/bin/env bash
# Compila a versão de teste e corre todos os testes (Playwright + Chromium) e a verificação de chaves secretas.
# Requisitos: pip install playwright && python3 -m playwright install chromium
# Sai com erro se algum teste falhar (usado também pelo GitHub, .github/workflows/testes.yml).
cd "$(dirname "$0")/.." || exit 1
python3 build.py teste || exit 1
falhas=0
python3 tools/seguranca/verificar_chaves.py || falhas=$((falhas+1))
for t in tests/test*.py; do
  r=$(timeout 1200 python3 "$t" 2>&1 | tail -1)
  echo "$(basename "$t"): $r"
  if ! echo "$r" | grep -qE "ERRORS?:? ?\[\]|ERR \[\]|403"; then falhas=$((falhas+1)); fi
done
echo "Testes com problemas: $falhas"
[ "$falhas" -eq 0 ]

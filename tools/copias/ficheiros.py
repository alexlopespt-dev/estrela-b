#!/usr/bin/env python3
"""Copia as fotos do armazenamento "equipa" da Supabase para PASTA/ficheiros/ (usa a lista ficheiros.csv da cópia).
Precisa de SUPABASE_URL e SUPABASE_SERVICE_KEY (chave de serviço: só nos Secrets do GitHub, nunca no código)."""
import os, sys, csv, urllib.request, urllib.parse
pasta = sys.argv[1] if len(sys.argv) > 1 else "copia"
url, key = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SERVICE_KEY"]
nomes = [r[0] for r in csv.reader(open(os.path.join(pasta, "ficheiros.csv"))) if r]
ok = falhas = 0
for n in nomes:
    if ".." in n or n.startswith("/"): continue
    dest = os.path.join(pasta, "ficheiros", n); os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(f"{url}/storage/v1/object/equipa/{urllib.parse.quote(n)}",
                                 headers={"Authorization": "Bearer " + key, "apikey": key})
    try:
        with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f: f.write(r.read()); ok += 1
    except Exception as e:
        falhas += 1; print("falhou:", n, e)
print(f"Fotos copiadas: {ok} de {len(nomes)}")
sys.exit(1 if falhas else 0)

#!/usr/bin/env python3
"""Procura chaves secretas no código e nos ficheiros que vão para o site. Sai com erro se encontrar alguma.
A única chave que pode estar no código é a pública da Supabase ("sb_publishable_…" ou uma anon JWT com role "anon").
Corre nos testes automáticos (GitHub) e em ./tests/correr_testes.sh."""
import os, re, sys, base64, json
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PASTAS = ["src", "dist", "config", "supabase", "tools", "tests", ".github", "build.py"]
IGNORAR = {"verificar_chaves.py"}
PADROES = [
    (r"sb_secret_[A-Za-z0-9_-]{10,}", "chave secreta da Supabase (sb_secret_)"),
    (r"postgres(?:ql)?://[^:/\s\"'@]+:[^@\s\"'{}$]{6,}@[^\s\"']+", "ligação à base de dados com palavra-passe"),
    (r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", "chave privada"),
    (r"sntrys_[A-Za-z0-9_=+/-]{20,}", "token do Sentry (sntrys_)"),
    (r"AKIA[0-9A-Z]{16}", "chave da AWS"),
    (r"gh[pousr]_[A-Za-z0-9]{30,}", "token do GitHub"),
    (r"xox[baprs]-[A-Za-z0-9-]{10,}", "token do Slack"),
    (r"re_[A-Za-z0-9]{8}_[A-Za-z0-9]{20,}", "chave da Resend"),
]
JWT = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")

def jwt_role(tok):
    try:
        p = tok.split(".")[1]; p += "=" * (-len(p) % 4)
        return json.loads(base64.urlsafe_b64decode(p)).get("role")
    except Exception:
        return None

def ficheiros():
    for p in PASTAS:
        a = os.path.join(ROOT, p)
        if os.path.isfile(a): yield a; continue
        for d, _, fs in os.walk(a):
            if "/node_modules" in d or "/__pycache__" in d or "/capturas" in d: continue
            for f in fs:
                if f in IGNORAR or f.endswith((".png", ".jpg", ".jpeg", ".webp", ".mp4", ".pptx", ".pdf", ".gpg")): continue
                yield os.path.join(d, f)

def main():
    achados = []
    for f in ficheiros():
        try: txt = open(f, encoding="utf-8", errors="ignore").read()
        except Exception: continue
        for rx, nome in PADROES:
            for m in re.finditer(rx, txt):
                achados.append((f, nome, m.group(0)[:24] + "…"))
        for m in JWT.finditer(txt):
            r = jwt_role(m.group(0))
            if r and r != "anon":
                achados.append((f, f"JWT com role '{r}' (ex.: service_role)", m.group(0)[:24] + "…"))
    if achados:
        for f, nome, amostra in achados:
            print(f"CHAVE SECRETA? {os.path.relpath(f, ROOT)}: {nome} ({amostra})")
        sys.exit(1)
    print("Sem chaves secretas no código (só a chave pública da Supabase).")

if __name__ == "__main__":
    main()

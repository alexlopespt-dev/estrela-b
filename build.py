#!/usr/bin/env python3
"""Compila a app da equipa técnica num único ficheiro HTML.

Uso:
  python3 build.py            -> gera as 3 versões em dist/
  python3 build.py online     -> dist/estrela-tecnico-app.html (sem dados; usa a base de dados do artifact no Claude)
  python3 build.py offline    -> dist/index.html (com dados iniciais e fotos; guarda no browser; para Netlify)
  python3 build.py clubes     -> dist/clubes/ (versão para outros clubes, PRODUÇÃO: index.html + _headers de segurança)
  python3 build.py clubes-testes -> dist/clubes-testes/ (a mesma versão ligada ao projeto Supabase de TESTES, com dados fictícios)
  python3 build.py atleta     -> dist/atleta/ (app do atleta do Estrela B: bem-estar, PSE, agenda, convocatória; + _headers)
  python3 build.py teste      -> dist/app_local.html + dist/app_db.html + dist/app_clubes.html (usados pelos testes)

A versão para clubes não leva nada do Estrela: sem dados, sem fotos, sem exercícios/modelo/emblemas/calendário
(src/estrela.js é trocado por src/clubes.js) e com um emblema genérico. Os endereços/chaves públicas dos dois
ambientes (produção e testes) estão em config/ambientes.json — nunca chaves secretas (ver SEGURANCA.md).
Cada pasta de clubes leva um _headers (HTTPS obrigatório/HSTS, CSP, etc.): no Netlify arrasta-se a PASTA inteira.
"""
import sys, json, os
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src"); DATA = os.path.join(ROOT, "data"); DIST = os.path.join(ROOT, "dist")
JS_ORDER = ["core.js","vec.js","views1.js","views2.js","views3.js","cfg.js","draw.js","quick.js","print.js","actions.js","who.js","bp.js","conv.js","atapp.js","tat.js","@edicao","migr.js","mon.js","prejogo.js","painel.js","sync.js","boot.js"]

# ambientes da versão para clubes (valores públicos: a segurança está nas regras RLS da base de dados)
AMB = json.load(open(os.path.join(ROOT, "config", "ambientes.json")))
SB_KEY = AMB["producao"]["sb_key"]
SB_TESTE = "https://sb.teste"   # servidor simulado nos testes (tests/sb_falso.py)
# ambiente usado pelos testes automáticos: Supabase e Sentry simulados, com a faixa "ambiente de testes"
ENV_TESTE = {"nome": "testes", "sb_url": SB_TESTE, "sb_key": SB_KEY, "sentry_dsn": "https://chavepublica@sentry.teste/42", "site": ""}

def env_of(nome):
    e = dict(AMB[nome]); e["nome"] = nome
    if not e.get("sb_url") or not e.get("sb_key"):
        sys.exit(f"config/ambientes.json: falta sb_url/sb_key do ambiente '{nome}' (ver SEGURANCA.md).")
    return e

def headers_for(env):
    """Cabeçalhos de segurança do site (ficheiro _headers do Netlify). A app é um único HTML com o código lá dentro e
    as janelas de impressão também têm um script próprio, por isso script-src precisa de 'unsafe-inline'; o resto fica fechado."""
    from urllib.parse import urlparse
    sb = env["sb_url"].rstrip("/")
    sentry = ""
    if env.get("sentry_dsn"):
        sentry = " https://" + urlparse(env["sentry_dsn"]).hostname
    google = " https://script.google.com https://script.googleusercontent.com"   # monitorização (Google Sheets)
    csp = ("default-src 'self'; "
           f"script-src 'self' 'unsafe-inline'{google}; "
           "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
           "font-src 'self' https://fonts.gstatic.com data:; "
           "img-src 'self' data: blob:; "
           f"connect-src 'self' {sb}{sentry}{google} https://fonts.googleapis.com https://fonts.gstatic.com; "
           "frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; "
           "worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests")
    return ("/*\n"
            f"  Content-Security-Policy: {csp}\n"
            "  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload\n"
            "  X-Content-Type-Options: nosniff\n"
            "  X-Frame-Options: DENY\n"
            "  Referrer-Policy: strict-origin-when-cross-origin\n"
            "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n"
            "  Cross-Origin-Opener-Policy: same-origin-allow-popups\n"
            "  X-Robots-Tag: noindex, nofollow\n"
            "  Cache-Control: no-cache\n")

def generic_crest():
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M50 4 L92 18 V58 C92 88 72 106 50 116 C28 106 8 88 8 58 V18 Z" '
           'fill="#6b1426" stroke="#f2bd4b" stroke-width="5"/><circle cx="50" cy="58" r="21" fill="#fff"/>'
           '<path d="M50 44 l9 6.5 -3.4 10.6 h-11.2 l-3.4 -10.6 z" fill="#2a0a12"/>'
           '<path d="M50 44 V37 M59 50.5 l7 -2.5 M55.6 61.1 l4.4 6 M44.4 61.1 l-4.4 6 M41 50.5 l-7 -2.5" stroke="#2a0a12" stroke-width="2.4"/></svg>')
    import base64
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()

def build(seed, out, edition="estrela", env=None):
    clubes = edition == "clubes"
    if clubes:
        crest = generic_crest(); imgs = {}; opp = {}; vec = {}; mjimg = {}; bpcrest = crest
        app_name, alt = "App da equipa técnica", "Emblema do clube"
    else:
        crest = open(os.path.join(DATA, "emblema.b64")).read()
        imgs = json.load(open(os.path.join(DATA, "exercicios_imagens.json")))
        opp = json.load(open(os.path.join(DATA, "emblemas_adversarios.json")))
        vec = json.load(open(os.path.join(DATA, "exercicios_vetor.json")))
        mjimg = json.load(open(os.path.join(DATA, "modelo_jogo_imagens.json")))
        bpcrest = open(os.path.join(DATA, "emblema_bp.b64")).read().strip()
        app_name, alt = "CF Estrela da Amadora — Equipa B", "Emblema do Estrela da Amadora"
    css = open(os.path.join(SRC, "style.css")).read()
    files = [("clubes.js" if clubes else "estrela.js") if f == "@edicao" else f for f in JS_ORDER]
    js = "\n".join(open(os.path.join(SRC, f)).read() for f in files)
    h = open(os.path.join(SRC, "shell.html")).read().replace("/*CSS*/", css).replace("/*JS*/", js)
    if not clubes:
        h = h.replace("__MODELO__", json.dumps(json.load(open(os.path.join(DATA, "modelo_jogo_2627.json"))), ensure_ascii=False))
    h = (h.replace('"__CREST__"', json.dumps(crest))
          .replace("__CRESTSRC__", crest.strip())
          .replace("__EDITION__", edition)
          .replace("__APPNAME__", app_name).replace("__APPTITLE__", "Equipa técnica" if clubes else "Estrela Técnico").replace("__CRESTALT__", alt)
          .replace("__SBURL__", (env or {}).get("sb_url", "")).replace("__SBKEY__", (env or {}).get("sb_key", ""))
          .replace("__AMBIENTE__", (env or {}).get("nome", "")).replace("__SENTRY__", (env or {}).get("sentry_dsn", ""))
          .replace("__HORBG__", open(os.path.join(DATA, "horario_fundo.b64")).read().strip())
          .replace("__BPCREST__", bpcrest)
          .replace("__EXIMG__", json.dumps(imgs))
          .replace("__EXVEC__", json.dumps(vec, separators=(",", ":")))
          .replace("__MJIMG__", json.dumps(mjimg))
          .replace("__OPPIMG__", json.dumps(opp, ensure_ascii=False))
          .replace("__BUILD__", __import__("datetime").datetime.now(__import__("zoneinfo").ZoneInfo("Europe/Lisbon")).strftime("%d/%m/%Y %H:%M"))
          .replace("__SEED__", json.dumps(seed, ensure_ascii=False) if seed else "null"))
    if clubes and env is ENV_TESTE:   # só na versão dos testes automáticos: acesso ao estado da app a partir dos testes
        h = h.replace("\nsbBoot();", "\nsbBoot(); window.__t={D,SB,meta:()=>meta(),put,del,clone,saveImg,sImgLoad};", 1)
    os.makedirs(DIST, exist_ok=True)
    path = os.path.join(DIST, out)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w").write(h)
    if clubes and env is not ENV_TESTE:
        open(os.path.join(os.path.dirname(path), "_headers"), "w").write(headers_for(env))
    print(f"{out}: {len(h)//1024} KB")

def headers_atleta():
    google = "https://script.google.com https://script.googleusercontent.com"   # script da partilha (dados_app.gs)
    csp = ("default-src 'self'; "
           f"script-src 'self' 'unsafe-inline' {google}; "
           "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; "
           f"img-src 'self' data:; connect-src 'self' {google}; "
           "frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests")
    return ("/*\n"
            f"  Content-Security-Policy: {csp}\n"
            "  Strict-Transport-Security: max-age=63072000; includeSubDomains\n"
            "  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n"
            "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n"
            "  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-cache\n")

def build_atleta():
    """App do atleta (Estrela B): página própria, pequena, pensada para o telemóvel. O link pessoal traz o endereço do
    script e o código do atleta, por isso não há nada de secreto nem de configurável aqui dentro."""
    crest = open(os.path.join(DATA, "emblema.b64")).read().strip()
    d = os.path.join(SRC, "atleta")
    h = open(os.path.join(d, "shell.html")).read()
    h = h.replace("/*CSS*/", open(os.path.join(d, "atleta.css")).read()).replace("/*JS*/", open(os.path.join(d, "atleta.js")).read())
    h = h.replace('"__CREST__"', json.dumps(crest))
    out = os.path.join(DIST, "atleta"); os.makedirs(out, exist_ok=True)
    open(os.path.join(out, "index.html"), "w").write(h)
    open(os.path.join(out, "_headers"), "w").write(headers_atleta())
    print(f"atleta/index.html: {len(h)//1024} KB")

if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "tudo"
    seed_local = json.load(open(os.path.join(DATA, "seed_local.json")))
    if what in ("online", "tudo"):  build(None, "estrela-tecnico-app.html")
    if what in ("offline", "tudo"): build(seed_local, "index.html")
    if what in ("clubes", "tudo"): build(None, "clubes/index.html", "clubes", env_of("producao"))
    if what == "clubes-testes" or (what == "tudo" and AMB["testes"].get("sb_url")):
        build(None, "clubes-testes/index.html", "clubes", env_of("testes"))
    if what in ("atleta", "teste", "tudo"): build_atleta()
    if what in ("teste", "tudo"):
        build(seed_local, "app_local.html")
        build(None, "app_db.html")
        build(None, "app_clubes.html", "clubes", ENV_TESTE)

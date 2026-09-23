#!/usr/bin/env python3
"""Compila a app da equipa técnica num único ficheiro HTML.

Uso:
  python3 build.py            -> gera as 3 versões em dist/
  python3 build.py online     -> dist/estrela-tecnico-app.html (sem dados; usa a base de dados do artifact no Claude)
  python3 build.py offline    -> dist/index.html (com dados iniciais e fotos; guarda no browser; para Netlify)
  python3 build.py teste      -> dist/app_local.html + dist/app_db.html (usados pelos testes)
"""
import sys, json, os
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src"); DATA = os.path.join(ROOT, "data"); DIST = os.path.join(ROOT, "dist")
JS_ORDER = ["core.js","views1.js","views2.js","views3.js","cfg.js","draw.js","quick.js","print.js","actions.js","boot.js"]

def build(seed, out):
    crest = open(os.path.join(DATA, "emblema.b64")).read()
    imgs = json.load(open(os.path.join(DATA, "exercicios_imagens.json")))
    css = open(os.path.join(SRC, "style.css")).read()
    js = "\n".join(open(os.path.join(SRC, f)).read() for f in JS_ORDER)
    h = open(os.path.join(SRC, "shell.html")).read().replace("/*CSS*/", css).replace("/*JS*/", js)
    h = (h.replace('"__CREST__"', json.dumps(crest))
          .replace("__EXIMG__", json.dumps(imgs))
          .replace("__SEED__", json.dumps(seed, ensure_ascii=False) if seed else "null"))
    os.makedirs(DIST, exist_ok=True)
    path = os.path.join(DIST, out)
    open(path, "w").write(h)
    print(f"{out}: {len(h)//1024} KB")

if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "tudo"
    seed_local = json.load(open(os.path.join(DATA, "seed_local.json")))
    if what in ("online", "tudo"):  build(None, "estrela-tecnico-app.html")
    if what in ("offline", "tudo"): build(seed_local, "index.html")
    if what in ("teste", "tudo"):
        build(seed_local, "app_local.html")
        build(None, "app_db.html")

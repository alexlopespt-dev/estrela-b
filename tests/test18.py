import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Browser com dados antigos (só os 9 exercícios de exemplo): a atualização exlib129 junta os 129 da biblioteca, uma vez, sem duplicar nem mexer nos existentes.
errs=[]
LSK="estrela-tecnico-v1"
seed=json.load(open(os.path.join(ROOT,"data","seed_local.json")))
old=json.loads(json.dumps(seed))
old["exercises"]={k:v for k,v in old["exercises"].items() if not k.startswith("exi")}
old["exercises"]["ex01"]["name"]="Rondo 4x2 (meu)"
old["exercises"]["ex_meu"]={"name":"Exercício meu","cat":"Tático"}
old["meta"]["mig"]={"cal2627":"2026-09-20","plantel_mon1":"2026-09-23"}
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(800)
    pg.evaluate(f"localStorage.setItem('{LSK}',JSON.stringify({json.dumps(old)}))")
    pg.reload(); pg.wait_for_timeout(1500)
    print("aviso:", pg.inner_text("#toast"))
    d=pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}'))")
    ex=d["exercises"]; n=len(ex); print("exercícios:", n, "| exi:", sum(1 for k in ex if k.startswith("exi")), "| mig:", sorted(d["meta"]["mig"]))
    if n!=len(seed["exercises"])+1: errs.append("contagem")
    if ex["ex01"]["name"]!="Rondo 4x2 (meu)" or "ex_meu" not in ex: errs.append("mexeu nos existentes")
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(800)
    nv=pg.eval_on_selector_all(".exthumb img","e=>e.filter(x=>x.src.startsWith('data:image/svg')).length"); print("desenhos vetoriais:", nv)
    if nv!=sum(1 for k in seed["exercises"] if k.startswith("exi")): errs.append("desenhos")
    # apagar um exercício da biblioteca não o faz voltar
    d["exercises"].pop("exi005"); pg.evaluate(f"localStorage.setItem('{LSK}',JSON.stringify({json.dumps(d)}))")
    pg.reload(); pg.wait_for_timeout(1200)
    d2=pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}'))"); print("apagado não volta:", "exi005" not in d2["exercises"])
    if "exi005" in d2["exercises"]: errs.append("voltou")
    b.close()
print("ERRORS",errs)

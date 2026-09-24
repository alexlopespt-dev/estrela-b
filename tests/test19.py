import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Monitorização quando o browser bloqueia a leitura direta (sem CORS): a app usa o segundo caminho (?cb=, JSONP).
errs=[]
FIX=open(os.path.join(ROOT,"tests","monitorizacao_exemplo.json")).read()
URL="https://script.google.com/macros/s/TESTE/exec"
modo={"v":"novo"}; calls=[]
def handler(route):
    u=route.request.url; calls.append(u)
    if "cb=" in u and modo["v"]=="novo":
        cb=u.split("cb=")[1].split("&")[0]
        route.fulfill(status=200, body=f"{cb}({FIX});", headers={"Content-Type":"application/javascript"})
    else:   # script antigo: só JSON e sem cabeçalho CORS (a leitura direta falha no browser)
        route.fulfill(status=200, body=FIX, headers={"Content-Type":"application/json"})
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.route("https://script.google.com/**", handler)
    # o browser bloqueia a leitura direta (como acontece com CORS/extensões): fetch ao Google falha
    pg.add_init_script("const _f=window.fetch; window.fetch=(u,o)=>String(u).includes('script.google.com')?Promise.reject(new TypeError('Failed to fetch')):_f(u,o);")
    APP=open(os.path.join(DIST,"app_local.html")).read()
    pg.route("https://estrela.test/**", lambda r: r.fulfill(status=200, body=APP, headers={"Content-Type":"text/html"}))
    pg.goto("https://estrela.test/"); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="mon"]'); pg.click('.bar [data-a="monCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',"certa"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1500)
    n=pg.eval_on_selector_all(".tb.mon tbody tr","e=>e.length"); print("segundo caminho:", pg.inner_text("#toast"), "| linhas:", n, "| pedidos:", len(calls), "| com cb:", sum("cb=" in c for c in calls))
    if n!=24 or not any("cb=" in c for c in calls): errs.append("jsonp")
    print("callback limpo:", pg.evaluate("Object.keys(window).filter(k=>k.startsWith('__estrelaMon')).length")==0)
    # script ainda antigo (sem ?cb=): mensagem clara
    modo["v"]="antigo"; pg.click('.bar [data-a="monRefresh"]'); pg.wait_for_timeout(2000)
    t=pg.inner_text("#toast"); print("script antigo:", t)
    errs[:]=[e for e in errs if "Unexpected token" not in e]   # erro de sintaxe esperado do JSON executado como script
    if "Nova versão" not in t: errs.append("mensagem")
    b.close()
print("ERRORS",errs)

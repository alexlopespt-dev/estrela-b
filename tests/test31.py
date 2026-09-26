import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Relatório pré-jogo (Monitorização): só no dia anterior e no dia do jogo; secções, gráficos, variação da prontidão via registo diário.
errs=[]
BASE=json.load(open(os.path.join(ROOT,"tests","monitorizacao_exemplo.json")))
URL="https://script.google.com/macros/s/TESTE/exec"
FIX={"d":BASE}
def handler(route):
    route.fulfill(status=200, body=json.dumps(FIX["d"]), headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.route("https://script.google.com/**", handler)
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="mon"]'); pg.wait_for_timeout(200)
    if pg.query_selector('[data-a="preJogo"]'): errs.append("botão sem dados")
    pg.click('.bar [data-a="monCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',"certa"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1000); chk(pg,"mon")
    # MD-4: botão presente mas apagado, explica quando fica disponível
    bt=pg.query_selector('.bar [data-a="preJogo"]'); cls=bt.get_attribute("class") if bt else ""
    print("MD-4 botão:", cls)
    if not bt or "off" not in cls: errs.append("botão MD-4")
    bt.click(); pg.wait_for_timeout(200); t=pg.inner_text("#toast"); print("toast:", t)
    if "dia anterior" not in t or pg.is_visible("#dlg"): errs.append("MD-4 abriu")
    # MD-1: com registo de ontem (prontidão 6 abaixo para metade) -> variação da prontidão
    d=json.loads(json.dumps(BASE)); d["hoje"]="2026-09-26"; d["md"]={"etiqueta":"MD-1","falta":1,"desdeJogo":6,"folga":False}; FIX["d"]=d
    ontem={j["nome"]:(j["prontidao"]-6 if i%2==0 else j["prontidao"]+3) for i,j in enumerate(d["jogadores"]) if j.get("prontidao") is not None}
    pg.evaluate("h=>localStorage.setItem('estrela-tecnico-v1:monhist',JSON.stringify(h))", {"2026-09-25":ontem,"2026-09-01":{"x":1}})
    pg.click('.bar [data-a="monRefresh"]'); pg.wait_for_timeout(1000); chk(pg,"mon md-1")
    h=pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1:monhist'))")
    print("registos:", sorted(h.keys()))
    if "2026-09-26" not in h or len(h["2026-09-26"])<10: errs.append("registo de hoje")
    if "2026-09-01" in h and len(h)>21: errs.append("limite 21 dias")
    bt=pg.query_selector('.bar [data-a="preJogo"]')
    if "off" in (bt.get_attribute("class") or ""): errs.append("botão MD-1 apagado")
    bt.click(); pg.wait_for_timeout(300)
    print("janela:", pg.inner_text("#dlg h2") if pg.query_selector("#dlg h2") else pg.inner_text("#dlg")[:40])
    with pg.expect_download() as dl: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(dl.value.path()).read(); print("ficheiro:", dl.value.suggested_filename, len(html)//1024, "KB, svg:", html.count("<svg"))
    for s in ["Relatório pré-jogo","MD-1","Prontidão média","Indisponíveis","Quem recuperou","Carga acumulada","Casos a decidir","Leitura final","Núcleo utilizável"]:
        if s not in html: errs.append("falta "+s)
    if "prontidão desde ontem" not in html.lower() and "desde ontem" not in html: errs.append("sem variação da prontidão")
    if html.count("<svg")<4: errs.append("gráficos")
    if "NaN" in html or "undefined" in html: errs.append("NaN/undefined")
    out=os.path.join(CAP,"t31_prejogo.html"); open(out,"w").write(html)
    p2=ctx.new_page(); p2.goto("file://"+out); p2.wait_for_timeout(800); p2.pdf(path=os.path.join(CAP,"t31_relatorio_pre_jogo.pdf"),format="A4",print_background=True); p2.close(); os.remove(out)
    # dia do jogo (MD), sem registo de ontem -> usa o bem-estar
    pg.evaluate("localStorage.removeItem('estrela-tecnico-v1:monhist')")
    d2=json.loads(json.dumps(d)); d2["hoje"]="2026-09-27"; d2["md"]={"etiqueta":"MD","falta":0,"desdeJogo":7,"folga":False}; FIX["d"]=d2
    pg.click('#dlg [data-a="mClose"]') if pg.is_visible("#dlg") else None
    pg.click('.bar [data-a="monRefresh"]'); pg.wait_for_timeout(1000)
    pg.click('.bar [data-a="preJogo"]'); pg.wait_for_timeout(300)
    with pg.expect_download() as dl: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(dl.value.path()).read(); print("MD:", "Jogo hoje" in html, "bem-estar" in html)
    if "Jogo hoje" not in html or "NaN" in html or "undefined" in html: errs.append("MD")
    b.close()
print("ERRORS",errs)

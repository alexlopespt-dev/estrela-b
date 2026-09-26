import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Relatório pré-jogo (Monitorização): só no dia anterior e no dia do jogo (dia contado pelo calendário da app, a partir de hoje);
# secções, gráficos, variação da prontidão via registo diário, aviso de dados antigos; erro claro com o URL do script da partilha.
errs=[]
BASE=json.load(open(os.path.join(ROOT,"tests","monitorizacao_exemplo.json")))
URL="https://script.google.com/macros/s/TESTE/exec"
FIX={"d":BASE}
def handler(route):
    route.fulfill(status=200, body=json.dumps(FIX["d"]), headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
def fix(hoje,etq,falta):
    d=json.loads(json.dumps(BASE)); d["hoje"]=hoje; d["md"]={"etiqueta":etq,"falta":falta,"desdeJogo":7-falta,"folga":False}; return d
def dia(pg,iso):   # muda o "hoje" do browser e recarrega
    pg.clock.set_fixed_time(iso+"T10:00:00"); pg.reload(); pg.wait_for_timeout(1200); pg.click('nav [data-t="mon"]'); pg.wait_for_timeout(200)
def refresh(pg):
    pg.click('.bar [data-a="monRefresh"]'); pg.wait_for_timeout(1000); chk(pg,"mon")
def kpi(pg): return pg.inner_text('.kpi:has-text("Microciclo") b').replace("\n"," ")
def relatorio(pg):
    pg.click('.bar [data-a="preJogo"]'); pg.wait_for_timeout(300)
    with pg.expect_download() as dl: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    return dl.value, open(dl.value.path()).read()
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.route("https://script.google.com/**", handler)
    pg.clock.set_fixed_time("2026-09-30T10:00:00")
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="mon"]'); pg.wait_for_timeout(200)
    if pg.query_selector('[data-a="preJogo"]'): errs.append("botão sem dados")
    # quarta 30/09, jogo no domingo 04/10 (J3): MD-4 -> botão apagado, explica quando fica disponível
    FIX["d"]=fix("2026-09-30","MD-4",4)
    pg.click('.bar [data-a="monCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',"certa"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1000); chk(pg,"mon")
    bt=pg.query_selector('.bar [data-a="preJogo"]'); cls=bt.get_attribute("class") if bt else ""
    print("MD-4:", kpi(pg), "| botão:", cls)
    if not bt or "off" not in cls: errs.append("botão MD-4")
    bt.click(); pg.wait_for_timeout(200); t=pg.inner_text("#toast"); print("toast:", t)
    if "dia anterior" not in t or pg.is_visible("#dlg"): errs.append("MD-4 abriu")
    # sábado 03/10 (MD-1), com registo de ontem (prontidão 6 abaixo para metade) -> variação da prontidão
    dia(pg,"2026-10-03"); d=fix("2026-10-03","MD-1",1); FIX["d"]=d
    ontem={j["nome"]:(j["prontidao"]-6 if i%2==0 else j["prontidao"]+3) for i,j in enumerate(d["jogadores"]) if j.get("prontidao") is not None}
    pg.evaluate("h=>localStorage.setItem('estrela-tecnico-v1:monhist',JSON.stringify(h))", {"2026-10-02":ontem,"2026-09-01":{"x":1}})
    refresh(pg); print("MD-1:", kpi(pg))
    # carregar outra vez sem cálculo novo no Sheets: diz que não há dados novos e mostra a hora do cálculo
    refresh(pg); t=pg.inner_text("#toast"); print("segunda leitura:", t)
    if "Sem dados novos" not in t: errs.append("toast sem dados novos")
    if "Calculado no Sheets" not in pg.inner_text(".bar"): errs.append("texto da hora do cálculo")
    h=pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1:monhist'))"); print("registos:", sorted(h.keys()))
    if "2026-10-03" not in h or len(h["2026-10-03"])<10: errs.append("registo de hoje")
    if "MD-1" not in kpi(pg) or "amanhã" not in kpi(pg): errs.append("kpi MD-1")
    if "off" in (pg.get_attribute('.bar [data-a="preJogo"]',"class") or ""): errs.append("botão MD-1 apagado")
    dl,html=relatorio(pg); print("ficheiro:", dl.suggested_filename, len(html)//1024, "KB, svg:", html.count("<svg"))
    for s in ["Relatório pré-jogo","MD-1","Jogo amanhã","Atlético CP B","Prontidão média","Indisponíveis","Quem recuperou","Carga acumulada","Casos a decidir","Leitura final","Núcleo utilizável","desde ontem"]:
        if s not in html: errs.append("falta "+s)
    if "não foi atualizada hoje" in html: errs.append("aviso de dados antigos sem razão")
    if html.count("<svg")<4: errs.append("gráficos")
    if "NaN" in html or "undefined" in html: errs.append("NaN/undefined")
    out=os.path.join(CAP,"t31_prejogo.html"); open(out,"w").write(html)
    p2=ctx.new_page(); p2.goto("file://"+out); p2.wait_for_timeout(800); p2.pdf(path=os.path.join(CAP,"t31_relatorio_pre_jogo.pdf"),format="A4",print_background=True); p2.close(); os.remove(out)
    # domingo 04/10 (dia do jogo) sem o Sheets atualizado: o resumo ainda diz MD-1 de ontem -> app mostra MD e o relatório avisa
    pg.click('#dlg [data-a="mClose"]') if pg.is_visible("#dlg") else None
    dia(pg,"2026-10-04"); print("MD (dados de ontem):", kpi(pg))
    if not kpi(pg).startswith("MD ") or "hoje" not in kpi(pg): errs.append("kpi MD com dados antigos")
    dl,html=relatorio(pg); print("MD:", "Jogo hoje" in html, "não foi atualizada hoje" in html)
    if "Jogo hoje" not in html or "não foi atualizada hoje" not in html or "NaN" in html or "undefined" in html: errs.append("MD")
    # o caso da captura: resumo de sexta (MD-2) visto no sábado -> passa a MD-1 e deixa gerar
    pg.click('#dlg [data-a="mClose"]') if pg.is_visible("#dlg") else None
    FIX["d"]=fix("2026-10-02","MD-2",2); refresh(pg)
    dia(pg,"2026-10-03"); print("resumo de sexta visto no sábado:", kpi(pg))
    if "MD-1" not in kpi(pg) or "off" in (pg.get_attribute('.bar [data-a="preJogo"]',"class") or ""): errs.append("MD-2 antigo")
    # URL do script da partilha colado na monitorização: "pedido desconhecido" -> mensagem clara
    FIX["d"]={"erro":"pedido desconhecido"}; refresh(pg); t=pg.inner_text("#main"); print("script errado:", "partilha" in t)
    if "dados_app.gs" not in t: errs.append("mensagem script errado")
    pg.evaluate("u=>localStorage.setItem('estrela-tecnico-v1:sync',JSON.stringify({url:u,key:'certa'}))", URL)
    pg.reload(); pg.wait_for_timeout(1200); pg.click('nav [data-t="mon"]'); refresh(pg)
    t=pg.inner_text("#main"); print("mesmo URL da partilha:", "mesmo endereço" in t)
    if "mesmo endereço" not in t: errs.append("mensagem URL da partilha")
    b.close()
print("ERRORS",errs)

import os, sys, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Monitorização: ligação ao Apps Script (simulado), nomes da folha -> atletas, painel, separador, ficha, convocatória, erros.
errs=[]
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
FIX=open(os.path.join(ROOT,"tests","monitorizacao_exemplo.json")).read()
URL="https://script.google.com/macros/s/TESTE/exec"
calls=[]
def handler(route):
    u=route.request.url; calls.append(u)
    body=FIX if "k=certa" in u else json.dumps({"erro":"chave"})
    route.fulfill(status=200, body=body, headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":950})
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.route("https://script.google.com/**", handler)
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200); chk(pg,"painel")
    print("cartão por ligar:", "por ligar" in pg.inner_text("#main"))
    pg.click('nav [data-t="mon"]'); pg.wait_for_timeout(200); chk(pg,"mon vazio")
    pg.click('.bar [data-a="monCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=url]',"http://x"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200); print("http:", pg.inner_text("#toast"))
    pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',"errada"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(800)
    print("chave errada:", pg.inner_text("#toast"))
    if "chave" not in pg.inner_text("#toast"): errs.append("chave errada sem aviso")
    pg.click('.bar [data-a="monCfg"]'); pg.wait_for_timeout(200); pg.fill('#dlg [name=key]',"certa"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1000); chk(pg,"mon")
    print("certa:", pg.inner_text("#toast"))
    n=pg.eval_on_selector_all(".tb.mon tbody tr","e=>e.length"); print("linhas:", n)
    if n!=24: errs.append("linhas mon")
    print("sem ligação:", pg.inner_text("p.note >> nth=0")[:120])
    # ligações automáticas: Bruno Vunge -> Bruno V., Miguel Valério -> Valério, Miguel -> Miguel
    links=pg.evaluate("[...document.querySelectorAll('.tb.mon tbody tr')].map(r=>[r.querySelector('td b').innerText, (r.querySelector('[data-p=atleta]')||{}).dataset?.id||''])")
    lk=dict(links); print("Bruno V.:", "Bruno V." in lk, "| Valério:", "Valério" in lk, "| Miguel:", lk.get("Miguel"), "| Hugo R. = Rocha:", lk.get("Rocha"), "| Khan:", lk.get("Khan"), "| Jota sem ligação:", lk.get("Jota")=="")
    if "Bruno V." not in lk or "Valério" not in lk or not lk.get("Miguel") or lk.get("Rocha")!="p2" or lk.get("Khan")!="p_khan" or lk.get("Jota")!="": errs.append("ligação de nomes")
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t16_mon.png"), full_page=True)
    # ordenar e filtrar
    pg.click('[data-a="monSort"][data-k="carga7"]'); pg.wait_for_timeout(200)
    first=pg.inner_text(".tb.mon tbody tr >> nth=0 >> td >> nth=0"); print("mais carga:", first.strip())
    pg.click('[data-a="monF"][data-k="al"]'); pg.wait_for_timeout(200); print("com alerta:", pg.eval_on_selector_all(".tb.mon tbody tr","e=>e.length"))
    # mapear Hugo R. à mão para o Rocha e ignorar
    pg.click('.bar [data-a="monCfg"]'); pg.wait_for_timeout(300)
    i=pg.evaluate("[...document.querySelectorAll('#dlg .monmap select')].findIndex(s=>s.dataset.n==='Jota')")
    pg.select_option(f'#dlg [name=m_{i}]',"p26" if False else pg.evaluate("Object.entries(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).players).find(([k,v])=>v.name==='Zé Ramos')[0]")); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1000)
    print("mapa guardado:", pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1')).meta.cfg.mon.map"))
    # painel
    pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(300); chk(pg,"painel2")
    print("painel:", pg.inner_text('.card:has-text("Prontidão —")')[:220].replace("\n"," | "))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t16_painel.png"), full_page=True)
    # ficha do atleta
    pg.click('nav [data-t="plantel"]'); pg.click('[data-p="atleta"][data-id="p1"]'); pg.wait_for_timeout(300); chk(pg,"atleta")
    print("ficha Abbiati:", pg.inner_text('.card:has-text("Monitorização")')[:160].replace("\n"," | "))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t16_atleta.png"), full_page=True)
    # convocatória com prontidão
    pg.click('nav [data-t="jogos"]'); pg.click('[data-p="jogo"][data-id="jg_2627_j2"]'); pg.wait_for_timeout(300); chk(pg,"jogo")
    print("chips na convocatória:", pg.eval_on_selector_all(".tile .mchip","e=>e.length"))
    # sem rede: mantém os últimos dados
    pg.unroute("https://script.google.com/**"); pg.route("https://script.google.com/**", lambda r:r.abort())
    pg.click('nav [data-t="mon"]'); pg.click('.bar [data-a="monRefresh"]'); pg.wait_for_timeout(800); chk(pg,"mon sem rede")
    print("sem rede:", pg.inner_text("#toast"), "| linhas:", pg.eval_on_selector_all(".tb.mon tbody tr","e=>e.length"))
    # recarregar sem rede: dados guardados neste browser
    pg.reload(); pg.wait_for_timeout(1500); pg.click('nav [data-t="mon"]'); pg.wait_for_timeout(300)
    print("depois de recarregar:", pg.eval_on_selector_all(".tb.mon tbody tr","e=>e.length"))
    if pg.eval_on_selector_all(".tb.mon tbody tr","e=>e.length")!=24: errs.append("cache")
    pg.set_viewport_size({"width":390,"height":844}); pg.wait_for_timeout(200); chk(pg,"mon telemóvel")
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t16_mon_tlm.png"))
    # desligar
    pg.click('.bar [data-a="monCfg"]'); pg.click('#dlg [data-a="mDel"]'); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(300)
    print("desligado:", "Sem ligação" in pg.inner_text("#main"))
    print("pedidos:", len(calls))
    b.close()
print("ERRORS",errs)

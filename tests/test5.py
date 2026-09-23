import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
URL="file://"+DIST+"/app_local.html"
errs=[]
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1200,"height":900})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    # ---- estatísticas de jogo
    pg.click('nav [data-t="jogos"]'); pg.click('[data-id="jg_j1"]'); pg.wait_for_timeout(150); chk(pg,"jogo")
    for _ in range(4): pg.click('[data-a="gst"][data-p="p9"][data-k="sd01"][data-n="1"]')
    pg.click('[data-a="gst"][data-p="p9"][data-k="sd01"][data-n="-1"]')
    pg.click('[data-a="gst"][data-p="p11"][data-k="sd04"][data-n="1"]'); pg.wait_for_timeout(200)
    print("p9 RM:", pg.eval_on_selector('[data-a="gst"][data-p="p9"][data-k="sd01"][data-n="1"]',"e=>e.previousElementSibling.innerText"))
    print("unused players in stats table?", pg.locator('.card:has-text("5. Estatísticas") [data-p="p12"]').count())
    # config: new event, duplicate code
    pg.click('.card-h [data-a="sdCfg"]'); pg.wait_for_timeout(100); print("defs:", pg.eval_on_selector_all('#dlg .li',"e=>e.length"))
    pg.click('#dlg .dlg-f [data-a="sdEdit"]'); pg.fill('#dlg [name=title]',"Cruzamentos"); pg.fill('#dlg [name=code]',"rm"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80); print("dup code:", pg.inner_text("#toast"))
    pg.fill('#dlg [name=code]',"CZ"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150); print("defs after:", pg.eval_on_selector_all('#dlg .li',"e=>e.length"))
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(100)
    print("cols:", pg.eval_on_selector_all('.card:has-text("5. Estatísticas") thead th',"e=>e.map(x=>x.innerText).join(',')"))
    # remove p11 from call after stat? has events (yellow) -> blocked. use p13 stat then? p13 has sub event -> blocked too. fine.
    # stats tab
    pg.click('nav [data-t="stats"]'); pg.wait_for_timeout(100); chk(pg,"stats")
    pg.click('[data-a="stSort"][data-k="cs:sd01"]'); pg.wait_for_timeout(100)
    print("sort RM top:", pg.eval_on_selector(".tb tbody tr b","e=>e.innerText"), "| kpi RM:", pg.inner_text(".kpi:has-text('Remates')>> nth=0").replace("\n"," "))
    pg.click('nav [data-t="plantel"]'); pg.click('[data-p="atleta"][data-id="p9"]'); pg.wait_for_timeout(150); chk(pg,"atleta")
    print("atleta stats:", pg.inner_text(".card:has-text('Estatísticas de jogo') .kpis").replace("\n"," ")[:120])
    # ---- modelo de jogo
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="modelo"]'); pg.wait_for_timeout(100); chk(pg,"modelo")
    pg.click('[data-a="prNew"][data-m="oo"]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(60); print("pr empty:", pg.inner_text("#toast"))
    pg.fill('#dlg [name=name]',"Saída curta a 3"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    pg.click('[data-a="prNew"][data-m="oo"][data-parent]'); pg.fill('#dlg [name=name]',"Terceiro homem"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    pg.click('[data-a="prNew"][data-m="trd"]'); pg.fill('#dlg [name=name]',"Reação à perda 5 s"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    print("principles:", pg.eval_on_selector_all('[data-a="prEdit"] b',"e=>e.map(x=>x.innerText)"))
    # link exercise ex05 (transição) to Reação; ex02 to Terceiro homem
    pg.click('[data-a="tsub"][data-k="ex"]'); pg.click('.ex:has-text("Transição defensiva")'); pg.click('#dlg [data-a="exEdit"]'); pg.wait_for_timeout(100)
    pg.check('#dlg label.chk:has-text("Reação à perda") input'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    pg.click('.ex:has-text("Posse 5x5")'); pg.click('#dlg [data-a="exEdit"]'); pg.check('#dlg label.chk:has-text("Terceiro homem") input'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    # create a past training with plan
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="newEvent"][data-type="treino"]'); pg.fill('#dlg [name=date]',"2026-09-18"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200); chk(pg,"treino")
    opts=pg.eval_on_selector_all('select[data-c="planAdd"] option',"e=>e.map(o=>o.textContent)")
    pg.select_option('select[data-c="planAdd"]', label=[o for o in opts if o.startswith("Transição")][0]); pg.wait_for_timeout(150)
    pg.select_option('select[data-c="planAdd"]', label=[o for o in opts if o.startswith("Posse")][0]); pg.wait_for_timeout(150)
    pg.click('[data-a="planFree"]'); pg.wait_for_timeout(150)
    print("pr select default:", pg.eval_on_selector('.plan >> nth=0 >> select[data-f=pr]',"e=>e.options[e.selectedIndex].text"))
    free_sel=pg.locator('.plan >> nth=2 >> select[data-f=pr]')
    free_sel.select_option(label="Saída curta a 3"); pg.wait_for_timeout(200)
    pg.fill('.plan >> nth=2 >> input[data-f=min]',"20"); pg.keyboard.press("Tab"); pg.click("h2"); pg.wait_for_timeout(200)
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="modelo"]'); pg.wait_for_timeout(150); chk(pg,"modelo2")
    print("model time:", pg.inner_text(".card >> nth=0 >> .card-b").replace("\n"," | "))
    print("per principle:", pg.eval_on_selector_all('[data-a="prEdit"]',"e=>e.map(x=>x.innerText.replace(/\\n/g,' '))"))
    # delete principle with children
    pg.click('[data-a="prEdit"]:has-text("Saída curta")'); pg.click('#dlg [data-a="mDel"]'); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(200); chk(pg,"after del pr")
    print("principles after del:", pg.eval_on_selector_all('[data-a="prEdit"] b',"e=>e.map(x=>x.innerText)"))
    # ---- presenças
    pg.click('[data-a="tsub"][data-k="sessoes"]'); pg.locator('[data-p="treino"]').first.click(); pg.click('[data-a="attAll"]'); pg.wait_for_timeout(150)
    pg.click('[data-a="att"][data-p="p2"][data-s="FI"]'); pg.wait_for_timeout(150)
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="pres"]'); pg.wait_for_timeout(150); chk(pg,"pres")
    print("pres head:", pg.eval_on_selector_all(".tb thead th","e=>e.map(x=>x.innerText.replace(/\\n/g,' '))"))
    print("row Rocha:", pg.eval_on_selector('.tb tbody tr:has-text("Rocha")',"e=>e.innerText.replace(/\\s+/g,' ')"))
    print("row Alves:", pg.eval_on_selector('.tb tbody tr:has-text("Alves")',"e=>e.innerText.replace(/\\s+/g,' ')"))
    pg.click('[data-a="pmNav"][data-n="1"]'); pg.wait_for_timeout(80); chk(pg,"pres next"); print("next month (jogos do calendário):", pg.eval_on_selector_all(".tb thead th","e=>e.filter(x=>x.innerText.includes('Jogo')).length"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","s_pres.png"))
    # ---- tratamentos
    pg.click('nav [data-t="clinico"]'); pg.click('.bar [data-a="injNew"]'); pg.select_option('#dlg [name=pid]',"p7"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    pg.click('[data-a="trtNew"]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(60); print("trt empty:", pg.inner_text("#toast"))
    pg.fill('#dlg [name=desc]',"Gelo e massagem"); pg.select_option('#dlg [name=pain]',"6"); pg.fill('#dlg [name=date]',"2026-09-20"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    pg.click('[data-a="trtNew"]'); pg.fill('#dlg [name=desc]',"Corrida leve"); pg.select_option('#dlg [name=pain]',"3"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    print("trt card:", pg.inner_text(".card:has-text('Tratamentos')").split("Tratamentos")[1][:120].replace("\n"," | "))
    # edit injury keeps treatments
    pg.click('.card-b [data-a="injEdit"]'); pg.wait_for_timeout(100); print("in modal trts:", pg.eval_on_selector_all('#dlg [data-a="trtEdit"]',"e=>e.length"))
    pg.select_option('#dlg [name=zone]',"Joelho"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    print("trts kept:", pg.evaluate("Object.values(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).injuries)[0].trt.length"))
    pg.click('[data-a="trtEdit"] >> nth=0'); pg.click('#dlg [data-a="mDel"]'); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(150)
    print("after del:", pg.evaluate("Object.values(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).injuries)[0].trt.length"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","s_clin.png"), full_page=True)
    b.close()
print("ERRORS",errs)

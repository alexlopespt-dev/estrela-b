import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
URL="file://"+DIST+"/app_local.html"
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":950})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1500)
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(800)
    print("exercícios:", pg.eval_on_selector_all(".ex","e=>e.length"), "| com foto:", pg.eval_on_selector_all(".ex .exthumb img","e=>e.length"))
    print("categorias:", pg.eval_on_selector_all('[data-a="exCat"]',"e=>e.map(x=>x.innerText)"))
    pg.fill('#exSearch',"rabias"); pg.wait_for_timeout(200)
    print("procura rabias:", pg.eval_on_selector_all(".ex","e=>e.filter(x=>x.style.display!=='none').length"))
    pg.fill('#exSearch',""); pg.wait_for_timeout(200)
    pg.click('.ex >> nth=0'); pg.wait_for_timeout(300)
    print("ficha:", pg.eval_on_selector_all("#dlg img","e=>e.length"), "img |", pg.inner_text("#dlg .dlg-b").replace("\n"," ")[:220])
    pg.click('#dlg [data-a="mClose"]')
    # seletor a partir do treino
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="newEvent"][data-type="treino"]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
    pg.click('[data-a="exPick"]'); pg.wait_for_timeout(800)
    print("picker:", pg.eval_on_selector_all("#pickGrid .pick","e=>e.length"), "| imagens:", pg.eval_on_selector_all("#pickGrid .pick img","e=>e.length"))
    pg.fill('#pickSearch',"finaliza"); pg.wait_for_timeout(300)
    print("procura:", pg.eval_on_selector_all("#pickGrid .pick","e=>e.filter(x=>x.style.display!=='none').length"))
    pg.fill('#pickSearch',""); pg.click('#dlg [data-a="pickCat"][data-k="Lúdico"]'); pg.wait_for_timeout(300)
    print("cat lúdico:", pg.eval_on_selector_all("#pickGrid .pick","e=>e.filter(x=>x.style.display!=='none').length"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","d_picker.png"))
    pg.click('#pickGrid .pick:visible >> nth=0'); pg.wait_for_timeout(300); print(pg.inner_text("#toast"))
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(300)
    print("plano:", pg.eval_on_selector_all(".plan input[data-f=name]","e=>e.map(x=>x.value)"))
    # PDF com foto
    ctx=pg.context
    pg.click('[data-a="prPlan"]'); pg.wait_for_timeout(200)
    with ctx.expect_page() as popup: pg.click('#dlg [data-a="prGo"][data-k="open"]')
    p2=popup.value; p2.wait_for_load_state(); p2.wait_for_timeout(600)
    print("pdf imgs:", p2.eval_on_selector_all(".blk .draw img","e=>e.length"))
    p2.screenshot(path=os.path.join(ROOT,"tests","capturas","pdf_plano2.png"), full_page=True); p2.close()
    b.close()
print("ERRORS",errs)

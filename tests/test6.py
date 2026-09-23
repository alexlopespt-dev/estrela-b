import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
import json
URL="file://"+DIST+"/app_local.html"
errs=[]
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
def LS(pg): return pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1'))")
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1200,"height":950})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(100)
    pg.click('.ex:has-text("Rondo 4x2")'); pg.wait_for_timeout(100)
    pg.click('#dlg [data-a="drawEx"]'); pg.wait_for_timeout(150)
    box=pg.locator("#pitch").bounding_box(); print("pitch box:", {k:round(v) for k,v in box.items()})
    X=lambda fx: box["x"]+box["width"]*fx; Y=lambda fy: box["y"]+box["height"]*fy
    # place 4 players A, 2 B, cone, ball
    for fx,fy in [(.3,.3),(.7,.3),(.3,.7),(.7,.7)]: pg.mouse.click(X(fx),Y(fy))
    pg.click('#dlg [data-a="dwTool"][data-k="B"]')
    for fx,fy in [(.45,.5),(.55,.5)]: pg.mouse.click(X(fx),Y(fy))
    pg.click('#dlg [data-a="dwTool"][data-k="ball"]'); pg.mouse.click(X(.32),Y(.34))
    pg.click('#dlg [data-a="dwTool"][data-k="cone"]'); pg.mouse.click(X(.2),Y(.2)); pg.mouse.click(X(.8),Y(.2))
    # pass arrow drag
    pg.click('#dlg [data-a="dwTool"][data-k="pass"]'); pg.mouse.move(X(.3),Y(.4)); pg.mouse.down(); pg.mouse.move(X(.5),Y(.4),steps=5); pg.mouse.move(X(.68),Y(.32),steps=5); pg.mouse.up()
    # tiny arrow should be discarded
    pg.mouse.move(X(.1),Y(.9)); pg.mouse.down(); pg.mouse.move(X(.101),Y(.901)); pg.mouse.up()
    # zone
    pg.click('#dlg [data-a="dwTool"][data-k="zone"]'); pg.mouse.move(X(.15),Y(.15)); pg.mouse.down(); pg.mouse.move(X(.85),Y(.85),steps=6); pg.mouse.up()
    n=pg.evaluate("M.drw.it.length") if False else len(pg.eval_on_selector_all("#pitchItems [data-i]","e=>e"))
    print("items:", n)
    # move player 1 by dragging with move tool
    pg.click('#dlg [data-a="dwTool"][data-k="move"]')
    first=pg.locator('#pitchItems g[data-i="0"]').bounding_box()
    pg.mouse.move(first["x"]+first["width"]/2, first["y"]+first["height"]/2); pg.mouse.down(); pg.mouse.move(X(.25),Y(.5),steps=6); pg.mouse.up()
    nb=pg.locator('#pitchItems g[data-i="0"]').bounding_box(); print("moved player1 x:", round(first["x"]), "->", round(nb["x"]))
    # delete cone
    pg.click('#dlg [data-a="dwTool"][data-k="del"]'); c=pg.locator('#pitchItems g:has(path[fill="#ff8a1f"])').first.bounding_box(); pg.mouse.click(c["x"]+c["width"]/2,c["y"]+c["height"]*0.6)
    print("after del:", len(pg.eval_on_selector_all("#pitchItems [data-i]","e=>e")))
    pg.click('#dlg [data-a="dwUndo"]'); print("after undo:", len(pg.eval_on_selector_all("#pitchItems [data-i]","e=>e")))
    pg.click('#dlg [data-a="dwField"][data-k="full"]'); pg.wait_for_timeout(50); print("field full lines:", pg.eval_on_selector_all("#pitchField ellipse","e=>e.length"), "items kept:", len(pg.eval_on_selector_all("#pitchItems [data-i]","e=>e")))
    pg.click('#dlg [data-a="dwField"][data-k="half"]')
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","d_draw.png"))
    # esc should ask (dirty)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100); print("ask on esc:", pg.evaluate("document.querySelector('#dlgAsk').open")); pg.click('#dlgAsk [data-ask="0"]')
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    print("exView svg:", pg.eval_on_selector_all("#dlg svg","e=>e.length"), "| btn:", pg.inner_text('#dlg [data-a="drawEx"]'))
    d=[x for x in LS(pg)["exercises"].values() if x["name"]=="Rondo 4x2"][0]["drw"]; print("stored:", d["f"], len(d["it"]), [i["t"] for i in d["it"]])
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(100)
    print("thumb in card:", pg.eval_on_selector_all(".ex .exthumb svg","e=>e.length")); chk(pg,"ex")
    # --- categories
    pg.click('[data-a="catCfg"]'); pg.wait_for_timeout(100)
    rows=pg.locator("#cfgCats .cfgrow input"); print("cats:", rows.count())
    rows.nth(1).fill("Técnico-coordenativo")  # rename Técnico
    pg.click('#dlg [data-a="cfgAdd"]'); pg.locator("#cfgCats .cfgrow input").last.fill("Aquecimento")  # duplicate
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80); print("dup:", pg.inner_text("#toast"))
    pg.locator("#cfgCats .cfgrow input").last.fill("Velocidade")
    pg.locator('#cfgCats .cfgrow').last.locator('[data-a="cfgMove"][data-n="-1"]').click()
    pg.locator('#cfgCats .cfgrow').nth(8).locator('[data-a="cfgDel"]').click()  # delete Retorno à calma? check
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200); print(pg.inner_text("#toast")); chk(pg,"cats")
    st=LS(pg); print("cfg cats:", st["meta"]["cfg"]["exCats"])
    print("ex cats:", sorted(set(x["cat"] for x in st["exercises"].values())))
    print("chips:", pg.eval_on_selector_all('[data-a="exCat"]',"e=>e.map(x=>x.innerText)"))
    pg.click('.ex >> nth=0'); pg.click('#dlg [data-a="exEdit"]'); print("form cat opts:", pg.eval_on_selector_all('#dlg [name=cat] option',"e=>e.length")); pg.click('#dlg [data-a="mClose"]')
    # --- evaluation config: make eval first then rename attr
    pg.click('nav [data-t="plantel"]'); pg.click('[data-p="atleta"][data-id="p9"]'); pg.click('.acts [data-a="evalNew"]'); pg.wait_for_timeout(100)
    pg.eval_on_selector('input[data-sl="tec"][data-i="0"]',"e=>{e.value='8';e.dispatchEvent(new Event('input',{bubbles:true}))}")
    pg.eval_on_selector('input[data-sl="tec"][data-i="1"]',"e=>{e.value='6';e.dispatchEvent(new Event('input',{bubbles:true}))}")
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    pg.click('nav [data-t="plantel"]'); pg.click('[data-a="evalCfg"]'); pg.wait_for_timeout(100)
    pg.fill('#cfgL_tec',"Técnica individual")
    pg.locator('#cfgA_tec .cfgrow input').nth(0).fill("Passe curto")     # rename Passe
    pg.locator('#cfgA_tec .cfgrow').nth(1).locator('[data-a="cfgDel"]').click()  # remove Receção (has value 6)
    pg.click('#dlg [data-a="cfgAdd"][data-l="cfgA_tec"]'); pg.locator('#cfgA_tec .cfgrow input').last.fill("Remate de longe")
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200); print(pg.inner_text("#toast"))
    st=LS(pg); ev=list(st["evals"].values())[0]["v"]["tec"]; print("eval tec:", ev); print("cfg tec:", st["meta"]["cfg"]["eval"]["tec"])
    pg.click('[data-p="atleta"][data-id="p9"]'); pg.wait_for_timeout(150); chk(pg,"atleta")
    print("radar label:", pg.eval_on_selector_all("svg.radar text","e=>e.map(x=>x.textContent)"), "| area:", pg.inner_text(".areas").replace("\n"," "))
    pg.click('[data-a="evalEdit"]'); pg.wait_for_timeout(100)
    print("edit rows tec:", pg.eval_on_selector_all('#dlg input[data-sl="tec"]',"e=>e.map(x=>x.dataset.attr)"), "| avg:", pg.inner_text("#av_tec"))
    pg.click('#dlg [data-a="mClose"]')
    # empty area validation
    pg.click('nav [data-t="plantel"]'); pg.click('[data-a="evalCfg"]'); 
    for _ in range(pg.locator('#cfgA_psi .cfgrow').count()): pg.locator('#cfgA_psi .cfgrow [data-a="cfgDel"]').first.click()
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80); print("empty area:", pg.inner_text("#toast"))
    b.close()
print("ERRORS",errs)

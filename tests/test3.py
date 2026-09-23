import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
URL="file://"+DIST+"/app_local.html"
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1200,"height":900})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.click('nav [data-t="testes"]')
    pg.fill('input[data-c="test"][data-p="p1"][data-k="vel"]',"4,52"); pg.keyboard.press("Tab"); pg.click("h2"); pg.wait_for_timeout(150)
    pg.click('[data-a="tmNew"]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    pg.fill('input[data-c="test"][data-p="p1"][data-k="vel"]',"4,40"); pg.keyboard.press("Tab"); pg.click("h2"); pg.wait_for_timeout(200)
    print("delta:", pg.eval_on_selector('input[data-c="test"][data-p="p1"][data-k="vel"]',"e=>e.parentElement.innerText"))
    pg.fill('input[data-c="test"][data-p="p1"][data-k="salto"]',"230"); pg.keyboard.press("Tab"); pg.click("h2"); pg.wait_for_timeout(150)
    pg.click('nav [data-t="agenda"]'); pg.click('[data-a="calDay"][data-d="2026-09-23"]'); pg.wait_for_timeout(100)
    print(pg.inner_text(".card >> nth=1 >> h3"), "|", pg.inner_text(".bar h2"))
    pg.click('nav [data-t="plantel"]'); pg.click('[data-p="atleta"][data-id="p1"]'); pg.wait_for_timeout(150)
    print("atleta testes:", pg.inner_text(".card:has-text('Testes físicos') table").replace("\n"," | ").replace("\t"," "))
    b.close()
print("ERR",errs)

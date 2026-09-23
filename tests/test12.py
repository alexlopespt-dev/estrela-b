import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for w,h,tag in [(1180,420,"baixo"),(900,360,"muito_baixo"),(1280,950,"normal"),(390,844,"telemovel")]:
        pg=b.new_page(viewport={"width":w,"height":h})
        pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
        pg.click('.bar [data-a="weekGen"]'); pg.wait_for_timeout(300)
        vis=pg.eval_on_selector_all('#dlg .dlg-b .fld, #dlg .dlg-b label.fld',"e=>e.filter(x=>{const r=x.getBoundingClientRect();const d=document.querySelector('#dlg .dlg-b').getBoundingClientRect();return r.top>=d.top-2&&r.bottom<=d.bottom+2}).length")
        box=pg.eval_on_selector('#dlg',"e=>{const r=e.getBoundingClientRect();return [Math.round(r.height), Math.round(document.querySelector('#dlg .dlg-b').getBoundingClientRect().height)]}")
        print(tag, "dialog/corpo:", box, "| campos visíveis:", vis)
        pg.screenshot(path=os.path.join(ROOT,"tests","capturas",f"m_{tag}.png"))
        pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
        pg.click('nav [data-t="plantel"]'); pg.click('[data-a="plNew"]'); pg.wait_for_timeout(300)
        print("   novo atleta corpo:", pg.eval_on_selector('#dlg .dlg-b',"e=>Math.round(e.getBoundingClientRect().height)"))
        pg.close()
    b.close()
print("ERR",errs)

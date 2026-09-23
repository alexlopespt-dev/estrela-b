import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
import json
seed=open(os.path.join(ROOT,'data','seed_db.json')).read(); mock=open(os.path.join(ROOT,'tests','mock.js')).read()
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1200,"height":900})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.add_init_script(mock+f"\nwindow.__seed({seed});")
    pg.goto("file://"+DIST+"/app_db.html"); pg.wait_for_timeout(800)
    print("mode:", pg.evaluate("document.querySelector('#main').innerText.slice(0,40)"))
    pg.click('nav [data-t="jogos"]'); pg.click('[data-id="jg_j1"]'); pg.wait_for_timeout(200)
    # rapid call toggles
    for p in ["p20","p21","p22","p20"]: pg.click(f'[data-a="call"][data-p="{p}"]')
    pg.wait_for_timeout(600)
    call=pg.evaluate("window.__store.events.jg_j1.call")
    print("call has p21,p22 not p20:", "p21" in call and "p22" in call and "p20" not in call, len(call))
    pg.fill('input[data-f="ga"]',"2"); pg.click("h2"); pg.wait_for_timeout(400)
    pg.click('[data-a="gClose"]'); pg.wait_for_timeout(400)
    print("stored closed/ga:", pg.evaluate("[window.__store.events.jg_j1.closed, window.__store.events.jg_j1.ga]"))
    print("score:", pg.inner_text(".goals").replace("\n"," | "))
    # training rapid attendance
    pg.click('[data-a="weekGen"]') if False else None
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="weekGen"]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(500)
    pg.click('nav [data-t="treinos"]'); pg.locator('[data-p="treino"]').first.click(); pg.wait_for_timeout(200)
    for s in ["P","AT","FI","P"]: pg.click(f'[data-a="att"][data-p="p5"][data-s="{s}"]')
    pg.click('[data-a="attAll"]'); pg.wait_for_timeout(700)
    tid=[k for k,v in pg.evaluate("window.__store.events").items() if v["type"]=="treino"][0]
    _evs=pg.evaluate('window.__store.events')
    _first=sorted([k for k,v in _evs.items() if v['type']=='treino'], key=lambda k: _evs[k]['date'])[0]
    att=pg.evaluate(f"window.__store.events['{_first}'].att")
    print("p5 status:", att.get("p5"), "marked:", len([a for a in att.values() if a.get('s')]))
    print("ui p5 on:", pg.eval_on_selector('[data-a="att"][data-p="p5"].on',"e=>e.dataset.s"))
    # injury then eval
    pg.click('nav [data-t="clinico"]'); pg.click('.bar [data-a="injNew"]'); pg.select_option('#dlg [name=pid]',"p7"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
    print("inj stored:", len(pg.evaluate("window.__store.injuries||{}")))
    pg.click('nav [data-t="plantel"]'); pg.click('[data-p="atleta"][data-id="p7"]'); pg.wait_for_timeout(200)
    print("p7 avail:", pg.inner_text(".ahead p"))
    pg.fill('textarea[data-f="notes"]',"Nota teste"); pg.click("h2"); pg.wait_for_timeout(400)
    print("notes stored:", pg.evaluate("window.__store.players.p7.notes"))
    print("writes:", pg.evaluate("window.__writes"))
    b.close()
print("ERR",errs)

import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
import json
URL="file://"+DIST+"/app_local.html"
errs=[]
def chk(pg,label):
    bad=pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')")
    if bad: errs.append("RENDER FAIL: "+label)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1200,"height":900})
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.on("console",lambda m: errs.append("CONSOLE "+m.text) if m.type=="error" and "fonts" not in m.text and "net::ERR_" not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(700)
    tabs=["painel","agenda","treinos","jogos","plantel","testes","clinico","scouting","stats"]
    for t in tabs:
        pg.click(f'nav [data-t="{t}"]'); pg.wait_for_timeout(120); chk(pg,t)
    # treinos subtabs
    pg.click('nav [data-t="treinos"]')
    for k in ["plan","ex","sessoes"]:
        pg.click(f'[data-a="tsub"][data-k="{k}"]'); pg.wait_for_timeout(80); chk(pg,"tsub "+k)
    # J1 game page
    pg.click('nav [data-t="jogos"]'); pg.click('[data-p="jogo"][data-id="jg_j1"]'); pg.wait_for_timeout(150); chk(pg,"jogo")
    rows=pg.evaluate("""[...[...document.querySelectorAll('section.card')].find(s=>s.querySelector('h3')&&s.querySelector('h3').innerText.startsWith('4.')).querySelectorAll('.tb tbody tr')].map(r=>[r.querySelector('b').innerText, r.children[1].innerText.trim(), r.children[2].innerText.trim(), r.children[3].innerText.trim()])""")
    exp={"Abbiati":"90'","Valério":"78'","Rafa S.":"90'","Rafa F.":"90'","Bruno M.":"90'","Yannick":"90'","Couceiro":"71'","Alves":"71'","Martim":"61'","Zava":"61'","Chidera":"90'","Rodrigo S.":"12'","Francisco":"29'","Miguel":"19'","Kenzo":"19'","Pirlo":"29'","Noam":"0'","Luís A.":"0'"}
    got={r[0]:r[1] for r in rows}
    for k,v in exp.items():
        if got.get(k)!=v: errs.append(f"MIN {k}: {got.get(k)} != {v}")
    print("ficha rows",len(rows), "Alves G/A:", [r for r in rows if r[0]=="Alves"])
    score=pg.inner_text(".goals"); print("score:",score.replace("\n"," | "))
    # J1 já vem com o resultado do zerozero (0-6, fora); limpar para testar o fecho sem golos sofridos
    if "0 - 6" not in score: errs.append("J1 sem resultado do calendário: "+score)
    pg.fill('input[data-f="ga"]',""); pg.keyboard.press("Tab"); pg.wait_for_timeout(200)
    # close without ga
    pg.click('[data-a="gClose"]'); pg.wait_for_timeout(100); print("toast:",pg.inner_text("#toast"))
    pg.fill('input[data-f="ga"]',"1"); pg.keyboard.press("Tab"); pg.wait_for_timeout(200)
    pg.click('[data-a="gClose"]'); pg.wait_for_timeout(200)
    print("after close:", pg.inner_text(".goals").replace("\n"," | "))
    # add event: substitution invalid (same) and valid yellow
    pg.click('[data-a="gOpen"]'); pg.wait_for_timeout(100)
    pg.click('[data-a="evNew"]'); pg.wait_for_timeout(100)
    pg.click('#dlg [data-a="evType"][data-k="sub"]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80); print("sub no min:",pg.inner_text("#toast"))
    pg.fill('#dlg [name=min]',"80"); pg.select_option('#dlg [name=out]',"p1"); pg.select_option('#dlg [name=in]',"p12"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    rows=pg.evaluate("""[...[...document.querySelectorAll('section.card')].find(s=>s.querySelector('h3')&&s.querySelector('h3').innerText.startsWith('4.')).querySelectorAll('.tb tbody tr')].map(r=>[r.querySelector('b').innerText, r.children[1].innerText.trim()])""")
    print("Abbiati/Noam after sub:", [r for r in rows if r[0] in ("Abbiati","Noam")])
    # delete that sub
    n_before=pg.eval_on_selector_all(".evl","e=>e.length")
    pg.locator('.evl').filter(has_text="Noam").locator('[data-a="evDel"]').click(); pg.wait_for_timeout(150)
    print("events before/after:", n_before, pg.eval_on_selector_all(".evl","e=>e.length"))
    # goal with assist
    pg.click('[data-a="evNew"]'); pg.fill('#dlg [name=min]',"88"); pg.select_option('#dlg [name=pid]',"p24") if False else None
    pg.select_option('#dlg [name=pid]',"p17"); pg.select_option('#dlg [name=ast]',"p18"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    print("score after goal:", pg.inner_text(".goals").replace("\n"," | "))
    txt=pg.input_value("#callTxt"); print("call text:\n"+txt)
    # rating edit
    pg.fill('input[data-c="rt"][data-p="p17"]',"7,5"); pg.keyboard.press("Tab"); pg.wait_for_timeout(200)
    pg.fill('input[data-c="rt"][data-p="p17"]',"12"); pg.keyboard.press("Tab"); pg.wait_for_timeout(200); print("rt 12:",pg.inner_text("#toast"))
    # xi limit
    pg.click('[data-a="xi"][data-p="p12"]'); pg.wait_for_timeout(100); print("xi 12th:",pg.inner_text("#toast"))
    pg.click('[data-a="gClose"]'); pg.wait_for_timeout(150)
    # painel
    pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(150); chk(pg,"painel2")
    print("kpis:", pg.inner_text(".kpis").replace("\n"," | "))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","s_painel.png"), full_page=True)
    # week gen
    pg.click('[data-a="weekGen"] >> nth=0'); pg.wait_for_timeout(100)
    print("week mon default:", pg.input_value('#dlg [name=mon]'))
    pg.fill('#dlg [name=time]',"19:30"); pg.fill('#dlg [name=opp]',"Clube Teste"); pg.fill('#dlg [name=obj]',"Pressão alta"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    print("weekgen toast:", pg.inner_text("#toast"))
    pg.click('[data-a="weekGen"] >> nth=0'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200); print("weekgen again:", pg.inner_text("#toast"))
    b.close()
print("ERRORS:",errs)

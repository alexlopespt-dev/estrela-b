import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
URL="file://"+DIST+"/app_local.html"
errs=[]
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1200,"height":900}, accept_downloads=True)
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto(URL); pg.wait_for_timeout(600)
    # week gen then training
    pg.click('[data-a="weekGen"] >> nth=0'); pg.fill('#dlg [name=time]',"19:30"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200); print(pg.inner_text("#toast"))
    pg.click('nav [data-t="treinos"]'); pg.wait_for_timeout(100); chk(pg,"treinos")
    first=pg.locator('[data-p="treino"]').first; first.click(); pg.wait_for_timeout(150); chk(pg,"treino page")
    tid=pg.evaluate("S.page && S.page.id") if False else None
    # plan
    pg.select_option('select[data-c="planAdd"]', index=1); pg.wait_for_timeout(150)
    pg.select_option('select[data-c="planAdd"]', index=3); pg.wait_for_timeout(150)
    pg.click('[data-a="planFree"]'); pg.wait_for_timeout(150)
    print("plan rows:", pg.eval_on_selector_all(".plan","e=>e.length"), pg.inner_text(".card-h:has-text('Plano da sessão') .sub"))
    pg.click('.plan >> nth=2 >> [data-a="planMove"][data-n="-1"]'); pg.wait_for_timeout(100)
    pg.fill('.plan >> nth=1 >> input[data-f="min"]',"20"); pg.keyboard.press("Tab"); pg.wait_for_timeout(150)
    pg.click('.plan >> nth=0 >> [data-a="planDel"]'); pg.wait_for_timeout(100)
    print("plan after:", pg.eval_on_selector_all(".plan input[data-f=name]","e=>e.map(x=>x.value)"), pg.inner_text(".card-h:has-text('Plano da sessão') .sub"))
    # theme field
    pg.fill('input[data-f="theme"]',"Organização ofensiva"); pg.keyboard.press("Tab"); pg.wait_for_timeout(200)
    print("title:", pg.inner_text(".phead h2"))
    # attendance
    pg.click('[data-a="att"][data-p="p2"][data-s="FJ"]'); pg.wait_for_timeout(80)
    pg.click('[data-a="attAll"]'); pg.wait_for_timeout(150); print(pg.inner_text("#toast"))
    pg.fill('input.rpe[data-p="p1"]',"7"); pg.keyboard.press("Tab"); pg.wait_for_timeout(150)
    pg.fill('input.rpe[data-p="p3"]',"11"); pg.keyboard.press("Tab"); pg.wait_for_timeout(150); print("rpe 11:",pg.inner_text("#toast"))
    print("rpe disabled for FJ:", pg.is_disabled('input.rpe[data-p="p2"]'))
    print("att summary:", pg.inner_text(".card-h:has-text('Presenças') .sub"))
    pg.click('[data-a="trClose"]'); pg.wait_for_timeout(150); print("closed:", pg.inner_text(".phead .acts"))
    pg.click('[data-a="dupTr"]'); pg.wait_for_timeout(150); print(pg.inner_text("#toast")); chk(pg,"dup")
    pg.click('[data-a="back"]'); pg.wait_for_timeout(100)
    # exercises: new, search
    pg.click('[data-a="tsub"][data-k="ex"]'); pg.fill('#exSearch',"rondo"); pg.wait_for_timeout(100)
    print("ex visible:", pg.eval_on_selector_all(".ex","e=>e.filter(x=>x.style.display!=='none').length"))
    pg.click('[data-a="exNew"]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80); print("ex no name:",pg.inner_text("#toast"))
    pg.fill('#dlg [name=name]',"Meu exercício"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
    if pg.locator('#dlg [data-a="dwTool"]').count(): pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    pg.click('.ex >> nth=0'); pg.wait_for_timeout(100); pg.click('#dlg [data-a="exEdit"]'); pg.wait_for_timeout(100); pg.click('#dlg [data-a="mClose"]')
    # planning cycles
    pg.click('[data-a="tsub"][data-k="plan"]'); pg.click('[data-a="cycNew"][data-k="meso"]'); pg.fill('#dlg [name=end]',"2026-09-01"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80); print("meso bad:",pg.inner_text("#toast"))
    pg.fill('#dlg [name=end]',"2026-10-31"); pg.fill('#dlg [name=start]',"2026-09-21"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150); chk(pg,"plan")
    print("cycles:", pg.eval_on_selector_all(".li b","e=>e.map(x=>x.innerText)"))
    # agenda
    pg.click('nav [data-t="agenda"]'); pg.wait_for_timeout(100); chk(pg,"agenda")
    pg.click('[data-a="calNav"][data-n="1"]'); pg.click('[data-a="calNav"][data-n="-1"]'); pg.click('[data-a="calDay"][data-d="2026-09-23"]'); pg.wait_for_timeout(100)
    print("day panel:", pg.inner_text(".card >> nth=1").split("\n")[:4])
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","s_agenda.png"), full_page=True)
    # plantel & athlete & eval
    pg.click('nav [data-t="plantel"]'); pg.click('[data-p="atleta"][data-id="p9"]'); pg.wait_for_timeout(150); chk(pg,"atleta")
    print("kpis alves:", pg.inner_text(".ahead + .card-b .kpis").replace("\n"," | "))
    pg.click('.acts [data-a="evalNew"]'); pg.wait_for_timeout(100)
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80); print("eval empty:",pg.inner_text("#toast"))
    for sl,v in [('input[data-sl="tec"][data-i="0"]',"8"),('input[data-sl="tec"][data-i="4"]',"9"),('input[data-sl="tat"][data-i="1"]',"7"),('input[data-sl="fis"][data-i="0"]',"8.5"),('input[data-sl="psi"][data-i="1"]',"9")]:
        pg.eval_on_selector(sl,f"(e)=>{{e.value='{v}';e.dispatchEvent(new Event('input',{{bubbles:true}}))}}")
    print("area tec:", pg.inner_text("#av_tec"))
    pg.click('#dlg [data-a="slClear"][data-k="tec"][data-i="0"]'); print("area tec after clear:", pg.inner_text("#av_tec"))
    pg.fill('#dlg [name=by]',"Mister"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200); chk(pg,"atleta eval")
    print("radar:", pg.eval_on_selector_all("svg.radar","e=>e.length"), pg.inner_text(".areas").replace("\n"," "))
    pg.click('.acts [data-a="plEdit"]'); pg.fill('#dlg [name=birth]',"2004-05-10"); pg.fill('#dlg [name=height]',"182"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    print("ahead:", pg.inner_text(".ahead p"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","s_atleta.png"), full_page=True)
    # tests
    pg.click('nav [data-t="testes"]'); pg.wait_for_timeout(100); chk(pg,"testes")
    pg.fill('input[data-c="test"][data-p="p1"][data-k="vel"]',"4,52"); pg.keyboard.press("Tab"); pg.wait_for_timeout(150)
    pg.fill('input[data-c="test"][data-p="p3"][data-k="vel"]',"4,40"); pg.keyboard.press("Tab"); pg.wait_for_timeout(150)
    pg.fill('input[data-c="test"][data-p="p4"][data-k="vel"]',"abc"); pg.keyboard.press("Tab"); pg.wait_for_timeout(150); print("test abc:",pg.inner_text("#toast"))
    pg.click('[data-a="tmNew"]'); pg.wait_for_timeout(80); print("new moment defaults:", pg.input_value('#dlg [name=label]'), pg.input_value('#dlg [name=date]'))
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    pg.fill('input[data-c="test"][data-p="p1"][data-k="vel"]',"4,40"); pg.keyboard.press("Tab"); pg.wait_for_timeout(200)
    print("delta p1:", pg.eval_on_selector('input[data-c="test"][data-p="p1"][data-k="vel"]',"e=>e.parentElement.innerText"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","s_testes.png"), full_page=True)
    # clinical
    pg.click('nav [data-t="clinico"]'); pg.click('.bar [data-a="injNew"]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80); print("inj no pid:",pg.inner_text("#toast"))
    pg.select_option('#dlg [name=pid]',"p9"); pg.select_option('#dlg [name=zone]',"Coxa posterior"); pg.fill('#dlg [name=exp]',"2026-10-05"); pg.fill('#dlg [name=plan]',"Fisioterapia\nCorrida\nIntegrado"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200); chk(pg,"clinico")
    pg.click('input[data-c="step"][data-i="0"]'); pg.wait_for_timeout(150)
    print("clin kpis:", pg.inner_text(".kpis").replace("\n"," | "), "| meter:", pg.eval_on_selector(".meter i","e=>e.style.width"))
    pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(100); print("painel indisponiveis:", pg.inner_text(".kpi:has-text('Indisponíveis')").replace("\n"," "))
    # convocatoria with injured -> warning
    pg.click('nav [data-t="jogos"]'); pg.locator('[data-p="jogo"]').first.click(); pg.wait_for_timeout(150)
    pg.click('[data-a="call"][data-p="p9"]'); pg.wait_for_timeout(100); print("call injured:",pg.inner_text("#toast"))
    pg.click('nav [data-t="clinico"]'); pg.click('[data-a="injSt"][data-s="alta"]'); pg.wait_for_timeout(150); print(pg.inner_text("#toast")); chk(pg,"clinico alta")
    # scouting
    pg.click('nav [data-t="scouting"]'); pg.click('[data-a="scNew"]'); pg.fill('#dlg [name=name]',"João Teste"); pg.fill('#dlg [name=club]',"Clube X"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150); chk(pg,"alvo")
    pg.click('[data-a="repNew"]'); pg.select_option('#dlg [name=cur]',"4"); pg.select_option('#dlg [name=rec]',"Contratar"); pg.fill('#dlg [name=str]',"Rápido"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    print("alvo:", pg.inner_text(".phead .acts"), "|", pg.inner_text(".kpis").replace("\n"," "))
    pg.click('[data-a="back"]'); pg.fill('#scSearch',"zzz"); pg.wait_for_timeout(80); print("sc none visible:", pg.is_visible("#scNone"))
    # stats
    pg.click('nav [data-t="stats"]'); pg.click('[data-a="stSort"][data-k="g"]'); pg.wait_for_timeout(100); chk(pg,"stats")
    print("top by goals:", pg.eval_on_selector_all(".tb tbody tr","e=>e.slice(0,3).map(r=>r.querySelector('b').innerText)"))
    # export
    pg.click('nav [data-t="plantel"]')
    with pg.expect_download() as d: pg.click('[data-a="export"]')
    dl=d.value; path=dl.path(); import json; data=json.load(open(path)); print("export:", dl.suggested_filename, len(data["players"]), len(data["events"]))
    # modal dirty close
    pg.click('[data-a="plNew"]'); pg.fill('#dlg [name=name]',"X"); pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(80); print("ask open:", pg.evaluate("document.querySelector('#dlgAsk').open"))
    pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(80); print("dlg closed:", not pg.evaluate("document.querySelector('#dlg').open"))
    # persist reload
    pg.reload(); pg.wait_for_timeout(500); print("after reload tab:", pg.evaluate("S.tab") if False else pg.inner_text('nav [aria-selected=true]'))
    b.close()
print("ERRORS:",errs)

import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
URL="file://"+DIST+"/app_local.html"
errs=[]
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":950},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1500)
    for t in ["painel","agenda","treinos","jogos","plantel","testes","clinico","scouting","adv","stats"]:
        pg.click(f'nav [data-t="{t}"]'); pg.wait_for_timeout(250); chk(pg,t)
    print("separadores:", pg.eval_on_selector_all("nav.tabs button","e=>e.map(x=>x.innerText.replace(/\\d+$/,''))"))
    # staff no plantel
    pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(300)
    print("staff:", pg.eval_on_selector_all('[data-a="stfEdit"] b',"e=>e.map(x=>x.innerText)"))
    pg.click('[data-a="stfEdit"] >> nth=1'); pg.wait_for_timeout(200); pg.fill('#dlg [name=role]',"Treinador adjunto (sub)"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    # treino: presenças staff
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="newEvent"][data-type="treino"]'); pg.fill('#dlg [name=date]',"2026-09-22"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400); chk(pg,"treino")
    pg.click('[data-a="sattAll"]'); pg.wait_for_timeout(200); print(pg.inner_text("#toast"))
    pg.click('[data-a="satt"][data-p="st03"][data-s="FJ"]'); pg.wait_for_timeout(200)
    print("staff presenças:", pg.inner_text('.card-h:has-text("equipa técnica") .sub'))
    pg.click('[data-a="exPick"]'); pg.wait_for_timeout(700); pg.click('#pickGrid .pick >> nth=3'); pg.wait_for_timeout(200); pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(300)
    # PDF: descarregar com 150%
    pg.click('[data-a="prPlan"]'); pg.wait_for_timeout(200)
    pg.click('#dlg [data-a="prScale"][data-k="150"]')
    with pg.expect_download() as d: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    dl=d.value; html=open(dl.path()).read()
    print("descarregado:", dl.suggested_filename, "| zoom 1.5:", "zoom:1.5" in html, "| sem print automático:", "window.print" not in html, "| imagem:", html.count("<img"))
    pg.click('[data-a="prTrain"]'); pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(d.value.path()).read(); print("relatório com staff:", "Equipa técnica" in html and "Tiago Isidoro" in html and "Falta justificada" in html)
    # abrir numa aba
    pg.click('[data-a="prPlan"]'); pg.wait_for_timeout(200)
    with ctx.expect_page() as pop: pg.click('#dlg [data-a="prGo"][data-k="open"]')
    p2=pop.value; p2.wait_for_load_state(); print("aba:", p2.title()); p2.close()
    # adversário a partir do jogo
    pg.click('nav [data-t="jogos"]'); pg.click('[data-id="jg_j1"]'); pg.wait_for_timeout(300)
    pg.click('[data-a="oppFromGame"]'); pg.wait_for_timeout(400); chk(pg,"adversário")
    print("ficha:", pg.inner_text(".phead h2"), "| tab:", pg.inner_text('nav [aria-selected=true]'))
    pg.select_option('select[data-f="formation"]',"4-4-2"); pg.wait_for_timeout(200)
    pg.fill('textarea[data-f="strong"]',"Bola longa para o 9, forte no jogo aéreo"); pg.click("h2"); pg.wait_for_timeout(300)
    pg.click('[data-a="oppKeyNew"]'); pg.fill('#dlg [name=name]',"Avançado alto"); pg.fill('#dlg [name=n]',"9"); pg.select_option('#dlg [name=pos]',"PL"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    pg.click('[data-a="oppRepNew"]'); pg.fill('#dlg [name=txt]',"Observado em vídeo."); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    print("jogadores/obs:", pg.eval_on_selector_all('[data-a="oppKeyEdit"]',"e=>e.length"), pg.eval_on_selector_all('[data-a="oppRepEdit"]',"e=>e.length"), "| jogo ligado:", pg.eval_on_selector_all('.card:has-text("Observações e jogos") [data-p="jogo"]',"e=>e.length"))
    pg.click('[data-a="prOpp"]'); pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(d.value.path()).read(); print("PDF adversário:", "4-4-2" in html and "Avançado alto" in html and "Bola longa" in html)
    # voltar ao jogo e reabrir a mesma ficha (não duplica)
    pg.click('nav [data-t="jogos"]'); pg.click('[data-id="jg_j1"]'); pg.wait_for_timeout(300); pg.click('[data-a="oppFromGame"]'); pg.wait_for_timeout(300)
    pg.click('nav [data-t="adv"]'); pg.wait_for_timeout(300); print("adversários:", pg.eval_on_selector_all('[data-p="adversario"]',"e=>e.length"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","d_adv.png"), full_page=True)
    pg.click('[data-p="adversario"] >> nth=0'); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(ROOT,"tests","capturas","d_adv2.png"), full_page=True)
    b.close()
print("ERRORS",errs)

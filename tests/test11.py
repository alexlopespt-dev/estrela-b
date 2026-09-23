import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
URL="file://"+DIST+"/app_local.html"
errs=[]
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":950})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1500)
    for t in ["painel","agenda","treinos","jogos","plantel","testes","clinico","scouting","stats"]:
        pg.click(f'nav [data-t="{t}"]'); pg.wait_for_timeout(250); chk(pg,t)
    pg.click('nav [data-t="treinos"]')
    for k in ["sessoes","plan","modelo","ex","pres"]:
        pg.click(f'[data-a="tsub"][data-k="{k}"]'); pg.wait_for_timeout(400); chk(pg,"tsub "+k)
    pg.click('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(600)
    print("exercícios:", pg.eval_on_selector_all(".ex","e=>e.length"), "| com foto:", pg.eval_on_selector_all(".ex .exthumb img","e=>e.length"), "| com desenho:", pg.eval_on_selector_all(".ex .exthumb svg","e=>e.length"))
    print("categorias:", pg.eval_on_selector_all('[data-a="exCat"]',"e=>e.map(x=>x.innerText)"))
    # duplicados por nome
    names=pg.eval_on_selector_all(".ex b","e=>e.map(x=>x.innerText)")
    from collections import Counter
    dup=[n for n,c in Counter(names).items() if c>1]
    print("nomes repetidos:", dup)
    pg.click('.ex:has-text("Rondo 5x2") >> nth=0'); pg.wait_for_timeout(300)
    print("novo exercício:", pg.eval_on_selector_all("#dlg svg","e=>e.length"), "svg |", pg.inner_text("#dlg .dlg-b").replace("\n"," ")[:150])
    pg.click('#dlg [data-a="mClose"]')
    # momentos + microciclos
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="modelo"]'); pg.wait_for_timeout(300)
    print("momentos:", pg.eval_on_selector_all(".card-h h3","e=>e.map(x=>x.innerText)")[1:7])
    for m,name in [("oo","Saída curta"),("od","Bloco médio"),("tro","Sair em passe"),("trd","Reação à perda"),("fbp","Canto ofensivo")]:
        pg.click(f'[data-a="prNew"][data-m="{m}"]'); pg.fill('#dlg [name=name]',name); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    # treino com plano
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="weekGen"]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="sessoes"]'); pg.wait_for_timeout(300); pg.locator('[data-p="treino"]').first.click(); pg.wait_for_timeout(300)
    pg.click('[data-a="exPick"]'); pg.wait_for_timeout(800)
    print("picker:", pg.eval_on_selector_all("#pickGrid .pick","e=>e.length"), "| imagens:", pg.eval_on_selector_all("#pickGrid .pick img","e=>e.length"))
    pg.fill('#pickSearch',"rondo 5x2"); pg.wait_for_timeout(300)
    pg.click('#pickGrid .pick:visible >> nth=0'); pg.wait_for_timeout(200)
    pg.fill('#pickSearch',"reação à perda"); pg.wait_for_timeout(300)
    vis=pg.eval_on_selector_all("#pickGrid .pick","e=>e.filter(x=>x.style.display!=='none').length")
    if vis: pg.click('#pickGrid .pick:visible >> nth=0'); pg.wait_for_timeout(200)
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(300)
    sels=pg.locator('.plan select[data-f=pr]')
    print("blocos:", sels.count())
    sels.nth(0).select_option(label="Saída curta"); pg.wait_for_timeout(200)
    if sels.count()>1: sels.nth(1).select_option(label="Reação à perda"); pg.wait_for_timeout(200)
    for i in range(sels.count()):
        pg.fill(f'.plan >> nth={i} >> input[data-f=min]', "25"); pg.keyboard.press("Tab"); pg.click("h2"); pg.wait_for_timeout(200)
    # data do treino no passado para contar
    pg.fill('input[data-f="date"]',"2026-09-18"); pg.click("h2"); pg.wait_for_timeout(300)
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="plan"]'); pg.wait_for_timeout(500); chk(pg,"plan")
    print("distribuição:", pg.inner_text('.card:has-text("O que temos trabalhado") .card-b').replace("\n"," | ")[:400])
    pg.click('[data-a="cycPer"][data-k="Competitivo"] >> nth=0'); pg.wait_for_timeout(400); chk(pg,"periodo")
    print("após período:", pg.inner_text('.card:has-text("Microciclos por período") table').replace("\n"," ")[:220])
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","d_dist.png"), full_page=True)
    b.close()
print("ERRORS",errs)

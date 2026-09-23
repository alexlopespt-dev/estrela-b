import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
URL="file://"+DIST+"/app_local.html"
errs=[]
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
def LS(pg): return pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1'))")
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1200,"height":950}); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("MAIN "+str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    # princípios + treino com plano
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="modelo"]'); pg.wait_for_timeout(100); chk(pg,"modelo")
    print("momentos:", pg.eval_on_selector_all(".card-h h3","e=>e.map(x=>x.innerText)")[:9])
    for m,name in [("od","Bloco defensivo médio"),("tro","Saída rápida"),("fbp","Defesa de cantos"),("fbp","Lançamentos laterais")]:
        pg.click(f'[data-a="prNew"][data-m="{m}"]'); pg.fill('#dlg [name=name]',name); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(120)
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="newEvent"][data-type="treino"]'); pg.fill('#dlg [name=date]',"2026-09-18"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(250)
    pg.fill('input[data-f="theme"]',"Organização defensiva"); pg.click("h2"); pg.wait_for_timeout(200)
    opts=pg.eval_on_selector_all('select[data-c="planAdd"] option',"e=>e.map(o=>o.textContent)")
    for lbl in ["Rondo","Transição defensiva","Bolas paradas ofensivas"]:
        m=[o for o in opts if o.startswith(lbl)]
        if m: pg.select_option('select[data-c="planAdd"]', label=m[0]); pg.wait_for_timeout(120)
    sels=pg.locator('.plan select[data-f=pr]')
    sels.nth(0).select_option(label="Bloco defensivo médio"); pg.wait_for_timeout(150)
    sels.nth(1).select_option(label="Saída rápida"); pg.wait_for_timeout(150)
    sels.nth(2).select_option(label="Defesa de cantos"); pg.wait_for_timeout(150)
    for i,mins in enumerate([20,25,15]):
        pg.fill(f'.plan >> nth={i} >> input[data-f=min]',str(mins)); pg.keyboard.press("Tab"); pg.click("h2"); pg.wait_for_timeout(150)
    # presenças + avaliação individual
    pg.click('[data-a="attAll"]'); pg.wait_for_timeout(200)
    pg.fill('input.rpe[data-p="p1"]',"7"); pg.click("h2"); pg.wait_for_timeout(150)
    pg.fill('input[data-c="tev"][data-p="p1"][data-f="r"]',"8"); pg.click("h2"); pg.wait_for_timeout(200)
    pg.fill('input[data-c="tev"][data-p="p1"][data-f="t"]',"Muito bem na saída de bola"); pg.click("h2"); pg.wait_for_timeout(200)
    print("avaliados:", pg.inner_text('.card-h:has-text("Avaliação individual") .sub'))
    pg.fill('input[data-c="tev"][data-p="p3"][data-f="r"]',"12"); pg.click("h2"); pg.wait_for_timeout(200); print("nota 12:", pg.inner_text("#toast"))
    # um a um
    pg.click('[data-a="tevAll"]'); pg.wait_for_timeout(200)
    print("modal:", pg.inner_text("#dlg h3"), "| nota pré:", pg.input_value("#tevR"))
    pg.click('#dlg [data-a="tevRate"][data-n="7"]'); pg.wait_for_timeout(200)
    pg.fill('#tevT',"Boa atitude"); pg.click('#dlg [data-a="tevNext"]'); pg.wait_for_timeout(250)
    print("2.º:", pg.inner_text("#dlg h3"))
    pg.click('#dlg [data-a="tevRate"][data-n="6.5"]'); pg.wait_for_timeout(150)
    pg.click('#dlg [data-a="tevPrev"]'); pg.wait_for_timeout(200)
    print("volta:", pg.inner_text("#dlg h3"), "| nota:", pg.input_value("#tevR"), "| obs:", pg.input_value("#tevT"))
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    st=LS(pg); tr=[v for v in st["events"].values() if v["type"]=="treino" and v["date"]=="2026-09-18"][0]
    print("pev:", {k:v for k,v in list(tr["pev"].items())[:3]})
    # PDFs
    tid=[k for k,v in st["events"].items() if v["type"]=="treino" and v["date"]=="2026-09-18"][0]
    for act,name in [("prPlan","plano"),("prTrain","relatorio")]:
        pg.click(f'[data-a="{act}"]'); pg.wait_for_timeout(200)
        with ctx.expect_page() as popup:
            pg.click('#dlg [data-a="prGo"][data-k="open"]')
        p2=popup.value; p2.wait_for_load_state(); p2.wait_for_timeout(400)
        print(name, "->", p2.title(), "|", len(p2.content()), "bytes |", p2.inner_text("h1"))
        p2.screenshot(path=os.path.join(ROOT,"tests","capturas",f"pdf_{name}.png"), full_page=True); p2.close()
    pg.click('nav [data-t="plantel"]'); pg.click('[data-p="atleta"][data-id="p9"]'); pg.wait_for_timeout(200)
    pg.click('[data-a="prAth"]'); pg.wait_for_timeout(200)
    with ctx.expect_page() as popup: pg.click('#dlg [data-a="prGo"][data-k="open"]')
    p2=popup.value; p2.wait_for_load_state(); p2.wait_for_timeout(300)
    print("atleta ->", p2.title(), "| secções:", p2.eval_on_selector_all("h2","e=>e.map(x=>x.innerText)"))
    p2.screenshot(path=os.path.join(ROOT,"tests","capturas","pdf_atleta.png"), full_page=True); p2.close()
    pg.click('nav [data-t="jogos"]'); pg.click('[data-id="jg_j1"]'); pg.wait_for_timeout(200)
    pg.click('[data-a="prGame"]'); pg.wait_for_timeout(200)
    with ctx.expect_page() as popup: pg.click('#dlg [data-a="prGo"][data-k="open"]')
    p2=popup.value; p2.wait_for_load_state(); p2.wait_for_timeout(300)
    print("jogo ->", p2.title(), "| linhas ficha:", p2.eval_on_selector_all("table tbody tr","e=>e.length"))
    p2.screenshot(path=os.path.join(ROOT,"tests","capturas","pdf_jogo.png"), full_page=True); p2.close()
    # distribuição
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="plan"]'); pg.wait_for_timeout(250); chk(pg,"plan")
    print("distrib:", pg.inner_text('.card:has-text("O que temos trabalhado") .card-b').replace("\n"," | ")[:400])
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","d_distrib.png"))
    pg.click('[data-a="tsub"][data-k="modelo"]'); pg.wait_for_timeout(200); chk(pg,"modelo2")
    print("modelo:", pg.inner_text('.card >> nth=0 >> .card-b').replace("\n"," | ")[:300])
    b.close()
print("ERRORS",errs)

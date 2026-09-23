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
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1200,"height":950})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.click('nav [data-t="jogos"]'); pg.click('[data-id="jg_j1"]'); pg.wait_for_timeout(150)
    pg.click('[data-a="quick"]'); pg.wait_for_timeout(200)
    print("step1 pre-selected:", pg.eval_on_selector_all('#dlg .tile.xi',"e=>e.length"), "titulares,", pg.eval_on_selector_all('#dlg .tile.on',"e=>e.length"), "suplentes")
    pg.click('#dlg [data-a="qStart"]'); pg.wait_for_timeout(150)
    print("p1:", pg.inner_text("#dlg h3"), "|", pg.inner_text("#dlg .dlg-h p"), "| rate:", pg.input_value("#qRate"), "| min:", pg.input_value("#qMin"))
    pg.click('#dlg [data-a="qRate"][data-n="7.5"]'); pg.wait_for_timeout(100)
    pg.click('#dlg [data-a="qFine"][data-n="0.1"]'); pg.wait_for_timeout(100)
    print("after fine:", pg.input_value("#qRate"))
    pg.click('#dlg [data-a="qInc"][data-k="g"]'); pg.click('#dlg [data-a="qInc"][data-k="g"]'); pg.click('#dlg [data-a="qDec"][data-k="g"]'); pg.wait_for_timeout(150)
    print("golos:", pg.eval_on_selector('#dlg .stepper:has-text("Golos") output',"e=>e.innerText"))
    pg.click('#dlg [data-a="qNext"]'); pg.wait_for_timeout(150); print("p2:", pg.inner_text("#dlg h3"))
    # jump to end
    for _ in range(20):
        if "Rever jogo" in pg.inner_text('#dlg [data-a="qNext"]'):
            pg.click('#dlg [data-a="qNext"]'); break
        pg.click('#dlg [data-a="qNext"]'); pg.wait_for_timeout(60)
    pg.wait_for_timeout(200); print("resumo:", pg.inner_text("#dlg h3"), "| linhas:", pg.eval_on_selector_all("#dlg .li","e=>e.length"))
    pg.click('#dlg .li >> nth=0'); pg.wait_for_timeout(150); print("volta ao jogador:", pg.inner_text("#dlg h3"))
    pg.click('#dlg [data-a="qNext"]') 
    for _ in range(25):
        if "Rever jogo" in (pg.inner_text('#dlg [data-a="qNext"]') if pg.locator('#dlg [data-a="qNext"]').count() else "Rever jogo"):
            break
        pg.click('#dlg [data-a="qNext"]'); pg.wait_for_timeout(50)
    if pg.locator('#dlg [data-a="qNext"]').count(): pg.click('#dlg [data-a="qNext"]')
    pg.wait_for_timeout(150)
    pg.click('#dlg [data-a="qSave"]'); pg.wait_for_timeout(300); chk(pg,"jogo após quick")
    g=LS(pg)["events"]["jg_j1"]
    print("rt Abbiati:", g["rt"]["p1"], "| minOv:", g.get("minOv",{}).get("p1"), "| golos Abbiati:", len([e for e in g["ev"] if e["t"]=="golo" and e["pid"]=="p1"]))
    print("golos totais:", len([e for e in g["ev"] if e["t"]=="golo"]), "| assists:", len([e for e in g["ev"] if e["t"]=="assist"]))
    rows=pg.evaluate("""[...document.querySelectorAll('section.card')].find(s=>s.querySelector('h3')&&s.querySelector('h3').innerText.startsWith('4.')).querySelectorAll('.tb tbody tr')""")
    print("ficha Alves:", pg.eval_on_selector('.tb tbody tr:has-text("Alves")',"e=>e.innerText.replace(/\\s+/g,' ')")[:90])
    print("botão recalcular:", pg.locator('[data-a="minAuto"]').count())
    pg.click('[data-a="minAuto"]'); pg.wait_for_timeout(200)
    print("Abbiati min após recalcular:", pg.eval_on_selector('.tb tbody tr:has-text("Abbiati")',"e=>e.innerText.replace(/\\s+/g,' ')")[:60])
    # grelha
    pg.click('nav [data-t="stats"]'); pg.click('[data-a="ssub"][data-k="grelha"]'); pg.wait_for_timeout(200); chk(pg,"grelha")
    print("grelha:", pg.eval_on_selector_all(".tb thead th","e=>e.map(x=>x.innerText).join('|')"))
    print("1.ª linha:", pg.eval_on_selector(".tb tbody tr","e=>e.innerText.replace(/\\s+/g,' ')")[:80], "| estrelas:", pg.eval_on_selector_all(".rt.best","e=>e.length"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","d_grelha.png"))
    # importar da app de ratings
    pg.click('nav [data-t="plantel"]')
    pg.set_input_files("#jsonIn",os.path.join(ROOT,"tests","ratings_exemplo.json")); pg.wait_for_timeout(300)
    print("ask:", pg.inner_text("#dlgAsk").replace("\n"," ")[:110])
    pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(400); chk(pg,"após import")
    print(pg.inner_text("#toast"))
    st=LS(pg); gs={k:v for k,v in st["events"].items() if v["type"]=="jogo"}
    print("jogos:", [(v.get("opp"),v.get("date"),v.get("phase"),v.get("ga")) for v in gs.values()])
    j1=st["events"]["jg_j1"]; print("J1 rt p9:", j1["rt"]["p9"], "| minOv p9:", j1.get("minOv",{}).get("p9"), "| golos p9:", len([e for e in j1["ev"] if e["t"]=="golo" and e["pid"]=="p9"]))
    print("novo atleta:", [p["name"] for p in st["players"].values() if p["name"]=="Novato"])
    pg.click('nav [data-t="stats"]'); pg.click('[data-a="ssub"][data-k="por"]'); pg.wait_for_timeout(200); chk(pg,"stats após import")
    print("kpis:", pg.inner_text(".kpis").replace("\n"," ")[:150])
    b.close()
print("ERRORS",errs)

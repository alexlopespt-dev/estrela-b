import os, json, datetime as dt
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Carga planeada vs. real no microciclo (cálculo, alerta "acima do habitual", dias, jogo) e relatório semanal em PDF.
errs=[]
LSK="estrela-tecnico-v1"
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1180,"height":950},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1000)
    d=json.loads(pg.evaluate(f"localStorage.getItem('{LSK}')")); pls=list(d["players"])
    mon=dt.date(2026,8,24); ints=["Média","Alta","Alta","Baixa"]
    for w in range(5):
        s=mon+dt.timedelta(days=7*w); e=s+dt.timedelta(days=6)
        d["cycles"][f"mc{w}"]={"kind":"micro","name":f"Microciclo T{w+1}","start":s.isoformat(),"end":e.isoformat(),"period":"Competitivo","obj":"Objetivo teste"}
        for k in range(4):
            day=s+dt.timedelta(days=1+k); rpe=[5,7,7,3][k]+(2 if w==4 else 0)
            d["events"][f"tr{w}{k}"]={"type":"treino","date":day.isoformat(),"dur":90,"int":ints[k],"ttype":"fp","theme":f"T{k}",
              "plan":[{"ex":"exi131","name":"L","min":30,"mom":["oo"]},{"ex":"exi132","name":"V","min":40,"mom":["tro"]}],
              "att":{**{p:{"s":"P","rpe":rpe} for p in pls[:18]},pls[19]:{"s":"FJ"}},"pev":{pls[0]:{"r":8},pls[1]:{"r":7}}}
    d["injuries"]["in_t"]={"pid":pls[3],"date":"2026-09-22","type":"Muscular","zone":"Coxa posterior","status":"ativa","diag":"Contratura","exp":"2026-10-05"}
    pg.evaluate(f"localStorage.setItem('{LSK}',JSON.stringify({json.dumps(d)}))"); pg.reload(); pg.wait_for_timeout(1000)
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="plan"]'); pg.wait_for_timeout(300)
    pg.click('[data-a="distSel"][data-k="mc4"]'); pg.wait_for_timeout(400)
    t=pg.inner_text('section.card:has-text("planeada vs. real")'); print(t[:200].replace("\n"," | "))
    # planeada: (5+7+7+3)×70 = 1540; real: (7+9+9+5)×90 = 2700; habitual: (5+7+7+3)×90 = 1980 → +36%
    if "Microciclo T5" not in t or "1540 UA" not in t or "2700 UA" not in t or "36% acima" not in t or "1980 UA" not in t: errs.append("contas "+t[:200])
    pg.click('[data-a="distSel"][data-k="mc1"]'); pg.wait_for_timeout(300)
    t2=pg.inner_text('section.card:has-text("planeada vs. real")'); print("microciclo normal:", "acima" in t2)
    if "acima" in t2: errs.append("alerta a mais")
    print("barras:", pg.eval_on_selector_all('section.card:has-text("planeada vs. real") svg path',"e=>e.length"))
    pg.click('[data-a="distSel"][data-k="mc4"]'); pg.wait_for_timeout(300)
    pg.click('[data-a="prWeek"]'); pg.wait_for_timeout(200)
    with pg.expect_download() as dl: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    h=open(dl.value.path()).read()
    need=["Relatório semanal — Microciclo T5","Carga planeada vs. real","Treinos","Momentos trabalhados","Lesões","Contratura","Destaques individuais","Presenças","Objetivo teste","vs CAC"]
    miss=[x for x in need if x not in h]; print("relatório — em falta:", miss, "| sem print automático:", "window.print" not in h)
    if miss: errs.append("relatório "+str(miss))
    out=os.path.join(ROOT,"tests","capturas","t27_semana.html"); open(out,"w").write(h)
    p2=ctx.new_page(); p2.goto("file://"+out); p2.wait_for_timeout(800); p2.pdf(path=os.path.join(ROOT,"tests","capturas","t27_semana.pdf"),format="A4",print_background=True); os.remove(out)
    # sem microciclos: semana atual, sem erros
    d2=json.loads(pg.evaluate(f"localStorage.getItem('{LSK}')")); d2["cycles"]={}
    pg.evaluate(f"localStorage.setItem('{LSK}',JSON.stringify({json.dumps(d2)}))"); pg.reload(); pg.wait_for_timeout(900)
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="plan"]'); pg.wait_for_timeout(300)
    print("sem microciclos:", pg.inner_text("section.card:has-text(\"planeada vs. real\") .card-h"))
    b.close()
print("ERRORS",errs)

import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Momentos nos exercícios (OF OD TO TD BP) e gráfico circular do "O que temos trabalhado":
# guardar/editar momentos, tempo dividido pelos momentos, 100% num só momento, princípios têm prioridade, objetivo com linhas.
errs=[]
LSK="estrela-tecnico-v1"
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":950})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1000)
    LS=lambda: pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}'))")
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(400)
    def moms(exid,ks):
        pg.click(f'[data-a="exView"][data-id="{exid}"]'); pg.wait_for_timeout(200); pg.click('#dlg [data-a="exEdit"]'); pg.wait_for_timeout(300)
        for m in ("oo","od","tro","trd","fbp"): pg.set_checked(f'#dlg [name=mom_{m}]', m in ks)
        pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    moms("exi130",["od"]); moms("exi131",["oo","tro"])
    x=LS()["exercises"]; print("guardado:", x["exi130"].get("mom"), x["exi131"].get("mom"), "| objetivo com linhas:", "\n" in x["exi131"]["obj"])
    if x["exi130"].get("mom")!=["od"] or x["exi131"].get("mom")!=["oo","tro"] or "\n" not in x["exi131"]["obj"]: errs.append("guardar momentos")
    print("etiquetas no cartão:", pg.inner_text('[data-a="exView"][data-id="exi131"] .meta'))
    moms("exi130",["od","fbp"]); moms("exi130",["od"])   # editar e voltar atrás
    # treino passado com 10' só OD e 20' OF+TO
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="newEvent"][data-type="treino"]'); pg.fill('#dlg [name=date]',"2026-09-22"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
    tid=[k for k,v in LS()["events"].items() if v.get("date")=="2026-09-22" and v["type"]=="treino"][0]
    pg.evaluate(f"""(()=>{{ const d=JSON.parse(localStorage.getItem('{LSK}')); d.events['{tid}'].plan=[{{ex:'exi130',name:'Meinhos',min:10}},{{ex:'exi131',name:'L',min:20}},{{ex:'exi001',name:'sem momento',min:15}}]; localStorage.setItem('{LSK}',JSON.stringify(d)); }})()""")
    pg.reload(); pg.wait_for_timeout(900); pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="plan"]'); pg.wait_for_timeout(400)
    leg=pg.inner_text(".mleg >> nth=-1").split("\n"); print("legenda:", leg)
    txt=" ".join(leg)
    if "33.3%" not in txt or "OD" not in txt: errs.append("percentagens "+txt)
    print("nota:", pg.inner_text(".card-b > p.note"))
    if "67%" not in pg.inner_text(".card-b > p.note"): errs.append("tempo com momento")
    print("fatias:", pg.eval_on_selector_all(".mpie >> nth=-1 >> svg path","e=>e.map(p=>p.getAttribute('fill'))"))
    if len(pg.eval_on_selector_all(".mpie >> nth=-1 >> svg path","e=>e")) !=3: errs.append("fatias")
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t24_momentos.png"))
    # um só momento: círculo completo
    pg.evaluate(f"""(()=>{{ const d=JSON.parse(localStorage.getItem('{LSK}')); d.events['{tid}'].plan=[{{ex:'exi130',name:'Meinhos',min:10}}]; localStorage.setItem('{LSK}',JSON.stringify(d)); }})()""")
    pg.reload(); pg.wait_for_timeout(900); pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="plan"]'); pg.wait_for_timeout(400)
    n=pg.eval_on_selector_all(".mpie >> nth=-1 >> svg path","e=>e.length"); print("só OD — fatias:", n, "|", pg.eval_on_selector(".mpie >> nth=-1 >> svg","e=>e.textContent"))
    if n!=1: errs.append("círculo completo")
    # telemóvel e ecrã baixo
    pg.set_viewport_size({"width":390,"height":800}); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t24_tlm.png"))
    w=pg.evaluate("document.documentElement.scrollWidth"); print("largura no telemóvel:", w)
    if w>392: errs.append("transborda no telemóvel")
    b.close()
print("ERRORS",errs)

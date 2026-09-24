import os, sys, json, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Desenhos vetoriais dos exercícios: biblioteca, ficha (vetorial/original), seletor, PDF do plano, foto própria por cima.
errs=[]
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
V=json.load(open(os.path.join(ROOT,"data","exercicios_vetor.json")))
IM=json.load(open(os.path.join(ROOT,"data","exercicios_imagens.json")))
print("desenhos:", len(V), "| imagens:", len(IM), "| todas cobertas:", set(IM)<=set(V))
if not set(IM)<=set(V): errs.append("imagens sem desenho: "+str(sorted(set(IM)-set(V))))
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":950},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1500)
    LSK="estrela-tecnico-v1"
    DB=lambda: pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}'))")
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(800); chk(pg,"biblioteca")
    srcs=pg.eval_on_selector_all(".exthumb img","e=>e.map(x=>x.getAttribute('src'))")
    nv=sum(1 for s in srcs if s.startswith("data:image/svg+xml")); print("miniaturas:", len(srcs), "| vetoriais:", nv)
    if nv<100: errs.append("miniaturas vetoriais")
    # todos os desenhos são SVG válido e o browser consegue desenhá-los
    res=pg.evaluate("""async(l)=>{ const bad=[]; for(const s of l){ const x=decodeURIComponent(s.split(',')[1]);
        if(new DOMParser().parseFromString(x,'image/svg+xml').querySelector('parsererror')){ bad.push('xml'); continue; }
        const im=new Image(); im.src=s; try{ await im.decode(); if(!im.naturalWidth) bad.push('w'); }catch(e){ bad.push('decode'); } }
      return bad; }""", [s for s in srcs if s.startswith("data:image/svg")])
    print("SVG com problemas:", res)
    if res: errs.append("svg "+str(res))
    pg.wait_for_timeout(500)
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t17_biblioteca.png"))
    # ficha: alternar para a imagem original e voltar
    xid=[k for k,x in DB()["exercises"].items() if x.get("imgk")=="exi014"][0]
    pg.click(f'[data-a="exView"][data-id="{xid}"]'); pg.wait_for_timeout(300)
    s1=pg.get_attribute("#dlg img","src")[:26]; print("ficha:", s1)
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t17_ficha.png"))
    pg.click('#dlg [data-a="exvMode"][data-k="o"]'); pg.wait_for_timeout(300)
    s2=pg.get_attribute("#dlg img","src")[:22]; print("original:", s2, "| guardado:", pg.evaluate(f"localStorage.getItem('{LSK}:exv')"))
    if not s1.startswith("data:image/svg") or not s2.startswith("data:image/jpeg"): errs.append("alternar desenho")
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(300)
    print("biblioteca em originais:", pg.eval_on_selector_all(".exthumb img","e=>e.filter(x=>x.src.startsWith('data:image/jpeg')).length"))
    pg.reload(); pg.wait_for_timeout(1200); pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(600)
    n_o=pg.eval_on_selector_all(".exthumb img","e=>e.filter(x=>x.src.startsWith('data:image/jpeg')).length"); print("mantém após recarregar:", n_o)
    if n_o<100: errs.append("modo não guardado")
    pg.click(f'[data-a="exView"][data-id="{xid}"]'); pg.wait_for_timeout(300); pg.click('#dlg [data-a="exvMode"][data-k="v"]'); pg.wait_for_timeout(300); pg.click('#dlg [data-a="mClose"]')
    # foto própria tem prioridade (sem botões de alternar)
    d=DB(); pid=[k for k,x in d["exercises"].items() if x.get("imgk")=="exi020"][0]; pname=d["exercises"][pid]["name"]
    d["exercises"][pid]["img"]=IM["exi001"]; pg.evaluate(f"localStorage.setItem('{LSK}',JSON.stringify({json.dumps(d)}))")
    pg.reload(); pg.wait_for_timeout(1200); pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(600)
    pg.click(f'[data-a="exView"][data-id="{pid}"]'); pg.wait_for_timeout(300)
    print("foto própria:", pg.get_attribute("#dlg img","src")[:22], "| sem alternar:", pg.eval_on_selector_all('#dlg [data-a="exvMode"]',"e=>e.length")==0)
    if pg.eval_on_selector_all('#dlg [data-a="exvMode"]',"e=>e.length") or not pg.get_attribute("#dlg img","src").startswith("data:image/jpeg"): errs.append("foto própria")
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    # plano: seletor e PDF com SVG embutido
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="newEvent"][data-type="treino"]'); pg.fill('#dlg [name=date]',"2026-09-29"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400); chk(pg,"treino")
    pg.click('[data-a="exPick"]'); pg.wait_for_timeout(700)
    print("seletor vetorial:", pg.eval_on_selector_all("#pickGrid .pick img","e=>e.filter(x=>x.src.startsWith('data:image/svg')).length"))
    for k in ("exi014","exi050","exi129"):
        x=[i for i,e in DB()["exercises"].items() if e.get("imgk")==k][0]; pg.click(f'#pickGrid .pick[data-x="{x}"]'); pg.wait_for_timeout(200)
    pg.click(f'#pickGrid .pick[data-x="{pid}"]'); pg.wait_for_timeout(200)
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(300)
    pg.click('[data-a="prPlan"]'); pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(d.value.path()).read()
    nsvg=len(re.findall(r'<svg viewBox="0 0 440 302"',html)); nimg=html.count('<img src="data:image/jpeg')
    print("PDF: desenhos SVG", nsvg, "| fotos", nimg, "| ids únicos:", len(set(re.findall(r'id="(net\w+)"',html)))==len(re.findall(r'id="(net\w+)"',html)))
    if nsvg<2 or nimg<1 or '<svg viewBox="0 0 420 605"' not in html: errs.append("PDF plano")
    out=os.path.join(ROOT,"tests","capturas","t17_plano.html"); open(out,"w").write(html)
    p2=ctx.new_page(); p2.goto("file://"+out); p2.wait_for_timeout(1500)
    p2.pdf(path=os.path.join(ROOT,"tests","capturas","t17_plano.pdf"),format="A4",print_background=True); p2.close()
    os.remove(out)
    b.close()
print("ERRORS",errs)

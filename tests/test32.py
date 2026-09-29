import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Quem alterou: identificar o dispositivo, carimbo _by/_at em cada alteração feita aqui, nunca nas automáticas nem em meta,
# "Última alteração" nas fichas e "Últimas alterações" no Plantel (filtro por dispositivo). Bolas paradas dentro de Jogos.
errs=[]
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
def LS(pg): return pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1'))")
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(2200)
    st=LS(pg)
    auto=[c+"/"+i for c in st for i,x in st[c].items() if isinstance(x,dict) and "_by" in x]
    print("carimbos depois das atualizações automáticas:", len(auto))
    if auto: errs.append("atualizações automáticas carimbadas: "+", ".join(auto[:3]))
    # aviso no painel até o dispositivo se identificar
    if not pg.query_selector('#main [data-a="meCfg"]'): errs.append("sem aviso para identificar")
    # alteração antes de identificar: fica com o tipo de dispositivo "(sem nome)"
    pg.click('nav [data-t="adv"]'); pg.wait_for_timeout(300); pg.locator('[data-p="adversario"]').first.click(); pg.wait_for_timeout(400)
    oid=pg.evaluate("S=>0") if False else None
    f=pg.locator('#main textarea').first; f.fill("Pressão alta"); f.evaluate("e=>e.dispatchEvent(new Event('change',{bubbles:true}))"); pg.wait_for_timeout(300)
    st=LS(pg); op=[x for x in st["opponents"].values() if x.get("_by")]
    print("sem nome:", op[0]["_by"] if op else None)
    if not op or "(sem nome)" not in op[0]["_by"]: errs.append("carimbo sem nome")
    # identificar: pessoa + dispositivo
    pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(200); pg.click('#main [data-a="meCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=nome]',"Alexandre Lopes"); pg.fill('#dlg [name=disp]',"MacBook Pro"); pg.wait_for_timeout(100)
    prev=pg.inner_text("#mePrev"); print("pré-visualização:", prev)
    if prev!="MacBook Pro de Alexandre": errs.append("pré-visualização")
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300); chk(pg,"painel")
    if pg.query_selector('#main [data-a="meCfg"]'): errs.append("aviso continua depois de identificar")
    # alteração num treino novo -> carimbo com o nome; aparece na ficha
    pg.click('.bar [data-a="newEvent"][data-type="treino"]'); pg.fill('#dlg [name=date]',"2026-09-18"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    st=LS(pg); tr=[(i,x) for i,x in st["events"].items() if x.get("type")=="treino" and x.get("date")=="2026-09-18"]
    print("treino:", tr[0][1].get("_by") if tr else None, tr[0][1].get("_at","")[:16] if tr else None)
    if not tr or tr[0][1].get("_by")!="MacBook Pro de Alexandre" or not tr[0][1].get("_at"): errs.append("carimbo treino")
    if any("_by" in (x or {}) for x in st["meta"].values()): errs.append("meta carimbado")
    pg.click('nav [data-t="treinos"]'); pg.wait_for_timeout(200); pg.click(f'[data-a="page"][data-id="{tr[0][0]}"]'); pg.wait_for_timeout(300)
    t=pg.inner_text(".edby") if pg.query_selector(".edby") else ""; print("ficha:", t)
    if "MacBook Pro de Alexandre" not in t: errs.append("última alteração na ficha")
    # outro dispositivo (simulado: carimbo vindo da partilha) + lista no Plantel com filtro
    pg.evaluate("""()=>{ const k='estrela-tecnico-v1', d=JSON.parse(localStorage.getItem(k)); const id=Object.keys(d.players)[0];
      d.players[id]._by='iPad de Tiago'; d.players[id]._at=new Date(Date.now()-3600e3).toISOString();
      Object.keys(d.players).slice(1,8).forEach((j,i)=>{ d.players[j]._by='Portátil de João'; d.players[j]._at=new Date(Date.now()-7200e3-i*60e3).toISOString(); });
      localStorage.setItem(k,JSON.stringify(d)); }""")
    pg.reload(); pg.wait_for_timeout(2200)
    pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(300); chk(pg,"plantel")
    n5=pg.eval_on_selector_all('section:has(h3:text("Últimas alterações")) .list .li',"e=>e.length"); print("antes de ver mais:", n5)
    if n5>5 or not pg.query_selector('[data-a="whoMore"]'): errs.append("só as 5 mais recentes + ver mais")
    pg.click('[data-a="whoMore"]'); pg.wait_for_timeout(200)
    items=pg.eval_on_selector_all('section:has(h3:text("Últimas alterações")) .list .li',"e=>e.map(x=>x.innerText.replace(/\\n/g,' | '))")
    print("últimas alterações:", items[:4])
    if len(items)<3 or "MacBook Pro de Alexandre" not in items[0] or not any("iPad de Tiago" in x for x in items): errs.append("lista")
    pg.click('[data-a="whoBy"][data-k="iPad de Tiago"]'); pg.wait_for_timeout(200)
    n=pg.eval_on_selector_all('section:has(h3:text("Últimas alterações")) .list .li',"e=>e.length"); print("filtro iPad:", n)
    if n!=1: errs.append("filtro")
    pg.locator('section:has(h3:text("Últimas alterações")) .list .li').first.click(); pg.wait_for_timeout(300)
    if "iPad de Tiago" not in (pg.inner_text(".edby") if pg.query_selector(".edby") else ""): errs.append("abrir a partir da lista")
    # bolas paradas dentro de Jogos
    pg.click('nav [data-t="jogos"]'); pg.click('[data-a="jsub"][data-k="bp"]'); pg.wait_for_timeout(300); chk(pg,"bp")
    if not pg.query_selector('[data-a="bpNew"]') or pg.query_selector('nav [data-t="bp"]'): errs.append("bolas paradas em Jogos")
    b.close()
print("ERRORS",errs)

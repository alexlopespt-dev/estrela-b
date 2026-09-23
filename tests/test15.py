import os, sys, json, base64
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Calendário 2026/27 (atualização de dados que corre uma vez) e emblemas dos adversários.
errs=[]
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
def LS(pg): return pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1'))")
seed=json.load(open(os.path.join(ROOT,"data","seed_local.json")))
with sync_playwright() as pw:
    b=pw.chromium.launch()
    # 1) primeira abertura (versão offline)
    pg=b.new_page(viewport={"width":1280,"height":950})
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    print("aviso:", pg.inner_text("#toast"))
    st=LS(pg); gs=sorted([v for v in st["events"].values() if v["type"]=="jogo"], key=lambda g:g["date"])
    print("jogos:", len(gs), "| adversários:", len(st["opponents"]), "| com emblema:", sum(1 for o in st["opponents"].values() if o.get("crk")), "| mig:", st["meta"].get("mig"))
    if len(gs)!=24 or len(st["opponents"])!=12: errs.append("calendário incompleto")
    j1=[g for g in gs if g["date"]=="2026-09-20"][0]; print("J1:", j1["venue"], j1["time"], j1["ga"], j1["phase"])
    if (j1["venue"],j1["ga"],j1["time"])!=("F",0,"15:00"): errs.append("J1")
    j8=[g for g in gs if g["phase"]=="Jornada 8"][0]; print("J8:", j8["date"], j8["time"], j8["venue"], j8["opp"])
    print("sem J11/J24:", not any(g["phase"] in ("Jornada 11","Jornada 24") for g in gs))
    # recarregar não duplica
    pg.reload(); pg.wait_for_timeout(1000)
    if len([v for v in LS(pg)["events"].values() if v["type"]=="jogo"])!=24: errs.append("duplicou ao recarregar")
    for t in ["jogos","adv","agenda","painel"]:
        pg.click(f'nav [data-t="{t}"]'); pg.wait_for_timeout(250); chk(pg,t)
        pg.screenshot(path=os.path.join(ROOT,"tests","capturas",f"t15_{t}.png"), full_page=(t!="agenda"))
    pg.click('nav [data-t="jogos"]'); pg.wait_for_timeout(200)
    print("emblemas na lista de jogos:", pg.eval_on_selector_all("#main img.ocrest","e=>e.length"))
    pg.click('[data-p="jogo"][data-id="jg_2627_j2"]'); pg.wait_for_timeout(300); chk(pg,"jogo J2")
    print("J2:", pg.inner_text(".phead h2"), "| emblema no marcador:", pg.eval_on_selector_all(".score .side img","e=>e.length"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t15_jogo.png"))
    pg.click('[data-a="oppFromGame"]'); pg.wait_for_timeout(300); chk(pg,"ficha adv")
    print("ficha:", pg.inner_text(".phead h2"), "| jogos ligados:", pg.eval_on_selector_all('[data-p="jogo"]',"e=>e.length"))
    # trocar o emblema por um ficheiro
    png=pg.evaluate("(()=>{const c=document.createElement('canvas');c.width=300;c.height=300;const x=c.getContext('2d');x.fillStyle='#c00';x.fillRect(0,0,300,300);return c.toDataURL('image/png').split(',')[1];})()")
    with pg.expect_file_chooser() as fc: pg.click('[data-a="oppCrestUp"]')
    fc.value.set_files({"name":"e.png","mimeType":"image/png","buffer":base64.b64decode(png)}); pg.wait_for_timeout(1000)
    o=[v for v in LS(pg)["opponents"].values() if v["name"]=="CAC"][0]; print("emblema novo:", pg.inner_text("#toast"), "| imgL:", bool(o.get("imgL")), "| crk:", o.get("crk"))
    if not o.get("imgL"): errs.append("emblema carregado")
    pg.close()
    # 2) dados já existentes (dispositivo com jogo criado pela semana-tipo e adversário já criado à mão)
    pg=b.new_page(viewport={"width":1280,"height":950}); pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    old=json.loads(json.dumps(seed))
    old["events"]["jg_x"]={"type":"jogo","date":"2026-09-27","time":"","opp":"","venue":"C","comp":"","phase":"","dur":90,"call":["p1"],"xi":[],"ev":[],"rt":{},"ga":None,"closed":False}
    old["opponents"]["op_mine"]={"name":"Talaíde","comp":"III Distrital","keys":[{"name":"Avançado","n":"9"}],"reports":[],"strong":"Bola parada"}
    pg.goto("file://"+DIST+"/app_local.html"); pg.evaluate("s=>localStorage.setItem('estrela-tecnico-v1',s)", json.dumps(old)); pg.reload(); pg.wait_for_timeout(1200)
    st=LS(pg); x=st["events"]["jg_x"]; tal=[v for v in st["opponents"].values() if v["name"]=="Talaíde"]
    print("jogo existente preenchido:", x["opp"], x["time"], x["phase"], x["call"], "| duplicado no dia:", sum(1 for v in st["events"].values() if v["type"]=="jogo" and v["date"]=="2026-09-27"))
    print("Talaíde:", len(tal), "| mantém notas:", tal[0].get("strong"), "| emblema:", tal[0].get("crk"))
    if x["opp"]!="CAC" or x["call"]!=["p1"] or len(tal)!=1 or tal[0].get("strong")!="Bola parada": errs.append("dados existentes")
    pg.close()
    # 3) versão online (mock): corre uma vez; com uma coleção que falha não corre
    mock=open(os.path.join(ROOT,"tests","mock.js")).read(); sdb=open(os.path.join(ROOT,"data","seed_db.json")).read()
    pg=b.new_page(); pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.add_init_script(mock+";window.__seed("+sdb+");"); pg.goto("file://"+DIST+"/app_db.html"); pg.wait_for_timeout(2500)
    n=pg.evaluate("Object.values(window.__store.events).filter(e=>e.type==='jogo').length"); print("online jogos:", n, "| mig:", pg.evaluate("window.__store.meta.mig"))
    if n!=24: errs.append("online")
    pg.close()
    bad=mock.replace("collection:c=>({ onSnapshot:(next,err)=>{","collection:c=>({ onSnapshot:(next,err)=>{ if(c==='events'){ setTimeout(()=>err(new Error('x')),20); return ()=>{}; }")
    pg=b.new_page(); pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.add_init_script(bad+";window.__seed("+sdb+");"); pg.goto("file://"+DIST+"/app_db.html"); pg.wait_for_timeout(2500)
    n=pg.evaluate("Object.keys(window.__store.events||{}).length"); w=pg.evaluate("window.__writes"); print("online com falha: eventos", n, "| escritas", w)
    if w: errs.append("migração correu com dados incompletos")
    pg.close(); b.close()
print("ERRORS",errs)

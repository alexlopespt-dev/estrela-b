import os, json, subprocess, urllib.request
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Staff repetido depois de ligar a partilha (staff criado à mão num dispositivo + staff dos dados iniciais noutro):
# fica um só por nome (o que tem foto), com as presenças nos treinos passadas para ele; e a atualização staffdup1 limpa
# os repetidos que já existam num browser.
errs=[]
LSK="estrela-tecnico-v1"; KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8781
URL="https://script.google.com/macros/s/TESTE/exec"
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
assert "pronto" in srv.stdout.readline()
def estado(): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/__estado").read())
def fwd(route):
    rq=route.request; u=rq.url.replace(URL,f"http://127.0.0.1:{PORT}/exec")
    r=urllib.request.urlopen(urllib.request.Request(u,data=rq.post_data_buffer if rq.method=="POST" else None,method=rq.method))
    route.fulfill(status=r.status,body=r.read(),headers={"Content-Type":r.headers.get("Content-Type"),"Access-Control-Allow-Origin":"*"})
APP=open(os.path.join(DIST,"app_local.html")).read()
seed=json.load(open(os.path.join(ROOT,"data","seed_local.json")))
FOTO="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ=="
def LS(pg): return pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}'))")
def abrir(ctx,dados=None):
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.route("https://script.google.com/**",fwd); pg.route("https://estrela.test/**",lambda r:r.fulfill(status=200,body=APP,headers={"Content-Type":"text/html"}))
    pg.goto("https://estrela.test/"); pg.wait_for_timeout(600)
    if dados is not None: pg.evaluate(f"localStorage.setItem('{LSK}',JSON.stringify({json.dumps(dados)}))"); pg.reload(); pg.wait_for_timeout(1200)
    return pg
def ligar(pg):
    pg.click('nav [data-t="plantel"]'); pg.click('#main [data-a="syncCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',KEY); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(2500)
def nomes(pg): return sorted(s["name"] for s in LS(pg)["staff"].values())
try:
  with sync_playwright() as pw:
    b=pw.chromium.launch()
    A=abrir(b.new_context()); ligar(A); print("A:", A.inner_text("#toast"))
    # B: staff criado à mão (com foto) em vez do dos dados iniciais, e um treino com presenças desse staff
    dB=json.loads(json.dumps(seed)); dB["meta"]["mig"]={"cal2627":"x","plantel_mon1":"x","exlib129":"x","staffdup1":"x"}
    dB["staff"]={"st_mm":{"name":"Miguel Motta","role":"Treinador Principal","photoData":FOTO,"order":1},
                 "st_jm":{"name":"João Maltez","role":"Treinador Adjunto","photoData":FOTO,"order":2}}
    dB["events"]["tr_b"]={"type":"treino","date":"2026-09-29","satt":{"st_mm":{"s":"P"},"st_jm":{"s":"FJ"}},"plan":[],"att":{}}
    B=abrir(b.new_context(),dB); ligar(B); print("B:", B.inner_text("#toast"))
    nb=nomes(B); print("staff no B:", len(nb), "| repetidos:", len(nb)-len(set(nb)))
    if len(nb)!=len(set(nb)) or len(nb)!=8: errs.append("repetidos B")
    mm=[s for s in LS(B)["staff"].values() if s["name"]=="Miguel Motta"][0]; print("Miguel Motta com foto:", bool(mm.get("photoData")), "| função:", mm.get("role"))
    if not mm.get("photoData"): errs.append("perdeu a foto")
    A.click('#syncSt'); A.click('#dlg [data-a="mSave"]'); A.wait_for_timeout(1500)
    na=nomes(A); print("staff no A:", len(na), "| repetidos:", len(na)-len(set(na)))
    if len(na)!=len(set(na)) or len(na)!=8: errs.append("repetidos A")
    sa=LS(A)["events"]["tr_b"]["satt"]; ids=set(LS(A)["staff"]); print("presenças do treino:", sa, "| ids existem:", set(sa)<=ids)
    if not set(sa)<=ids or len(sa)!=2: errs.append("presenças")
    st=estado(); vivos=[d for d in st["docs"] if d[0]=="staff" and not d[4]]; print("no Sheets:", len(vivos), "staff")
    if len(vivos)!=8: errs.append("Sheets")
    # browser com repetidos já guardados (sem partilha): a atualização staffdup1 limpa
    dC=json.loads(json.dumps(seed)); dC["meta"]["mig"]={"cal2627":"x","plantel_mon1":"x","exlib129":"x"}
    dC["staff"]["st_x"]={"name":"miguel motta ","role":"Treinador Principal","photoData":FOTO}
    C=abrir(b.new_context(),dC); nc=nomes(C); print("migração:", C.inner_text("#toast"), "| staff:", len(nc))
    if len(nc)!=8: errs.append("migração")
    C.click('nav [data-t="plantel"]'); C.wait_for_timeout(300); C.screenshot(path=os.path.join(ROOT,"tests","capturas","t21_staff.png"),full_page=True)
    b.close()
finally: srv.kill()
print("ERRORS",errs)

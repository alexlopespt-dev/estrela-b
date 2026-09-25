import os, json, subprocess, urllib.request
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Partilha: duas pessoas no mesmo treino ao mesmo tempo (presenças/RPE/tema em campos diferentes) não se apagam;
# apagados recuperáveis; cópia de segurança diária (ficam 30).
errs=[]
LSK="estrela-tecnico-v1"; KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8795; URL="https://script.google.com/macros/s/TESTE/exec"
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
assert "pronto" in srv.stdout.readline()
def estado(): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/__estado").read())
def run(f): return urllib.request.urlopen(f"http://127.0.0.1:{PORT}/__run?f={f}").read()
off={"A":False,"B":False}
def fwd(who):
    def h(route):
        if off[who]: return route.abort()
        rq=route.request; u=rq.url.replace(URL,f"http://127.0.0.1:{PORT}/exec")
        r=urllib.request.urlopen(urllib.request.Request(u,data=rq.post_data_buffer if rq.method=="POST" else None,method=rq.method))
        route.fulfill(status=r.status,body=r.read(),headers={"Content-Type":r.headers.get("Content-Type"),"Access-Control-Allow-Origin":"*"})
    return h
APP=open(os.path.join(DIST,"app_local.html")).read()
def abrir(b,who):
    pg=b.new_context(viewport={"width":1280,"height":900}).new_page(); pg.on("pageerror",lambda e:errs.append(who+" "+str(e)))
    pg.route("https://script.google.com/**",fwd(who)); pg.route("https://estrela.test/**",lambda r:r.fulfill(status=200,body=APP,headers={"Content-Type":"text/html"}))
    pg.goto("https://estrela.test/"); pg.wait_for_timeout(900)
    pg.click('nav [data-t="plantel"]'); pg.click('#main [data-a="syncCfg"]'); pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',KEY); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(2500)
    return pg
def LS(pg): return pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}'))")
def puxar(pg): pg.click('#syncSt'); pg.wait_for_timeout(200); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1500)
try:
  with sync_playwright() as pw:
    b=pw.chromium.launch()
    A=abrir(b,"A")
    A.click('nav [data-t="painel"]'); A.click('.bar [data-a="newEvent"][data-type="treino"]'); A.fill('#dlg [name=date]',"2026-09-23"); A.click('#dlg [data-a="mSave"]'); A.wait_for_timeout(1500)
    tid=[k for k,v in LS(A)["events"].items() if v.get("date")=="2026-09-23" and v["type"]=="treino"][0]
    B=abrir(b,"B")
    ps=list(LS(A)["players"].keys())[:4]
    # os dois abrem o mesmo treino; B fica sem rede enquanto trabalha
    for pg in (A,B): pg.click('nav [data-t="treinos"]'); pg.click(f'[data-p="treino"][data-id="{tid}"]'); pg.wait_for_timeout(400)
    off["B"]=True
    A.click(f'[data-a="att"][data-p="{ps[0]}"][data-s="P"]'); A.click(f'[data-a="att"][data-p="{ps[1]}"][data-s="FJ"]'); A.wait_for_timeout(300)
    A.fill('[data-f="theme"]',"Tema do treinador"); A.click("h2"); A.wait_for_timeout(1500)
    B.click(f'[data-a="att"][data-p="{ps[2]}"][data-s="P"]'); B.wait_for_timeout(200)
    B.fill(f'[data-c="rpe"][data-p="{ps[2]}"]',"7"); B.click("h2"); B.wait_for_timeout(200)
    B.fill('[data-f="notes"]' if B.query_selector('[data-f="notes"]') else 'textarea[data-f="notes"]',"Notas do adjunto"); B.click("h2"); B.wait_for_timeout(800)
    print("B sem rede:", B.inner_text("#syncSt"))
    off["B"]=False; puxar(B); puxar(A); puxar(B)
    ea=LS(A)["events"][tid]; eb=LS(B)["events"][tid]
    print("A:", {k:v for k,v in ea["att"].items()}, ea.get("theme"), ea.get("notes"))
    print("B:", {k:v for k,v in eb["att"].items()}, eb.get("theme"), eb.get("notes"))
    ok = lambda e: e["att"].get(ps[0],{}).get("s")=="P" and e["att"].get(ps[1],{}).get("s")=="FJ" and e["att"].get(ps[2],{}).get("rpe") in (7,"7") and e.get("theme")=="Tema do treinador" and e.get("notes")=="Notas do adjunto"
    if not ok(ea) or not ok(eb): errs.append("perdeu alterações")
    srvdoc=[json.loads(r[2]) for r in estado()["docs"] if r[1]==tid][0]; print("no Sheet:", srvdoc["att"], srvdoc.get("theme"), srvdoc.get("notes"))
    if not ok(srvdoc): errs.append("Sheet")
    # apagar e recuperar
    gid=[k for k,v in LS(A)["events"].items() if v["type"]=="jogo"][0]; nome=LS(A)["events"][gid].get("opp")
    A.click('nav [data-t="jogos"]'); A.click(f'[data-id="{gid}"]'); A.wait_for_timeout(300)
    A.click('[data-a="delEvent"]'); A.click('#dlgAsk [data-ask="1"]'); A.wait_for_timeout(1500); puxar(B)
    print("apagado no B:", gid not in LS(B)["events"])
    B.click('#syncSt'); B.wait_for_timeout(200); B.click('#dlg [data-a="syncTrash"]'); B.wait_for_timeout(1500)
    txt=B.inner_text("#dlg"); print("lixo:", txt.replace("\n"," | ")[:160])
    if nome not in txt: errs.append("lixo")
    B.click('#dlg [data-a="syncRestore"] >> nth=0'); B.wait_for_timeout(1500); B.click('#dlg [data-a="mClose"]'); puxar(A)
    print("recuperado no A:", gid in LS(A)["events"], LS(A)["events"].get(gid,{}).get("opp"))
    if gid not in LS(A)["events"]: errs.append("recuperar")
    # cópias de segurança
    run("prepararDadosApp"); st=estado(); print("acionadores:", st["triggers"], "| cópias:", len(st["copias"]), st["copias"][0]["rows"] if st["copias"] else 0)
    if "copiaDiaria" not in st["triggers"] or not st["copias"] or st["copias"][0]["rows"]<200: errs.append("cópia")
    for _ in range(32): run("copiaDiaria")
    print("cópias guardadas:", len(estado()["copias"]))
    if len(estado()["copias"])!=30: errs.append("30 cópias")
    b.close()
finally: srv.kill()
print("ERRORS",errs)

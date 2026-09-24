import os, json, subprocess, urllib.request
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Lesões do Clínico da app -> separador "· Lesões" do Painel (Apps Script verdadeiro com Google simulado):
# nome da folha de monitorização (ligação à mão "Hugo R." = Rocha, igual, abreviatura), estado, datas, atualizar, apagar,
# linhas escritas à mão intactas, recálculo agendado uma só vez.
errs=[]
KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8783; URL="https://script.google.com/macros/s/TESTE/exec"
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
assert "pronto" in srv.stdout.readline()
def estado(): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/__estado").read())
def prep(p): urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{PORT}/__prep",data=json.dumps(p).encode(),method="POST")).read()
def fwd(route):
    rq=route.request; u=rq.url.replace(URL,f"http://127.0.0.1:{PORT}/exec")
    r=urllib.request.urlopen(urllib.request.Request(u,data=rq.post_data_buffer if rq.method=="POST" else None,method=rq.method))
    route.fulfill(status=r.status,body=r.read(),headers={"Content-Type":r.headers.get("Content-Type"),"Access-Control-Allow-Origin":"*"})
APP=open(os.path.join(DIST,"app_local.html")).read()
def corre(): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/__triggers").read())
def app_rows(): corre(); return [r for r in (estado()["lesoes"] or []) if str(r[5] if len(r)>5 else "").startswith("app:")]
try:
  prep({"nomes":["Abbiati","Bruno V.","Hugo R.","Valério"],"manual":[["Rui","Tratamento","2026-09-20","","escrito à mão"]]})
  with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.route("https://script.google.com/**",fwd); pg.route("https://estrela.test/**",lambda r:r.fulfill(status=200,body=APP,headers={"Content-Type":"text/html"}))
    pg.goto("https://estrela.test/"); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="plantel"]'); pg.click('#main [data-a="syncCfg"]'); pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',KEY); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(2500)
    print("ligado:", pg.inner_text("#toast"))
    ids={v["name"]:k for k,v in pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1')).players").items()}
    def lesao(nome,zona,diag):
        pg.click('nav [data-t="clinico"]'); pg.click('#main [data-a="injNew"]'); pg.wait_for_timeout(200)
        pg.select_option('#dlg [name=pid]',ids[nome]); pg.fill('#dlg [name=date]',"2026-09-22"); pg.select_option('#dlg [name=zone]',zona)
        pg.fill('#dlg [name=diag]',diag); pg.fill('#dlg [name=exp]',"2026-10-10"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1800)
    zonas=pg.evaluate("1") and None
    pg.click('nav [data-t="clinico"]'); pg.click('#main [data-a="injNew"]'); pg.wait_for_timeout(200)
    zonas=pg.eval_on_selector_all('#dlg [name=zone] option',"e=>e.map(o=>o.value).filter(Boolean)"); pg.click('#dlg [data-a="mClose"]')
    lesao("Rocha",zonas[0],"Entorse do tornozelo")
    st=estado(); print("antes do acionador: agendado", st["triggers"], "| separador ainda sem linhas da app:", not any(len(r)>5 and str(r[5]).startswith("app:") for r in (st["lesoes"] or [])))
    if st["triggers"].count("atualizarDaApp")!=1: errs.append("agendamento")
    lesao("Abbiati",zonas[1],"Contratura")
    rows=app_rows(); print("linhas da app:", [(r[0],r[1],r[2],r[3],r[4]) for r in rows])
    nm=sorted(r[0] for r in rows)
    if nm!=["Abbiati","Hugo R."]: errs.append("nomes "+str(nm))
    if any(r[1]!="Lesionado" for r in rows) or any(r[3] for r in rows): errs.append("estado")
    st=estado(); print("à mão intacta:", st["lesoes"][0][:5], "| acionadores pendentes depois de correr:", st["triggers"])
    if st["lesoes"][0][0]!="Rui" or st["triggers"]: errs.append("mão/trigger")
    # condicionado e alta
    pg.click('nav [data-t="clinico"]'); pg.wait_for_timeout(300)
    pg.click('#main [data-a="injSt"][data-s="condicionado"] >> nth=0'); pg.wait_for_timeout(1800)
    rows=app_rows(); print("depois de condicionado:", [(r[0],r[1]) for r in rows])
    if not any(r[1]=="Condicionado" for r in rows): errs.append("condicionado")
    pg.click('#main [data-a="injSt"][data-s="alta"] >> nth=0'); pg.wait_for_timeout(1800)
    rows=app_rows(); print("depois da alta:", [(r[0],r[1],r[3]) for r in rows])
    if not any(r[3] for r in rows): errs.append("alta sem fim")
    # apagar uma lesão na app
    iid=[k for k,v in pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1')).injuries").items() if v["pid"]==ids["Abbiati"]][0]
    pg.click('nav [data-t="clinico"]'); pg.wait_for_timeout(300)
    pg.evaluate(f"document.querySelector('[data-a=\"injEdit\"][data-id=\"{iid}\"]').click()"); pg.wait_for_timeout(300)
    pg.click('#dlg [data-a="mDel"]'); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(1800)
    rows=app_rows(); st=estado(); print("depois de apagar:", [r[0] for r in rows], "| total no separador:", len(st["lesoes"]))
    if [r[0] for r in rows]!=["Hugo R."] or st["lesoes"][0][0]!="Rui": errs.append("apagar")
    b.close()
finally: srv.kill()
print("ERRORS",errs)

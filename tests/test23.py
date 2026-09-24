import os, json, subprocess, urllib.request
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Dois scripts separados: a monitorização (resumo + JSONP) e "Dados da app". Se alguém colar na partilha o URL
# da monitorização, a app explica o erro e não liga.
errs=[]
KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8785; URL="https://script.google.com/macros/s/MON/exec"
GS=os.path.join(ROOT,"tools","apps-script","monitorizacao_completo.gs")
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT),GS],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
assert "pronto" in srv.stdout.readline()
def get(q): return urllib.request.urlopen(f"http://127.0.0.1:{PORT}/exec?"+q).read().decode()
try:
    resumo={"v":1,"jogadores":[{"nome":"Abbiati"}]}
    urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{PORT}/__props",data=json.dumps({"app_n":"1","app_0":json.dumps(resumo)}).encode(),method="POST")).read()
    r1=get("k="+KEY); r2=get("k="+KEY+"&cb=abc"); r3=get("k=errada"); r4=get("k="+KEY+"&a=pull&since=0")
    print("monitorização:", r1[:40], "| JSONP:", r2[:12], "| chave errada:", r3, "| pull ignorado:", r4[:30])
    if json.loads(r1).get("v")!=1 or not r2.startswith("abc(") or "chave" not in r3 or '"docs"' in r4: errs.append("script da monitorização")
    def fwd(route):
        rq=route.request; u=rq.url.replace(URL,f"http://127.0.0.1:{PORT}/exec")
        r=urllib.request.urlopen(urllib.request.Request(u,data=rq.post_data_buffer if rq.method=="POST" else None,method=rq.method))
        route.fulfill(status=r.status,body=r.read(),headers={"Content-Type":r.headers.get("Content-Type"),"Access-Control-Allow-Origin":"*"})
    with sync_playwright() as pw:
        b=pw.chromium.launch(); pg=b.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.route("https://script.google.com/**",fwd); pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1000)
        pg.click('nav [data-t="plantel"]'); pg.click('#main [data-a="syncCfg"]'); pg.wait_for_timeout(200)
        print("URL vazio no formulário:", pg.input_value('#dlg [name=url]')=="")
        pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',KEY); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1500)
        t=pg.inner_text("#toast"); print("URL da monitorização na partilha:", t, "| continua desligado:", pg.is_hidden("#syncSt"))
        if "monitorização" not in t or not pg.is_hidden("#syncSt"): errs.append("aviso URL errado")
        b.close()
finally: srv.kill()
print("ERRORS",errs)

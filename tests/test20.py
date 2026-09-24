import os, json, base64, subprocess, time, urllib.request
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Partilha de dados (versão Netlify): dois dispositivos ligados ao mesmo Apps Script (simulado em tests/gas_servidor.js,
# que corre o ficheiro .gs verdadeiro). Ligar e juntar, criar/editar/apagar num e ver no outro, sem rede e depois,
# fotos para o Drive, atualização automática.
errs=[]
LSK="estrela-tecnico-v1"; KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8779
URL="https://script.google.com/macros/s/TESTE/exec"
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
assert "pronto" in srv.stdout.readline()
def estado(): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/__estado").read())
off={"A":False,"B":False}
def forward(who):
    def h(route):
        if off[who]: return route.abort()
        rq=route.request; u=rq.url.replace("https://script.google.com/macros/s/TESTE/exec",f"http://127.0.0.1:{PORT}/exec")
        req=urllib.request.Request(u,data=rq.post_data_buffer if rq.method=="POST" else None,method=rq.method)
        r=urllib.request.urlopen(req); body=r.read()
        route.fulfill(status=r.status,body=body,headers={"Content-Type":r.headers.get("Content-Type","application/json"),"Access-Control-Allow-Origin":"*"})
    return h
PNG=base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
APP=open(os.path.join(DIST,"app_local.html")).read()
def LS(pg): return pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}'))")
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
def novo(pg,who):
    c=pg.context
    pg.route("https://script.google.com/**",forward(who))
    pg.route("https://drive.google.com/**",lambda r:r.fulfill(status=200,body=PNG,headers={"Content-Type":"image/png"}))
    pg.route("https://estrela.test/**",lambda r:r.fulfill(status=200,body=APP,headers={"Content-Type":"text/html"}))
    pg.on("pageerror",lambda e:errs.append(who+" PAGEERR "+str(e)))
    pg.goto("https://estrela.test/"); pg.wait_for_timeout(1200)
def ligar(pg):
    pg.click('nav [data-t="plantel"]'); pg.click('#main [data-a="syncCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',KEY); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(2500)
def puxar(pg):   # o mesmo que carregar no estado do cabeçalho -> Guardar (sem mudar nada) = sincronizar já
    pg.click('#syncSt'); pg.wait_for_timeout(200); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1200)
def criar_treino(pg,data,tema):
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="newEvent"][data-type="treino"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=date]',data); pg.fill('#dlg [name=theme]',tema); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
def treinos(pg): return {k:v for k,v in LS(pg)["events"].items() if v.get("type")=="treino"}
try:
  with sync_playwright() as pw:
    b=pw.chromium.launch()
    A=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True).new_page(); novo(A,"A")
    B=b.new_context(viewport={"width":820,"height":1180},has_touch=True).new_page(); novo(B,"B")
    print("sem ligação, estado escondido:", A.is_hidden("#syncSt"))
    # A liga primeiro: envia tudo
    ligar(A); print("A:", A.inner_text("#toast"), "| estado:", A.inner_text("#syncSt"))
    st=estado(); nloc=sum(len(v) for v in LS(A).values() if isinstance(v,dict)); print("no Sheets:", len(st["docs"]), "| no A:", nloc)
    if len(st["docs"])!=nloc or "Partilhado" not in A.inner_text("#syncSt"): errs.append("ligar A")
    A.screenshot(path=os.path.join(ROOT,"tests","capturas","t20_ligado.png"))
    # B já tinha um treino só dele antes de ligar
    criar_treino(B,"2026-09-30","Treino do adjunto (antes de ligar)")
    ligar(B); print("B:", B.inner_text("#toast"))
    puxar(A); print("A recebeu o treino do B:", any(v.get("theme")=="Treino do adjunto (antes de ligar)" for v in treinos(A).values()))
    if not any(v.get("theme")=="Treino do adjunto (antes de ligar)" for v in treinos(A).values()): errs.append("juntar")
    # B cria, A vê (automaticamente, sem tocar em nada: ~15 s)
    criar_treino(B,"2026-10-01","Criado pelo adjunto"); B.wait_for_timeout(1500)
    t0=time.time(); ok=False
    while time.time()-t0<25:
        A.wait_for_timeout(1000)
        if any(v.get("theme")=="Criado pelo adjunto" for v in treinos(A).values()): ok=True; break
    print(f"A viu o treino novo sozinho: {ok} ({time.time()-t0:.0f} s)")
    if not ok: errs.append("atualização automática")
    A.click('nav [data-t="treinos"]'); A.wait_for_timeout(300); chk(A,"treinos A")
    print("na lista do A:", "Criado pelo adjunto" in A.inner_text("#main"))
    # A edita o tema desse treino, B vê
    tid=[k for k,v in treinos(A).items() if v.get("theme")=="Criado pelo adjunto"][0]
    A.click(f'[data-p="treino"][data-id="{tid}"]'); A.wait_for_timeout(300)
    A.fill('[data-f="theme"]',"Editado pelo treinador"); A.click("h2"); A.wait_for_timeout(1500)
    puxar(B); print("B vê a edição:", LS(B)["events"][tid].get("theme"))
    if LS(B)["events"][tid].get("theme")!="Editado pelo treinador": errs.append("editar")
    # A apaga, B deixa de ver
    A.click('[data-a="delEvent"]'); A.wait_for_timeout(200); A.click('#dlgAsk [data-ask="1"]'); A.wait_for_timeout(1500)
    puxar(B); print("B deixou de ver o apagado:", tid not in LS(B)["events"])
    if tid in LS(B)["events"]: errs.append("apagar")
    # A sem rede: fica na fila, envia quando volta
    off["A"]=True; criar_treino(A,"2026-10-02","Sem rede"); A.wait_for_timeout(1500)
    s1=A.inner_text("#syncSt"); print("A sem rede:", s1)
    if "por enviar" not in s1: errs.append("fila sem rede")
    A.reload(); A.wait_for_timeout(1500); print("fila guardada depois de recarregar:", A.inner_text("#syncSt"))
    off["A"]=False; puxar(A); A.wait_for_timeout(800); print("A com rede:", A.inner_text("#syncSt"))
    puxar(B); print("B recebeu o de sem rede:", any(v.get("theme")=="Sem rede" for v in treinos(B).values()))
    if not any(v.get("theme")=="Sem rede" for v in treinos(B).values()): errs.append("reenvio")
    # edição ao mesmo tempo no mesmo registo: fica a última enviada; ninguém perde o resto
    # foto de exercício com a partilha ligada: vai para o Drive
    ex0=[k for k,v in LS(A)["exercises"].items() if v.get("imgk")=="exi014"][0]
    A.click('nav [data-t="treinos"]'); A.click('[data-a="tsub"][data-k="ex"]'); A.wait_for_timeout(500)
    A.click(f'[data-a="exView"][data-id="{ex0}"]'); A.wait_for_timeout(300)
    big=A.evaluate("""(()=>{const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d');x.fillStyle='#2d7a48';x.fillRect(0,0,1200,800);return c.toDataURL('image/jpeg',0.9).split(',')[1];})()""")
    with A.expect_file_chooser() as fc: A.click('#dlg [data-a="exPhoto"]')
    fc.value.set_files({"name":"foto.jpg","mimeType":"image/jpeg","buffer":base64.b64decode(big)}); A.wait_for_timeout(2500)
    x=LS(A)["exercises"][ex0]; st=estado(); print("foto no Drive:", x.get("imgG"), "| ficheiros:", len(st["files"]), "| partilhada por link:", all(f["shared"] for f in st["files"]))
    if not x.get("imgG") or not st["files"]: errs.append("foto drive")
    A.click('#dlg [data-a="mClose"]'); A.wait_for_timeout(1200)
    puxar(B); B.click('nav [data-t="treinos"]'); B.click('[data-a="tsub"][data-k="ex"]'); B.wait_for_timeout(500)
    B.click(f'[data-a="exView"][data-id="{ex0}"]'); B.wait_for_timeout(500)
    src=B.get_attribute("#dlg .dlg-b img","src"); print("B vê a foto:", src[:60])
    if "drive.google.com/thumbnail" not in src: errs.append("foto no B")
    B.click('#dlg [data-a="mClose"]')
    # chave errada ao ligar: aviso e continua como estava
    C=b.new_context().new_page(); novo(C,"A")
    C.click('nav [data-t="plantel"]'); C.click('#main [data-a="syncCfg"]'); C.fill('#dlg [name=url]',URL); C.fill('#dlg [name=key]',"errada"); C.click('#dlg [data-a="mSave"]'); C.wait_for_timeout(1000)
    print("chave errada:", C.inner_text("#toast"), "| continua desligado:", C.is_hidden("#syncSt"))
    if "chave" not in C.inner_text("#toast") or not C.is_hidden("#syncSt"): errs.append("chave errada")
    # desligar
    puxar(B); B.click('#syncSt'); B.click('#dlg [data-a="mDel"]'); B.click('#dlgAsk [data-ask="1"]'); B.wait_for_timeout(300)
    print("B desligado:", B.is_hidden("#syncSt"), "| dados continuam:", len(treinos(B)))
    A.screenshot(path=os.path.join(ROOT,"tests","capturas","t20_A.png"))
    st=estado(); print("registos no Sheets:", len(st["docs"]), "| apagados:", sum(1 for d in st["docs"] if d[4]))
    b.close()
finally:
    srv.kill()
print("ERRORS",errs)

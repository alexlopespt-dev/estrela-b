import os, json, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas")
from playwright.sync_api import sync_playwright
# Bolas paradas (quadro tático): separador, modelo da equipa (migração bp1), os 6 tipos com colocação inicial,
# colocar/arrastar/apagar, nomes do plantel, setas curvas, zonas, texto, desfazer/refazer, passos + animação,
# guardar/reabrir, imagem PNG, PDF, iPad (os dois sentidos), tema escuro e ecrã baixo.
errs=[]
LSK="estrela-tecnico-v1"
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
def DB(pg): return pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}'))")
def SP(pg): return DB(pg).get("setpieces") or {}
def svgpt(pg,x,y):   # coordenadas do campo (1000x682) -> ecrã
    r=pg.evaluate("(()=>{const r=document.querySelector('#bpS').getBoundingClientRect();return [r.left,r.top,r.width,r.height];})()")
    return r[0]+x*r[2]/1000, r[1]+y*r[3]/682
def tap(pg,x,y): X,Y=svgpt(pg,x,y); pg.mouse.click(X,Y); pg.wait_for_timeout(120)
def drag(pg,x1,y1,x2,y2):
    X1,Y1=svgpt(pg,x1,y1); X2,Y2=svgpt(pg,x2,y2); pg.mouse.move(X1,Y1); pg.mouse.down()
    for i in range(1,9): pg.mouse.move(X1+(X2-X1)*i/8, Y1+(Y2-Y1)*i/8)
    pg.mouse.up(); pg.wait_for_timeout(150)
def items(pg): return pg.evaluate("[...document.querySelectorAll('#bpSI [data-k]')].map(g=>g.dataset.k)")
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1500)
    # separador e modelo da equipa
    tabs=pg.eval_on_selector_all("nav [data-t]","e=>e.map(x=>x.dataset.t)"); print("separadores:", tabs)
    if "bp" not in tabs: errs.append("sem separador")
    pg.click('nav [data-t="bp"]'); pg.wait_for_timeout(400); chk(pg,"separador")
    sp=SP(pg); ex=sp.get("bp_livlat1"); print("modelo da equipa:", ex and ex["name"], "| jogadores:", ex and [i.get("n") for i in ex["fr"][0]["it"] if i["t"]=="p"])
    if not ex or len([i for i in ex["fr"][0]["it"] if i["t"]=="p"])!=10 or not any(i["t"]=="g" for i in ex["fr"][0]["it"]): errs.append("modelo bp1")
    pg.screenshot(path=os.path.join(CAP,"t28_separador.png"))
    # recarregar não duplica o modelo
    pg.reload(); pg.wait_for_timeout(1200); print("sem duplicar:", len(SP(pg))==1)
    if len(SP(pg))!=1: errs.append("modelo duplicado")
    pg.click('nav [data-t="bp"]'); pg.wait_for_timeout(300)
    pg.click('[data-a="bpOpen"][data-id="bp_livlat1"]'); pg.wait_for_timeout(500)
    pg.locator("#bpS").screenshot(path=os.path.join(CAP,"t28_modelo.png"))
    cr=pg.evaluate("(()=>{const i=document.querySelector('#bpS image');return i?i.getAttribute('href').slice(0,22)+'|'+i.getBoundingClientRect().width:''})()"); print("emblema no campo:", cr)
    if not cr.startswith("data:image/png;base64,"): errs.append("emblema")
    pg.screenshot(path=os.path.join(CAP,"t28_editor.png"))
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    # os 6 tipos
    tipos={"lof":"Livres Ofensivos","ldf":"Livres Defensivos","cco":"Canto Ofensivo Curto","clo":"Canto Ofensivo Longo","pen":"Penálti","lan":"Lançamento Lateral"}
    for k,t in tipos.items():
        pg.click('.bar [data-a="bpNew"]'); pg.wait_for_timeout(250)
        pg.click(f'#dlg [data-a="bpPickType"][data-k="{k}"]'); pg.wait_for_timeout(100)
        nm=pg.input_value('#dlg [name=name]')
        if nm!=t: errs.append("nome por omissão "+k+" "+nm)
        pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
        n=len(items(pg)); print(f"{k}: '{nm}' com {n} elementos")
        if n<6: errs.append("modelo vazio "+k)
        if k=="clo" and not pg.evaluate("[...document.querySelectorAll('#bpSI path[marker-end]')].length>=5"): errs.append("setas canto longo")
        pg.locator("#bpS").screenshot(path=os.path.join(CAP,f"t28_{k}.png"))
        pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    sp=SP(pg); print("guardadas:", len(sp), sorted(x["type"] for x in sp.values()))
    if len(sp)!=7: errs.append("criar 6 tipos")
    pg.click('[data-a="bpFilter"][data-k="pen"]'); pg.wait_for_timeout(200)
    print("filtro penálti:", pg.eval_on_selector_all(".bpcard","e=>e.length"))
    if pg.eval_on_selector_all(".bpcard","e=>e.length")!=1: errs.append("filtro")
    pg.click('[data-a="bpFilter"][data-k=""]'); pg.wait_for_timeout(200)
    # editar um livre defensivo a fundo
    lid=[i for i,x in SP(pg).items() if x["type"]=="ldf"][0]
    pg.click(f'[data-a="bpOpen"][data-id="{lid}"]'); pg.wait_for_timeout(400)
    n0=len(items(pg))
    pg.click('#dlg [data-a="bpTool"][data-k="p"]'); tap(pg,150,500); tap(pg,200,520)
    print("colocar 2 jogadores:", len(items(pg))-n0)
    if len(items(pg))-n0!=2: errs.append("colocar")
    # nome do plantel no círculo escolhido
    pl=pg.eval_on_selector_all("#bpRoster [data-a=bpRoster]","e=>e.map(x=>[x.dataset.p,x.innerText])")
    pg.click(f'#bpRoster [data-p="{pl[3][0]}"]'); pg.wait_for_timeout(150)
    print("nome no círculo:", pg.evaluate("[...document.querySelectorAll('#bpSI text')].map(t=>t.textContent)").count(DB(pg)["players"][pl[3][0]]["name"])==1)
    # arrastar (modo mover)
    pg.click('#dlg [data-a="bpTool"][data-k="sel"]'); drag(pg,200,520,600,600)
    # seta de passe e curvar pelo ponto do meio
    pg.click('#dlg [data-a="bpTool"][data-k="pass"]'); drag(pg,300,600,700,450)
    d0=pg.evaluate("[...document.querySelectorAll('#bpSI path[marker-end]')].pop().getAttribute('d')")
    hc=pg.evaluate("(()=>{const c=document.querySelector('#bpSI .bphc');return c?[+c.getAttribute('cx'),+c.getAttribute('cy')]:null})()")
    if hc: drag(pg,hc[0],hc[1],hc[0]-40,hc[1]-120)
    d1=pg.evaluate("[...document.querySelectorAll('#bpSI path[marker-end]')].pop().getAttribute('d')")
    print("seta curva:", d0!=d1, d1[:50])
    if not hc or d0==d1: errs.append("curvar seta")
    # condução, movimento, zona, texto, barreira, bola, cone, GR
    pg.click('#dlg [data-a="bpTool"][data-k="drib"]'); drag(pg,150,300,300,250)
    pg.click('#dlg [data-a="bpTool"][data-k="run"]'); drag(pg,800,600,860,420)
    pg.click('#dlg [data-a="bpTool"][data-k="zone"]'); drag(pg,380,90,620,200)
    pg.click('#dlg [data-a="bpTool"][data-k="txt"]'); tap(pg,80,660); pg.keyboard.type("Zona 1"); pg.wait_for_timeout(150)
    pg.click('#dlg [data-a="bpTool"][data-k="wall"]'); tap(pg,300,420)
    pg.click('#dlg [data-a="bpTool"][data-k="ball"]'); tap(pg,120,640)
    pg.click('#dlg [data-a="bpTool"][data-k="cone"]'); tap(pg,900,640)
    n1=len(items(pg)); print("elementos depois de desenhar:", n1, "| texto:", pg.evaluate("[...document.querySelectorAll('#bpSI text')].some(t=>t.textContent==='Zona 1')"))
    if n1-n0!=2+1+3+1+4+2: errs.append(f"desenhar {n1-n0}")
    # desfazer / refazer / tecla Delete / duplicar
    pg.click('#dlg [data-a="bpUndo"]'); n2=len(items(pg)); pg.click('#dlg [data-a="bpRedo"]'); n3=len(items(pg))
    print("desfazer/refazer:", n2, n3)
    if n2!=n1-1 or n3!=n1: errs.append("desfazer/refazer")
    pg.click('#dlg [data-a="bpTool"][data-k="sel"]'); tap(pg,900,640); pg.keyboard.press("Delete"); pg.wait_for_timeout(120)
    tap(pg,120,640); pg.keyboard.press("Control+d"); pg.wait_for_timeout(120)
    print("Delete + Ctrl+D:", len(items(pg))==n1)
    if len(items(pg))!=n1: errs.append("teclado")
    pg.keyboard.press("Control+z"); pg.keyboard.press("Control+z"); pg.wait_for_timeout(120)
    if len(items(pg))!=n1: errs.append("ctrl+z")
    # cor e número
    tap(pg,150,500); pg.click('#bpProps [data-a="bpSet"][data-v="b"]'); pg.fill('#bpProps [data-bpf=num]',"9"); pg.wait_for_timeout(100)
    # passos e animação
    pg.click('#dlg [data-a="bpFrameAdd"]'); pg.wait_for_timeout(150)
    drag(pg,150,500,480,160)
    pg.click('#dlg [data-a="bpFrameAdd"]'); pg.wait_for_timeout(150)
    drag(pg,480,160,500,120)
    print("passos:", pg.eval_on_selector_all("#bpSteps .bpstep","e=>e.length"))
    pg.click('#dlg [data-a="bpPlay"]'); pg.wait_for_timeout(900)
    mid=pg.evaluate("document.querySelector('#bpSteps [data-a=bpPlay]').textContent")
    pg.wait_for_timeout(3600)
    fim=pg.evaluate("document.querySelector('#bpSteps .bpstep.on').textContent")
    print("animação:", mid, "-> no fim está no passo", fim)
    if "Parar" not in mid or fim!="3": errs.append("animação")
    pg.fill('#dlg [name=bpname]',"Livre frontal — barreira de 4"); pg.fill('#dlg [name=bpnotes]',"GR orienta a barreira.\nZona ao 2.º poste.")
    pg.locator("#bpS").screenshot(path=os.path.join(CAP,"t28_desenhado.png"))
    # imagem PNG
    with pg.expect_download() as dl: pg.click('#dlg [data-a="bpPng"]')
    png=open(dl.value.path(),"rb").read(); print("PNG:", dl.value.suggested_filename, len(png)//1024, "KB", png[:4]==b"\x89PNG")
    if png[:4]!=b"\x89PNG" or len(png)<20000: errs.append("png")
    open(os.path.join(CAP,"t28_export.png"),"wb").write(png)
    # guardar e reabrir
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
    x=SP(pg)[lid]; print("guardado:", x["name"], "| passos:", len(x["fr"]), "| notas:", x["notes"][:20], "| tipos:", sorted({i["t"] for i in x["fr"][0]["it"]}))
    if len(x["fr"])!=3 or x["name"]!="Livre frontal — barreira de 4" or not x["notes"]: errs.append("guardar")
    if not any(i.get("c")=="b" and i.get("num")=="9" for i in x["fr"][0]["it"]): errs.append("cor/número")
    ks=[set(i["k"] for i in f["it"]) for f in x["fr"]]
    if not (ks[0]==ks[1]==ks[2]) or len(ks[0])!=len(x["fr"][0]["it"]): errs.append("chaves dos passos")
    pg.click(f'[data-a="bpOpen"][data-id="{lid}"]'); pg.wait_for_timeout(400)
    print("reaberto:", pg.input_value('#dlg [name=bpname]'), len(items(pg)))
    # fechar sem alterações não pergunta; com alterações pergunta
    pg.click('#dlg [data-a="bpTool"][data-k="sel"]'); tap(pg,120,640); pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    if pg.evaluate("document.querySelector('#dlg').open"): errs.append("tocar sem mexer marcou alterações")
    pg.click(f'[data-a="bpOpen"][data-id="{lid}"]'); pg.wait_for_timeout(300); drag(pg,120,640,160,600)
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    asked=pg.evaluate("document.querySelector('#dlgAsk').open"); print("pergunta ao fechar com alterações:", asked)
    if not asked: errs.append("aviso ao fechar")
    pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(200)
    # PDF de uma e de todas
    pg.click(f'[data-a="bpOpen"][data-id="{lid}"]'); pg.wait_for_timeout(300)
    with pg.expect_download() as dl: pg.click('#dlg [data-a="bpPrint"]')
    html=open(dl.value.path()).read(); nsv=html.count('<svg'); print("PDF de uma:", nsv, "campos | notas:", "Zona ao 2.º poste" in html)
    if nsv!=3 or "Zona ao 2.º poste" not in html: errs.append("pdf uma")
    out=os.path.join(CAP,"t28_pdf.html"); open(out,"w").write(html)
    p2=ctx.new_page(); p2.goto("file://"+out); p2.wait_for_timeout(800); p2.pdf(path=os.path.join(CAP,"t28_bola_parada.pdf"),format="A4",print_background=True); p2.close(); os.remove(out)
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    pg.click('[data-a="bpPrintAll"]'); pg.wait_for_timeout(200)
    with pg.expect_download() as dl: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(dl.value.path()).read(); print("PDF de todas:", html.count("<svg"), "campos")
    if html.count("<svg")<9: errs.append("pdf todas")
    # eliminar
    cid=[i for i,x in SP(pg).items() if x["type"]=="cco"][0]
    pg.click(f'[data-a="bpOpen"][data-id="{cid}"]'); pg.wait_for_timeout(300); pg.click('#dlg [data-a="mDel"]'); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(300)
    print("eliminada:", cid not in SP(pg))
    if cid in SP(pg): errs.append("eliminar")
    # duplicar a partir do cartão: abre a cópia, igual ao original (mesmos passos e setas), nome "(cópia)"
    n0=len(SP(pg)); orig=SP(pg)[lid]
    pg.click(f'[data-a="bpCopy"][data-id="{lid}"]'); pg.wait_for_timeout(400)
    new=[i for i in SP(pg) if i not in (lid,) and SP(pg)[i]["name"].endswith("(cópia)")]
    print("duplicar (cartão):", len(SP(pg))==n0+1, new and SP(pg)[new[0]]["name"], "| editor aberto:", pg.input_value('#dlg [name=bpname]'))
    if len(new)!=1 or SP(pg)[new[0]]["fr"]!=orig["fr"] or pg.input_value('#dlg [name=bpname]')!=orig["name"]+" (cópia)": errs.append("duplicar cartão")
    cp1=new[0]
    # na cópia mudo uma seta; o original fica igual
    hc=pg.evaluate("(()=>{const p=[...document.querySelectorAll('#bpSI [data-k]')].find(g=>g.querySelector('path[marker-end]'));return p.dataset.k})()")
    pg.evaluate(f"document.querySelector('#bpSI [data-k=\"{hc}\"] path[marker-end]').dispatchEvent(new PointerEvent('pointerdown',{{bubbles:true,clientX:0,clientY:0}}))")
    pg.keyboard.press("Delete"); pg.wait_for_timeout(100)
    # duplicar dentro do editor com alterações por guardar: pergunta, guarda e abre a segunda cópia
    pg.click('#dlg [data-a="bpCopyEd"]'); pg.wait_for_timeout(200)
    if not pg.evaluate("document.querySelector('#dlgAsk').open"): errs.append("duplicar editor sem perguntar")
    pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(400)
    sp=SP(pg); c2=[i for i,x in sp.items() if x["name"]==orig["name"]+" (cópia 2)"]
    print("duplicar (editor):", pg.input_value('#dlg [name=bpname]'), "| cópia 1 sem a seta:", len(sp[cp1]["fr"][0]["it"])==len(orig["fr"][0]["it"])-1, "| original igual:", sp[lid]["fr"]==orig["fr"])
    if len(c2)!=1 or sp[lid]["fr"]!=orig["fr"] or len(sp[cp1]["fr"][0]["it"])!=len(orig["fr"][0]["it"])-1 or sp[c2[0]]["fr"]!=sp[cp1]["fr"]: errs.append("duplicar editor")
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(CAP,"t28_duplicar.png"))
    # cópia (exportar) inclui as bolas paradas
    b.close()
    # iPad (tátil), deitado e ao alto; tema escuro; ecrã baixo
    for (w,h,nm,dark) in [(1180,820,"ipad_h",False),(820,1180,"ipad_v",True),(1280,420,"baixo",False)]:
        b=pw.chromium.launch(); c=b.new_context(viewport={"width":w,"height":h},has_touch=True,color_scheme="dark" if dark else "light"); q=c.new_page()
        q.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
        q.goto("file://"+DIST+"/app_local.html"); q.wait_for_timeout(1200)
        q.click('nav [data-t="bp"]'); q.wait_for_timeout(300); q.click('[data-a="bpOpen"]'); q.wait_for_timeout(400)
        box=q.evaluate("(()=>{const r=document.querySelector('#bpS').getBoundingClientRect();return [r.width,r.height,document.querySelector('#dlg .dlg-b').scrollWidth<=document.querySelector('#dlg .dlg-b').clientWidth+1]})()")
        print(nm, "campo", round(box[0]), "x", round(box[1]), "| sem scroll lateral:", box[2])
        tb=q.evaluate("document.querySelector('#dlg .bptools').getBoundingClientRect().height")
        if box[0]<300 or not box[2] or tb<28: errs.append(f"tamanho {nm} (ferramentas {tb})")
        # tocar e arrastar com o dedo
        r=q.evaluate("(()=>{const r=document.querySelector('#bpS').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        X,Y=r[0]+500*r[2]/1000, r[1]+79*r[3]/682
        q.touchscreen.tap(X,Y); q.wait_for_timeout(150)
        sel=q.evaluate("!!document.querySelector('#bpSI .bpring')");
        if not sel: errs.append("toque "+nm)
        q.screenshot(path=os.path.join(CAP,f"t28_{nm}.png"))
        b.close()
print("ERRORS",errs)

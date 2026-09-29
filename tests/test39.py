"""test39: editor de desenho (dwv.js) — iPad (arrastar para cima/baixo sem mexer a página), bola nova, linhas,
"Novo a partir deste", "Importar desenho", "Repor o da biblioteca" e desenhos antigos (drw) convertidos."""
import os, sys, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
errs=[]; fails=[]
def ok(c,m):
    print(("OK   " if c else "FALHA ")+m)
    if not c: fails.append(m)
def LS(pg): return pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1'))")
def openEx(pg,xid):
    pg.evaluate(f"()=>{{const b=document.querySelector('.ex[data-id=\"{xid}\"]'); b.scrollIntoView(); b.click();}}"); pg.wait_for_timeout(150)
def items(pg): return pg.eval_on_selector_all("#dvS .dvi","e=>e.length")
TOUCH="""(a)=>{const s=document.querySelector('#dvS');const r=s.getBoundingClientRect();
  const ev=(t,x,y)=>{const X=r.left+r.width*x,Y=r.top+r.height*y; const el=t==='pointerdown'?(document.elementFromPoint(X,Y)||s):s; el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:X,clientY:Y,pointerId:9,pointerType:'touch',isPrimary:true}));};
  ev('pointerdown',a[0],a[1]); const n=6; for(let i=1;i<=n;i++) ev('pointermove',a[0]+(a[2]-a[0])*i/n,a[1]+(a[3]-a[1])*i/n); ev('pointerup',a[2],a[3]);}"""
with sync_playwright() as pw:
    b=pw.chromium.launch()
    ctx=b.new_context(viewport={"width":820,"height":1180},has_touch=True,is_mobile=True)
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(500)
    pg.tap('nav [data-t="treinos"]'); pg.tap('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(150)

    # --- bola nova nas miniaturas da biblioteca
    ok(pg.evaluate("document.querySelectorAll('.excards img').length")>0,"miniaturas da biblioteca")
    openEx(pg,"exi001")
    ok(pg.locator('#dlg [data-a="exFrom"]').count()==1,"botão 'Novo a partir deste' na ficha")
    pg.tap('#dlg [data-a="drawEx"]'); pg.wait_for_timeout(200)
    ok(pg.locator("#dvS").count()==1,"editor aberto")
    ok(pg.locator('#dlg [data-a="dvLib"]').count()==1,"'Repor o da biblioteca' num exercício da biblioteca")
    n0=items(pg); ok(n0>3,f"desenho da biblioteca carregado no editor ({n0} elementos)")
    svg=pg.inner_html("#dvS"); ok("#1d3fa0" in svg.lower() or "mka" in svg.lower() or 'data-ball' in svg or svg.count("<path")>0,"desenho com elementos")
    has_ball=pg.evaluate("""()=>{const v=document.querySelector('#dvS').innerHTML; return /class="vball"|data-b="1"/.test(v)||v.includes('BALLMK')}""")
    # a bola nova tem gomos coloridos: procura as cores da bola MKA
    cols=pg.evaluate("""()=>[...document.querySelectorAll('#dvS [fill]')].map(e=>e.getAttribute('fill').toLowerCase())""")
    ok(any(c in cols for c in ["#c42a42","#2458c8","#cfae1d"]) or has_ball,"bola nova (gomos coloridos) no desenho")

    # --- iPad: o editor cabe no ecrã e arrastar para baixo/cima não mexe a página
    bx=pg.locator("#dvS").bounding_box()
    ok(bx["y"]>=0 and bx["y"]+bx["height"]<=1180+1,f"campo inteiro visível no ecrã ({int(bx['y'])}..{int(bx['y']+bx['height'])})")
    pg.tap('#dlg [data-a="dvTool"][data-k="pA"]'); pg.touchscreen.tap(bx["x"]+bx["width"]*.5, bx["y"]+bx["height"]*.3)
    pg.tap('#dlg [data-a="dvTool"][data-k="sel"]')
    last=lambda: pg.evaluate("()=>{const g=[...document.querySelectorAll('#dvS .dvi')].pop(); const r=g.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]}")
    c0=last(); sy0=pg.evaluate("()=>[scrollY,document.querySelector('#dlg').scrollTop,document.querySelector('#dlg .dlg-b')?document.querySelector('#dlg .dlg-b').scrollTop:0]")
    fx=(c0[0]-bx["x"])/bx["width"]; fy=(c0[1]-bx["y"])/bx["height"]
    pg.evaluate(TOUCH,[fx,fy,fx,fy+.4]); pg.wait_for_timeout(80)
    c1=last(); ok(c1[1]-c0[1]>bx["height"]*.3,f"arrastar para baixo com o dedo ({c0[1]:.0f}→{c1[1]:.0f})")
    pg.evaluate(TOUCH,[fx,fy+.4,fx,fy-.1]); pg.wait_for_timeout(80)
    c2=last(); ok(c1[1]-c2[1]>bx["height"]*.4,f"arrastar para cima com o dedo ({c1[1]:.0f}→{c2[1]:.0f})")
    sy1=pg.evaluate("()=>[scrollY,document.querySelector('#dlg').scrollTop,document.querySelector('#dlg .dlg-b')?document.querySelector('#dlg .dlg-b').scrollTop:0]")
    ok(sy0==sy1,f"a página não se mexeu ({sy0} → {sy1})")
    # o toque no campo não deixa o browser fazer scroll: touchstart/touchmove cancelados
    prevented=pg.evaluate("""()=>{const s=document.querySelector('#dvS'); const r=s.getBoundingClientRect();
      const t=new Touch({identifier:3,target:s,clientX:r.left+20,clientY:r.top+20});
      const e=new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[t],targetTouches:[t],changedTouches:[t]}); s.dispatchEvent(e); return e.defaultPrevented}""")
    ok(prevented,"toque no campo não faz scroll (touchstart cancelado)")
    ta=pg.evaluate("getComputedStyle(document.querySelector('#dvS')).touchAction")
    ok(ta=="none",f"touch-action:none no campo ({ta})")

    # --- linhas
    n1=items(pg)
    pg.tap('#dlg [data-a="dvTool"][data-k="line"]'); pg.evaluate(TOUCH,[.2,.8,.6,.8]); pg.wait_for_timeout(60)
    ok(items(pg)==n1+1,"linha contínua criada")
    ok(pg.locator('#dvProps [data-a="dvLine"]').count()>=3 and pg.locator('#dvProps [data-a="dvArr"]').count()>=2,"propriedades da linha (estilo e setas)")
    ok(pg.locator('#dvS [data-h="a"]').count()==1 and pg.locator('#dvS [data-h="b"]').count()==1,"pegas nas pontas da linha")
    pg.tap('#dvProps [data-a="dvLine"][data-s="d"]'); pg.tap('#dvProps [data-a="dvArr"][data-s="2"]'); pg.wait_for_timeout(60)
    pg.tap('#dlg [data-a="dvTool"][data-k="dline"]'); pg.evaluate(TOUCH,[.2,.9,.7,.9]); pg.wait_for_timeout(60)
    ok(items(pg)==n1+2,"linha tracejada criada")
    # mover a ponta b
    pg.evaluate("""()=>{const h=document.querySelector('#dvS [data-h="b"]'); const r=h.getBoundingClientRect(); const s=document.querySelector('#dvS'); const R=s.getBoundingClientRect();
      const ev=(t,x,y,el)=>(el||s).dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:4,pointerType:'touch'}));
      ev('pointerdown',r.x+r.width/2,r.y+r.height/2,h); ev('pointermove',R.left+R.width*.9,R.top+R.height*.6); ev('pointerup',R.left+R.width*.9,R.top+R.height*.6);}""")
    # curto demais: não cria
    pg.evaluate(TOUCH,[.5,.5,.505,.5]); ok(items(pg)==n1+2,"toque curto não cria linha")
    pg.screenshot(path=os.path.join(CAP,"d_draw_ipad.png"))
    pg.tap('#dlg [data-a="mSave"]'); pg.wait_for_timeout(250)
    d=LS(pg)["exercises"]["exi001"]
    lns=[i for i in d["vec"]["it"] if i["t"]=="ln"]
    ok(any(i.get("dash") and i.get("arr")==2 for i in lns),"linha com tracejado e seta nas duas pontas guardada")
    ok(any(abs(i["pts"][-1][0]-d["vec"]["w"]*.9)<4 for i in lns),"ponta da linha arrastada guardada")
    ok(d.get("imgk")=="exi001","biblioteca: imgk mantém-se (imagem original ainda disponível)")

    # --- repor o da biblioteca
    pg.tap('#dlg [data-a="drawEx"]'); pg.wait_for_timeout(150)
    pg.tap('#dlg [data-a="dvLib"]'); pg.wait_for_timeout(80)
    ok(items(pg)==n0,"repor o desenho da biblioteca")
    pg.tap('#dlg [data-a="dvUndo"]'); ok(items(pg)==n1+2,"desfazer o repor")
    pg.tap('#dlg [data-a="mClose"]'); pg.wait_for_timeout(150)
    if pg.locator('#confirmDlg[open], dialog[open] [data-a="cfOk"]').count(): pass

    # --- novo a partir deste
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(500)
    pg.tap('nav [data-t="treinos"]'); pg.tap('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(150)
    before=set(LS(pg)["exercises"].keys())
    openEx(pg,"exi002"); pg.tap('#dlg [data-a="exFrom"]'); pg.wait_for_timeout(250)
    ok(pg.locator("#dvS").count()==1,"'Novo a partir deste' abre logo o editor")
    nn=items(pg)
    pg.tap('#dlg [data-a="dvTool"][data-k="ball"]'); bx=pg.locator("#dvS").bounding_box(); pg.touchscreen.tap(bx["x"]+bx["width"]*.4,bx["y"]+bx["height"]*.4)
    ok(items(pg)==nn+1,"bola acrescentada à cópia")
    # importar o desenho de outro exercício
    pg.tap('#dlg [data-a="dvImport"]'); pg.wait_for_timeout(120)
    ok(pg.locator("#dvImp .dvimp-i").count()>5,"lista para importar desenho")
    pg.evaluate("()=>{const i=document.querySelector('#dvImp input'); i.value='Vagas 3x2'; i.dispatchEvent(new Event('input',{bubbles:true}));}"); pg.wait_for_timeout(80)
    pk=pg.locator('#dvImp .dvimp-i[data-id="exi003"]'); ok(pk.count()==1,"pesquisa na lista de importar")
    if pk.count(): pk.tap(); pg.wait_for_timeout(150)
    ok(pg.locator("#dvImp").is_hidden(),"lista fecha depois de escolher")
    pg.screenshot(path=os.path.join(CAP,"d_draw_copia.png"))
    pg.tap('#dlg [data-a="mSave"]'); pg.wait_for_timeout(250)
    ex=LS(pg)["exercises"]; new=[k for k in ex if k not in before]
    ok(len(new)==1,"uma cópia criada")
    if new:
        c=ex[new[0]]; o=ex["exi002"]
        ok(c["name"]=="Conquistar a base (cópia)",f"nome da cópia ({c['name']})")
        ok("vec" in c and "imgk" not in c,"cópia tem desenho próprio (sem imgk)")
        ok(c.get("cat")==o.get("cat") and c.get("desc")==o.get("desc"),"cópia leva categoria e descrição")
        ok("vec" not in o,"original intacto")
        ok(len(c["vec"]["it"])>0,"desenho importado guardado")
    # segunda cópia do mesmo: nome "(cópia 2)"
    openEx(pg,"exi002"); pg.tap('#dlg [data-a="exFrom"]'); pg.wait_for_timeout(200); pg.tap('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    ok(any(x["name"]=="Conquistar a base (cópia 2)" for x in LS(pg)["exercises"].values()),"segunda cópia com nome '(cópia 2)'")

    # --- desenho antigo (drw) é convertido e editável
    st=LS(pg); st["exercises"]["ex01"]["drw"]={"f":"full","it":[{"t":"A","x":300,"y":300,"n":1},{"t":"ball","x":500,"y":340},{"t":"run","x1":200,"y1":200,"x2":400,"y2":250}]}
    st["exercises"]["ex01"].pop("vec",None)
    pg.evaluate("s=>localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s))",st)
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(500)
    pg.tap('nav [data-t="treinos"]'); pg.tap('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(150)
    openEx(pg,"ex01"); pg.tap('#dlg [data-a="drawEx"]'); pg.wait_for_timeout(150)
    ok(items(pg)==3,f"desenho antigo convertido ({items(pg)} elementos)")
    pg.tap('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    e1=LS(pg)["exercises"]["ex01"]; ok("vec" in e1 and "drw" not in e1,"desenho antigo passa a vec ao guardar")
    b.close()
print("ERR",errs)
if errs or fails: print("FALHAS:",fails); sys.exit(1)

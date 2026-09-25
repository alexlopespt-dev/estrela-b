# Grava a app a ser usada (frames reais a 60 fps, relógio controlado) — um clip por funcionalidade.
import os, sys, json, math, shutil
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from demo import demo
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT="/home/user/estrela-b"; LSK="estrela-tecnico-v1"
APP=open(ROOT+"/dist/app_local.html").read(); FIX=open(ROOT+"/tests/monitorizacao_exemplo.json").read()
FPS=60; DT=1000/FPS
TOUCH_JS="""(()=>{ if(document.getElementById('ft')) return; const d=document.createElement('div'); d.id='ft';
 d.style.cssText='position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.55);border:2px solid rgba(255,255,255,.95);box-shadow:0 0 0 1px rgba(0,0,0,.25),0 6px 18px rgba(0,0,0,.35);pointer-events:none;z-index:2147483647;opacity:0;transition:none';
 const r=document.createElement('div'); r.id='ftr'; r.style.cssText='position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid rgba(255,255,255,.9);pointer-events:none;z-index:2147483646;opacity:0';
 document.documentElement.appendChild(r); document.documentElement.appendChild(d);
 window.__ft=(x,y,o,s)=>{ d.style.left=x+'px'; d.style.top=y+'px'; d.style.opacity=o; d.style.transform='scale('+s+')'; };
 window.__ftr=(x,y,k)=>{ r.style.left=x+'px'; r.style.top=y+'px'; r.style.opacity=Math.max(0,1-k); r.style.transform='scale('+(1+k*1.6)+')'; };
 // escondida nos diálogos também (o <dialog> fica na top layer): a bolinha vai para dentro do diálogo aberto
 window.__ftTop=()=>{ const dl=[...document.querySelectorAll('dialog[open]')].pop(); const host=dl||document.documentElement; if(d.parentNode!==host){ host.appendChild(r); host.appendChild(d); } };
})()"""
ease=lambda t: 4*t*t*t if t<.5 else 1-(-2*t+2)**3/2
class Rec:
    def __init__(s,pg,name):
        s.pg=pg; s.dir=os.path.join(HERE,"clips",name); shutil.rmtree(s.dir,ignore_errors=True); os.makedirs(s.dir); s.n=0; s.pos=None
        pg.evaluate(TOUCH_JS)
    def frame(s,k=1):
        for _ in range(k):
            s.pg.clock.run_for(int(DT)); s.pg.evaluate("window.__ftTop&&__ftTop()")
            s.pg.screenshot(path=f"{s.dir}/{s.n:05d}.jpg",type="jpeg",quality=90); s.n+=1
    def hold(s,sec): s.frame(int(sec*FPS))
    def xy(s,sel,nth=0):
        b=s.pg.locator(sel).nth(nth).bounding_box(); return (b["x"]+b["width"]/2,b["y"]+b["height"]/2)
    def move(s,x,y,sec=.45,show=True):
        x0,y0=s.pos if s.pos else (x+120,y+160); n=max(1,int(sec*FPS))
        for i in range(1,n+1):
            k=ease(i/n); cx=x0+(x-x0)*k; cy=y0+(y-y0)*k-math.sin(math.pi*i/n)*18
            s.pg.evaluate(f"__ft({cx},{cy},{min(1,i/(n*.4)) if not s.pos else 1},1)"); s.pg.mouse.move(cx,cy); s.frame()
        s.pos=(x,y)
    def tap(s,sel=None,nth=0,at=None,after=.35):
        x,y=at if at else s.xy(sel,nth); s.move(x,y)
        for i in range(5): s.pg.evaluate(f"__ft({x},{y},1,{1-.18*i/4})"); s.frame()
        s.pg.mouse.click(x,y)
        for i in range(14): k=i/13; s.pg.evaluate(f"__ft({x},{y},1,{.82+.18*k});__ftr({x},{y},{k})"); s.frame()
        s.pg.evaluate(f"__ftr({x},{y},1)"); s.hold(after)
    def hide(s,sec=.3):
        if not s.pos: return
        x,y=s.pos; n=int(sec*FPS)
        for i in range(n): s.pg.evaluate(f"__ft({x},{y},{1-(i+1)/n},1)"); s.frame()
        s.pos=None
    def scroll(s,dy,sec=1.2,el=None,finger=True):
        n=int(sec*FPS); js=(f"document.querySelector('{el}')" if el else "document.scrollingElement")
        y0=s.pg.evaluate(f"{js}.scrollTop"); fx,fy=(s.pos if s.pos else (900,600))
        if finger and not s.pos: s.move(fx,fy,.3)
        for i in range(1,n+1):
            k=ease(i/n); s.pg.evaluate(f"{js}.scrollTop={y0+dy*k}")
            if finger: s.pg.evaluate(f"__ft({fx},{fy-(dy*k)*0.25 % 260},1,1)")
            s.frame()
    def drag(s,x0,y0,x1,y1,sec=.8):
        s.move(x0,y0,.35); s.pg.mouse.move(x0,y0); s.pg.mouse.down(); n=int(sec*FPS)
        for i in range(1,n+1):
            k=ease(i/n); x=x0+(x1-x0)*k; y=y0+(y1-y0)*k; s.pg.mouse.move(x,y); s.pg.evaluate(f"__ft({x},{y},1,.85)"); s.frame()
        s.pg.mouse.up(); s.pos=(x1,y1); s.pg.evaluate(f"__ft({x1},{y1},1,1)"); s.hold(.15)
    def type(s,sel,text,cps=14):
        s.tap(sel,after=.1)
        for ch in text: s.pg.keyboard.type(ch); s.frame(max(1,int(FPS/cps)))
    def done(s): print(s.dir, s.n, "frames"); return s.n

def setup(pw,vp,dsf,dark=False,mobile=False):
    b=pw.chromium.launch(); ctx=b.new_context(viewport=vp,device_scale_factor=dsf,has_touch=False,color_scheme="dark" if dark else "light",is_mobile=False)
    pg=ctx.new_page()
    pg.route("https://estrela.test/**",lambda r:r.fulfill(status=200,body=APP,headers={"Content-Type":"text/html"}))
    def mon(route):
        u=route.request.url
        if "cb=" in u: cb=u.split("cb=")[1].split("&")[0]; route.fulfill(status=200,body=f"{cb}({FIX});",headers={"Content-Type":"application/javascript"})
        else: route.fulfill(status=200,body=FIX,headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
    pg.route("https://script.google.com/**",mon)
    # só no vídeo: sem Google Fonts aqui, a Barlow passa a Inter e a Barlow Condensed a Roboto Condensed (aspeto próximo do iPad)
    pg.add_init_script("""document.addEventListener('DOMContentLoaded',()=>{ const st=document.createElement('style');
      st.textContent='@font-face{font-family:"Barlow";src:local("Inter");font-weight:100 900}@font-face{font-family:"Barlow Condensed";src:local("Roboto Condensed");font-weight:100 900}';
      document.head.appendChild(st); });""")
    pg.goto("https://estrela.test/"); pg.wait_for_timeout(1500)
    db=demo(pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}'))"))
    db["meta"].setdefault("cfg",{})["mon"]={"url":"https://script.google.com/macros/s/DEMO/exec","key":"x","map":{}}
    pg.evaluate(f"localStorage.setItem('{LSK}',JSON.stringify({json.dumps(db)}))")
    pg.evaluate(f"localStorage.setItem('{LSK}:theme','{'dark' if dark else 'light'}')")
    pg.clock.install(time="2026-09-25T10:00:00")
    pg.reload(); pg.clock.run_for(2500); pg.wait_for_timeout(800); pg.clock.run_for(500)
    pg.evaluate("document.querySelector('#toast')&&document.querySelector('#toast').classList.remove('show')")
    return b,pg

only=set(sys.argv[1:])
with sync_playwright() as pw:
    IPAD=({"width":1180,"height":820},1.5)
    if not only or "painel" in only:
        b,pg=setup(pw,*IPAD); r=Rec(pg,"painel")
        r.hold(.8); r.scroll(420,1.6); r.hold(.4); r.scroll(-420,1.2); r.tap('nav [data-t="treinos"]',after=.6); r.done(); b.close()
    if not only or "treino" in only:
        b,pg=setup(pw,*IPAD); pg.click('nav [data-t="treinos"]'); pg.clock.run_for(300); r=Rec(pg,"treino")
        r.hold(.3); r.tap('[data-p="treino"][data-id="tr_demo14"]',after=.5); r.scroll(330,1.1)
        r.tap('[data-a="planMom"]',nth=5,after=.25); r.tap('[data-a="planMom"]',nth=11,after=.25); r.scroll(420,1.0); r.hide(); r.hold(.3); r.done(); b.close()
    if not only or "plan" in only:
        b,pg=setup(pw,*IPAD); pg.click('nav [data-t="treinos"]'); pg.clock.run_for(300); r=Rec(pg,"plan")
        r.tap('[data-a="tsub"][data-k="plan"]',after=.4); r.scroll(560,1.1)
        chips=pg.locator('[data-a="distSel"], [data-a="mdl"], [data-a="dist"]').count()
        r.hold(.3); r.scroll(640,1.3); r.hide(); r.hold(.5); r.done(); b.close()
    if not only or "ex" in only:
        b,pg=setup(pw,*IPAD); pg.click('nav [data-t="treinos"]'); pg.clock.run_for(300); r=Rec(pg,"ex")
        r.tap('[data-a="tsub"][data-k="ex"]',after=.3); r.scroll(900,1.4); r.tap('[data-a="exView"]',nth=14,after=.6)
        r.tap('#dlg [data-a="exvMode"][data-k="o"]',after=.5); r.tap('#dlg [data-a="exvMode"][data-k="v"]',after=.5); r.hide(); r.done(); b.close()
    if not only or "conv" in only:
        b,pg=setup(pw,*IPAD); pg.click('nav [data-t="jogos"]'); pg.clock.run_for(300); pg.click('[data-a="jsub"][data-k="conv"]'); pg.clock.run_for(300)
        pg.select_option('[data-c="convG"]',"jg_2627_j3"); pg.clock.run_for(300); pg.evaluate("document.scrollingElement.scrollTop=560"); pg.clock.run_for(100)
        r=Rec(pg,"conv"); r.hold(.2)
        tiles=pg.locator('#main [data-a="call"]'); nt=tiles.count()
        for i in [0,1,3,4,5,6,8,9,10,12,13,14,15,16]:
            if i<nt: x,y=r.xy('#main [data-a="call"]',i); r.move(x,y,.16); pg.mouse.click(x,y); pg.evaluate(f"__ftr({x},{y},.3)"); r.frame(4)
        r.hide(.2); pg.evaluate("document.querySelector('.convdocs').scrollIntoView({block:'center'})"); pg.clock.run_for(50)
        y1=pg.evaluate("document.scrollingElement.scrollTop"); pg.evaluate("document.scrollingElement.scrollTop=%d"%(y1-900)); r.scroll(900,1.3,finger=False); r.hold(.6); r.done(); b.close()
    if not only or "bp" in only:
        b,pg=setup(pw,*IPAD); pg.click('nav [data-t="bp"]'); pg.clock.run_for(300); r=Rec(pg,"bp")
        r.tap('[data-a="bpOpen"][data-id="bp_livlat1"]',after=.4)
        def P(x,y): bb=pg.locator("#bpS").bounding_box(); return (bb["x"]+x*bb["width"]/1000, bb["y"]+y*bb["height"]/682)
        r.tap('#dlg [data-a="bpFrameAdd"]',after=.2)
        for (a,bxy) in [((421,334),(470,150)),((474,334),(560,120)),((296,335),(420,200)),((858,508),(700,420))]:
            x0,y0=P(*a); x1,y1=P(*bxy); r.drag(x0,y0,x1,y1,.55)
        r.tap('#dlg [data-a="bpTool"][data-k="pass"]',after=.1); x0,y0=P(814,502); x1,y1=P(520,160); r.drag(x0,y0,x1,y1,.7)
        r.tap('#dlg [data-a="bpTool"][data-k="sel"]',after=.1); r.tap('#dlg [data-a="bpPlay"]',after=.1); r.hide(.2); r.hold(2.4); r.done(); b.close()
    if not only or "mon" in only:
        b,pg=setup(pw,*IPAD); pg.click('nav [data-t="mon"]'); pg.clock.run_for(800); pg.wait_for_timeout(600); pg.clock.run_for(300); r=Rec(pg,"mon")
        r.hold(.4); r.tap('[data-a="monSort"]',nth=1,after=.5); r.scroll(380,1.0); r.tap('[data-a="page"][data-p="atleta"]',nth=0,after=.2) if pg.locator('[data-a="page"][data-p="atleta"]').count() else None
        r.hide(); r.hold(.8); r.done(); b.close()
    if not only or "phone" in only:
        b,pg=setup(pw,{"width":390,"height":844},2,dark=True); r=Rec(pg,"phone")
        r.hold(.3); r.scroll(700,1.6); r.tap('nav [data-t="jogos"]',after=.4); r.tap('[data-p="jogo"][data-id="jg_j1"]',after=.3); r.scroll(500,1.0); r.hide(); r.done(); b.close()

"""test40: quem falta responder (painel + Respostas do dia, WhatsApp individual e para o grupo, telemóvel na ficha)
e avisos push da app do atleta (dados_app.gs: VAPID ES256, acionador, sw.js; app: botão Ativar avisos)."""
import os, sys, json, subprocess, urllib.parse
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
errs=[]
def ok(c,m):
    print(("OK   " if c else "FALHA ")+m)
    if not c: errs.append(m)
# ================= 1) quem falta (app técnica) =================
BASE=json.load(open(os.path.join(ROOT,"tests","monitorizacao_exemplo.json")))
URL="https://script.google.com/macros/s/TESTE/exec"
def handler(route): route.fulfill(status=200,body=json.dumps(BASE),headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
DIA="2026-09-23"
disp=[j["nome"] for j in BASE["jogadores"] if not j.get("estado") or j["estado"] in ("Disponível","Condicionado")]
resp=set(x["n"] for x in BASE["respostas"]["bem"] if x["d"]==DIA)
falta=[n for n in disp if n not in resp]
print("esperados:",len(disp),"responderam:",len(resp&set(disp)),"faltam:",len(falta))
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900}); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.route("https://script.google.com/**",handler)
    pg.clock.set_fixed_time(DIA+"T10:00:00")
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="mon"]'); pg.click('.bar [data-a="monCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',"certa"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1000)
    pg.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); s.events.t40={type:'treino',date:'%s',time:'19:00',dur:90,att:{}}; localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}"""%DIA)
    pg.reload(); pg.wait_for_timeout(1500)
    pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(300)
    t=pg.inner_text(".fl") if pg.locator(".fl").count() else ""
    print("painel:",t.replace("\n"," | "))
    ok("Bem-estar hoje" in t and f"Faltam {len(falta)}" in t,"painel mostra quantos faltam ao bem-estar")
    # telemóvel na ficha de um dos que faltam
    pls=pg.evaluate("Object.entries(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).players).map(([id,p])=>[id,p.name])")
    pg.click('.fl [data-a="faltaOpen"][data-k="bem"]'); pg.wait_for_timeout(200)
    rows=pg.locator("#dlg .list .li").count(); ok(rows==len(falta),f"lista com {rows} (esperado {len(falta)})")
    hrefs=pg.eval_on_selector_all('#dlg .list a[href^="https://wa.me/"]',"e=>e.map(a=>a.href)")
    ok(len(hrefs)==len(falta) and all("text=" in h for h in hrefs),"WhatsApp por atleta")
    grp=pg.inner_text("#faltaGrp"); ok("http" not in grp and "bem-estar" in grp,"mensagem do grupo só com nomes")
    first=pg.inner_text("#dlg .list .li >> nth=0 >> b")
    pg.screenshot(path=os.path.join(CAP,"t40_falta.png"))
    pg.click('#dlg [data-a="mClose"]')
    pid=[i for i,n in pls if n==first]
    if pid:
        pg.evaluate("""([id])=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); s.players[id].tel='912 345 678'; localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}""",[pid[0]])
        pg.reload(); pg.wait_for_timeout(1500); pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(300)
        pg.click('.fl [data-a="faltaOpen"][data-k="bem"]'); pg.wait_for_timeout(200)
        h=pg.get_attribute("#dlg .list .li >> nth=0 >> a","href"); ok(h.startswith("https://wa.me/351912345678?"),"número da ficha no WhatsApp ("+h[:40]+")")
        pg.click('#dlg [data-a="mClose"]')
        # campo no formulário do atleta
        pg.evaluate(f"document.querySelector('[data-a=\"page\"][data-p=\"atleta\"][data-id=\"{pid[0]}\"]')||0")
    # PSE: só depois de acabar a sessão do dia
    tr=pg.evaluate(f"Object.values(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).events).filter(e=>e.date==='{DIA}'&&e.time).map(e=>e.type+' '+e.time+' '+e.dur)")
    print("sessões do dia:",tr)
    if tr:
        ok("PSE hoje" in t and "depois da sessão (20:30)" in t,"PSE ainda não pedido antes do fim da sessão")
        pg.clock.set_fixed_time(DIA+"T23:30:00"); pg.reload(); pg.wait_for_timeout(1500); pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(300)
        t=pg.inner_text(".fl"); print("noite:",t.replace("\n"," | "))
        ok("PSE hoje" in t and "depois da sessão" not in t and ("Faltam" in t.split("PSE hoje")[1] or "Todos" in t.split("PSE hoje")[1]),"PSE pedido depois da sessão")
        if pg.locator('.fl [data-a="faltaOpen"][data-k="pse"]').count():
            pg.click('.fl [data-a="faltaOpen"][data-k="pse"]'); pg.wait_for_timeout(200)
            ok("PSE" in pg.inner_text("#dlg") and pg.locator("#dlg .list .li").count()>0,"lista de quem falta ao PSE"); pg.click('#dlg [data-a="mClose"]')
    # Respostas do dia: botão Lembrar
    pg.click('nav [data-t="mon"]'); pg.click('[data-a="monV"][data-k="resp"]'); pg.wait_for_timeout(200)
    ok(pg.locator('#main [data-a="faltaOpen"][data-k="bem"]').count()==1,"botão Lembrar nas Respostas do dia")
    # formulário do atleta tem Telemóvel
    pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(200)
    pg.evaluate(f"(()=>{{const b=document.querySelector('[data-a=\"page\"][data-p=\"atleta\"][data-id=\"{pls[0][0]}\"]'); if(b) b.click();}})()"); pg.wait_for_timeout(300)
    eb=pg.locator('[data-a="plEdit"]')
    if eb.count():
        eb.first.click(); pg.wait_for_timeout(200)
        pg.fill('#dlg [name=tel]',"+351 961 111 222"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
        v=pg.evaluate(f"JSON.parse(localStorage.getItem('estrela-tecnico-v1')).players['{pls[0][0]}'].tel"); ok(v=="+351 961 111 222","telemóvel guardado na ficha")
    else: ok(False,"botão editar atleta")
    pg.set_viewport_size({"width":390,"height":844}); pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(300)
    ov=pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); ok(ov<=1,"sem overflow no telemóvel")
    pg.screenshot(path=os.path.join(CAP,"t40_painel_m.png"),full_page=False)
    b.close()

# ================= 2) avisos push: dados_app.gs (Google simulado, relógio simulado) =================
import urllib.request, base64
VERIFY=r"""const c=require('crypto');const [pub,data,sig]=process.argv.slice(1);const b=Buffer.from(pub,'base64url');
try{const k=c.createPublicKey({key:{kty:'EC',crv:'P-256',x:b.subarray(1,33).toString('base64url'),y:b.subarray(33).toString('base64url')},format:'jwk'});
if(data==='-'){console.log('ponto');process.exit(0);}
console.log(c.verify('sha256',Buffer.from(data),{key:k,dsaEncoding:'ieee-p1363'},Buffer.from(sig,'base64url'))?'valida':'invalida');}catch(e){console.log('erro '+e.message);}"""
def es256(pub,data,sig): return subprocess.run(["node","-e",VERIFY,pub,data,sig],capture_output=True,text=True).stdout.strip()
KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8793
ID_BEM="1w5BTGC_4J8565aigffuRKRFSeAOsqKK4WDgNnaAo8II"; ID_PSE="1lnH3j_dXdFSOw-6Ak9CdtRpWWjm1MIvJBEToQowX_3Q"
env=dict(os.environ, TZ="Europe/Lisbon")
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,env=env)
assert "pronto" in srv.stdout.readline()
BASE_U=f"http://127.0.0.1:{PORT}"
def rq(path,data=None): return json.loads(urllib.request.urlopen(urllib.request.Request(BASE_U+path,data=json.dumps(data).encode() if data is not None else None,method="POST" if data is not None else "GET")).read())
def post(p): return rq("/exec",p)
def get(q): return rq("/exec?"+urllib.parse.urlencode(q))
def agora(t=None): return rq("/__agora"+("?t="+t if t is not None else ""))
def run(f): return rq("/__run?f="+f)
def b64d(x): return base64.urlsafe_b64decode(x+"="*(-len(x)%4))
DIA="2026-10-06"   # terça-feira
FOTO="data:image/jpeg;base64,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"
TOK="tokLuisA_abcdefghijklmnop"; TOK_H="tokHugo_abcdefghijklmnopq"
H_BEM=["Carimbo de data/hora","Nome do Jogador","Qualidade do sono - Como dormiste esta noite?","Fadiga Geral - Como te sentes fisicamente?","Dor Muscular - nível de dores musculares?","Stress - Como está o teu nível de stress?"]
H_PSE=["Carimbo de data/hora","Nome do Jogador","Tipo de sessão","Duração da sessão","Quão intenso foi o treino? (PSE)"]
try:
    agora(DIA+"T07:50:00")
    post({"a":"x"}); run("prepararDadosApp")
    ok("avisosAtletas" in rq("/__estado")["triggers"],"acionador dos avisos instalado")
    rq("/__prep",{"nomes":["Luís A.","Hugo R."],"respostas":[{"id":ID_BEM,"nome":"respostas","linhas":[H_BEM]},{"id":ID_PSE,"nome":"respostas","linhas":[H_PSE]}]})
    ops=[{"c":"players","i":"ta1","d":{"name":"Luís A.","n":7,"atk":TOK}},{"c":"players","i":"ta2","d":{"name":"Hugo R.","n":9,"atk":TOK_H,"photoData":FOTO}},
         {"c":"meta","i":"cfg","d":{"atletaUrl":"https://estrela-b-atleta.netlify.app"}},
         {"c":"events","i":"tr1","d":{"type":"treino","date":DIA,"time":"19:00","dur":90,"att":{}}},
         {"c":"events","i":"j1","d":{"type":"jogo","date":"2026-10-11","time":"15:00","opp":"Talaíde","venue":"F","dur":90,"call":["ta1"],"meetT":"13:15","convPub":True}}]
    post({"k":KEY,"a":"push","ops":ops})
    r=get({"a":"atleta","t":TOK}); key=(r.get("push") or {}).get("key","")
    pub=b64d(key); ok(len(pub)==65 and pub[0]==4,"chave pública VAPID (65 bytes, 0x04)")
    # a chave pública é mesmo o ponto da curva P-256
    ok(es256(key,"-","")=="ponto","ponto válido na curva P-256 (aceite pelo crypto do Node)")
    ok(post({"a":"atleta_push","t":TOK,"sub":{"endpoint":"https://evil.example/x"}}).get("erro")=="Endereço de avisos desconhecido.","endereço de avisos estranho recusado")
    ok(post({"a":"atleta_push","t":"z"*24,"sub":{"endpoint":"https://fcm.googleapis.com/fcm/send/a"}}).get("erro")=="link","código errado recusado")
    ok(post({"a":"atleta_push","t":TOK,"sub":{"endpoint":"https://fcm.googleapis.com/fcm/send/luis1"}}).get("n")==1,"subscrição do Luís guardada")
    ok(post({"a":"atleta_push","t":TOK_H,"sub":{"endpoint":"https://web.push.apple.com/hugo1"}}).get("n")==1,"subscrição do Hugo (iPhone) guardada")
    post({"a":"atleta_push","t":TOK_H,"sub":{"endpoint":"https://web.push.apple.com/gone-hugo"}})
    agora()
    # 07:50: nada ainda (antes das 8h)
    agora(DIA+"T07:50:00"); n=run("avisosAtletas"); ok(n==0 and not agora()["pedidos"],"antes das 8h não avisa")
    # 08:00: convocatória publicada → só o convocado (Luís)
    agora(DIA+"T08:00:00"); n=run("avisosAtletas"); pd=agora()["pedidos"]
    ok(n==1 and [p["url"] for p in pd]==["https://fcm.googleapis.com/fcm/send/luis1"],f"convocatória: aviso só ao convocado ({[p['url'] for p in pd]})")
    if pd:
        h=pd[0]["o"]["headers"]; auth=h.get("Authorization","")
        ok(h.get("TTL") and auth.startswith("vapid t=") and (", k="+key) in auth,"cabeçalhos VAPID")
        jwt=auth[8:].split(",")[0]; hd,pl_,sg=jwt.split("."); claims=json.loads(b64d(pl_))
        ok(json.loads(b64d(hd))=={"typ":"JWT","alg":"ES256"} and claims["aud"]=="https://fcm.googleapis.com" and claims["sub"]=="https://estrela-b-atleta.netlify.app","JWT: aud e sub")
        sig=b64d(sg); ok(len(sig)==64,"assinatura com 64 bytes")
        v=es256(key,hd+"."+pl_,sg); ok(v=="valida","assinatura ES256 válida (verificada com o crypto do Node): "+v)
        ok(es256(key,hd+"."+pl_+"x",sg)=="invalida","assinatura não serve para outra mensagem")
    r=get({"a":"aviso","t":TOK}); print("aviso:",r)
    ok(r.get("pend") and r["pend"][0]["t"]=="Estás convocado!" and "Talaíde" in r["pend"][0]["b"] and "13:15" in r["pend"][0]["b"] and r["pend"][0]["tab"]=="jogo","mensagem da convocatória")
    r=get({"a":"aviso","t":TOK}); ok(len(r.get("pend",[]))==1,"a seguir mostra a última (aviso repetido do telemóvel)")
    agora(DIA+"T08:15:00"); run("avisosAtletas"); ok(not agora()["pedidos"],"convocatória não repete")
    # 08:30: bem-estar aos dois; o endereço que já não existe (410) sai
    agora(DIA+"T08:29:00"); run("avisosAtletas"); ok(not agora()["pedidos"],"08:29: ainda não")
    agora(DIA+"T08:30:00"); n=run("avisosAtletas"); pd=agora()["pedidos"]; urls=sorted(p["url"] for p in pd)
    ok(n==2 and len(urls)==3,"bem-estar às 8h30: aviso aos dois ("+str(urls)+")")
    st=rq("/__estado")["props"]; subs=json.loads(st["av_ta2"])["subs"]
    ok([x["e"] for x in subs]==["https://web.push.apple.com/hugo1"],"endereço apagado (410) retirado")
    r=get({"a":"aviso","t":TOK_H}); ok(r["pend"][0]["t"].startswith("Bom dia, Hugo") and "bem-estar" in r["pend"][0]["b"],"mensagem do bem-estar")
    agora(DIA+"T09:15:00"); run("avisosAtletas"); ok(not agora()["pedidos"],"bem-estar não repete no mesmo dia")
    # Luís responde; PSE: fim 20:30 + 20 min
    agora(DIA+"T10:00:00"); post({"a":"atleta_bem","t":TOK,"i":[4,4,4,4],"d":DIA})
    post({"a":"atleta_pse","t":TOK,"tipo":"Treino","dur":90,"rpe":6,"d":DIA}) if False else None
    agora(DIA+"T20:45:00"); run("avisosAtletas"); ok(not agora()["pedidos"],"PSE: ainda não (20:45)")
    agora(DIA+"T20:40:00"); agora()
    agora(DIA+"T20:50:00"); post({"a":"atleta_pse","t":TOK,"tipo":"Treino","dur":90,"rpe":6})
    n=run("avisosAtletas"); pd=agora()["pedidos"]
    ok(n==1 and [p["url"] for p in pd]==["https://web.push.apple.com/hugo1"],"PSE às 20:50 só a quem não registou ("+str([p['url'] for p in pd])+")")
    r=get({"a":"aviso","t":TOK_H}); ok(r["pend"][0]["t"]=="Como correu o treino?","mensagem do PSE")
    agora(DIA+"T21:05:00"); run("avisosAtletas"); ok(not agora()["pedidos"],"PSE não repete")
    # dia de folga: sem bem-estar
    agora("2026-10-07T09:00:00"); run("avisosAtletas"); ok(not agora()["pedidos"],"folga: sem lembrete do bem-estar")
    # teste pedido pela app; desligar
    agora(DIA+"T12:00:00")
    r=post({"a":"atleta_push_teste","t":TOK}); ok(r.get("enviados")==1,"aviso de teste")
    ok(post({"a":"atleta_push_teste","t":TOK}).get("erro","").startswith("Espera"),"teste limitado a 1 por minuto")
    agora()
    ok(post({"a":"atleta_push","t":TOK,"sub":{"endpoint":"https://fcm.googleapis.com/fcm/send/luis1"},"on":False}).get("n")==0,"desligar avisos neste telemóvel")
    # ---- app do atleta (browser): botão Ativar avisos, com o push do browser simulado
    SURL="https://script.google.com/macros/s/TESTE/exec"; ATD=os.path.join(DIST,"atleta")
    def fwd(route):
        rq_=route.request; u=rq_.url.replace(SURL,BASE_U+"/exec")
        r=urllib.request.urlopen(urllib.request.Request(u,data=rq_.post_data_buffer if rq_.method=="POST" else None,method=rq_.method))
        route.fulfill(status=r.status,body=r.read(),headers={"Content-Type":r.headers.get("Content-Type"),"Access-Control-Allow-Origin":"*"})
    SO_INDEX={"on":False}
    def site(route):
        pth=urllib.parse.urlparse(route.request.url).path.lstrip("/") or "index.html"; f=os.path.join(ATD,pth)
        if SO_INDEX["on"] and pth!="index.html": return route.fulfill(status=404,body="Not found",headers={"Content-Type":"text/html"})
        if not os.path.isfile(f): return route.fulfill(status=404,body="")
        ct={"html":"text/html","js":"text/javascript","webmanifest":"application/manifest+json","png":"image/png"}[pth.rsplit(".",1)[1]]
        route.fulfill(status=200,body=open(f,"rb").read(),headers={"Content-Type":ct})
    STUB="""(()=>{ const sub={endpoint:'https://fcm.googleapis.com/fcm/send/fake1',options:{applicationServerKey:null},toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'x',auth:'y'}}},unsubscribe:async()=>{window.__unsub=1;return true}};
      let cur=null; const reg={pushManager:{getSubscription:async()=>cur,subscribe:async(o)=>{window.__subKey=new Uint8Array(o.applicationServerKey).length; window.__uvo=o.userVisibleOnly; cur=sub; return sub;}}};
      Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register:async(u)=>{window.__sw=u;return reg},ready:Promise.resolve(reg),getRegistration:async()=>reg,addEventListener(){}}});
      let perm='default'; window.Notification=class{ static get permission(){return perm} static async requestPermission(){perm='granted';return perm} };
      window.PushManager=window.PushManager||function(){}; })();"""
    agora(DIA+"T12:30:00")
    with sync_playwright() as pw:
        b=pw.chromium.launch(); c=b.new_context(viewport={"width":390,"height":844}); c.add_init_script(STUB); pg=c.new_page()
        pg.on("pageerror",lambda e:errs.append("PAGEERR atleta "+str(e)))
        pg.route("https://script.google.com/**",fwd); pg.route("https://atleta.test/**",site)
        pg.goto("https://atleta.test/#s="+urllib.parse.quote(SURL,safe="")+"&t="+TOK); pg.wait_for_timeout(1500)
        ok(pg.locator('#pushCard [data-a="pushOn"]').count()==1,"cartão 'Ativar avisos' no Hoje")
        pg.screenshot(path=os.path.join(CAP,"t40_avisos.png"),full_page=True)
        pg.click('#pushCard [data-a="pushOn"]'); pg.wait_for_timeout(1500)
        subs=json.loads(rq("/__estado")["props"].get("av_ta1","{}")).get("subs",[])
        ok([x["e"] for x in subs]==["https://fcm.googleapis.com/fcm/send/fake1"],"subscrição enviada para o script")
        ok(pg.evaluate("window.__subKey")==65 and pg.evaluate("window.__uvo") is True and pg.evaluate("window.__sw")=="sw.js","subscribe com a chave do script (65 bytes) e sw.js")
        cf=pg.evaluate("caches.open('estrela-atleta').then(c=>c.match(new URL('__cfg',location.href).href)).then(r=>r&&r.json())")
        ok(cf and cf.get("t")==TOK and cf.get("s")==SURL,"código guardado para o service worker")
        pd=agora()["pedidos"]; ok(any(p["url"].endswith("fake1") for p in pd),"aviso de teste enviado ao ligar")
        ok(pg.locator("#pushCard").count()==0,"cartão sai do Hoje depois de ligar")
        pg.click('nav [data-t="eu"]'); pg.wait_for_timeout(300)
        t=pg.inner_text("#pushCard"); ok("Ligados" in t and pg.locator('#pushCard [data-a="pushOff"]').count()==1,"Eu: avisos ligados, com desligar")
        pg.click('#pushCard [data-a="pushOff"]'); pg.wait_for_timeout(1200)
        subs=json.loads(rq("/__estado")["props"].get("av_ta1","{}")).get("subs",[])
        ok(subs==[] and pg.evaluate("window.__unsub")==1,"desligar tira a subscrição")
        # "Agora não"
        pg.click('nav [data-t="hoje"]'); pg.wait_for_timeout(200); pg.click('#pushCard [data-a="pushDepois"]'); pg.wait_for_timeout(200)
        ok(pg.locator("#pushCard").count()==0,"'Agora não' esconde o cartão")
        # aviso tocado → abre no separador certo
        pg.goto("about:blank"); pg.goto("https://atleta.test/#tab=jogo"); pg.wait_for_timeout(1200)
        ok(pg.locator('nav [data-t="jogo"][aria-current="page"]').count()==1 and "t="+TOK in pg.url,"#tab=jogo abre os Jogos (e o link volta ao endereço)")
        # iPhone no Safari (sem estar no ecrã principal)
        ci=b.new_context(viewport={"width":390,"height":844},user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1")
        ci.add_init_script(STUB); pi=ci.new_page(); pi.route("https://script.google.com/**",fwd); pi.route("https://atleta.test/**",site)
        pi.goto("https://atleta.test/#s="+urllib.parse.quote(SURL,safe="")+"&t="+TOK_H); pi.wait_for_timeout(1500)
        t=pi.inner_text("#pushCard") if pi.locator("#pushCard").count() else ""
        ok("Adicionar ao ecrã principal" in t and pi.locator('#pushCard [data-a="pushOn"]').count()==0,"iPhone no Safari: explica o ecrã principal")
        pi.screenshot(path=os.path.join(CAP,"t40_iphone.png"))
        ok(pi.get_attribute("header.top .me-ph","src")==FOTO,"foto do atleta ao lado do 'Boa tarde'")
        # só o index.html publicado: a app funciona, sem cartão de avisos no Hoje; em Eu explica o que falta
        SO_INDEX["on"]=True; cs=b.new_context(viewport={"width":390,"height":844}); cs.add_init_script(STUB); ps=cs.new_page()
        ps.on("pageerror",lambda e:errs.append("PAGEERR só index "+str(e)))
        ps.route("https://script.google.com/**",fwd); ps.route("https://atleta.test/**",site)
        ps.goto("https://atleta.test/#s="+urllib.parse.quote(SURL,safe="")+"&t="+TOK_H); ps.wait_for_timeout(1800)
        ok(ps.locator("#pushCard").count()==0 and "bem-estar" in ps.inner_text("#app").lower(),"só index.html: app funciona, sem cartão de avisos no Hoje")
        ps.click('nav [data-t="eu"]'); ps.wait_for_timeout(300)
        ok("sw.js" in (ps.inner_text("#pushCard") if ps.locator("#pushCard").count() else ""),"só index.html: Eu explica que falta o sw.js")
        ok((ps.get_attribute('link[rel="apple-touch-icon"]',"href") or "").startswith("data:image/png"),"ícone do iPhone dentro da página")
        SO_INDEX["on"]=False
        # manifesto e ícones
        man=json.load(open(os.path.join(ATD,"manifest.webmanifest")))
        ok(man["display"]=="standalone" and "start_url" not in man and all(os.path.isfile(os.path.join(ATD,i["src"])) for i in man["icons"]),"manifesto (sem start_url: o ícone abre com o link pessoal) e ícones")
        b.close()
    # ---- service worker (node, com self/caches/fetch simulados)
    SWT=r"""const fs=require('fs'),vm=require('vm');const L={};const shown=[];let opened=null;
    const self={registration:{scope:'https://atleta.test/',showNotification:async(t,o)=>shown.push([t,o])},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async u=>{opened=u}},addEventListener:(k,f)=>L[k]=f,skipWaiting(){}};
    const caches={open:async()=>({match:async u=>u==='https://atleta.test/__cfg'?{json:async()=>({s:'https://script.google.com/macros/s/X/exec',t:'tok123456789012345678901'})}:null})};
    let url=null;const fetch=async u=>{url=u;return {json:async()=>({pend:[{id:'bem-1',t:'Bom dia, Luís!',b:'Responde ao bem-estar',tab:'hoje'},{id:'conv-j1',t:'Estás convocado!',b:'vs X',tab:'jogo'}]})}};
    vm.createContext({self,caches,fetch,URL,console,Date,encodeURIComponent,Promise});vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),vm.createContext===0?0:undefined)""" 
    SWT=r"""const fs=require('fs'),vm=require('vm');const L={};const shown=[];let opened=null,url=null;
    const ctx={console,Date,URL,Promise,encodeURIComponent};
    ctx.self={registration:{scope:'https://atleta.test/',showNotification:async(t,o)=>{shown.push([t,o.body,o.tag,o.data.tab])}},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async u=>{opened=u}},addEventListener:(k,f)=>{L[k]=f},skipWaiting(){}};
    ctx.caches={open:async()=>({match:async u=>u==='https://atleta.test/__cfg'?{json:async()=>({s:'https://script.google.com/macros/s/X/exec',t:'tok123456789012345678901'})}:null})};
    ctx.fetch=async u=>{url=u;return {json:async()=>({pend:[{id:'bem-1',t:'Bom dia, Luís!',b:'Responde ao bem-estar',tab:'hoje'},{id:'conv-j1',t:'Estás convocado!',b:'vs X',tab:'jogo'}]})}};
    vm.createContext(ctx);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),ctx);
    (async()=>{let w;L.push({data:null,waitUntil:p=>{w=p}});await w;
      let w2;L.notificationclick({notification:{close(){},data:{tab:'jogo'}},waitUntil:p=>{w2=p}});await w2;
      console.log(JSON.stringify({url,shown,opened}));})();"""
    out=subprocess.run(["node","-e",SWT,os.path.join(DIST,"atleta","sw.js")],capture_output=True,text=True); print("sw:",out.stdout.strip()[:300],out.stderr[:300])
    try:
        r=json.loads(out.stdout)
        ok("a=aviso&t=tok123456789012345678901" in (r["url"] or ""),"service worker pergunta ao script o que mostrar")
        ok([x[0] for x in r["shown"]]==["Bom dia, Luís!","Estás convocado!"] and r["shown"][1][2]=="conv-j1","service worker mostra as mensagens")
        ok(r["opened"]=="https://atleta.test/#tab=jogo","tocar no aviso abre o separador certo")
    except Exception as e: ok(False,"service worker: "+str(e))
finally:
    srv.kill()
print("ERRORS:",errs)
if errs: sys.exit(1)

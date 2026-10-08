import os, json, subprocess, urllib.request, urllib.parse, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# App do atleta: plano de reabilitação da lesão ativa (exercícios, dose, indicação, como se faz, vídeo) e sessão registada
# pelo atleta (feitos + dor + notas) → entra no registo do plano (uma por dia: registar outra vez corrige; ids que não são do
# plano ignorados; sem exercícios recusado); com alta deixa de aparecer. Avaliações: só as marcadas "Mostrar na app do atleta"
# e só as do próprio. Lado técnico: a caixa na avaliação grava pub, a etiqueta aparece na ficha e a sessão do atleta no Clínico.
errs=[]
KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8796; URL="https://script.google.com/macros/s/TESTE/exec"
ID_BEM="1w5BTGC_4J8565aigffuRKRFSeAOsqKK4WDgNnaAo8II"; ID_PSE="1lnH3j_dXdFSOw-6Ak9CdtRpWWjm1MIvJBEToQowX_3Q"
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
assert "pronto" in srv.stdout.readline()
BASE=f"http://127.0.0.1:{PORT}"
def prep(p): urllib.request.urlopen(urllib.request.Request(BASE+"/__prep",data=json.dumps(p).encode(),method="POST")).read()
def post(p): return json.loads(urllib.request.urlopen(urllib.request.Request(BASE+"/exec",data=json.dumps(p).encode(),method="POST")).read())
def get(q): return json.loads(urllib.request.urlopen(BASE+"/exec?"+urllib.parse.urlencode(q)).read())
def pull(): return {(x["c"],x["i"]):x.get("d") for x in get({"k":KEY,"a":"pull","since":0})["docs"]}
def fwd(route):
    rq=route.request; u=rq.url.replace(URL,BASE+"/exec")
    r=urllib.request.urlopen(urllib.request.Request(u,data=rq.post_data_buffer if rq.method=="POST" else None,method=rq.method))
    route.fulfill(status=r.status,body=r.read(),headers={"Content-Type":r.headers.get("Content-Type"),"Access-Control-Allow-Origin":"*"})
ATL=open(os.path.join(DIST,"atleta","index.html")).read()
def site(route): route.fulfill(status=200,body=ATL,headers={"Content-Type":"text/html"})
T=datetime.date.today(); iso=lambda d:d.isoformat(); hoje=iso(T); d=lambda n:iso(T+datetime.timedelta(days=n))
TOK="tokReab_abcdefghijklmnopq"; TOK2="tokOutro_abcdefghijklmnop"
H_BEM=["Carimbo de data/hora","Nome do Jogador","Qualidade do sono","Fadiga Geral","Dor Muscular","Stress"]
H_PSE=["Carimbo de data/hora","Nome do Jogador","Tipo de sessão","Duração da sessão","Quão intenso foi o treino? (PSE)"]
try:
  post({"a":"x"}); urllib.request.urlopen(BASE+"/__run?f=prepararDadosApp").read()
  prep({"nomes":["Tiago C.","Rui"],"respostas":[{"id":ID_BEM,"nome":"respostas","form":True,"linhas":[H_BEM]},{"id":ID_PSE,"nome":"respostas","form":True,"linhas":[H_PSE]}]})
  ops=[{"c":"players","i":"pa","d":{"name":"Tiago C.","n":5,"pos":"DC","atk":TOK}},{"c":"players","i":"pb","d":{"name":"Rui","n":1,"pos":"GR","atk":TOK2}},
       {"c":"meta","i":"team","d":{"team":"Estrela B"}},
       {"c":"injuries","i":"inA","d":{"pid":"pa","date":d(-6),"type":"Muscular","zone":"Coxa posterior","side":"Direito","status":"ativa","exp":d(10)}},
       {"c":"injuries","i":"inVelha","d":{"pid":"pa","date":d(-90),"type":"Entorse","zone":"Tornozelo","status":"alta","ret":d(-80)}},
       {"c":"rehabex","i":"rb03","d":{"name":"Ponte de isquiotibiais","reg":"Coxa posterior","fase":2,"s":3,"r":"10","t":"","desc":"Calcanhares no banco, sobe a anca.","vid":"https://youtu.be/exemplo"}},
       {"c":"rehabex","i":"rb06","d":{"name":"Nordic","fase":3,"s":3,"r":"5","desc":"Desce devagar.","vid":"javascript:alert(1)"}},
       {"c":"rehab","i":"inA","d":{"pid":"pa","fase":2,"items":[{"id":"i1","x":"rb03","s":3,"r":"10","t":"","n":"Sem dor"},{"id":"i2","x":"rb06","s":4,"r":"6","t":"","n":""},{"id":"i3","x":"apagado","name":"Bicicleta","s":1,"r":"","t":"15 min"}],
          "log":[{"id":"s0","d":d(-1),"by":"Bruno (fisio)","dor":3,"ok":["i1","i2"],"n":"ok"}]}},
       {"c":"evals","i":"ev1","d":{"pid":"pa","date":d(-5),"by":"Miguel Motta","v":{"tec":{"Passe":8,"Condução":7},"tat":{"Posicionamento":6}},"str":"Agressivo no duelo","weak":"Primeiro passe","fin":"A crescer","pub":True}},
       {"c":"evals","i":"ev2","d":{"pid":"pa","date":d(-2),"by":"Miguel Motta","v":{"tec":{"Passe":9}},"str":"Interno","pub":False}},
       {"c":"evals","i":"ev3","d":{"pid":"pb","date":d(-3),"v":{"tec":{"Passe":5}},"str":"De outro","pub":True}}]
  print("dados:", post({"k":KEY,"a":"push","ops":ops}).get("ok"))
  r=get({"a":"atleta","t":TOK}); R=r.get("reab"); print("reab:", json.dumps(R,ensure_ascii=False)[:400])
  if not R or R["inj"]!="inA" or R["fase"]!=2 or R["faseNome"]!="Mobilidade e ativação" or len(R["items"])!=3: errs.append("plano na app do atleta")
  it={x["id"]:x for x in (R or {}).get("items",[])}
  if it.get("i1",{}).get("dose")!="3×10" or it["i1"]["n"]!="Sem dor" or it["i1"]["vid"]!="https://youtu.be/exemplo": errs.append("exercício 1 (dose/indicação/vídeo)")
  if it.get("i2",{}).get("vid")!="" : errs.append("vídeo que não é https passou")
  if it.get("i3",{}).get("nome")!="Bicicleta" or it["i3"]["dose"]!="1×15 min": errs.append("exercício apagado da biblioteca fica com o nome")
  if R and (R["hoje"] is not None or R["ult"][0]["by"]!="Bruno (fisio)"): errs.append("sessões anteriores")
  av=r.get("avals",[]); print("avaliações:", [(a["id"],a["media"],[(x["l"],x["v"]) for x in a["areas"]]) for a in av])
  if [a["id"] for a in av]!=["ev1"]: errs.append("só as avaliações publicadas do próprio")
  if av and (av[0]["areas"][0]["v"]!=7.5 or av[0]["media"]!=6.8 or av[0]["fin"]!="A crescer"): errs.append("médias da avaliação")
  # sessão pelo atleta
  if post({"a":"atleta_reab","t":TOK,"ok":[],"dor":2}).get("erro")!="reab": errs.append("sem exercícios aceite")
  if post({"a":"atleta_reab","t":TOK,"ok":["i1"],"dor":11}).get("erro") is None: errs.append("dor 11 aceite")
  r1=post({"a":"atleta_reab","t":TOK,"ok":["i1","xx","i1"],"dor":2,"n":"Correu bem"}); print("sessão:", r1)
  doc=pull()[("rehab","inA")]; lg=doc["log"]; print("registo:", lg)
  apl=[l for l in lg if l.get("app")]
  if len(lg)!=2 or len(apl)!=1 or apl[0]["ok"]!=["i1"] or apl[0]["dor"]!=2 or apl[0]["d"]!=hoje or apl[0]["by"]!="Atleta (app)": errs.append("sessão gravada no plano")
  if doc.get("fase")!=2 or len(doc.get("items",[]))!=3: errs.append("o resto do plano mudou")
  post({"a":"atleta_reab","t":TOK,"ok":["i1","i2"],"dor":1}); lg=pull()[("rehab","inA")]["log"]
  if len(lg)!=2 or [l for l in lg if l.get("app")][0]["ok"]!=["i1","i2"]: errs.append("segunda sessão do dia devia corrigir a primeira")
  R=get({"a":"atleta","t":TOK})["reab"]
  if not R["hoje"] or R["hoje"]["ok"]!=["i1","i2"] or R["hoje"]["dor"]!=1: errs.append("hoje na app depois de registar")
  # outro atleta não tem plano
  if get({"a":"atleta","t":TOK2}).get("reab") is not None: errs.append("outro atleta com plano")
  if post({"a":"atleta_reab","t":TOK2,"ok":["i1"],"dor":1}).get("erro")!="reab": errs.append("atleta sem lesão a registar")

  with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR atleta "+str(e)))
    pg.route("https://script.google.com/**",fwd); pg.route("https://atleta.test/**",site)
    # de volta ao estado sem sessão de hoje (para ver o botão), apagando a do atleta
    doc=pull()[("rehab","inA")]; doc["log"]=[l for l in doc["log"] if not l.get("app")]; post({"k":KEY,"a":"push","ops":[{"c":"rehab","i":"inA","d":doc}]})
    pg.goto("https://atleta.test/#s="+urllib.parse.quote(URL,safe="")+"&t="+TOK); pg.wait_for_timeout(1500)
    t=pg.inner_text("#app"); print("hoje:", t.replace("\n"," | ")[:260])
    if "a tua recuperação" not in t.lower() or "3 exercícios para hoje" not in t or "Fase 2" not in t: errs.append("cartão da recuperação no Hoje")
    pg.screenshot(path=os.path.join(CAP,"t46_hoje.png"),full_page=True)
    pg.click('[data-a="reab"]'); pg.wait_for_timeout(300)
    if not pg.is_disabled('.sheet [data-a="reabEnviar"]'): errs.append("enviar sem exercícios")
    pg.click('.sheet .rx-it:has-text("Ponte") summary'); pg.wait_for_timeout(100)
    pg.click('.sheet [data-a="reabOk"][data-id="i1"]'); pg.wait_for_timeout(150)
    if not pg.eval_on_selector('.sheet details[data-id="i1"]',"e=>e.open"): errs.append("'Como se faz' fecha ao marcar")
    if pg.get_attribute('.sheet .rx-vid',"href")!="https://youtu.be/exemplo": errs.append("vídeo")
    pg.click('.sheet [data-a="reabOk"][data-id="i3"]'); pg.click('.sheet [data-a="reabDor"][data-n="4"]'); pg.fill('#reabN',"Senti no fim"); pg.wait_for_timeout(100)
    print("botão:", pg.inner_text('.sheet [data-a="reabEnviar"]'))
    pg.screenshot(path=os.path.join(CAP,"t46_sessao.png"),full_page=False)
    pg.click('.sheet [data-a="reabEnviar"]'); pg.wait_for_timeout(1500)
    t=pg.inner_text(".sheet"); print("enviado:", t.replace("\n"," | "))
    if "Sessão registada" not in t or "2 de 3" not in t or "Avisa o departamento clínico" not in t: errs.append("confirmação da sessão")
    pg.click('.sheet [data-a="fechar"]'); pg.wait_for_timeout(600)
    if "Sessão de hoje registada" not in pg.inner_text("#app"): errs.append("hoje depois de registar")
    apl=[l for l in pull()[("rehab","inA")]["log"] if l.get("app")]
    if len(apl)!=1 or apl[0]["ok"]!=["i1","i3"] or apl[0]["dor"]!=4 or apl[0]["n"]!="Senti no fim": errs.append("sessão da app no plano "+json.dumps(apl))
    # corrigir: abre com o que já estava marcado
    pg.click('[data-a="reab"]'); pg.wait_for_timeout(300)
    if pg.eval_on_selector_all('.sheet .rx-ck[aria-pressed="true"]',"e=>e.length")!=2 or pg.input_value("#reabN")!="Senti no fim": errs.append("corrigir abre com o registado")
    pg.click('.sheet [data-a="fechar"]')
    # avaliações no Eu
    pg.click('nav [data-t="eu"]'); pg.wait_for_timeout(300)
    t=pg.inner_text("#app"); print("eu:", t[t.find("avaliações")-20:][:300].replace("\n"," | ") if "avaliações" in t.lower() else t[:200])
    if "As minhas avaliações".lower() not in t.lower() or "Agressivo no duelo" not in t or "Interno" in t or "De outro" in t: errs.append("avaliações no Eu")
    pg.click('.av .av-at summary >> nth=0'); pg.wait_for_timeout(100)
    if "Condução" not in pg.inner_text(".av"): errs.append("critérios da avaliação")
    ov=pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
    if ov>1: errs.append("overflow no telemóvel")
    pg.screenshot(path=os.path.join(CAP,"t46_eu.png"),full_page=True)
    # sem rede: fica no telemóvel e vai depois
    doc=pull()[("rehab","inA")]; doc["log"]=[l for l in doc["log"] if not l.get("app")]; post({"k":KEY,"a":"push","ops":[{"c":"rehab","i":"inA","d":doc}]})
    pg.click('nav [data-t="hoje"]'); pg.click('[data-a="refresh"]') if pg.locator('[data-a="refresh"]').count() else None; pg.reload(); pg.wait_for_timeout(1500)
    pg.unroute("https://script.google.com/**"); pg.route("https://script.google.com/**",lambda r:r.abort())
    pg.click('[data-a="reab"]'); pg.wait_for_timeout(300); pg.click('.sheet [data-a="reabOk"][data-id="i2"]'); pg.click('.sheet [data-a="reabEnviar"]'); pg.wait_for_timeout(1500)
    if "Guardada no telemóvel" not in pg.inner_text(".sheet"): errs.append("sem rede: guardada")
    pg.click('.sheet [data-a="fechar"]'); pg.wait_for_timeout(300)
    pg.unroute("https://script.google.com/**"); pg.route("https://script.google.com/**",fwd)
    pg.evaluate("window.dispatchEvent(new Event('online'))"); pg.wait_for_timeout(2500)
    apl=[l for l in pull()[("rehab","inA")]["log"] if l.get("app")]
    if len(apl)!=1 or apl[0]["ok"]!=["i2"]: errs.append("fila enviada quando volta a rede "+json.dumps(apl))
    b.close()
  # alta: deixa de aparecer
  inj=pull()[("injuries","inA")]; inj["status"]="alta"; inj["ret"]=hoje; post({"k":KEY,"a":"push","ops":[{"c":"injuries","i":"inA","d":inj}]})
  if get({"a":"atleta","t":TOK}).get("reab") is not None: errs.append("com alta continua a aparecer")
finally:
  srv.kill()

# lado da equipa técnica: caixa "Mostrar na app do atleta" e etiqueta na ficha; sessão do atleta no Clínico
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900}); pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    pid=pg.evaluate("""(h)=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); const p=Object.keys(s.players)[0];
      s.injuries.tA={pid:p,date:h,type:'Muscular',zone:'Joelho',status:'ativa'}; s.rehab=s.rehab||{}; s.rehabex=s.rehabex||{};
      s.rehabex.rb08={name:'Elevação da perna estendida',fase:1,s:3,r:'12'};
      s.rehab.tA={pid:p,fase:1,items:[{id:'k1',x:'rb08',s:3,r:'12'}],log:[{id:'ra1',d:h,by:'Atleta (app)',dor:2,ok:['k1'],n:'',app:1}]};
      localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s)); return p;}""", hoje)
    pg.reload(); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="plantel"]'); pg.click(f'[data-p="atleta"][data-id="{pid}"]'); pg.wait_for_timeout(300)
    pg.click(f'#main [data-a="evalNew"] >> nth=0'); pg.wait_for_timeout(300)
    if not pg.locator('#dlg [name=pub]').count(): errs.append("caixa 'Mostrar na app do atleta'")
    pg.eval_on_selector('#dlg input[data-sl="tec"]',"e=>{e.value=7;e.dispatchEvent(new Event('input',{bubbles:true}))}")
    pg.check('#dlg [name=pub]'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    ev=[v for v in pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1')).evals").values() if v.get("pid")==pid]
    if not ev or not ev[-1].get("pub"): errs.append("pub gravado")
    if "Na app do atleta" not in pg.inner_text("#main"): errs.append("etiqueta na ficha")
    pg.click('nav [data-t="clinico"]'); pg.click('.seg [data-a="csub"][data-k="reab"]'); pg.wait_for_timeout(300)
    if "Atleta (app)" not in pg.inner_text("#main"): errs.append("sessão do atleta no Clínico")
    b.close()
print("ERRORS",errs)

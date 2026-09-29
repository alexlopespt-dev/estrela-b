import os, json, subprocess, urllib.request, urllib.parse, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# App do atleta (dist/atleta) com o dados_app.gs verdadeiro (Google simulado): link pessoal; bem-estar e PSE gravados
# nas folhas dos formulários com os textos das opções e o nome da monitorização; corrigir na mesma linha; resposta
# feita pelo formulário reconhecida; sem rede → fica no telemóvel e é enviada depois; agenda; convocatória só depois de
# publicada; os meus números; link inválido; marca para a monitorização recalcular.
# Lado da equipa técnica (app_local): endereço do site, criar link pessoal, publicar a convocatória — e o link funciona.
errs=[]
KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8791; URL="https://script.google.com/macros/s/TESTE/exec"
ID_BEM="1w5BTGC_4J8565aigffuRKRFSeAOsqKK4WDgNnaAo8II"; ID_PSE="1lnH3j_dXdFSOw-6Ak9CdtRpWWjm1MIvJBEToQowX_3Q"
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
assert "pronto" in srv.stdout.readline()
BASE=f"http://127.0.0.1:{PORT}"
def estado(): return json.loads(urllib.request.urlopen(BASE+"/__estado").read())
def prep(p): urllib.request.urlopen(urllib.request.Request(BASE+"/__prep",data=json.dumps(p).encode(),method="POST")).read()
def post(p): return json.loads(urllib.request.urlopen(urllib.request.Request(BASE+"/exec",data=json.dumps(p).encode(),method="POST")).read())
def get(q): return json.loads(urllib.request.urlopen(BASE+"/exec?"+urllib.parse.urlencode(q)).read())
OFF={"on":False}
def fwd(route):
    rq=route.request
    if OFF["on"]: return route.abort()
    u=rq.url.replace(URL,BASE+"/exec")
    r=urllib.request.urlopen(urllib.request.Request(u,data=rq.post_data_buffer if rq.method=="POST" else None,method=rq.method))
    route.fulfill(status=r.status,body=r.read(),headers={"Content-Type":r.headers.get("Content-Type"),"Access-Control-Allow-Origin":"*"})
ATL=open(os.path.join(DIST,"atleta","index.html")).read(); APP=open(os.path.join(DIST,"app_local.html")).read()
def site(route): route.fulfill(status=200,body=ATL if "atleta.test" in route.request.url else APP,headers={"Content-Type":"text/html"})
T=datetime.date.today(); iso=lambda d: d.isoformat(); hoje=iso(T)
TOK="tokLuisA_abcdefghijklmnop"; TOK_H="tokHugo_abcdefghijklmnopq"
H_BEM=["Carimbo de data/hora","Nome do Jogador","Qualidade do sono - Como dormiste esta noite?","Fadiga Geral - Como te sentes fisicamente?","Dor Muscular - nível de dores musculares?","Stress - Como está o teu nível de stress?","Score Total","Estado"]
H_PSE=["Carimbo de data/hora","Nome do Jogador","Tipo de sessão","Duração da sessão","Quão intenso foi o treino? (PSE)","Como te sentes?"]
ontem=iso(T-datetime.timedelta(days=1)).replace("-","/")
try:
  post({"a":"x"})   # garante que o script arrancou
  urllib.request.urlopen(BASE+"/__run?f=prepararDadosApp").read()
  prep({"nomes":["Luís A.","Hugo R.","Rui"],"aliases":[["Luisinho","Luís A."]],"respostas":[
    {"id":ID_BEM,"nome":"respostas","linhas":[H_BEM,
      [ontem+" 07:10:00","Luís.A.","4 - Bom","3 - Normal","5 - Sem Dor","4 - Tranquilo",16,"Atenção"],
      [ontem+" 07:20:00","Rui","2 - Mau","2 - Cansado","3 - Alguma Dor","3 - Normal",10,"Risco"],
      [iso(T-datetime.timedelta(days=3)).replace("-","/")+" 08:10:00","Zé Ninguém","4 - Bom","4 - Bem","4 - Pouca Dor","4 - Tranquilo",16,"Atenção"],
      [iso(T-datetime.timedelta(days=2)).replace("-","/")+" 08:00:00","Luisinho","3 - Normal","3 - Normal","3 - Alguma Dor","3 - Normal",12,"Risco"],
      [hoje.replace("-","/")+" 06:31:43","Hugo R.","2 - Mau","3 - Normal","3 - Alguma Dor","4 - Tranquilo",12,"Risco"]]},
    {"id":ID_PSE,"nome":"respostas","linhas":[H_PSE,[ontem+" 21:00:00","Rui","Treino","01:30:00","7 - Muito difícil","Cansado"],[ontem+" 21:05:00","Hugo R.","Recuperação","00:40:00","3 - Moderado","Bem"]]}]})
  d=lambda n: iso(T+datetime.timedelta(days=n))
  ops=[{"c":"players","i":"ta1","d":{"name":"Luís A.","full":"Luís Alves","n":7,"pos":"MC","atk":TOK}},
       {"c":"players","i":"ta2","d":{"name":"Hugo R.","n":9,"pos":"PL","atk":TOK_H}},
       {"c":"players","i":"ta3","d":{"name":"Rui","n":1,"pos":"GR"}},
       {"c":"meta","i":"team","d":{"team":"Estrela B","full":"CF Estrela da Amadora — Equipa B"}},
       {"c":"events","i":"tr_hoje","d":{"type":"treino","date":hoje,"time":"19:30","dur":90,"place":"Reboleira","theme":"Posse","att":{}}},
       {"c":"events","i":"tr_passado","d":{"type":"treino","date":d(-3),"time":"19:30","dur":90,"att":{"ta1":{"s":"P","rpe":6},"ta2":{"s":"FJ"}}}},
       {"c":"events","i":"j_passado","d":{"type":"jogo","date":d(-2),"time":"15:00","opp":"CAC","venue":"C","dur":90,"call":["ta1","ta2","ta3"],"xi":["ta1","ta3"],
          "ev":[{"t":"golo","min":30,"pid":"ta1"},{"t":"assist","min":30,"pid":"ta2"},{"t":"sub","min":60,"in":"ta2","out":"ta1"}],"rt":{"ta1":8},"ga":1,"closed":True}},
       {"c":"events","i":"j_prox","d":{"type":"jogo","date":d(3),"time":"15:00","opp":"Atlético CP B","venue":"F","comp":"III Divisão","place":"Tapadinha","dur":90,
          "call":["ta1","ta3"],"xi":["ta1"],"meetT":"13:15","meetP":"Estádio","cnum":{"ta1":10},"sched":[{"l":"Concentração","t":"13:15"},{"l":"Jogo","t":"15:00"}]}},
       {"c":"events","i":"tr_madrugada","d":{"type":"treino","date":hoje,"time":"00:00","dur":90,"theme":"Madrugada","att":{}}},
       {"c":"events","i":"j_longe","d":{"type":"jogo","date":d(30),"time":"16:00","opp":"Porto Salvo","venue":"C","phase":"Jornada 9","dur":90}}]
  r=post({"k":KEY,"a":"push","ops":ops}); print("dados:", r.get("ok"), r.get("erros"))
  # ---- servidor
  r=get({"a":"atleta","t":"x"*24}); print("link errado:", r)
  if r.get("erro")!="link": errs.append("link errado aceite")
  r=get({"a":"atleta","t":TOK})
  print("resposta:", r.get("me"), r.get("numeros"), "| conv:", r.get("conv"), "| opções sono:", r["opcoes"]["bem"]["sono"])
  if r["me"]["name"]!="Luís A." or r["conv"] is not None: errs.append("dados do atleta / convocatória antes de publicar")
  n=r["numeros"]
  if (n["jogos"],n["titular"],n["min"],n["golos"],n["assist"],n["pres"],n["treinos"])!=(1,1,60,1,0,1,1): errs.append("números "+str(n))
  if "4 - Bom" not in r["opcoes"]["bem"]["sono"] or "2 - Mau" not in r["opcoes"]["bem"]["sono"] or len(r["opcoes"]["bem"]["sono"])!=5: errs.append("opções da folha")
  if "rt" in json.dumps(r) and '"rt"' in json.dumps(r): errs.append("notas enviadas ao atleta")
  if "Rui" in json.dumps(r["respostas"]): errs.append("respostas de outro atleta")
  if not any(h["d"]==d(-1) and h["t"]==16 for h in r["respostas"]["hist"]): errs.append("histórico (Luís.A. = Luís A.) "+str(r["respostas"]["hist"]))
  if not any(h["d"]==d(-2) and h["t"]==12 for h in r["respostas"]["hist"]): errs.append("histórico pela equivalência do separador · Nomes (Luisinho) "+str(r["respostas"]["hist"]))
  rh=get({"a":"atleta","t":TOK_H}); print("Hugo respondeu pelo formulário:", rh["respostas"]["bem"])
  if not rh["respostas"]["bem"] or rh["respostas"]["bem"]["i"]!=[2,3,3,4]: errs.append("resposta do formulário não reconhecida")
  if "chave" in json.dumps(get({"a":"pull","since":0})) is False: pass
  if get({"a":"pull","since":0}).get("erro")!="chave": errs.append("partilha sem chave aceite")
  # ---- app do atleta
  with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR atleta "+str(e)))
    pg.route("https://script.google.com/**",fwd); pg.route("https://atleta.test/**",site); pg.route("https://estrela.test/**",site)
    pg.goto("https://atleta.test/#s="+urllib.parse.quote(URL,safe="")+"&t="+TOK); pg.wait_for_timeout(1500)
    t=pg.inner_text("#app"); print("hoje:", t.replace("\n"," | ")[:160])
    if "Luís" not in t or "Como estás hoje?" not in t: errs.append("ecrã de hoje")
    if "Madrugada" in t.split("A seguir")[-1]: errs.append("'A seguir' mostra um treino que já acabou")
    if "Atualizado às" not in t: errs.append("hora dos dados")
    if "t="+TOK not in pg.url: errs.append("o link tem de ficar no endereço (iPhone: adicionar ao ecrã principal)")
    ov=pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
    if ov>1: errs.append("overflow no telemóvel")
    pg.screenshot(path=os.path.join(CAP,"t38_hoje.png"),full_page=True)
    # bem-estar
    pg.click('[data-a="bem"]'); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(CAP,"t38_bem.png"))
    if not pg.is_disabled('.sheet .cta'): errs.append("enviar ativo sem respostas")
    for j,n in enumerate([4,3,5,4]): pg.click(f'[data-a="bemOpt"][data-j="{j}"][data-n="{n}"]'); pg.wait_for_timeout(80)
    pg.click('.sheet .cta'); pg.wait_for_timeout(900)
    t=pg.inner_text(".sheet"); print("enviado:", t.replace("\n"," | "))
    if "Obrigado" not in t or "16/20" not in t: errs.append("confirmação do bem-estar")
    rows=estado()["resp"][ID_BEM]; nova=rows[-1]; print("linha nova:", nova)
    if len(rows)!=7 or nova[1]!="Luís A." or nova[2:6]!=["4 - Bom","3 - Normal","5 - Sem Dor","4 - Tranquilo"] or (len(nova)>6 and nova[6] not in ("",None)): errs.append("linha do bem-estar")
    pg.click('.sheet [data-a="fechar"]'); pg.wait_for_timeout(900)
    if "Respondido às" not in pg.inner_text("#app"): errs.append("hoje não mostra respondido")
    # uma resposta por dia: sem botão para responder outra vez e o script recusa
    if pg.locator('[data-a="bem"]').count() or "Voltas a responder amanhã" not in pg.inner_text("#app"): errs.append("bem-estar: deixa responder outra vez")
    r=post({"a":"atleta_bem","t":TOK,"i":[2,2,2,2]}); rows=estado()["resp"][ID_BEM]; print("segunda resposta:", r.get("erro"), len(rows), rows[-1][2])
    if r.get("erro")!="ja" or "amanhã" not in r.get("msg","") or len(rows)!=7 or rows[-1][2]!="4 - Bom": errs.append("segunda resposta do bem-estar aceite")
    # Hugo respondeu pelo formulário do Google: a app dele não deixa responder outra vez
    r=post({"a":"atleta_bem","t":TOK_H,"i":[3,3,3,3]}); print("Hugo (já respondeu no formulário):", r.get("erro"))
    if r.get("erro")!="ja": errs.append("resposta dada no formulário não conta")
    # PSE sem rede: fica no telemóvel e segue depois (e conta como respondido)
    OFF["on"]=True
    pg.click('[data-a="pse"]'); pg.wait_for_timeout(300)
    tipo=pg.eval_on_selector('[data-a="pseTipo"][aria-pressed="true"]',"e=>e.textContent"); dur=pg.input_value("#pseDur"); print("PSE por omissão:", tipo, dur)
    if tipo!="Treino" or dur!="90": errs.append("sessão/duração por omissão")
    pg.click('[data-a="pseDur"][data-n="-5"]'); pg.click('[data-a="pseRpe"][data-n="7"]'); pg.click('[data-a="pseSen"] >> nth=0')
    pg.screenshot(path=os.path.join(CAP,"t38_pse.png"))
    pg.click('.sheet .cta'); pg.wait_for_timeout(900)
    t=pg.inner_text(".sheet"); print("sem rede:", t.replace("\n"," | "))
    if "Guardado no telemóvel" not in t: errs.append("fila sem rede")
    pg.click('.sheet [data-a="fechar"]'); pg.wait_for_timeout(300)
    if "guardado no telemóvel" not in pg.inner_text("#app").lower() or pg.locator('[data-a="pse"]').count(): errs.append("pendente não aparece / deixa registar outra vez")
    OFF["on"]=False; pg.evaluate("window.dispatchEvent(new Event('online'))"); pg.wait_for_timeout(1800)
    rows=estado()["resp"][ID_PSE]; print("PSE:", rows[-1], len(rows))
    if rows[-1][1]!="Luís A." or rows[-1][2]!="Treino" or rows[-1][3]!="01:25:00" or rows[-1][4]!="7 - Muito difícil" or len(rows)!=4: errs.append("linha do PSE")
    r=post({"a":"atleta_pse","t":TOK,"tipo":"Recuperação","dur":30,"rpe":3}); print("segundo PSE:", r.get("erro"))
    if r.get("erro")!="ja" or len(estado()["resp"][ID_PSE])!=4: errs.append("segundo PSE aceite")
    if "Já registaste o PSE hoje" not in pg.inner_text("#app"): errs.append("PSE feito não aparece")
    st=estado(); print("marca para a monitorização:", (st["atletas"] or [[]])[1][:1] if st["atletas"] else None, "| registo:", [r[1:] for r in (st["atletas"] or [])[4:6]])
    if not st["atletas"] or not st["atletas"][1][0]: errs.append("marca no Painel")
    # agenda, jogo (convocatória ainda não publicada), eu
    pg.click('nav [data-t="agenda"]'); pg.wait_for_timeout(200); t=pg.inner_text("#app")
    if "Madrugada" not in t or "Terminado" not in t: errs.append("agenda: treino de hoje já acabado")
    if "19:30" not in t or "Treino" not in t or "Atlético CP B" not in t or "folga" not in t.lower() or "Esta semana" not in t: errs.append("agenda")
    pg.screenshot(path=os.path.join(CAP,"t38_agenda.png"),full_page=True)
    pg.click('nav [data-t="jogo"]'); pg.wait_for_timeout(200); t=pg.inner_text("#app")
    if "quando a equipa técnica a publicar" not in t or "Estás convocado" in t: errs.append("convocatória antes de publicada")
    if "Próximos jogos" not in t or "Porto Salvo" not in t: errs.append("próximos jogos (mais de 15 dias)")
    post({"k":KEY,"a":"push","ops":[{"c":"events","i":"j_prox","d":{**[o for o in ops if o["i"]=="j_prox"][0]["d"],"convPub":True}}]})
    pg.click('nav [data-t="eu"]'); pg.click('[data-a="refresh"]'); pg.wait_for_timeout(1200)
    t=pg.inner_text("#app"); print("eu:", t.replace("\n"," | ")[:260])
    if "60" not in t or "golos" not in t.lower() or "Presenças nos treinos" not in t: errs.append("os meus números")
    if not pg.locator(".pcard").count(): errs.append("cartão do jogador")
    pg.screenshot(path=os.path.join(CAP,"t38_eu.png"),full_page=True)
    pg.click('nav [data-t="jogo"]'); pg.wait_for_timeout(200); t=pg.inner_text("#app"); print("jogo:", t.replace("\n"," | ")[:220])
    if "Estás convocado" not in t or "13:15" not in t or "Rui" not in t or "10" not in t: errs.append("convocatória publicada")
    pg.screenshot(path=os.path.join(CAP,"t38_jogo.png"),full_page=True)
    pg.click('nav [data-t="hoje"]'); pg.wait_for_timeout(200)
    if "Estás convocado" not in pg.inner_text("#app"): errs.append("aviso de convocado no hoje")
    # ícone antigo no ecrã principal (link que já não vale) mas o telemóvel tem o link bom guardado → usa o guardado
    pg.goto("about:blank"); pg.goto("https://atleta.test/#s="+urllib.parse.quote(URL,safe="")+"&t="+"q"*24); pg.wait_for_timeout(2000)
    t=pg.inner_text("#app")
    if "já não é válido" in t or "Luís" not in t or "t="+TOK not in pg.url: errs.append("link antigo no endereço: não usou o link bom guardado")
    # tema escuro
    pg.emulate_media(color_scheme="dark"); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(CAP,"t38_hoje_escuro.png"),full_page=True); pg.emulate_media(color_scheme="light")
    # link inválido noutro telemóvel
    p2=ctx.browser.new_context(viewport={"width":390,"height":844}).new_page(); p2.route("https://script.google.com/**",fwd); p2.route("https://atleta.test/**",site)
    p2.goto("https://atleta.test/#s="+urllib.parse.quote(URL,safe="")+"&t="+"z"*24); p2.wait_for_timeout(1200)
    if "já não é válido" not in p2.inner_text("#app"): errs.append("link inválido")
    p2.goto("https://atleta.test/"); p2.wait_for_timeout(800)
    # ---- lado da equipa técnica
    pa=b.new_context(viewport={"width":1280,"height":900}).new_page(); pa.on("pageerror",lambda e:errs.append("PAGEERR app "+str(e)))
    pa.route("https://script.google.com/**",fwd); pa.route("https://estrela.test/**",site)
    pa.goto("https://estrela.test/"); pa.wait_for_timeout(1200)
    pa.click('nav [data-t="plantel"]'); pa.click('#main [data-a="syncCfg"]'); pa.fill('#dlg [name=url]',URL); pa.fill('#dlg [name=key]',KEY); pa.click('#dlg [data-a="mSave"]'); pa.wait_for_timeout(3000)
    pa.click('nav [data-t="plantel"]'); pa.wait_for_timeout(300)
    pid=pa.evaluate("Object.entries(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).players).find(([k,v])=>v.name==='Abbiati')[0]")
    pa.click(f'#main [data-a="page"][data-id="{pid}"] >> nth=0'); pa.wait_for_timeout(400)
    t=pa.inner_text("#main")
    if "App do atleta" not in t or "Falta o endereço" not in t: errs.append("cartão sem endereço")
    pa.click('#main [data-a="atSiteCfg"]'); pa.fill('#dlg [name=site]',"https://atleta.test/"); pa.click('#dlg [data-a="mSave"]'); pa.wait_for_timeout(300)
    pa.click('#main [data-a="atGen"]'); pa.wait_for_timeout(2500)
    link=pa.input_value(f"#atL_{pid}"); print("link:", link[:70], "…")
    if not link.startswith("https://atleta.test/#s=https%3A%2F%2Fscript.google.com") or "&t=" not in link: errs.append("formato do link")
    atk=link.split("&t=")[1]
    srvp=[json.loads(r[2]) for r in estado()["docs"] if r[0]=="players" and r[1]==pid][0]
    if srvp.get("atk")!=atk: errs.append("código não chegou à partilha")
    pa.screenshot(path=os.path.join(CAP,"t38_ficha.png"),full_page=True)
    ra=get({"a":"atleta","t":atk}); print("o link criado na app funciona:", ra.get("me",{}).get("name"))
    if ra.get("me",{}).get("name")!="Abbiati": errs.append("link criado não funciona")
    # novo link desliga o anterior
    pa.click('#main [data-a="atGen"]'); pa.click('#dlgAsk [data-ask="1"]'); pa.wait_for_timeout(2500)
    if get({"a":"atleta","t":atk}).get("erro")!="link": errs.append("link antigo continua a funcionar")
    # outro dispositivo sem o link ainda recebido: "Criar os links em falta" vai primeiro buscar à partilha e não cria outro
    pa.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); delete s.players.ta1.atk; localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));
      const c=JSON.parse(localStorage.getItem('estrela-tecnico-v1:sync')); c.last=0; localStorage.setItem('estrela-tecnico-v1:sync',JSON.stringify(c));}""")
    pa.reload(); pa.wait_for_timeout(600)
    pa.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); if(s.players.ta1) delete s.players.ta1.atk; localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}""")
    antes_atk=[json.loads(r[2]).get("atk") for r in estado()["docs"] if r[0]=="players" and r[1]=="ta1"][0]
    # lista de links no Plantel
    pa.click('nav [data-t="plantel"]'); pa.click('#main [data-a="atLinks"]'); pa.wait_for_timeout(300)
    t=pa.inner_text("#dlg"); print("lista:", t.count("Sem link"), "sem link")
    pa.click('#dlg [data-a="atGenAll"]'); pa.wait_for_timeout(2500)
    if "Sem link" in pa.inner_text("#dlg"): errs.append("criar links em falta")
    depois_atk=[json.loads(r[2]).get("atk") for r in estado()["docs"] if r[0]=="players" and r[1]=="ta1"][0]; print("link do Luís mantém-se:", antes_atk==depois_atk)
    if antes_atk!=depois_atk: errs.append("'Criar os links em falta' trocou um link que já existia noutro dispositivo")
    # endereço escrito sem https:// (como na captura do utilizador) → aceite e os links aparecem
    pa.fill('#dlg [name=site]',"estrelab-atleta.netlify.app"); pa.click('#dlg [data-a="mSave"]'); pa.wait_for_timeout(400)
    t=pa.inner_text("#dlg"); v=pa.input_value('#dlg [name=site]'); print("sem https:", v, "| copiar:", pa.locator('#dlg [data-a="atCopy"]').count())
    if v!="https://estrelab-atleta.netlify.app" or "falta o endereço" in t or pa.locator('#dlg [data-a="atCopy"]').count()<3: errs.append("endereço sem https não aceite")
    # o endereço desta app (equipa técnica) é recusado
    pa.fill('#dlg [name=site]',"estrela.test"); pa.click('#dlg [data-a="mSave"]'); pa.wait_for_timeout(300)
    if "endereço desta app" not in pa.inner_text("#toast") or "estrelab-atleta" not in pa.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1')).meta.cfg.atletaUrl"): errs.append("aceitou o endereço da própria app")
    pa.fill('#dlg [name=site]',"https://atleta.test/"); pa.click('#dlg [data-a="mSave"]'); pa.wait_for_timeout(300)
    pa.click('#dlg [data-a="mClose"]')
    # verificar o que os atletas veem: um treino que só existe aqui (criado sem a partilha) → aparece e envia-se
    pa.evaluate("""(d)=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); s.events.tr_sopartilha={type:'treino',date:d,time:'18:00',dur:75,theme:'Só aqui',att:{}}; localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}""",d(1))
    pa.reload(); pa.wait_for_timeout(2500)
    pa.click('nav [data-t="plantel"]'); pa.click('#main [data-a="atLinks"]'); pa.wait_for_timeout(300)
    pa.click('#dlg [data-a="atDiag"]'); pa.wait_for_timeout(2500)
    t=pa.inner_text("#dlg"); print("verificar:", t.replace("\n"," | ")[:300])
    if "Só aqui" not in t or "Não chegou" not in t: errs.append("verificar: treino que não chegou à partilha")
    pa.screenshot(path=os.path.join(CAP,"t38_verificar.png"))
    pa.click('#dlg [data-a="atDiagSend"]'); pa.wait_for_timeout(3500)
    ag=[a["id"] for a in get({"a":"atleta","t":TOK})["agenda"]]
    if "tr_sopartilha" not in ag: errs.append("verificar: envio para a partilha")
    if "tudo igual" not in pa.inner_text("#dlg"): errs.append("verificar: depois de enviar")
    # respostas por atleta: nome na folha sem atleta → ligar à mão
    t=pa.inner_text("#dlg")
    if "Zé Ninguém" not in t or "Bem-estar e PSE nos últimos 14 dias" not in t: errs.append("verificar: nomes da folha sem atleta")
    pa.select_option('#dlg select[data-c="atNome"][data-n="Zé Ninguém"]',"ta3"); pa.wait_for_timeout(4500)
    rd=get({"a":"atletas_diag","k":KEY}); print("diag Rui:", rd["atletas"].get("ta3"), "sem atleta:", rd.get("semAtleta"))
    if "Zé Ninguém" in rd.get("semAtleta",{}) or rd["atletas"]["ta3"]["bem"]<2: errs.append("ligar nome da folha ao atleta")
    if "Zé Ninguém" in pa.inner_text("#dlg"): errs.append("verificar: nome ligado continua na lista")
    # jogo passado que só está aqui (minutos/golos) → conta para as estatísticas do atleta depois de enviado
    pa.click('#dlg [data-a="mClose"]')
    pa.evaluate("""(d)=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); s.events.j_so_aqui={type:'jogo',date:d,time:'15:00',opp:'Talaíde',venue:'C',dur:90,call:['ta1'],xi:['ta1'],ev:[{t:'golo',min:10,pid:'ta1'}],ga:0,closed:true}; localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}""",d(-5))
    pa.reload(); pa.wait_for_timeout(2500)
    pa.click('nav [data-t="plantel"]'); pa.click('#main [data-a="atLinks"]'); pa.wait_for_timeout(300)
    pa.click('#dlg [data-a="atDiag"]'); pa.wait_for_timeout(3500)
    t=pa.inner_text("#dlg")
    if "já passados" not in t or "Talaíde" not in t: errs.append("verificar: jogo passado em falta")
    antes=get({"a":"atleta","t":TOK})["numeros"]["jogos"]
    pa.click('#dlg [data-a="atDiagSend"]'); pa.wait_for_timeout(4000)
    depois=get({"a":"atleta","t":TOK})["numeros"]["jogos"]; print("jogos do Luís:", antes, "->", depois)
    if depois!=antes+1: errs.append("jogo passado enviado não conta nas estatísticas")
    pa.click('#dlg [data-a="mClose"]')
    # convocatória: publicar
    pa.click('nav [data-t="jogos"]'); pa.click('[data-a="jsub"][data-k="conv"]'); pa.wait_for_timeout(400)
    gid=pa.evaluate("document.querySelector('select[data-c=convG]').value")
    if not pa.is_disabled('#main [data-a="atPub"]') and not pa.evaluate(f"(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).events['{gid}'].call||[]).length"): errs.append("publicar sem convocados")
    antes=bool(pa.evaluate(f"JSON.parse(localStorage.getItem('estrela-tecnico-v1')).events['{gid}'].convPub||false"))
    if not antes and not pa.evaluate(f"(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).events['{gid}'].call||[]).length"):
        pa.click('#main [data-a="call"] >> nth=0'); pa.wait_for_timeout(300)
    for i in range(2):   # publicar e retirar (ou o contrário, se já estava publicada)
        pa.click('#main [data-a="atPub"]'); pa.wait_for_timeout(2500)
        ev=[json.loads(r[2]) for r in estado()["docs"] if r[0]=="events" and r[1]==gid]
        agora=bool(ev and ev[0].get("convPub")); print("publicada:", antes, "->", agora)
        if agora==antes: errs.append("publicar/retirar não chegou à partilha")
        if ("Publicada" in pa.inner_text("#main"))!=agora: errs.append("estado publicada no ecrã")
        antes=agora
    b.close()
finally:
  srv.terminate()
print("ERRORS:",errs)

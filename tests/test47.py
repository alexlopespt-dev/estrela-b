import os, json, re, subprocess, urllib.request, urllib.parse, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Relatório mensal por atleta: (1) servidor — pedido "mensal" devolve bem-estar e PSE do mês por atleta (folhas inteiras,
# nomes ligados, outros meses fora); (2) app — da ficha, um atleta: números do mês (presenças, jogos/minutos/golos, nota,
# carga, bem-estar, lesão/reabilitação, avaliação, testes) e UMA página A4; "Todos": uma página por atleta; sem partilha
# avisa e usa a carga das PSE da app; com partilha usa o Sheets (pedido intercetado) e mostra a média do plantel.
errs=[]
KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8797
ID_BEM="1w5BTGC_4J8565aigffuRKRFSeAOsqKK4WDgNnaAo8II"; ID_PSE="1lnH3j_dXdFSOw-6Ak9CdtRpWWjm1MIvJBEToQowX_3Q"
T=datetime.date.today(); first=T.replace(day=1); PM=(first-datetime.timedelta(days=1)).replace(day=1)   # mês anterior (completo)
MES=PM.strftime("%Y-%m"); md=lambda n: PM.replace(day=n).isoformat(); sl=lambda n,h: PM.replace(day=n).strftime("%Y/%m/%d")+" "+h
# ---------- (1) servidor
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
assert "pronto" in srv.stdout.readline()
BASE=f"http://127.0.0.1:{PORT}"
def prep(p): urllib.request.urlopen(urllib.request.Request(BASE+"/__prep",data=json.dumps(p).encode(),method="POST")).read()
def post(p): return json.loads(urllib.request.urlopen(urllib.request.Request(BASE+"/exec",data=json.dumps(p).encode(),method="POST")).read())
def get(q): return json.loads(urllib.request.urlopen(BASE+"/exec?"+urllib.parse.urlencode(q)).read())
try:
  post({"a":"x"}); urllib.request.urlopen(BASE+"/__run?f=prepararDadosApp").read()
  H_BEM=["Carimbo de data/hora","Nome do Jogador","Qualidade do sono","Fadiga Geral","Dor Muscular","Stress"]
  H_PSE=["Carimbo de data/hora","Nome do Jogador","Tipo de sessão","Duração da sessão","Quão intenso foi o treino? (PSE)"]
  outro=(PM-datetime.timedelta(days=3)).strftime("%Y/%m/%d")+" 08:00:00"
  prep({"nomes":["Tiago C.","Rui"],"aliases":[["Tiaguinho","Tiago C."]],"respostas":[
    {"id":ID_BEM,"nome":"respostas","form":True,"linhas":[H_BEM,[sl(3,"08:00:00"),"Tiago C.","4 - Bom","4 - Bem","3 - Alguma Dor","4 - Tranquilo"],[sl(4,"08:00:00"),"Tiaguinho","2 - Mau","3 - Normal","3 - Alguma Dor","3 - Normal"],
      [outro,"Tiago C.","5","5","5","5"],[sl(5,"08:00:00"),"Zé","3","3","3","3"]]},
    {"id":ID_PSE,"nome":"respostas","form":True,"linhas":[H_PSE,[sl(3,"21:00:00"),"Tiago C.","Treino","01:30:00","7 - Muito difícil"],[sl(3,"21:30:00"),"Tiago C.","Recuperação","00:20:00","3"],[sl(6,"21:00:00"),"Rui","Jogo","01:30:00","8"]]}]})
  post({"k":KEY,"a":"push","ops":[{"c":"players","i":"pa","d":{"name":"Tiago C."}},{"c":"players","i":"pb","d":{"name":"Rui"}}]})
  r=get({"k":KEY,"a":"mensal","mes":MES}); print("mensal:", json.dumps(r,ensure_ascii=False)[:500])
  if r.get("bem",{}).get("pa",{}).get(md(3),{}).get("t")!=15 or r["bem"]["pa"].get(md(4),{}).get("t")!=11: errs.append("bem-estar do mês (com equivalência)")
  if len(r["bem"]["pa"])!=2: errs.append("outro mês entrou")
  if [x["c"] for x in r.get("pse",{}).get("pa",{}).get(md(3),[])]!=[630,60] or r["pse"].get("pb",{}).get(md(6),[{}])[0].get("c")!=720: errs.append("PSE do mês")
  if r.get("semAtleta")!={"Zé":1}: errs.append("nomes sem atleta")
  if get({"k":KEY,"a":"mensal","mes":"2026-13"}).get("erro") is None: errs.append("mês inválido aceite")
  if get({"a":"mensal","mes":MES}).get("erro")!="chave": errs.append("sem chave aceite")
finally:
  srv.kill()

# ---------- (2) app
def setup(pg):
    return pg.evaluate("""(a)=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); const ps=Object.keys(s.players).filter(k=>!s.players[k].archived); const A=ps[0], B=ps[1];
      for(const k of Object.keys(s.events)) if(s.events[k].date&&s.events[k].date.slice(0,7)===a.mes) delete s.events[k];
      const att=(st,r)=>({[A]:{s:st,rpe:r},[B]:{s:'P',rpe:5}});
      s.events.m1={type:'treino',date:a.d[3],time:'19:30',dur:90,att:att('P',7)}; s.events.m2={type:'treino',date:a.d[4],time:'19:30',dur:60,att:att('AT',5)};
      s.events.m3={type:'treino',date:a.d[10],time:'19:30',dur:90,att:att('FI')}; s.events.m4={type:'treino',date:a.d[11],time:'19:30',dur:90,att:att('P',6)};
      s.events.mj={type:'jogo',date:a.d[6],time:'15:00',opp:'Mensal FC',venue:'F',dur:90,call:[A,B],xi:[A],ev:[{id:'x1',t:'golo',min:30,pid:A},{id:'x2',t:'amarelo',min:50,pid:A},{id:'x3',t:'sub',min:70,in:B,out:A}],rt:{[A]:7.5},ga:1,closed:true};
      s.evals.me={pid:A,date:a.d[12],by:'Miguel Motta',v:{tec:{Passe:8},fis:{Velocidade:6}},str:'Remate',weak:'Jogo aéreo',fin:'Bom mês'};
      s.tests.mt={date:a.d[2],label:'Teste mensal',res:{[A]:{vel:4.0,salto:230}}};
      s.injuries.mi={pid:A,date:a.d[20],type:'Muscular',zone:'Gémeo / perna',status:'ativa'};
      s.rehab=s.rehab||{}; s.rehab.mi={pid:A,fase:1,items:[{id:'z1',x:'rb14',s:3,r:'15'}],log:[{id:'l1',d:a.d[22],by:'Fisio',dor:4,ok:['z1']},{id:'l2',d:a.d[23],by:'Atleta (app)',dor:2,ok:['z1'],app:1}]};
      localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s)); return [A,B,s.players[A].name,ps.length];}""",
      {"mes":MES,"d":{str(n):md(n) for n in range(1,29)}})
def pdf_pages(ctx,html,name):
    out=os.path.join(CAP,name+".html"); open(out,"w").write(html)
    p2=ctx.new_page(); p2.goto("file://"+out); p2.wait_for_timeout(500); pdf=os.path.join(CAP,name+".pdf"); p2.pdf(path=pdf,format="A4",print_background=True); p2.close(); os.remove(out)
    import pymupdf; return len(pymupdf.open(pdf))
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    A,B,nA,NP=setup(pg); pg.reload(); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="plantel"]'); pg.click(f'[data-p="atleta"][data-id="{A}"]'); pg.wait_for_timeout(300)
    pg.click(f'#main [data-a="mesRel"][data-id="{A}"]'); pg.wait_for_timeout(300)
    if pg.input_value('#dlg [name=pid]')!=A: errs.append("atleta pré-escolhido")
    pg.select_option('#dlg [name=mes]',MES)
    with pg.expect_download() as dl: pg.click('#dlg [data-a="mesGo"][data-k="dl"]')
    html=open(dl.value.path(),encoding="utf-8").read(); txt=re.sub(r"<[^>]+>"," ",html); txt=re.sub(r"\s+"," ",txt)
    print("um atleta:", txt[txt.find("Presenças"):][:420])
    for w,why in [("Partilha não ligada","aviso sem partilha"),("75%","presenças 3 de 4"),("3 de 4 treinos","presenças"),("70'","minutos (saiu aos 70)"),("78% dos possíveis","% minutos"),
                  ("1 · 0","golos · assist."),("1 am.","amarelo"),("7.5","nota"),("Mensal FC","jogo"),("Remate","avaliação"),("Teste mensal","testes"),
                  ("Reabilitação: 2 sessões no mês (1 registada pelo atleta)","reabilitação"),("dor média 3.0/10","dor média"),("Notas da conversa","notas")]:
        if w not in txt: errs.append("um atleta: falta "+why+f" ({w})")
    if "Bem-estar diário" in txt: errs.append("sem partilha não devia ter o gráfico do bem-estar")
    # carga da app: 7×90 + 5×60 + 6×90 = 1470
    if "1470 UA" not in txt: errs.append("carga das PSE da app")
    n=pdf_pages(ctx,html,"t47_um"); print("páginas (1 atleta):", n)
    if n!=1: errs.append(f"um atleta devia ter 1 página ({n})")
    # todos
    pg.click('nav [data-t="plantel"]'); pg.click('#main [data-a="mesRel"]:not([data-id])'); pg.wait_for_timeout(300); pg.select_option('#dlg [name=mes]',MES)
    with pg.expect_download() as dl: pg.click('#dlg [data-a="mesGo"][data-k="dl"]')
    html=open(dl.value.path(),encoding="utf-8").read(); ns=html.count('<section class="mes">')
    n=pdf_pages(ctx,html,"t47_todos"); print("todos:", ns, "secções |", n, "páginas | atletas:", NP)
    if ns!=NP or n!=NP: errs.append(f"todos: uma página por atleta ({ns} secções, {n} páginas, {NP} atletas)")
    # com partilha (pedido "mensal" intercetado): bem-estar e carga do Sheets + média do plantel
    srvj={"ok":True,"mes":MES,"bem":{A:{md(3):{"t":15,"i":[4,4,3,4]},md(4):{"t":11,"i":[2,3,3,3]}}},"pse":{A:{md(3):[{"rpe":7,"dur":90,"c":630},{"rpe":3,"dur":20,"c":60}]},B:{md(6):[{"rpe":8,"dur":90,"c":720}]}},"semAtleta":{},"erros":[]}
    def rt(route):
        u=route.request.url
        if "a=mensal" in u: route.fulfill(status=200,body=json.dumps(srvj),headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
        else: route.fulfill(status=200,body=json.dumps({"now":0,"docs":[]}),headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
    pg.route("https://script.google.com/**",rt)
    pg.evaluate("localStorage.setItem('estrela-tecnico-v1:sync',JSON.stringify({url:'https://script.google.com/macros/s/TESTE/exec',key:'"+KEY+"',last:0}))")
    pg.reload(); pg.wait_for_timeout(1500)
    pg.click('nav [data-t="plantel"]'); pg.click(f'[data-p="atleta"][data-id="{A}"]'); pg.wait_for_timeout(300)
    pg.click(f'#main [data-a="mesRel"][data-id="{A}"]'); pg.wait_for_timeout(300); pg.select_option('#dlg [name=mes]',MES)
    with pg.expect_download(timeout=60000) as dl: pg.click('#dlg [data-a="mesGo"][data-k="dl"]')
    html=open(dl.value.path(),encoding="utf-8").read(); txt=re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",html))
    print("com partilha:", txt[txt.find("Carga do mês"):][:200])
    if "Partilha não ligada" in txt or "Bem-estar diário" not in txt or "690 UA" not in txt or "13.0/20" not in txt or "plantel 705" not in txt: errs.append("com partilha: dados do Sheets")
    if html.count("<circle")<2: errs.append("pontos do bem-estar")
    n=pdf_pages(ctx,html,"t47_partilha"); print("páginas (com partilha):", n)
    if n!=1: errs.append(f"com partilha devia ter 1 página ({n})")
    # mês cheio: 5 jogos e 2 avaliações → continua numa página
    pg.evaluate("""(a)=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); const A=a.A;
      [13,20,27,28].forEach((n,i)=>{ s.events['mx'+i]={type:'jogo',date:a.d[n],time:'15:00',opp:'Adversário '+n,venue:i%2?'F':'C',dur:90,call:[A],xi:[A],ev:[{id:'g'+i,t:'golo',min:10,pid:A}],rt:{[A]:6+i/2},ga:i,closed:true}; });
      s.evals.me2={pid:A,date:a.d[26],by:'João Maltez',v:{tec:{Passe:7},tat:{Leitura:7},fis:{Força:8},psi:{Liderança:8}},str:'Liderança e comunicação com a linha defensiva em todos os momentos do jogo',weak:'Gestão do esforço na segunda parte',fin:'Mês muito positivo'};
      localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}""",{"A":A,"d":{str(n):md(n) for n in range(1,29)}})
    pg.reload(); pg.wait_for_timeout(1500)
    pg.click('nav [data-t="plantel"]'); pg.click(f'[data-p="atleta"][data-id="{A}"]'); pg.wait_for_timeout(300)
    pg.click(f'#main [data-a="mesRel"][data-id="{A}"]'); pg.wait_for_timeout(300); pg.select_option('#dlg [name=mes]',MES)
    with pg.expect_download(timeout=60000) as dl: pg.click('#dlg [data-a="mesGo"][data-k="dl"]')
    html=open(dl.value.path(),encoding="utf-8").read(); n=pdf_pages(ctx,html,"t47_cheio"); print("páginas (mês cheio):", n)
    if n!=1: errs.append(f"mês cheio devia ter 1 página ({n})")
    b.close()
print("ERRORS",errs)

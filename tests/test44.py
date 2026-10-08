import os, json, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Treinos → "Copiar semana": origem (semana com treinos) → destino (qualquer dia da semana, vai para a segunda-feira);
# cada treino no mesmo dia da semana com hora/duração/local/tema/tipo/intensidade/material/objetivos/plano; sem presenças,
# PSE, avaliações nem notas; dias já com treino ficam desmarcados (e podem ser marcados); opção sem plano; microciclo criado
# (com o período/objetivo do de origem) só se faltar; mesma semana recusada; botão por semana na lista; telemóvel e ecrã baixo.
errs=[]
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
def DB(pg): return pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1'))")
T=datetime.date.today(); mon=T-datetime.timedelta(days=T.weekday())
W0=mon-datetime.timedelta(days=7); W1=mon+datetime.timedelta(days=7)    # semana passada (origem) e a próxima (destino)
iso=lambda d:d.isoformat(); dd=lambda w,n: iso(w+datetime.timedelta(days=n))
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900}); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    pg.evaluate("""(a)=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); const ps=Object.keys(s.players);
      for(const k of Object.keys(s.events)) if(s.events[k].type==='treino') delete s.events[k];
      const pl=[{ex:'exi130',name:'Meinhos',min:15,mom:['od']},{ex:null,name:'Jogo reduzido',min:30}];
      s.events.o2={type:'treino',date:a.ter,time:'19:30',dur:90,place:'Reboleira',theme:'Pressão alta',int:'Alta',ttype:'fp',mat:'Coletes',objG:'Pressionar',objE:'Reação à perda',plan:pl,att:{[ps[0]]:{s:'P',rpe:7}},pev:{[ps[0]]:{r:8}},notes:'Correu bem',closed:true};
      s.events.o3={type:'treino',date:a.qua,time:'19:30',dur:75,theme:'Posse',int:'Média',ttype:'pos',plan:[{ex:null,name:'Rondo',min:20}],att:{}};
      s.events.o5={type:'treino',date:a.sex,time:'18:00',dur:60,theme:'Pré-jogo',int:'Baixa',ttype:'pj',plan:[],att:{}};
      s.events.ja={type:'treino',date:a.dqua,time:'10:00',dur:60,theme:'Já marcado',plan:[],att:{}};
      s.cycles=s.cycles||{}; s.cycles.mo={kind:'micro',name:'Micro origem',start:a.mon0,end:a.sun0,period:'Competitivo',obj:'Pressão alta'};
      localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}""",
      {"ter":dd(W0,1),"qua":dd(W0,2),"sex":dd(W0,4),"dqua":dd(W1,2),"mon0":iso(W0),"sun0":dd(W0,6)})
    pg.reload(); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="treinos"]'); pg.wait_for_timeout(300); chk(pg,"treinos")
    nb=pg.locator('#main .wcsec [data-a="weekCopy"]').count(); print("botões por semana:", nb)
    if nb<2: errs.append("botão copiar por semana")
    pg.click(f'#main .wcsec [data-a="weekCopy"][data-w="{iso(W0)}"]'); pg.wait_for_timeout(300); chk(pg,"janela")
    if pg.input_value('#dlg [name=src]')!=iso(W0): errs.append("semana de origem pré-escolhida")
    pg.fill('#dlg [name=dst]', dd(W1,3)); pg.dispatch_event('#dlg [name=dst]','change'); pg.wait_for_timeout(200)   # quinta → vai para a segunda
    t=pg.inner_text("#wcPrev"); print("pré-visualização:", t.replace("\n"," | "))
    if "3 treinos" not in t or "Já há treino neste dia" not in t: errs.append("pré-visualização")
    st=pg.eval_on_selector_all('#wcPrev input[type=checkbox]',"e=>e.map(x=>x.checked)"); print("marcados:", st)
    if st!=[True,False,True]: errs.append("dia ocupado desmarcado")
    # mesma semana → recusada
    pg.fill('#dlg [name=dst]', dd(W0,0)); pg.dispatch_event('#dlg [name=dst]','change'); pg.wait_for_timeout(150)
    if "mesma" not in pg.inner_text("#wcPrev"): errs.append("aviso mesma semana")
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    if "mesma" not in pg.inner_text("#toast") or not pg.evaluate("document.querySelector('#dlg').open"): errs.append("mesma semana aceite")
    pg.fill('#dlg [name=dst]', dd(W1,0)); pg.dispatch_event('#dlg [name=dst]','change'); pg.wait_for_timeout(150)
    pg.screenshot(path=os.path.join(CAP,"t44_copiar.png"))
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400); print("toast:", pg.inner_text("#toast"))
    d=DB(pg); novos={k:v for k,v in d["events"].items() if v["type"]=="treino" and v["date"]>=iso(W1) and k!="ja"}
    print("criados:", sorted((v["date"],v.get("theme")) for v in novos.values()))
    if sorted(v["date"] for v in novos.values())!=[dd(W1,1),dd(W1,4)]: errs.append("datas copiadas")
    n2=[v for v in novos.values() if v["date"]==dd(W1,1)][0]
    if (n2["time"],n2["dur"],n2["place"],n2["theme"],n2["int"],n2["ttype"],n2["mat"],n2["objG"],n2["objE"])!=("19:30",90,"Reboleira","Pressão alta","Alta","fp","Coletes","Pressionar","Reação à perda"): errs.append("campos copiados "+json.dumps(n2))
    if len(n2["plan"])!=2 or n2["plan"][0].get("mom")!=["od"] or n2["plan"][1]["min"]!=30: errs.append("plano copiado")
    if n2.get("att") or n2.get("pev") or n2.get("notes") or n2.get("closed"): errs.append("copiou presenças/avaliações/notas/fechado")
    if d["events"]["o2"]["att"]=={} or d["events"]["ja"]["theme"]!="Já marcado": errs.append("original alterado")
    mc=[c for c in d["cycles"].values() if c.get("kind")=="micro" and c["start"]==iso(W1)]
    print("microciclo:", mc)
    if len(mc)!=1 or mc[0].get("period")!="Competitivo" or mc[0].get("obj")!="Pressão alta": errs.append("microciclo criado")
    # outra vez para a semana seguinte, sem plano e marcando o dia ocupado: não cria 2.º microciclo onde já existe
    pg.click('#main [data-a="weekCopy"]:not([data-w])'); pg.wait_for_timeout(300)
    pg.select_option('#dlg [name=src]', iso(W0)); pg.dispatch_event('#dlg [name=src]','change')
    pg.fill('#dlg [name=dst]', dd(W1,0)); pg.dispatch_event('#dlg [name=dst]','change'); pg.wait_for_timeout(150)
    st=pg.eval_on_selector_all('#wcPrev input[type=checkbox]',"e=>e.map(x=>x.checked)"); print("2.ª vez (tudo ocupado):", st)
    if any(st): errs.append("2.ª cópia: dias já ocupados deviam vir desmarcados")
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(150)
    if "pelo menos" not in pg.inner_text("#toast"): errs.append("nada marcado aceite")
    pg.uncheck('#dlg [name=plan]'); pg.wait_for_timeout(100); pg.check('#wcPrev [name=wc1]')
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400)
    d=DB(pg); q=[v for v in d["events"].values() if v["type"]=="treino" and v["date"]==dd(W1,2) and v.get("theme")=="Posse"]
    if len(q)!=1 or q[0]["plan"]: errs.append("cópia sem plano no dia ocupado")
    if len([c for c in d["cycles"].values() if c.get("kind")=="micro" and c["start"]==iso(W1)])!=1: errs.append("microciclo duplicado")
    # telemóvel e ecrã baixo: botão Copiar visível
    for (w,h) in [(390,844),(1280,420)]:
        pg.set_viewport_size({"width":w,"height":h}); pg.click('#main [data-a="weekCopy"]:not([data-w])'); pg.wait_for_timeout(300)
        ok=pg.evaluate("(()=>{const b=document.querySelector('#dlg [data-a=mSave]').getBoundingClientRect();return b.bottom<=innerHeight+1&&b.top>=0 && document.querySelector('#dlg').scrollWidth<=document.querySelector('#dlg').clientWidth+1})()")
        if not ok: errs.append(f"janela {w}x{h}")
        if w==390: pg.screenshot(path=os.path.join(CAP,"t44_tel.png"))
        pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
        if pg.is_visible("#dlgAsk"): pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(150)
    b.close()
print("ERRORS",errs)

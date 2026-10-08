import os, json, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Estatísticas → "Comparar atletas": a partir da ficha ("Comparar" → A = esse atleta, B = outro da mesma zona), escolher,
# trocar A/B, escolher em B o mesmo de A troca os dois; época (minutos, golos, cartões: menos é melhor), avaliação (radar com
# dois polígonos e as áreas), testes (velocidade: menos é melhor), lesões; sem monitorização não há essa secção; telemóvel e escuro.
errs=[]
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
T=datetime.date.today(); d=lambda n:(T+datetime.timedelta(days=n)).isoformat()
def row(pg,label):   # [valor A, valor B, quem ganha]
    return pg.evaluate("""(l)=>{const r=[...document.querySelectorAll('.cmprow')].find(x=>x.querySelector('.cmpl').firstChild.textContent.trim()===l); if(!r) return null;
      const a=r.querySelector('.cmpv.a'), b=r.querySelector('.cmpv.b'); return [a.textContent.trim(), b.textContent.trim(), a.classList.contains('win')?'a':b.classList.contains('win')?'b':'']}""", label)
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900}); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    ids=pg.evaluate("""(a)=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1'));
      const ps=Object.entries(s.players).filter(([k,p])=>!p.archived&&p.pos&&p.pos!=='GR'); const A=ps[0][0], B=ps[1][0];
      s.players[A].pos='MC'; s.players[B].pos='MC'; for(const k of Object.keys(s.events)) if(s.events[k].type==='jogo') delete s.events[k];
      s.events.cg1={type:'jogo',date:a.d1,time:'15:00',opp:'Comp FC',venue:'C',dur:90,call:[A,B],xi:[A,B],ev:[{id:'e1',t:'golo',min:10,pid:A},{id:'e2',t:'golo',min:20,pid:A},{id:'e3',t:'assist',min:20,pid:B},{id:'e4',t:'amarelo',min:30,pid:B},{id:'e5',t:'sub',min:60,in:Object.keys(s.players).find(k=>k!==A&&k!==B),out:B}],rt:{[A]:8,[B]:6},ga:1,closed:true};
      s.evals.ce1={pid:A,date:a.d1,v:{tec:{a:8,b:8},tat:{a:6},fis:{a:7},psi:{a:9}}};
      s.evals.ce2={pid:B,date:a.d1,v:{tec:{a:6},tat:{a:8},fis:{a:7},psi:{a:5}}};
      s.tests.ct1={date:a.d2,label:'Setembro',res:{[A]:{vel:4.10,salto:220},[B]:{vel:3.95,salto:240}}};
      s.injuries.ci1={pid:B,date:a.d3,type:'Muscular',zone:'Coxa posterior',status:'alta',ret:a.d4};
      localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s)); return [A,B,s.players[A].name,s.players[B].name];}""",
      {"d1":d(-3),"d2":d(-20),"d3":d(-15),"d4":d(-5)})
    A,B,nA,nB=ids
    pg.reload(); pg.wait_for_timeout(1200)
    # da ficha do atleta A
    pg.click('nav [data-t="plantel"]'); pg.click(f'[data-p="atleta"][data-id="{A}"]'); pg.wait_for_timeout(300)
    pg.click(f'#main [data-a="cmpWith"][data-id="{A}"]'); pg.wait_for_timeout(400); chk(pg,"comparar")
    sa=pg.input_value('select[data-c="cmpSel"][data-k="A"]'); sb=pg.input_value('select[data-c="cmpSel"][data-k="B"]'); print("A/B:", sa, sb)
    if sa!=A or sb==A: errs.append("A vem da ficha, B diferente")
    pg.select_option('select[data-c="cmpSel"][data-k="B"]', B); pg.wait_for_timeout(300)
    for l in ["Golos","Assistências","Amarelos","Minutos","Nota média","Velocidade","Salto horizontal","Dias de lesão na época"]:
        print(l, row(pg,l))
    if row(pg,"Golos")!=["2","0","a"]: errs.append("golos")
    if row(pg,"Assistências")!=["0","1","b"]: errs.append("assistências")
    if row(pg,"Amarelos")!=["0","1","a"]: errs.append("amarelos: menos é melhor")
    if row(pg,"Minutos")!=["90","60","a"]: errs.append("minutos (substituição aos 60')")
    if row(pg,"Velocidade")[2]!="b" or row(pg,"Salto horizontal")[2]!="b": errs.append("testes (velocidade: menos é melhor)")
    if row(pg,"Dias de lesão na época")!=["0","10","a"]: errs.append("dias de lesão")
    if row(pg,"Carga 7 dias")[2]!="": errs.append("carga sem melhor/pior")
    if pg.locator(".cmpradar polygon[stroke='var(--cmpA)']").count()!=1 or pg.locator(".cmpradar polygon[stroke='var(--cmpB)']").count()!=1: errs.append("radar com os dois")
    t=pg.inner_text("#main")
    if "Monitorização (hoje)" in t: errs.append("monitorização sem dados")
    if nA not in t or nB not in t: errs.append("nomes")
    pg.screenshot(path=os.path.join(CAP,"t45_comparar.png"),full_page=True)
    # trocar
    pg.click('[data-a="cmpSwap"]'); pg.wait_for_timeout(300)
    if pg.input_value('select[data-c="cmpSel"][data-k="A"]')!=B or row(pg,"Golos")!=["0","2","b"]: errs.append("trocar A/B")
    # escolher em B o mesmo que A: troca
    pg.select_option('select[data-c="cmpSel"][data-k="B"]', B); pg.wait_for_timeout(300)
    if (pg.input_value('select[data-c="cmpSel"][data-k="A"]'),pg.input_value('select[data-c="cmpSel"][data-k="B"]'))!=(A,B): errs.append("mesmo atleta nos dois lados")
    # sub-aba guardada; voltar a "Por atleta" e de novo
    pg.click('[data-a="ssub"][data-k="por"]'); pg.wait_for_timeout(200); pg.click('[data-a="ssub"][data-k="cmp"]'); pg.wait_for_timeout(200)
    if pg.input_value('select[data-c="cmpSel"][data-k="A"]')!=A: errs.append("mantém a escolha")
    # telemóvel + escuro
    pg.set_viewport_size({"width":390,"height":844}); pg.evaluate("document.documentElement.setAttribute('data-theme','dark')"); pg.wait_for_timeout(300)
    ov=pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1")
    if not ov: errs.append("scroll lateral no telemóvel")
    pg.screenshot(path=os.path.join(CAP,"t45_tel_escuro.png"),full_page=True)
    b.close()
print("ERRORS",errs)

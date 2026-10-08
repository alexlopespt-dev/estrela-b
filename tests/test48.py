import os, json, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Separador Guarda-redes (gr.js): semana com os treinos da equipa e as sessões de GR, criar sessão ligada ao treino,
# exercícios base de GR (com desenho) e tipo de trabalho no formulário do exercício, plano (biblioteca, livre, tipo,
# minutos, mover, apagar), PSE/bem-estar de cada GR vindos da monitorização, avaliação 1-5 e observações, criar as sessões
# em falta da semana, "O que temos trabalhado", duplicar, PDF da sessão e da semana, PSE e monitorização dos GR (tabelas com
# média do plantel), jogos dos GR (golos sofridos repartidos, validação com o resultado, defesas da ficha de jogo, época),
# cartão no treino da equipa e na ficha do GR, recarregar, telemóvel + escuro, eliminar.
errs=[]
BASE=json.load(open(os.path.join(ROOT,"tests","monitorizacao_exemplo.json")))
URL="https://script.google.com/macros/s/TESTE/exec"
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
def lsdoc(pg,col):
    return pg.evaluate(f"(()=>{{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1'));return s.{col}||{{}}}})()")
def flush(pg): pg.evaluate("window.dispatchEvent(new Event('pagehide'))"); pg.wait_for_timeout(150)
def pdf_pages(ctx,html,name):
    out=os.path.join(CAP,name+".html"); open(out,"w",encoding="utf-8").write(html.replace("window.print()","0"))
    p2=ctx.new_page(); p2.goto("file://"+out); p2.wait_for_timeout(500); pdf=os.path.join(CAP,name+".pdf"); p2.pdf(path=pdf,format="A4",print_background=True); p2.close(); os.remove(out)
    import pymupdf; return len(pymupdf.open(pdf))
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.route("https://script.google.com/**", lambda r: r.fulfill(status=200, body=json.dumps(BASE), headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}))
    pg.clock.set_fixed_time("2026-09-23T10:00:00")   # quarta-feira (a monitorização de exemplo é deste dia)
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    # treinos de 3.ª a 6.ª, dois jogos passados (um com dois GR), PSE no treino de 3.ª
    pg.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1'));
      const tr=(d,th,att)=>({type:'treino',date:d,time:'10:00',dur:90,theme:th,att:att||{}});
      s.events.t22=tr('2026-09-22','Tr terça',{p1:{s:'P',rpe:7},p12:{s:'P',rpe:6},p22:{s:'FJ'}}); s.events.t23=tr('2026-09-23','Tr quarta');
      s.events.t24=tr('2026-09-24','Tr quinta'); s.events.t25=tr('2026-09-25','Tr sexta');
      s.events.gx={type:'jogo',date:'2026-09-14',time:'15:00',opp:'Dois GR FC',venue:'C',dur:90,call:['p1','p12','p2','p3'],xi:['p1','p2','p3'],ev:[{id:'s1',t:'sub',min:60,out:'p1',in:'p12'}],ga:2,closed:true,rt:{p1:6,p12:7}};
      s.events.gy={type:'jogo',date:'2026-09-07',time:'15:00',opp:'Um GR SC',venue:'F',dur:90,call:['p12','p2'],xi:['p12','p2'],ev:[],ga:1,closed:true,rt:{p12:7.5},st:{p12:{sd07:5}}};
      localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}""")
    pg.reload(); pg.wait_for_timeout(1200)
    # monitorização ligada (como no test34)
    pg.click('nav [data-t="mon"]'); pg.click('.bar [data-a="monCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',"certa"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1000)
    # ---- separador
    pg.click('nav [data-t="gr"]'); pg.wait_for_timeout(300); chk(pg,"gr")
    strip=pg.eval_on_selector_all(".gkstrip .gkp .main > b","e=>e.map(x=>x.textContent)"); print("GR:", strip)
    if strip[:3]!=["Abbiati","Noam","Rui"]: errs.append("GR do plantel "+str(strip))
    st=pg.inner_text(".gkstrip")
    if "Bem-estar 17/20" not in st.replace("\n"," ") or "PSE 9" not in st: errs.append("faixa: bem-estar/PSE de hoje "+st[:200])
    wk=pg.inner_text(".wk-row").replace("\n"," "); print("semana:", wk[:300])
    if pg.locator('.wk-row [data-a="gkNew"].gkw-add').count()!=4: errs.append("4 treinos sem sessão de GR")
    if "Criar as 4 sessões em falta" not in pg.inner_text("#main"): errs.append("criar em falta (4)")
    # ---- exercícios base
    pg.click('[data-a="gksub"][data-k="ex"]'); pg.wait_for_timeout(200)
    n0=pg.locator("#main .ex").count()
    pg.click('#main .bar [data-a="gkBase"]'); pg.wait_for_timeout(400); chk(pg,"ex")
    n1=pg.locator("#main .ex").count(); print("exercícios de GR:", n0, "→", n1)
    if n1!=n0+16: errs.append(f"16 exercícios base ({n0}→{n1})")
    if pg.locator("#main .ex .exthumb img").count()<16: errs.append("exercícios base com desenho")
    if pg.locator('#main .bar [data-a="gkBase"]').count(): errs.append("botão dos base devia sair")
    pg.click('[data-a="gkT"][data-k="aer"]'); pg.wait_for_timeout(150)
    if pg.locator("#main .ex").count()!=1: errs.append("filtro por tipo (aéreo)")
    pg.click('[data-a="gkT"][data-k=""]'); pg.wait_for_timeout(150)
    pg.fill("#exSearch","penál"); pg.wait_for_timeout(100)
    if pg.locator("#main .ex:visible").count()!=1: errs.append("procurar")
    pg.fill("#exSearch","")
    exs=lsdoc(pg,"exercises"); g9=exs.get("gk09",{})
    if g9.get("cat")!="Guarda-redes" or g9.get("gkt")!="aer" or not (g9.get("vec") or {}).get("it"): errs.append("gk09 gravado "+str({k:g9.get(k) for k in ("cat","gkt")}))
    pg.click('#main .bar [data-a="gkBase"]') if pg.locator('#main .bar [data-a="gkBase"]').count() else None
    # tipo de trabalho no formulário do exercício (só para a categoria de GR)
    pg.click('#main .ex[data-a="exView"]:has-text("Penáltis")'); pg.wait_for_timeout(200)
    if "Penáltis e bolas paradas" not in pg.inner_text("#dlg"): errs.append("tipo de trabalho na ficha do exercício")
    pg.click('#dlg [data-a="exEdit"]'); pg.wait_for_timeout(200)
    if not pg.is_visible('#dlg [data-gkonly]'): errs.append("campo tipo de GR visível")
    pg.select_option('#dlg [name=gkt]',"ref"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    if lsdoc(pg,"exercises")["gk14"].get("gkt")!="ref": errs.append("tipo de trabalho gravado")
    pg.click('#main .ex[data-a="exView"]:has-text("Penáltis")'); pg.click('#dlg [data-a="exEdit"]'); pg.wait_for_timeout(200)
    pg.select_option('#dlg [name=cat]',"Técnico"); pg.wait_for_timeout(100)
    if pg.is_visible('#dlg [data-gkonly]'): errs.append("campo de GR devia esconder noutra categoria")
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    if pg.locator('#dlgAsk[open]').count(): pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(200)
    flush(pg)
    if lsdoc(pg,"exercises")["gk14"].get("cat")!="Guarda-redes": errs.append("cancelar não muda a categoria")
    # ---- criar sessão de quarta a partir da semana
    pg.click('[data-a="gksub"][data-k="sessoes"]'); pg.wait_for_timeout(200)
    pg.click('.wk-row [data-a="gkNew"][data-d="2026-09-23"]'); pg.wait_for_timeout(200)
    if pg.input_value('#dlg [name=ev]')!="t23" or pg.input_value('#dlg [name=time]')!="10:00": errs.append("nova sessão: treino e hora do dia")
    pg.fill('#dlg [name=theme]',"Saídas aéreas"); pg.fill('#dlg [name=dur]',"400"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    if not pg.locator("#dlg[open]").count(): errs.append("duração inválida devia ser recusada")
    pg.fill('#dlg [name=dur]',"35"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300); chk(pg,"sessão")
    t=pg.inner_text("#main")
    if "Saídas aéreas" not in t or "Com o treino da equipa das 10:00" not in t: errs.append("ficha da sessão")
    gk=lsdoc(pg,"gk"); sid=[k for k,v in gk.items() if v.get("theme")=="Saídas aéreas"]
    if len(sid)!=1 or gk[sid[0]].get("ev")!="t23" or gk[sid[0]].get("dur")!=35: errs.append("sessão gravada "+str(gk)); sid=sid or [""]
    sid=sid[0]
    # plano: biblioteca (2), livre, tipo, minutos, mover, apagar
    pg.click('#main [data-a="gkPick"]'); pg.wait_for_timeout(200)
    npk=pg.locator("#pickGrid .pick").count(); print("no seletor:", npk)
    if npk!=n1: errs.append("seletor com os exercícios de GR")
    pg.click('#pickGrid .pick:has-text("Cruzamentos")'); pg.click('#pickGrid .pick:has-text("Encaixe frontal")'); pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    pg.click('#main [data-a="gkFree"]'); pg.wait_for_timeout(200)
    pg.fill('.gkplan >> nth=2 >> [data-f="name"]',"Jogo de pés livre"); pg.press('.gkplan >> nth=2 >> [data-f="name"]',"Tab"); pg.wait_for_timeout(150)
    pg.select_option('.gkplan >> nth=2 >> select[data-f="t"]',"pes"); pg.wait_for_timeout(150)
    pg.fill('.gkplan >> nth=2 >> [data-f="min"]',"10"); pg.press('.gkplan >> nth=2 >> [data-f="min"]',"Tab"); pg.wait_for_timeout(150)
    pg.fill('.gkplan >> nth=0 >> [data-f="n"]',"2 × 6 por GR"); pg.press('.gkplan >> nth=0 >> [data-f="n"]',"Tab"); pg.wait_for_timeout(150)
    pg.fill('.gkplan >> nth=1 >> [data-f="min"]',"999"); pg.press('.gkplan >> nth=1 >> [data-f="min"]',"Tab"); pg.wait_for_timeout(300)
    pg.click('.gkplan >> nth=2 >> [data-a="gkMove"][data-n="-1"]'); pg.wait_for_timeout(150)
    pg.click('#main [data-a="gkFree"]'); pg.wait_for_timeout(150); pg.click('.gkplan >> nth=3 >> [data-a="gkDelB"]'); pg.wait_for_timeout(200)
    plan=lsdoc(pg,"gk")[sid]["plan"]; print("plano:", [(x["name"],x.get("t"),x.get("min"),x.get("n")) for x in plan])
    if [(x["name"],x.get("t"),x.get("min")) for x in plan]!=[("Cruzamentos: saída aérea com oposição","aer",15),("Jogo de pés livre","pes",10),("Encaixe frontal: rasteira, meia altura e alta","enc",10)]: errs.append("plano")
    if plan and plan[0].get("n")!="2 × 6 por GR": errs.append("indicações do bloco")
    if "35' planeados de 35'" not in pg.inner_text("#main"): errs.append("total planeado")
    # os GR na sessão: PSE e bem-estar da monitorização, presença do treino, avaliação e observações
    rows=pg.eval_on_selector_all(".gkath","e=>e.map(x=>x.innerText.replace(/\\s+/g,' '))"); print("GR na sessão:", rows)
    if not rows or "PSE 9 80' · 720 UA (app do atleta)" not in rows[0] or "bem-estar 17/20" not in rows[0]: errs.append("Abbiati: PSE/bem-estar")
    if len(rows)<2 or "Sem PSE neste dia" not in rows[1] or "bem-estar 8/20" not in rows[1]: errs.append("Noam: sem PSE, bem-estar 8")
    if "Presença por marcar no treino" not in rows[0]: errs.append("presença do treino da equipa")
    pg.click('.gkath >> nth=0 >> [data-a="gkRate"][data-n="4"]'); pg.wait_for_timeout(150)
    pg.click('.gkath >> nth=1 >> [data-a="gkRate"][data-n="2"]'); pg.wait_for_timeout(150)
    pg.click('.gkath >> nth=1 >> [data-a="gkRate"][data-n="2"]'); pg.wait_for_timeout(150)   # tocar outra vez tira
    pg.fill('.gkath >> nth=0 >> [data-c="gkOb"]',"Bom timing nas saídas"); pg.press('.gkath >> nth=0 >> [data-c="gkOb"]',"Tab"); pg.wait_for_timeout(200)
    ob=lsdoc(pg,"gk")[sid].get("ob",{}); print("ob:", ob)
    if ob!={"p1":{"r":4,"t":"Bom timing nas saídas"}}: errs.append("avaliação/observações "+str(ob))
    pg.screenshot(path=os.path.join(CAP,"t48_sessao.png"),full_page=True)
    # ---- PDF da sessão
    pg.click('#main [data-a="gkPr"]'); pg.wait_for_timeout(200)
    with pg.expect_download() as dl: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(dl.value.path(),encoding="utf-8").read()
    for s_ in ["Treino de guarda-redes — Saídas aéreas","Cruzamentos: saída aérea com oposição","Jogo de pés livre","Cruzamentos e jogo aéreo","2 × 6 por GR","35'"]:
        if s_ not in html: errs.append("PDF sessão: falta "+s_)
    nsvg=html.count("<svg"); n=pdf_pages(ctx,html,"t48_sessao"); print("PDF sessão:", nsvg, "desenhos |", n, "páginas")
    if nsvg<2: errs.append("PDF com os desenhos")
    if n>2: errs.append(f"PDF da sessão com {n} páginas")
    # ---- no treino da equipa
    pg.click('#main [data-a="page"][data-p="treino"]'); pg.wait_for_timeout(200)
    if "Treino de guarda-redes" not in pg.inner_text("#main") or "Saídas aéreas" not in pg.inner_text("#main"): errs.append("cartão no treino da equipa")
    # ---- semana: criar em falta
    pg.click('nav [data-t="gr"]'); pg.wait_for_timeout(200)
    if pg.locator('.wk-row [data-a="gkNew"].gkw-add').count()!=3: errs.append("3 treinos sem sessão")
    pg.click('#main [data-a="gkWeekGen"]'); pg.wait_for_timeout(300)
    gk=lsdoc(pg,"gk"); ses=[v for v in gk.values() if v.get("k")=="s"]
    if sorted(v.get("ev") for v in ses)!=["t22","t23","t24","t25"]: errs.append("criar em falta "+str([v.get("ev") for v in ses]))
    if pg.locator('.wk-row [data-a="gkNew"].gkw-add').count() or pg.locator('#main [data-a="gkWeekGen"]').count(): errs.append("semana completa")
    # O que temos trabalhado
    wt=pg.inner_text(".gkbars").replace("\n"," "); print("trabalhado:", wt)
    if not re.search(r"Cruzamentos e jogo aéreo 15' 43%",wt) or "Encaixe e receção 10' 29%" not in wt: errs.append("o que temos trabalhado")
    pg.screenshot(path=os.path.join(CAP,"t48_semana.png"),full_page=True)
    # PDF da semana
    pg.click('#main [data-a="gkPrW"]'); pg.wait_for_timeout(200)
    with pg.expect_download() as dl: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(dl.value.path(),encoding="utf-8").read()
    if "4 sessões" not in html or "Saídas aéreas" not in html: errs.append("PDF da semana")
    # ---- duplicar
    pg.click(f'#main [data-a="page"][data-p="gk"][data-id="{sid}"] >> nth=0'); pg.wait_for_timeout(200)
    pg.click('#main [data-a="gkDup"]'); pg.wait_for_timeout(200)
    if pg.input_value('#dlg [name=date]')!="2026-09-30": errs.append("duplicar: dia por omissão "+pg.input_value('#dlg [name=date]'))
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    gk=lsdoc(pg,"gk"); dup=[v for v in gk.values() if v.get("date")=="2026-09-30"]
    if len(dup)!=1 or len(dup[0].get("plan",[]))!=3 or dup[0].get("ob") or dup[0].get("ev"): errs.append("duplicado "+str(dup))
    # ---- PSE e monitorização
    pg.click('nav [data-t="gr"]'); pg.click('[data-a="gksub"][data-k="mon"]'); pg.wait_for_timeout(300); chk(pg,"mon")
    cards=pg.locator(".gkmon").count(); t=pg.inner_text("#main").lower(); print("cartões:", cards)
    if cards!=3 or "carga 7 dias" not in t or "2520" not in t: errs.append("cartões de monitorização")
    pse=pg.eval_on_selector_all("table.gktb >> nth=0 >> tbody tr","e=>e.map(r=>r.innerText.replace(/\\s+/g,' '))"); print("PSE:", pse)
    if len(pse)!=4 or "9 675 UA" not in pse[0] or not pse[3].startswith("Média do plantel"): errs.append("tabela PSE")
    bem=pg.eval_on_selector_all("table.gktb >> nth=1 >> tbody tr","e=>e.map(r=>r.innerText.replace(/\\s+/g,' '))"); print("bem:", bem)
    if len(bem)!=4 or "8 Risco" not in bem[1]: errs.append("tabela bem-estar")
    pg.screenshot(path=os.path.join(CAP,"t48_mon.png"),full_page=True)
    # ---- jogos
    pg.click('[data-a="gksub"][data-k="jogos"]'); pg.wait_for_timeout(300); chk(pg,"jogos")
    sm=pg.eval_on_selector_all("table.gktb tbody tr","e=>e.map(r=>r.innerText.replace(/\\s+/g,' '))"); print("época:", sm)
    if "Golos por repartir" not in pg.inner_text("#main"): errs.append("aviso golos por repartir")
    pg.click('.gkg:has-text("Dois GR FC") [data-a="gkGame"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=gs_p1]',"1"); pg.fill('#dlg [name=gs_p12]',"0"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    if not pg.locator("#dlg[open]").count(): errs.append("golos que não batem com o resultado deviam ser recusados")
    pg.fill('#dlg [name=gs_p12]',"1"); pg.fill('#dlg [name=r_p1]',"11"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    if not pg.locator("#dlg[open]").count(): errs.append("nota 11 devia ser recusada")
    pg.fill('#dlg [name=r_p1]',"6.5"); pg.fill('#dlg [name=def_p1]',"3"); pg.fill('#dlg [name=err_p12]',"1"); pg.fill('#dlg [name=t_p1]',"Golo de canto"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    rec=lsdoc(pg,"gk").get("j_gx",{}); print("registo:", rec)
    if rec.get("d")!={"p1":{"gs":1,"def":3,"r":6.5,"t":"Golo de canto"},"p12":{"gs":1,"err":1}}: errs.append("registo dos GR "+str(rec))
    sm=pg.eval_on_selector_all("table.gktb tbody tr","e=>e.map(r=>r.innerText.replace(/\\s+/g,' '))"); print("época:", sm)
    # Abbiati: J1 (90', 0) + gx (60', 1) | Noam: gy (90', 1, 5 def., nota 7,5) + gx (30', 1)
    if not sm[0].startswith("Abbiati 2 2 150 1 0,6 1 3 0 6,5 6,5"): errs.append("época Abbiati "+sm[0])
    if not sm[1].startswith("Noam 2 1 120 2 1,5 0 5 1 7,3"): errs.append("época Noam "+sm[1])
    if "Golos por repartir" in pg.inner_text("#main"): errs.append("aviso devia sair")
    pg.screenshot(path=os.path.join(CAP,"t48_jogos.png"),full_page=True)
    # ---- ficha do GR
    pg.click('table.gktb [data-p="atleta"][data-id="p1"]'); pg.wait_for_timeout(300); chk(pg,"ficha")
    t=pg.inner_text("#main")
    if "sessões de gr" not in t.lower() or "Bom timing nas saídas" not in t or "4/5" not in t: errs.append("cartão na ficha do GR")
    # ---- persistência, últimas alterações
    pg.reload(); pg.wait_for_timeout(1200)
    if pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).gk||{}).length")!=6: errs.append("gravado depois de recarregar")
    # ---- telemóvel + escuro
    pg.set_viewport_size({"width":390,"height":844}); pg.evaluate("document.documentElement.setAttribute('data-theme','dark')")
    pg.click('nav [data-t="gr"]'); pg.wait_for_timeout(200)
    for k in ["sessoes","mon","jogos","ex"]:
        pg.click(f'[data-a="gksub"][data-k="{k}"]'); pg.wait_for_timeout(200); chk(pg,"tel "+k)
        if not pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"): errs.append("scroll lateral no telemóvel: "+k)
    pg.click('[data-a="gksub"][data-k="sessoes"]'); pg.click(f'#main [data-a="page"][data-p="gk"][data-id="{sid}"] >> nth=0'); pg.wait_for_timeout(200)
    if not pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"): errs.append("scroll lateral na sessão (telemóvel)")
    pg.screenshot(path=os.path.join(CAP,"t48_tel.png"),full_page=True)
    # ---- eliminar
    pg.click('#main [data-a="gkDel"]'); pg.wait_for_timeout(150); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(300)
    if sid in lsdoc(pg,"gk") : flush(pg)
    if sid in lsdoc(pg,"gk"): errs.append("eliminar a sessão")
    b.close()
print("ERRORS",errs)

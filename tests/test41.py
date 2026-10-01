import os, json, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Clínico → Reabilitação: biblioteca (exercícios base sem duplicar, novo, filtros, pesquisa), plano por lesão (juntar, fase,
# dose/ordem, tirar), sessões (dor, feitos, editar, apagar), resumo no separador Lesões, PDF, WhatsApp, lesão apagada leva o plano,
# exercício apagado fica com o nome no plano; telemóvel, tema escuro, ecrã baixo; dados antigos sem as coleções novas.
errs=[]
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
def DB(pg): return pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1'))")
hoje=datetime.date.today().isoformat(); ontem=(datetime.date.today()-datetime.timedelta(days=1)).isoformat()
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True); pg=ctx.new_page()
    ctx.route("https://wa.me/**", lambda r: r.fulfill(status=200, content_type="text/html", body="ok"))
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    # dados antigos (sem rehab/rehabex) + duas lesões ativas
    pg.evaluate("""(()=>{const d=JSON.parse(localStorage.getItem('estrela-tecnico-v1'));delete d.rehab;delete d.rehabex;
      const ps=Object.keys(d.players); d.injuries=d.injuries||{};
      d.injuries.inA={pid:ps[0],date:'%s',type:'Muscular',zone:'Coxa posterior',side:'Direito',ctx:'Treino',status:'ativa',plan:[],trt:[]};
      d.injuries.inB={pid:ps[1],date:'%s',type:'Entorse',zone:'Tornozelo',side:'—',ctx:'Jogo',status:'condicionado',plan:[],trt:[]};
      localStorage.setItem('estrela-tecnico-v1',JSON.stringify(d));})()""" % (ontem,ontem))
    pg.reload(); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="clinico"]'); pg.wait_for_timeout(200); chk(pg,"clínico")
    if not pg.locator('[data-a="csub"][data-k="reab"]').count(): errs.append("sub-aba Reabilitação")
    pg.click('.seg [data-a="csub"][data-k="reab"]'); pg.wait_for_timeout(200); chk(pg,"reab vazio")
    t=pg.inner_text("#main"); print("vazio:", t.replace("\n"," | ")[:200])
    if "Biblioteca vazia" not in t or pg.locator(".rbcard").count()!=2: errs.append("estado inicial (biblioteca vazia, 2 em reabilitação)")
    pg.click('#main [data-a="rbBase"]'); pg.wait_for_timeout(300); print("base:", pg.inner_text("#toast"))
    n0=len(DB(pg)["rehabex"]); print("biblioteca:", n0)
    if n0!=27: errs.append("exercícios base")
    if pg.locator('#main [data-a="rbBase"]').count(): errs.append("botão de juntar base continua com a biblioteca completa")
    # filtros e pesquisa
    pg.click('[data-a="rbFq"][data-k="4"]'); pg.wait_for_timeout(150); n4=pg.locator("#rbList [data-name]").count(); print("fase 4:", n4)
    if n4!=3: errs.append("filtro por fase")
    pg.click('[data-a="rbFq"][data-k="0"]'); pg.wait_for_timeout(150)
    pg.select_option('select[data-c="rbReg"]', "Coxa posterior"); pg.wait_for_timeout(150); nr=pg.locator("#rbList [data-name]").count(); print("coxa posterior:", nr)
    if nr!=5: errs.append("filtro por zona")
    pg.select_option('select[data-c="rbReg"]', ""); pg.wait_for_timeout(150)
    pg.fill("#rbSearch","nordic"); pg.wait_for_timeout(100)
    vis=pg.eval_on_selector_all("#rbList [data-name]","e=>e.filter(x=>x.style.display!=='none').length"); print("pesquisa nordic:", vis)
    if vis!=1: errs.append("pesquisa")
    pg.fill("#rbSearch","zzzz"); pg.wait_for_timeout(100)
    if not pg.is_visible("#rbNone"): errs.append("sem resultados")
    pg.fill("#rbSearch","")
    # novo exercício na biblioteca (validações)
    pg.click('#main [data-a="rbNew"]'); pg.wait_for_timeout(150); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80)
    if "nome" not in pg.inner_text("#toast"): errs.append("sem nome aceite")
    pg.fill('#dlg [name=name]',"Corrida em piscina"); pg.select_option('#dlg [name=reg]',"Geral"); pg.select_option('#dlg [name=fase]',"2"); pg.fill('#dlg [name=s]',"4"); pg.fill('#dlg [name=t]',"5 min")
    pg.fill('#dlg [name=vid]',"javascript:alert(1)"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80)
    if "link" not in pg.inner_text("#toast") or not pg.is_visible("#dlg"): errs.append("vídeo que não é link aceite")
    pg.fill('#dlg [name=vid]',"https://youtu.be/exemplo"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    new=[k for k,v in DB(pg)["rehabex"].items() if v["name"]=="Corrida em piscina"]
    if len(new)!=1 or DB(pg)["rehabex"][new[0]]["fase"]!=2: errs.append("novo exercício")
    # juntar ao plano do atleta A (filtro F3 na janela + pesquisa)
    pg.click('#rb_inA [data-a="rbAdd"]'); pg.wait_for_timeout(200)
    pg.click('#dlg [data-a="rbPickF"][data-k="3"]'); pg.wait_for_timeout(80)
    vis3=pg.eval_on_selector_all("#rbPickL .rbpick","e=>e.filter(x=>x.style.display!=='none').length"); print("janela F3:", vis3)
    pg.fill("#rbPickQ","isquio"); pg.wait_for_timeout(80)
    vq=pg.eval_on_selector_all("#rbPickL .rbpick","e=>e.filter(x=>x.style.display!=='none').map(x=>x.innerText.split(' —')[0])"); print("F3 + isquio:", vq)
    if not vq or any("isquio" not in x.lower() for x in vq): errs.append("pesquisa na janela")
    pg.fill("#rbPickQ",""); pg.click('#dlg [data-a="rbPickF"][data-k="0"]')
    for nm in ["Nordic","Ponte de isquiotibiais com pés no banco","Isometria de isquiotibiais"]:
        pg.locator('#rbPickL .rbpick', has_text=nm).first.locator("input").check()
    pg.locator('#rbPickL .rbpick', has_text="Corrida em piscina").locator("input").check()
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(250); chk(pg,"plano")
    pl=DB(pg)["rehab"]["inA"]; print("plano:", len(pl["items"]), "fase:", pl["fase"])
    if len(pl["items"])!=4 or pl["fase"]!=1 or pl["pid"]!=DB(pg)["injuries"]["inA"]["pid"]: errs.append("juntar ao plano / fase inicial")
    # os já escolhidos ficam marcados e bloqueados
    pg.click('#rb_inA [data-a="rbAdd"]'); pg.wait_for_timeout(150)
    if pg.locator("#rbPickL input:disabled").count()!=4: errs.append("já no plano não bloqueado")
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80)
    if "pelo menos" not in pg.inner_text("#toast"): errs.append("juntar sem escolher")
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(100)
    # fase
    pg.click('#rb_inA [data-a="rbFase"][data-f="3"]'); pg.wait_for_timeout(150)
    if DB(pg)["rehab"]["inA"]["fase"]!=3 or pg.get_attribute('#rb_inA [data-a="rbFase"][data-f="3"]',"aria-pressed")!="true": errs.append("mudar fase")
    # dose e ordem
    k3=DB(pg)["rehab"]["inA"]["items"][2]["id"]
    pg.click(f'#rb_inA [data-a="rbItem"][data-k="{k3}"]'); pg.wait_for_timeout(150)
    pg.fill('#dlg [name=s]',"4"); pg.fill('#dlg [name=r]',"6"); pg.fill('#dlg [name=n]',"só até 60°"); pg.select_option('#dlg [name=ord]',"0"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    it=DB(pg)["rehab"]["inA"]["items"]
    if it[0]["id"]!=k3 or it[0]["s"]!=4 or it[0]["r"]!="6" or it[0]["n"]!="só até 60°" or len(it)!=4: errs.append("dose/ordem "+json.dumps(it[0]))
    d0=pg.inner_text('#rb_inA .rbitems li >> nth=0'); print("1.º:", d0.replace("\n"," | "))
    if "4×6" not in d0: errs.append("dose no cartão")
    # tirar do plano
    k4=[x["id"] for x in it if x["x"]==new[0]][0]; pg.click(f'#rb_inA [data-a="rbItem"][data-k="{k4}"]'); pg.wait_for_timeout(120); pg.click('#dlg [data-a="mDel"]'); pg.wait_for_timeout(200)
    if len(DB(pg)["rehab"]["inA"]["items"])!=3: errs.append("tirar do plano")
    # sessões
    pg.click('#rb_inA [data-a="rbSes"]'); pg.wait_for_timeout(150)
    if pg.locator('#dlg [name=ok]:checked').count()!=3: errs.append("sessão: exercícios marcados por omissão")
    pg.fill('#dlg [name=d]',(datetime.date.today()+datetime.timedelta(days=2)).isoformat()); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(80)
    if "futuro" not in pg.inner_text("#toast"): errs.append("sessão no futuro aceite")
    pg.fill('#dlg [name=d]',ontem); pg.click('#dlg .rbdor label:has-text("5")'); pg.fill('#dlg [name=by]',"Bruno (fisio)"); pg.fill('#dlg [name=n]',"Dor no fim")
    pg.locator('#dlg [name=ok]').nth(1).uncheck(); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    pg.click('#rb_inA [data-a="rbSes"]'); pg.wait_for_timeout(150); pg.click('#dlg .rbdor label:has-text("2")'); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200)
    lg=DB(pg)["rehab"]["inA"]["log"]; print("sessões:", [(l["d"],l["dor"],len(l["ok"])) for l in lg])
    if len(lg)!=2 or lg[0]["d"]!=ontem or lg[0]["dor"]!=5 or len(lg[0]["ok"])!=2 or lg[1]["dor"]!=2: errs.append("sessões gravadas / ordem por data")
    c=pg.inner_text("#rb_inA"); print("cartão:", c.replace("\n"," | ")[-220:])
    if "Dor 2/10" not in c or "2 sessões" not in c or not pg.locator("#rb_inA svg.rbsp").count(): errs.append("última sessão / evolução da dor")
    # editar e apagar uma sessão
    pg.click('#rb_inA [data-a="rbLog"]'); pg.wait_for_timeout(150)
    if pg.locator('#dlg [data-a="rbSesEdit"]').count()!=2: errs.append("lista de sessões")
    pg.click('#dlg [data-a="rbSesEdit"] >> nth=1'); pg.wait_for_timeout(150)   # a mais antiga (lista da mais recente para trás)
    if pg.input_value('#dlg [name=n]')!="Dor no fim": errs.append("editar sessão abre a certa")
    pg.click('#dlg [data-a="mDel"]'); pg.wait_for_timeout(150); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(200)
    if len(DB(pg)["rehab"]["inA"]["log"])!=1: errs.append("apagar sessão")
    # WhatsApp (sem telemóvel → aviso) e texto
    with ctx.expect_page() as wp: pg.click('#rb_inA [data-a="rbWa"]')
    u=wp.value.url; wp.value.close(); print("whatsapp:", u[:90])
    from urllib.parse import unquote
    if "wa.me" not in u or "Plano de reabilita" not in unquote(u) or "4×6" not in unquote(u): errs.append("WhatsApp")
    # PDF
    pg.click('#rb_inA [data-a="rbPdf"]'); pg.wait_for_timeout(150)
    with pg.expect_download() as d: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(d.value.path(),encoding="utf-8").read()
    if "Plano de reabilitação" not in html or "Nordic" not in html or "só até 60°" not in html or "Últimas sessões" not in html: errs.append("PDF")
    pg.wait_for_timeout(200)
    # resumo no separador Lesões
    pg.click('.seg [data-a="csub"][data-k=""]'); pg.wait_for_timeout(200)
    r=pg.inner_text("#main"); print("lesões:", [l for l in r.split("\n") if "Reabilitação —" in l])
    if "Reabilitação — fase 3 · 3 exercícios" not in r: errs.append("resumo nas Lesões")
    pg.click('#main .card:has-text("Coxa posterior") [data-a="csub"][data-k="reab"]'); pg.wait_for_timeout(200)
    if not pg.locator(".rbcard").count(): errs.append("botão Reabilitação no cartão da lesão")
    pg.screenshot(path=os.path.join(CAP,"t41_reab.png"),full_page=True)
    # exercício apagado da biblioteca fica com o nome no plano
    nid=[k for k,v in DB(pg)["rehabex"].items() if v["name"].startswith("Nordic")][0]
    pg.fill("#rbSearch","nordic"); pg.click(f'#rbList [data-a="rbEdit"][data-id="{nid}"]'); pg.wait_for_timeout(150)
    pg.click('#dlg [data-a="mDel"]'); pg.wait_for_timeout(120)
    if "plano" not in pg.inner_text("#dlgAsk"): errs.append("aviso de exercício em uso")
    pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(250)
    if nid in DB(pg)["rehabex"] or "Nordic" not in pg.inner_text("#rb_inA"): errs.append("exercício apagado perde o nome no plano")
    # juntar base outra vez: só repõe o que falta
    pg.click('#main [data-a="rbBase"]'); pg.wait_for_timeout(200); print("repor base:", pg.inner_text("#toast"))
    if len(DB(pg)["rehabex"])!=n0+1: errs.append("juntar base duplicou")
    # alta → sai da reabilitação; apagar a lesão leva o plano
    pg.click('.seg [data-a="csub"][data-k=""]'); pg.wait_for_timeout(150)
    pg.click('#main .card:has-text("Tornozelo") [data-a="injEdit"]'); pg.wait_for_timeout(150); pg.click('#dlg [data-a="mDel"]'); pg.wait_for_timeout(100); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(200)
    pg.click('#main .card:has-text("Coxa posterior") [data-a="injSt"][data-s="alta"]'); pg.wait_for_timeout(200)
    pg.click('.seg [data-a="csub"][data-k="reab"]'); pg.wait_for_timeout(200)
    if "Ninguém em reabilitação" not in pg.inner_text("#main"): errs.append("com alta continua em reabilitação")
    if "inA" not in DB(pg)["rehab"]: errs.append("plano de quem teve alta perdido")
    # Plantel → Últimas alterações mostra a reabilitação
    pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(200)
    if "Reabilitação:" not in pg.inner_text("#main") and "Exercício de reabilitação" not in pg.inner_text("#main"): errs.append("últimas alterações")
    # telemóvel, tema escuro e ecrã baixo
    pg.evaluate("""(()=>{const d=JSON.parse(localStorage.getItem('estrela-tecnico-v1'));const i=d.injuries.inA;i.status='ativa';localStorage.setItem('estrela-tecnico-v1',JSON.stringify(d));})()""")
    for (w,h,theme) in [(390,844,"light"),(820,1180,"dark"),(1280,420,"dark")]:
        p2=ctx.new_page(); p2.set_viewport_size({"width":w,"height":h}); p2.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
        p2.goto("file://"+DIST+"/app_local.html"); p2.wait_for_timeout(1100)
        p2.evaluate(f"document.documentElement.setAttribute('data-theme','{theme}')")
        p2.click('nav [data-t="clinico"]'); p2.click('.seg [data-a="csub"][data-k="reab"]'); p2.wait_for_timeout(250); chk(p2,f"reab {w}")
        ov=p2.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1")
        if not ov: errs.append(f"scroll lateral {w}")
        p2.click('#rb_inA [data-a="rbSes"]'); p2.wait_for_timeout(200)
        sv=p2.evaluate("(()=>{const b=document.querySelector('#dlg [data-a=mSave]').getBoundingClientRect();return b.bottom<=innerHeight+1&&b.top>=0})()")
        if not sv: errs.append(f"guardar sessão fora do ecrã {w}x{h}")
        p2.click('#dlg .rbdor label:has-text("3")')
        if w==390: p2.screenshot(path=os.path.join(CAP,"t41_sessao_tel.png"))
        p2.click('#dlg [data-a="mClose"]'); p2.wait_for_timeout(150)
        if p2.is_visible("#dlgAsk"): p2.click('#dlgAsk [data-ask="1"]'); p2.wait_for_timeout(150)
        if w==820: p2.screenshot(path=os.path.join(CAP,"t41_reab_ipad_escuro.png"),full_page=True)
        p2.close()
    b.close()
print("ERRORS",errs)

import os, json, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Plantel → "Estado da app": versão, dispositivo, espaço no browser, partilha (não ligada → aviso + Ligar), monitorização,
# app do atleta (links, convocatória do próximo jogo), dados (presenças/plano/jogos por fechar); "Copiar relatório";
# telemóvel e tema escuro sem scroll lateral.
errs=[]
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
T=datetime.date.today(); d=lambda n:(T+datetime.timedelta(days=n)).isoformat()
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900}); ctx.grant_permissions(["clipboard-read","clipboard-write"])
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    # um treino passado sem presenças nem plano e um jogo passado por fechar; próximo jogo com convocados mas não publicado
    pg.evaluate("""(a)=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); const ps=Object.keys(s.players);
      s.events.t_sem={type:'treino',date:a[0],time:'19:30',dur:90,att:{},plan:[]};
      s.events.j_aberto={type:'jogo',date:a[0],time:'15:00',opp:'Teste FC',venue:'C',dur:90};
      s.events.j_prox={type:'jogo',date:a[1],time:'15:00',opp:'Próximo SC',venue:'F',dur:90,call:ps.slice(0,3)};
      localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}""",[d(-2),d(1)])
    pg.reload(); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(200)
    pg.click('#main [data-a="estado"]'); pg.wait_for_timeout(300); chk(pg,"estado")
    t=pg.inner_text("#dlg"); print("estado:", t.replace("\n"," | ")[:600])
    for w in ["Estado da app","Versão","Espaço no browser","Partilha com a equipa técnica","Não está ligada","Monitorização","App do atleta","Links pessoais","Dados"]:
        if w.lower() not in t.lower(): errs.append("falta: "+w)
    if "Próximo SC" not in t or "não publicada" not in t: errs.append("convocatória do próximo jogo por publicar")
    if "sem presenças marcadas" not in t or "sem plano" not in t or "por fechar" not in t: errs.append("avisos dos dados")
    import re; nf0=int(re.search(r"(\d+) jogos? passados? por fechar",t).group(1))
    top=pg.get_attribute("#dlg .estop","class"); print("topo:", top, "|", pg.inner_text("#dlg .estop"))
    if "warn" not in top and "bad" not in top: errs.append("resumo do topo devia ter avisos")
    if pg.locator('#dlg .estdot.warn').count()<4: errs.append("pontos de atenção")
    # copiar relatório
    pg.click('#dlg [data-a="estCopy"]'); pg.wait_for_timeout(300)
    cb=pg.evaluate("navigator.clipboard.readText()"); print("relatório:", cb.split("\n")[:4])
    if "Estado da app" not in cb or "[Partilha com a equipa técnica]" not in cb or "! Ligação: Não está ligada" not in cb: errs.append("relatório copiado")
    # o botão Ligar abre a partilha
    pg.click('#dlg .estrow:has-text("Ligação") [data-a="syncCfg"]'); pg.wait_for_timeout(300)
    if "Partilhar dados com a equipa técnica" not in pg.inner_text("#dlg"): errs.append("botão Ligar")
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(CAP,"t43_plantel.png"))
    pg.click('#main [data-a="estado"]'); pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(CAP,"t43_estado.png"))
    pg.click('#dlg [data-a="mClose"]')
    # depois de publicar a convocatória e fechar o jogo: deixam de aparecer
    pg.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('estrela-tecnico-v1')); s.events.j_prox.convPub=true; s.events.j_aberto.closed=true; localStorage.setItem('estrela-tecnico-v1',JSON.stringify(s));}""")
    pg.reload(); pg.wait_for_timeout(1200); pg.click('nav [data-t="plantel"]'); pg.click('#main [data-a="estado"]'); pg.wait_for_timeout(300)
    t=pg.inner_text("#dlg")
    m=re.search(r"(\d+) jogos? passados? por fechar",t); nf1=int(m.group(1)) if m else 0; print("jogos por fechar:", nf0, "→", nf1)
    if "publicada na app" not in t or nf1!=nf0-1: errs.append("estado depois de corrigir: "+t.replace("\n"," | ")[-700:])
    pg.click('#dlg [data-a="mClose"]')
    # telemóvel + tema escuro
    p2=ctx.new_page(); p2.set_viewport_size({"width":390,"height":844}); p2.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    p2.goto("file://"+DIST+"/app_local.html"); p2.wait_for_timeout(1100); p2.evaluate("document.documentElement.setAttribute('data-theme','dark')")
    p2.click('nav [data-t="plantel"]'); p2.click('#main [data-a="estado"]'); p2.wait_for_timeout(300)
    ov=p2.evaluate("(()=>{const d=document.querySelector('#dlg');return d.scrollWidth<=d.clientWidth+1 && document.documentElement.scrollWidth<=document.documentElement.clientWidth+1})()")
    if not ov: errs.append("scroll lateral no telemóvel")
    p2.screenshot(path=os.path.join(CAP,"t43_estado_tel.png")); p2.close()
    b.close()
print("ERRORS",errs)

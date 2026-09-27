import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas")
from playwright.sync_api import sync_playwright
# Painel novo (painel.js): alertas no sino do cabeçalho, cartão do próximo jogo (contagem, sem sobreposição), prontidão resumida
# e "Precisa de atenção hoje", semana na horizontal (7 dias, navegar), Disponibilidade/Forma no fim; nos 2 temas e 3 tamanhos.
errs=[]
FIX=json.load(open(os.path.join(ROOT,"tests","monitorizacao_exemplo.json"))); FIX["hoje"]="2026-10-01"
def h(r): r.fulfill(status=200,body=json.dumps(FIX),headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
def chk(pg,l):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER "+l)
over="""(()=>{const a=document.querySelector('.nx-clk b').getBoundingClientRect(); return [...document.querySelectorAll('.nx-c')].some(c=>{const b=c.getBoundingClientRect(); return !(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);});})()"""
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for w,hh,theme in [(1440,900,"light"),(820,1180,"dark"),(390,844,"light")]:
        ctx=b.new_context(viewport={"width":w,"height":hh}); pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
        pg.route("https://script.google.com/**",h); pg.clock.set_fixed_time("2026-10-01T16:00:00")
        pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(2300)
        pg.evaluate(f"localStorage.setItem('estrela-tecnico-v1:theme','{theme}')")
        # sem monitorização: cartão para ligar, sem "Precisa de atenção"
        pg.reload(); pg.wait_for_timeout(2300); chk(pg,"painel sem mon")
        if not pg.query_selector('.d2-mp [data-a="monCfg"]') or pg.query_selector('.mp-att'): errs.append(f"sem mon {w}")
        pg.click('nav [data-t="mon"]'); pg.click('.bar [data-a="monCfg"]'); pg.fill('#dlg [name=url]',"https://script.google.com/macros/s/X/exec"); pg.fill('#dlg [name=key]',"k"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(900)
        pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(400); chk(pg,"painel "+str(w))
        if pg.text_content('#tTeam')!="CF Estrela da Amadora — Equipa B" or not pg.title().startswith("CF Estrela da Amadora"): errs.append(f"nome no cabeçalho {w}: "+pg.text_content('#tTeam'))
        # telemóvel: nome e subtítulo numa linha cada, sem "Departamento técnico"
        if w<=520:
            hh=pg.evaluate("[document.querySelector('#tTeam').getBoundingClientRect().height, parseFloat(getComputedStyle(document.querySelector('#tTeam')).lineHeight), document.querySelector('#tSub').getBoundingClientRect().height, document.querySelector('#tSub').innerText]")
            print("cabeçalho telemóvel:", hh)
            if hh[0]>hh[1]*1.4 or hh[2]>24 or "Departamento" in hh[3] or "Equipa B" not in hh[3] or pg.inner_text('#tTeam')!="CF Estrela da Amadora": errs.append(f"cabeçalho no telemóvel {hh}")
        nx=pg.inner_text('.nx'); att=pg.eval_on_selector_all('.mp-att .li',"e=>e.map(x=>x.innerText.replace(/\\n/g,' | '))")
        print(w, theme, "| jogo:", nx.split("\n")[:4], "| atenção:", len(att), att[:2])
        if "Atlético CP B" not in nx or "2D" not in nx or "MD-3" not in nx: errs.append(f"próximo jogo {w}")
        if "mais prontos" not in nx.lower(): errs.append(f"prontidão no cartão do jogo {w}")
        if pg.evaluate(over): errs.append(f"relógio sobre o emblema {w}")
        if not (1<=len(att)<=5) or not all(any(k in a for k in ["Decidir","Gerir minutos","Perguntar","Clínico","Vigiar"]) for a in att): errs.append(f"atenção {w}")
        if pg.query_selector('#main .alert:not([data-a="meCfg"])'): errs.append(f"alertas ainda no painel {w}")
        n=pg.eval_on_selector_all('.wk-d',"e=>e.length"); lab=pg.inner_text('.wk .card-h h3')
        if n!=7 or "Esta semana" not in lab: errs.append(f"semana {w}")
        dom=pg.evaluate("(()=>{const q=s=>[...document.querySelectorAll('#main .card-h h3')].findIndex(h=>h.innerText.includes(s)); return [q('Esta semana'),q('Disponibilidade'),q('Forma e destaques')]})()")
        if not (0<=dom[0]<dom[1]<dom[2]): errs.append(f"ordem {dom}")
        ov=pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1")
        if not ov: errs.append(f"scroll lateral {w}")
        pg.screenshot(path=os.path.join(CAP,f"t33_painel_{w}.png"),full_page=True)
        if w==1440:
            # semana seguinte / anterior
            pg.click('[data-a="wkNav"][data-n="1"]'); pg.wait_for_timeout(200)
            if "Semana de" not in pg.inner_text('.wk .card-h h3'): errs.append("semana seguinte")
            pg.click('[data-a="wkNav"][data-n="0"]'); pg.wait_for_timeout(200)
            if "Esta semana" not in pg.inner_text('.wk .card-h h3'): errs.append("voltar a esta semana")
            # sino: contador, abre, fecha com Esc, navega a partir de um alerta
            badge=pg.inner_text('#notiBt .nb') if pg.query_selector('#notiBt .nb') else ""
            pg.click('#notiBt'); pg.wait_for_timeout(250)
            items=pg.eval_on_selector_all('#notiPanel .alert',"e=>e.map(x=>x.querySelector('b').innerText)")
            print("sino:", badge, items)
            if not badge or not items or not pg.is_visible('#notiPanel'): errs.append("sino não abriu")
            pg.screenshot(path=os.path.join(CAP,"t33_notificacoes.png"))
            pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
            if pg.query_selector('#notiPanel'): errs.append("Esc não fechou")
            pg.click('#notiBt'); pg.wait_for_timeout(200); pg.click('#main .kpis'); pg.wait_for_timeout(150)
            if pg.query_selector('#notiPanel'): errs.append("clique fora não fechou")
            pg.click('#notiBt'); pg.wait_for_timeout(200)
            pg.locator('#notiPanel .alert:has-text("Jogo por fechar")').first.click(); pg.wait_for_timeout(300)
            if pg.query_selector('#notiPanel') or "Tenente Valdez" not in pg.inner_text('#main'): errs.append("alerta não abriu o jogo")
            # o sino continua a funcionar noutros separadores
            pg.click('nav [data-t="treinos"]'); pg.wait_for_timeout(200); pg.click('#notiBt'); pg.wait_for_timeout(200)
            if not pg.is_visible('#notiPanel'): errs.append("sino noutro separador")
        ctx.close()
    b.close()
print("ERRORS",errs)

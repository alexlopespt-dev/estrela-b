import os, sys, json, threading, http.server, functools
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
sys.path.insert(0,os.path.join(ROOT,"tests")); sys.path.insert(0,ROOT)
from sb_falso import SbFalso
import build
from playwright.sync_api import sync_playwright
# Segurança da versão para clubes: a app servida com os cabeçalhos verdadeiros (_headers: CSP, HSTS…) funciona sem
# nenhum bloqueio da CSP (entrar, criar clube, atleta, esquema tático + imagem, impressão); erros vão para o Sentry
# (formato envelope, ambiente, sem email nem nomes); limite de tentativas de entrada neste dispositivo; ambiente de
# testes com faixa e dados fictícios; cabeçalhos da produção com HSTS e a Supabase de produção na CSP.
errs=[]
# ---- cabeçalhos da produção
hp=build.headers_for(build.env_of("producao"))
for s in ["Strict-Transport-Security: max-age=63072000","Content-Security-Policy:","frame-ancestors 'none'","https://kgplkrtiobiysubcohii.supabase.co","X-Content-Type-Options: nosniff","object-src 'none'"]:
    if s not in hp: errs.append("cabeçalhos da produção sem "+s)
# ---- servidor local com os cabeçalhos do ambiente dos testes
HDR={}
for l in build.headers_for(build.ENV_TESTE).splitlines()[1:]:
    k,v=l.strip().split(": ",1); HDR[k]=v
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        for k,v in HDR.items(): self.send_header(k,v)
        super().end_headers()
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(H,directory=DIST)); threading.Thread(target=srv.serve_forever,daemon=True).start()
URL=f"http://127.0.0.1:{srv.server_address[1]}/app_clubes.html"
SB=SbFalso(); SENT=[]
def sentry(route,request):
    SENT.append((request.url,request.post_data)); route.fulfill(status=200,body='{"id":"x"}',headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
def gate(pg): return pg.inner_text("#sbGate") if pg.query_selector("#sbGate") else ""
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True); pg=ctx.new_page()
    CSP=[]
    pg.on("console",lambda m: CSP.append(m.text) if "Content Security Policy" in m.text or "Refused to" in m.text else None)
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)) if "erro de teste" not in str(e) else None)
    ctx.add_init_script("window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI));")
    pg.route("https://sb.teste/**",SB.handle); pg.route("https://sentry.teste/**",sentry)
    r=pg.goto(URL); print("CSP servida:", "content-security-policy" in {k.lower() for k in r.headers})
    if "content-security-policy" not in {k.lower() for k in r.headers}: errs.append("servidor sem CSP")
    pg.wait_for_timeout(2300)
    # ambiente de testes
    pill=pg.inner_text(".envpill") if pg.query_selector(".envpill") else ""; print("faixa:", pill, "| título:", pg.title())
    if pill!="AMBIENTE DE TESTES" or not pg.title().startswith("[TESTES]"): errs.append("sinal do ambiente de testes")
    # entrar e criar clube
    pg.click('#sbGate [data-g="signup"]'); pg.fill('#sbGate [name=name]',"Ana Martins"); pg.fill('#sbGate [name=email]',"ana@clube.pt"); pg.fill('#sbGate [name=pass]',"segredo123")
    pg.click('#sbGate button[type=submit]'); pg.wait_for_timeout(800)
    pg.fill('#sbGate [name=club]',"GD Teste"); pg.fill('#sbGate [name=team]',"Sub-17"); pg.click('#sbGate form[data-sbf=club] button[type=submit]'); pg.wait_for_timeout(1200)
    if pg.query_selector("#sbGate"): errs.append("não entrou: "+gate(pg)[:80])
    # dados fictícios (só no ambiente de testes)
    pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(400)
    pg.click('#main [data-a="sbFake"]'); pg.wait_for_timeout(200); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(1500)
    t=list(SB.teams)[0]; npl=sum(1 for (tt,c,i),d in SB.docs.items() if tt==t and c=="players"); nev=sum(1 for (tt,c,i),d in SB.docs.items() if tt==t and c=="events")
    print("fictícios na base de dados:", npl, "atletas,", nev, "treinos/jogos")
    if npl!=22 or nev!=5: errs.append("dados fictícios")
    # esquema tático + imagem (canvas a partir de SVG: img-src data:/blob:)
    pg.click('[data-a="plsub"][data-k="tat"]'); pg.wait_for_timeout(300); pg.click('#main [data-a="tacNew"] >> nth=0'); pg.wait_for_timeout(300)
    pg.click('[data-a="tacFill"]'); pg.wait_for_timeout(400)
    with pg.expect_download() as dl: pg.click('[data-a="tacPng"]')
    if os.path.getsize(dl.value.path())<20000: errs.append("imagem do esquema com a CSP")
    # documento para imprimir (janela nova com script próprio)
    pg.click('nav [data-t="plantel"]'); pg.click('[data-a="plsub"][data-k="at"]'); pg.wait_for_timeout(300)
    pg.click('#main .list .li >> nth=0'); pg.wait_for_timeout(400)
    pg.click('#main [data-a="prAth"]'); pg.wait_for_timeout(300)
    with pg.expect_download() as dl2: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    sz=os.path.getsize(dl2.value.path()); print("documento para imprimir:", sz//1024, "KB")
    if sz<2000: errs.append("documento para imprimir")
    # erro inesperado → Sentry
    pg.evaluate("setTimeout(()=>{ throw new Error('erro de teste 123'); },0)"); pg.wait_for_timeout(800)
    ev=None
    for u,body in SENT:
        lines=(body or "").split("\n")
        if len(lines)>=3:
            e=json.loads(lines[2])
            if "erro de teste 123" in json.dumps(e): ev=(u,e,body)
    print("Sentry:", bool(ev), ev and ev[0][:60])
    if not ev: errs.append("erro não chegou ao Sentry")
    else:
        u,e,body=ev
        if "sentry_key=chavepublica" not in u or "/api/42/envelope/" not in u: errs.append("endereço do Sentry")
        if e.get("environment")!="testes" or e["exception"]["values"][0]["type"]!="Error" or not e["exception"]["values"][0].get("stacktrace"): errs.append("conteúdo do erro")
        for s in ["ana@clube.pt","Ana Martins","GD Teste","Tomás Arruda"]:
            if s in body: errs.append("dado pessoal enviado ao Sentry: "+s)
    # o mesmo erro não é enviado duas vezes
    n0=len(SENT); pg.evaluate("setTimeout(()=>{ throw new Error('erro de teste 123'); },0)"); pg.wait_for_timeout(500)
    if len(SENT)!=n0: errs.append("erro repetido enviado outra vez")
    # sem bloqueios da CSP em todo o percurso
    v=pg.evaluate("window.__csp"); print("bloqueios da CSP:", v, CSP[:3])
    if v or CSP: errs.append("CSP bloqueou: "+str(v or CSP)[:200])
    # limite de tentativas de entrada
    pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(300); pg.click('#main [data-a="sbOut"]'); pg.wait_for_timeout(200); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(2300)
    tok=lambda: sum(1 for m,u,s in SB.log if "grant_type=password" in u)
    t0=tok()
    for i in range(5):
        pg.fill('#sbGate [name=email]',"ana@clube.pt"); pg.fill('#sbGate [name=pass]',f"errada{i}xx"); pg.click('#sbGate button[type=submit]'); pg.wait_for_timeout(250)
    pg.fill('#sbGate [name=pass]',"segredo123"); pg.click('#sbGate button[type=submit]'); pg.wait_for_timeout(300)
    g=gate(pg); print("6.ª tentativa:", g[g.find("Demasiadas"):][:70] if "Demasiadas" in g else g[:80], "| pedidos ao servidor:", tok()-t0)
    if "Demasiadas tentativas" not in g or tok()-t0!=5: errs.append("limite de tentativas")
    pg.evaluate("localStorage.removeItem('equipa-tecnica-v1:tentativas')")
    pg.fill('#sbGate [name=pass]',"segredo123"); pg.click('#sbGate button[type=submit]'); pg.wait_for_timeout(1200)
    if pg.query_selector("#sbGate"): errs.append("não voltou a entrar depois do limite")
    pg.screenshot(path=os.path.join(CAP,"t37_testes.png"))
    b.close()
srv.shutdown()
print("ERRORS:",errs)

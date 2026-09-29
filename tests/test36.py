import os, sys, json, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
sys.path.insert(0,os.path.join(ROOT,"tests"))
from sb_falso import SbFalso
from playwright.sync_api import sync_playwright
# Versão para clubes (dist/app_clubes.html = clubes/index.html com a Supabase simulada):
# nada do Estrela lá dentro; criar conta (com confirmação por email), criar clube vazio; atleta gravado na base de dados com o
# nome da conta; convite → segunda pessoa entra pelo link com a função escolhida e vê os mesmos dados (receção periódica);
# adjunto sem permissão para a configuração (volta ao valor guardado); apagar; fotos no armazenamento; sessão expirada;
# palavra-passe errada; sair e voltar a entrar; telemóvel. A versão do Estrela não tem nada disto.
errs=[]
URL="file://"+DIST+"/app_clubes.html"
SB=SbFalso(confirm=True)
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
def gate(pg): return pg.inner_text("#sbGate") if pg.query_selector("#sbGate") else ""
def team_docs(col=None):
    t=list(SB.teams)[0]
    return {(c,i):d for (tt,c,i),d in SB.docs.items() if tt==t and (col is None or c==col) and not d["deleted"]}
html=open(os.path.join(DIST,"app_clubes.html")).read()
for s in ["Abbiati","Pigatto","Tenente Valdez","Renato Zava","CAL_2627","EX_2609","exi130","Emanuel"]:
    if s in html: errs.append("versão clubes tem dados do Estrela: "+s)
if "sbBoot" in open(os.path.join(DIST,"app_local.html")).read(): errs.append("versão do Estrela tem o código dos clubes")
with sync_playwright() as pw:
    b=pw.chromium.launch()
    ca=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True); pa=ca.new_page()
    pa.on("pageerror",lambda e:errs.append("PAGEERR A "+str(e)))
    pa.route("https://sb.teste/**",SB.handle)
    pa.goto(URL); pa.wait_for_timeout(2300)
    g=gate(pa); print("entrada:", g.replace("\n"," | ")[:120])
    if "Entrar" not in g: errs.append("sem ecrã de entrada")
    if pa.evaluate("Object.keys(__t.D.players).length"): errs.append("clube com jogadores antes de entrar")
    pa.screenshot(path=os.path.join(CAP,"t36_login.png"))
    # criar conta (pede confirmação por email)
    pa.click('#sbGate [data-g="signup"]'); pa.wait_for_timeout(150)
    pa.fill('#sbGate [name=name]',"Ana Martins"); pa.fill('#sbGate [name=email]',"ana@clube.pt"); pa.fill('#sbGate [name=pass]',"curta")
    pa.click('#sbGate button[type=submit]'); pa.wait_for_timeout(300)
    if "8 caracteres" not in gate(pa): errs.append("palavra-passe curta: "+gate(pa)[:80])
    pa.fill('#sbGate [name=pass]',"segredo123"); pa.click('#sbGate button[type=submit]'); pa.wait_for_timeout(400)
    g=gate(pa); print("depois do registo:", "Confirma o teu email" in g)
    if "Confirma o teu email" not in g: errs.append("confirmação por email")
    # entrar antes de confirmar
    pa.click('#sbGate [data-g="login"]'); pa.fill('#sbGate [name=email]',"ana@clube.pt"); pa.fill('#sbGate [name=pass]',"segredo123"); pa.click('#sbGate button[type=submit]'); pa.wait_for_timeout(300)
    if "confirmaste o email" not in gate(pa): errs.append("aviso de email por confirmar")
    # link do email → sessão iniciada → criar clube
    pa.goto(URL+SB.confirm_link("ana@clube.pt")); pa.wait_for_timeout(2300)
    g=gate(pa); print("depois de confirmar:", g.replace("\n"," | ")[:140])
    if "Criar o teu clube" not in g or "Olá, Ana" not in g: errs.append("ecrã de criar clube")
    if "access_token" in pa.url: errs.append("token ficou no endereço")
    pa.screenshot(path=os.path.join(CAP,"t36_clube.png"))
    pa.fill('#sbGate [name=club]',"GD Exemplo"); pa.fill('#sbGate [name=team]',"Sub-19"); pa.fill('#sbGate [name=comp]',"I Divisão Distrital")
    pa.click('#sbGate form[data-sbf=club] button[type=submit]'); pa.wait_for_timeout(1200); chk(pa,"painel")
    if pa.query_selector("#sbGate"): errs.append("continua no ecrã de entrada: "+gate(pa)[:100])
    hd=pa.inner_text("#tTeam"); print("cabeçalho:", hd)
    if "GD Exemplo" not in hd: errs.append("nome do clube no cabeçalho")
    np=pa.evaluate("Object.keys(__t.D.players).length"); ns=pa.evaluate("Object.keys(__t.D.statdefs).length"); print("jogadores:", np, "estatísticas:", ns)
    if np!=0: errs.append("clube novo com jogadores")
    if ns!=7: errs.append("configuração base")
    pa.screenshot(path=os.path.join(CAP,"t36_painel.png"))
    # atleta novo → base de dados com o nome de quem gravou
    pa.click('nav [data-t="plantel"]'); pa.wait_for_timeout(300); chk(pa,"plantel")
    pa.click('#main [data-a="plNew"]'); pa.wait_for_timeout(200)
    pa.fill('#dlg [name=n]',"9"); pa.fill('#dlg [name=name]',"Rui Costa"); pa.click('#dlg [data-a="mSave"]'); pa.wait_for_timeout(700)
    pl=team_docs("players"); print("atletas na base de dados:", [d["data"].get("name") for d in pl.values()], [d["data"].get("_by") for d in pl.values()])
    if len(pl)!=1 or list(pl.values())[0]["data"].get("_by")!="Ana Martins": errs.append("atleta gravado")
    # convite para o adjunto
    pa.click('nav [data-t="plantel"]'); pa.wait_for_timeout(400)
    txt=pa.inner_text("#main")
    if "Conta e acessos" not in txt or "Ana Martins" not in txt: errs.append("cartão de acessos")
    pa.fill('form[data-sbinv] [name=email]',"carlos@clube.pt"); pa.select_option('form[data-sbinv] [name=role]',"adjunto")
    pa.click('form[data-sbinv] button[type=submit]'); pa.wait_for_timeout(600)
    link=pa.input_value("#sbInvL"); print("convite:", link[-50:])
    if "#convite=" not in link: errs.append("link do convite")
    pa.click('#dlg [data-a="mClose"]'); pa.wait_for_timeout(200)
    if "carlos@clube.pt" not in pa.inner_text("#main"): errs.append("convite na lista")
    pa.screenshot(path=os.path.join(CAP,"t36_acessos.png"),full_page=True)
    # segunda pessoa: abre o link, cria conta (sem confirmação), entra logo na equipa
    SB.confirm=False
    cb=b.new_context(viewport={"width":390,"height":844}); pb=cb.new_page()
    pb.on("pageerror",lambda e:errs.append("PAGEERR B "+str(e)))
    pb.route("https://sb.teste/**",SB.handle)
    pb.goto(URL+"#convite="+link.split("#convite=")[1]); pb.wait_for_timeout(2300)
    g=gate(pb)
    if "convite" not in g.lower(): errs.append("aviso de convite")
    ov=pb.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
    if ov>1: errs.append("entrada: overflow no telemóvel")
    pb.screenshot(path=os.path.join(CAP,"t36_login_m.png"))
    pb.click('#sbGate [data-g="signup"]'); pb.fill('#sbGate [name=name]',"Carlos Adjunto"); pb.fill('#sbGate [name=email]',"carlos@clube.pt"); pb.fill('#sbGate [name=pass]',"outrosegredo")
    pb.click('#sbGate button[type=submit]'); pb.wait_for_timeout(1400); chk(pb,"B painel")
    if pb.query_selector("#sbGate"): errs.append("B não entrou: "+gate(pb)[:120])
    role=[m["role"] for m in SB.members if m["email"]=="carlos@clube.pt"]; print("função de B:", role)
    if role!=["adjunto"]: errs.append("função do convite")
    if pb.evaluate("Object.values(__t.D.players).map(p=>p.name).join()")!="Rui Costa": errs.append("B não vê o atleta")
    # adjunto não altera a configuração: aviso e volta ao valor guardado
    pb.click('nav [data-t="plantel"]'); pb.wait_for_timeout(300)
    inp='input[data-c="meta"][data-f="full"]'; pb.fill(inp,"Hackeado"); pb.press(inp,"Tab"); pb.wait_for_timeout(900)
    t=pb.inner_text("#toast"); print("adjunto na configuração:", t, "|", pb.evaluate("__t.meta().full"))
    if "permissão" not in t: errs.append("aviso de permissão")
    if pb.evaluate("__t.meta().full")!="GD Exemplo — Sub-19": errs.append("configuração não voltou ao valor guardado")
    if "Hackeado" in json.dumps([d["data"] for d in team_docs("meta").values()]): errs.append("servidor aceitou a alteração")
    # adjunto grava um atleta; A recebe na próxima receção
    pb.click('#main [data-a="plNew"]'); pb.wait_for_timeout(200); pb.fill('#dlg [name=name]',"Nuno Gomes"); pb.click('#dlg [data-a="mSave"]'); pb.wait_for_timeout(700)
    pa.evaluate("window.dispatchEvent(new Event('online'))"); pa.wait_for_timeout(700)
    names=pa.evaluate("Object.values(__t.D.players).map(p=>p.name).sort().join()"); print("A recebeu:", names)
    if names!="Nuno Gomes,Rui Costa": errs.append("receção de alterações")
    by=[d["data"].get("_by") for d in team_docs("players").values() if d["data"].get("name")=="Nuno Gomes"]
    if by!=["Carlos Adjunto"]: errs.append("carimbo do adjunto "+str(by))
    # A apaga; B deixa de ver
    pid=pa.evaluate("Object.keys(__t.D.players).find(k=>__t.D.players[k].name==='Nuno Gomes')")
    pa.evaluate("id=>__t.del('players',id)",pid); pa.wait_for_timeout(500)
    pb.evaluate("window.dispatchEvent(new Event('online'))"); pb.wait_for_timeout(700)
    if pb.evaluate("Object.keys(__t.D.players).length")!=1: errs.append("apagado continua em B")
    # fotos: vão para o armazenamento da equipa, não para o documento
    r=pa.evaluate("""async()=>{ const c=document.createElement('canvas'); c.width=c.height=8; const b=await new Promise(r=>c.toBlob(r,'image/png'));
        const x=await __t.saveImg(b); const u=await __t.sImgLoad(x.imgA.slice(3)); return {x, ok:!!u}; }""")
    print("foto:", r)
    if not str(r["x"].get("imgA","")).startswith("sb:") or not r["ok"] or not SB.files: errs.append("foto no armazenamento")
    # sessão expirada a meio: renova sozinha
    SB.expire_all=True
    pa.evaluate("__t.put('players',Object.keys(__t.D.players)[0],{...__t.clone(Object.values(__t.D.players)[0]),n:10})"); pa.wait_for_timeout(900)
    if [d["data"].get("n") for d in team_docs("players").values()]!=[10]: errs.append("gravação depois de renovar a sessão")
    # palavra-passe errada; sair e voltar a entrar
    pa.click('nav [data-t="plantel"]'); pa.wait_for_timeout(200)
    pa.click('#main [data-a="sbOut"]'); pa.wait_for_timeout(200); pa.click('#dlgAsk [data-ask="1"]'); pa.wait_for_timeout(1200)
    if "Entrar" not in gate(pa): errs.append("sair")
    pa.fill('#sbGate [name=email]',"ana@clube.pt"); pa.fill('#sbGate [name=pass]',"errada99"); pa.click('#sbGate button[type=submit]'); pa.wait_for_timeout(300)
    if "errados" not in gate(pa): errs.append("palavra-passe errada: "+gate(pa)[:80])
    pa.fill('#sbGate [name=pass]',"segredo123"); pa.click('#sbGate button[type=submit]'); pa.wait_for_timeout(1200)
    if pa.query_selector("#sbGate") or pa.evaluate("Object.keys(__t.D.players).length")!=1: errs.append("voltar a entrar")
    # recarregar: continua com sessão e equipa
    pa.reload(); pa.wait_for_timeout(1200)
    if pa.query_selector("#sbGate") or "GD Exemplo" not in pa.inner_text("#tTeam"): errs.append("sessão ao recarregar")
    # tema escuro no ecrã de entrada
    cd=b.new_context(viewport={"width":1280,"height":900},color_scheme="dark"); pd=cd.new_page(); pd.route("https://sb.teste/**",SB.handle)
    pd.goto(URL); pd.wait_for_timeout(2300); pd.screenshot(path=os.path.join(CAP,"t36_login_dark.png"))
    b.close()
bad=[l for l in SB.log if l[2]>=500]
if bad: errs.append("simulador: "+str(bad[:3]))
print("ERRORS:",errs)

import os, sys, json, base64
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Tipo de treino e intensidade, semana-tipo por dia, foto de exercício em alta resolução (IndexedDB) e plano de treino em PDF.
errs=[]
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
def LS(pg): return pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1'))")
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":950},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    # semana-tipo com tipo e intensidade por dia
    pg.click('.bar [data-a="weekGen"]'); pg.wait_for_timeout(300)
    mon=pg.input_value('#dlg [name=mon]')
    for o,t,i in [(1,"rec","Baixa"),(2,"fp","Alta"),(3,"res","Muito alta"),(4,"pj","Média")]:
        pg.select_option(f'#dlg [name=tt{o}]',t); pg.select_option(f'#dlg [name=in{o}]',i)
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(400); print("semana:", pg.inner_text("#toast"))
    st=LS(pg); trs=sorted([v for v in st["events"].values() if v["type"]=="treino" and v["date"]>=mon and v["date"]<=mon[:8]+"99"], key=lambda v:v["date"])
    got=[(v["date"],v.get("ttype"),v.get("int")) for v in st["events"].values() if v["type"]=="treino" and v.get("ttype")]
    print("treinos com tipo:", sorted(got))
    if len(got)!=4: errs.append("semana-tipo: tipos não gravados")
    # agenda: cores por tipo e legenda
    pg.click('nav [data-t="agenda"]'); pg.wait_for_timeout(200)
    pg.click('[data-a="calDay"][data-d="'+mon+'"]'); pg.wait_for_timeout(200)
    if pg.inner_text("h2").lower().find(" de ")<0: pass
    n=pg.eval_on_selector_all(".cal .ev.t.typed","e=>e.length"); print("dias com tipo no calendário:", n, "| legenda:", pg.inner_text(".leg")[:120].replace("\n"," "))
    if n<1:
        # a semana pode estar no mês seguinte
        pg.click('[data-a="calNav"][data-n="1"]'); pg.wait_for_timeout(200); n=pg.eval_on_selector_all(".cal .ev.t.typed","e=>e.length"); print("  mês seguinte:", n)
    if n<1: errs.append("calendário sem tipos")
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t14_agenda.png"), full_page=True)
    chk(pg,"agenda")
    # página do treino: mudar tipo, intensidade, clima, objetivos
    tid=[k for k,v in LS(pg)["events"].items() if v["type"]=="treino" and v.get("ttype")=="fp"][0]
    pg.evaluate(f"document.querySelector('[data-a=page][data-id=\"{tid}\"]')||0")
    pg.click('nav [data-t="treinos"]'); pg.wait_for_timeout(200); pg.click(f'[data-a="page"][data-id="{tid}"]'); pg.wait_for_timeout(300); chk(pg,"treino")
    print("etiqueta:", pg.inner_text(".phead .ttype"))
    pg.select_option('select[data-f="ttype"]',"vel"); pg.wait_for_timeout(200)
    pg.select_option('select[data-f="int"]',"Média"); pg.wait_for_timeout(200)
    pg.fill('input[data-f="clima"]',"Quente sem chuva"); pg.click("h2"); pg.wait_for_timeout(200)
    pg.fill('input[data-f="theme"]',"Velocidade de reação"); pg.click("h2"); pg.wait_for_timeout(200)
    pg.click('details summary'); pg.fill('textarea[data-f="objG"]',"Preparar o jogo de domingo"); pg.click("h2"); pg.wait_for_timeout(200)
    pg.fill('textarea[data-f="objE"]',"Reação à perda"); pg.click("h2"); pg.wait_for_timeout(200)
    tr=LS(pg)["events"][tid]; print("gravado:", tr.get("ttype"), tr.get("int"), tr.get("clima"), tr.get("objG"), tr.get("objE"))
    if (tr.get("ttype"),tr.get("int"),tr.get("clima"))!=("vel","Média","Quente sem chuva"): errs.append("campos do treino")
    # plano com 2 exercícios (um com imagem embutida, outro com desenho)
    pg.click('[data-a="exPick"]'); pg.wait_for_timeout(700); pg.click('#pickGrid .pick >> nth=0'); pg.wait_for_timeout(200); pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(300)
    exid=pg.evaluate("Object.entries(JSON.parse(localStorage.getItem('estrela-tecnico-v1')).exercises).find(([k,v])=>v.drw&&v.drw.it&&v.drw.it.length)[0]")
    pg.select_option('select[data-c="planAdd"]',exid); pg.wait_for_timeout(300)
    # foto grande num exercício: vai para o IndexedDB e não para o localStorage
    ex0=LS(pg)["events"][tid]["plan"][0]["ex"]
    big=pg.evaluate("""(()=>{const c=document.createElement('canvas');c.width=2400;c.height=1500;const x=c.getContext('2d');x.fillStyle='#2d7a48';x.fillRect(0,0,2400,1500);x.fillStyle='#fff';for(let i=0;i<40;i++){x.beginPath();x.arc(100+i*55,200+(i%7)*150,20,0,7);x.fill();}return c.toDataURL('image/jpeg',0.9).split(',')[1];})()""")
    pg.click(f'.plan [data-a="exView"][data-id="{ex0}"]'); pg.wait_for_timeout(300)
    with pg.expect_file_chooser() as fc: pg.click('#dlg [data-a="exPhoto"]')
    fc.value.set_files({"name":"foto.jpg","mimeType":"image/jpeg","buffer":base64.b64decode(big)}); pg.wait_for_timeout(1500)
    x=LS(pg)["exercises"][ex0]; print("foto:", pg.inner_text("#toast"), "| imgL:", bool(x.get("imgL")), "| img no documento:", "img" in x)
    w=pg.evaluate("new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth);i.src=document.querySelector('#dlg .dlg-b img').src;})"); print("largura guardada:", w)
    if not x.get("imgL") or w<1700: errs.append("foto não guardada em alta resolução")
    pg.click('#dlg [data-a="mClose"]'); pg.wait_for_timeout(200)
    # depois de recarregar, a foto continua lá
    pg.reload(); pg.wait_for_timeout(1500)
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="ex"]'); pg.wait_for_timeout(300)
    ok=pg.evaluate(f"(()=>{{const b=[...document.querySelectorAll('.ex')].find(e=>e.dataset.a==='exView'&&e.dataset.id==='{ex0}'); const i=b&&b.querySelector('img'); return !!(i&&i.src.startsWith('blob:'));}})()"); print("foto depois de recarregar:", ok)
    if not ok: errs.append("foto perdida ao recarregar")
    # plano em PDF (descarregado): imagens embutidas, sem blob:
    pg.click('[data-a="tsub"][data-k="sessoes"]'); pg.click(f'[data-a="page"][data-id="{tid}"]'); pg.wait_for_timeout(300)
    pg.click('[data-a="prPlan"]'); pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click('#dlg [data-a="prGo"][data-k="dl"]')
    html=open(d.value.path()).read()
    print("PDF: blocos", html.count('class="blk"'), "| svg", html.count("<svg"), "| blob:", "blob:" in html, "| tipo/int/clima:", all(t in html for t in ["Velocidade","Média","Quente sem chuva","Preparar o jogo de domingo","Reação à perda","Nº Jogadores"]))
    if html.count('class="blk"')!=2 or "blob:" in html: errs.append("PDF do plano")
    p2=ctx.new_page(); p2.set_content(html.replace("https://fonts.googleapis.com","https://0.invalid")); p2.wait_for_timeout(500)
    p2.screenshot(path=os.path.join(ROOT,"tests","capturas","t14_plano.png"), full_page=True)
    p2.pdf(path=os.path.join(ROOT,"tests","capturas","t14_plano.pdf"), format="A4", print_background=True); print("páginas:", open(os.path.join(ROOT,"tests","capturas","t14_plano.pdf"),"rb").read().count(b"/Type /Page\n")+open(os.path.join(ROOT,"tests","capturas","t14_plano.pdf"),"rb").read().count(b"/Type /Page>>")); p2.close()
    # abrir numa aba continua a funcionar
    pg.click('[data-a="prPlan"]'); pg.wait_for_timeout(200)
    with ctx.expect_page() as pop: pg.click('#dlg [data-a="prGo"][data-k="open"]')
    p3=pop.value; p3.wait_for_timeout(1200); print("aba:", p3.title()); p3.close()
    # cópia exportada leva a foto dentro
    pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click('[data-a="export"]')
    cp=json.load(open(d.value.path())); xe=cp["exercises"][ex0]; print("cópia com foto:", str(xe.get("img",""))[:23], "| sem imgL:", "imgL" not in xe)
    if not str(xe.get("img","")).startswith("data:image") or "imgL" in xe: errs.append("exportação da foto")
    # novo treino com tipo
    pg.click('nav [data-t="painel"]'); pg.click('.bar [data-a="newEvent"][data-type="treino"]'); pg.wait_for_timeout(200)
    pg.select_option('#dlg [name=ttype]',"pj"); pg.select_option('#dlg [name=int]',"Baixa"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    print("novo treino:", pg.inner_text(".phead .ttype")); chk(pg,"novo treino")
    pg.set_viewport_size({"width":390,"height":844}); pg.click('nav [data-t="agenda"]'); pg.wait_for_timeout(300); chk(pg,"agenda telemóvel")
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t14_agenda_tlm.png"))
    b.close()
print("ERRORS",errs)

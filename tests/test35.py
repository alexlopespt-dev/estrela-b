import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Plantel → Esquema tático: criar, preencher vazios, escolher atleta/função/missão numa posição (com troca), mudar a formação
# (atletas mantêm-se), mover posições a arrastar, duplicar, imagem PNG, apagar; telemóvel e tema escuro; dados antigos sem "tactics".
errs=[]
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
def all_(pg): return pg.evaluate("JSON.parse(localStorage.getItem('estrela-tecnico-v1')).tactics||{}")
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900},accept_downloads=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    # dados antigos sem a coleção tactics
    pg.evaluate("(()=>{const d=JSON.parse(localStorage.getItem('estrela-tecnico-v1'));delete d.tactics;localStorage.setItem('estrela-tecnico-v1',JSON.stringify(d));})()")
    pg.reload(); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(200)
    pg.click('[data-a="plsub"][data-k="tat"]'); pg.wait_for_timeout(200); chk(pg,"vazio")
    if "Ainda sem esquemas" not in pg.inner_text("#main"): errs.append("estado vazio")
    pg.click('#main [data-a="tacNew"] >> nth=0'); pg.wait_for_timeout(300); chk(pg,"novo")
    n=len(pg.query_selector_all("svg.tac g.ts")); print("posições 4-2-3-1:", n)
    if n!=11: errs.append("11 posições")
    pg.click('[data-a="tacFill"]'); pg.wait_for_timeout(300); print("toast:", pg.inner_text("#toast"))
    T=list(all_(pg).values())[0]; filled={k:v.get("p") for k,v in T["sl"].items()}; print("preenchido:", sum(1 for v in filled.values() if v))
    if sum(1 for v in filled.values() if v)<10: errs.append("preencher vazios")
    pids=[v for v in filled.values() if v]
    if len(set(pids))!=len(pids): errs.append("atleta repetido")
    gr=pg.evaluate("id=>JSON.parse(localStorage.getItem('estrela-tecnico-v1')).players[id].pos", filled["GR"]); print("GR:", gr)
    if gr!="GR": errs.append("GR não é guarda-redes")
    pg.screenshot(path=os.path.join(CAP,"t35_tat.png"),full_page=True)
    # posição MOE: escolher o atleta que está no PL (troca), função EI, missão ataque, instruções
    pg.click('svg.tac g.ts[data-k="MOE"]'); pg.wait_for_timeout(200)
    pg.select_option('#dlg [name="p"]', filled["PL"]); pg.select_option('#dlg [name="r"]',"EI")
    pg.click('#dlg .tac-du label:has-text("Ataque")'); pg.fill('#dlg [name="ins"]',"ataca a profundidade")
    pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300); chk(pg,"slot")
    T=list(all_(pg).values())[0]; moe=T["sl"]["MOE"]; print("MOE:", moe, "PL:", T["sl"]["PL"].get("p"))
    if moe.get("p")!=filled["PL"] or moe.get("r")!="EI" or moe.get("d")!="ata" or moe.get("ins")!="ataca a profundidade": errs.append("gravar posição")
    if T["sl"]["PL"].get("p")!=filled["MOE"]: errs.append("troca de atletas")
    txt=pg.eval_on_selector('svg.tac g.ts[data-k="MOE"]','e=>e.textContent'); print("cartão:", txt.replace("\n"," | "))
    if "EI - Ata" not in " ".join(txt.split()): errs.append("texto da função")
    # formação 4-4-2: 11 posições, nenhum atleta perdido
    before=set(p for p in (v.get("p") for v in T["sl"].values()) if p)
    pg.select_option('select[data-c="tacForm"]',"4-4-2"); pg.wait_for_timeout(300); chk(pg,"442")
    T=list(all_(pg).values())[0]; after=set(p for p in (v.get("p") for v in T["sl"].values()) if p); print("4-4-2:", T["form"], len(T["sl"]), len(before), len(after))
    if T["form"]!="4-4-2" or len(T["sl"])!=11 or after!=before: errs.append("mudar formação")
    # 3-5-2 e volta, todas as formações desenham sem erro
    for f in ["3-5-2","4-3-3","5-3-2","3-4-3","4-1-4-1","4-3-1-2","5-4-1","4-2-3-1"]:
        pg.select_option('select[data-c="tacForm"]',f); pg.wait_for_timeout(150); chk(pg,f)
        n=len(pg.query_selector_all("svg.tac g.ts"))
        if n!=11: errs.append(f"{f}: {n} posições")
        # cartões não se sobrepõem
        ov=pg.evaluate("""(()=>{const r=[...document.querySelectorAll('svg.tac g.ts rect')].map(e=>e.getBoundingClientRect());let n=0;for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){const a=r[i],b=r[j];if(a.left<b.right-2&&b.left<a.right-2&&a.top<b.bottom-2&&b.top<a.bottom-2)n++;}return n;})()""")
        if ov: errs.append(f"{f}: {ov} cartões sobrepostos")
    T=list(all_(pg).values())[0]
    if len(set(p for p in (v.get("p") for v in T["sl"].values()) if p))!=len(before): errs.append("atletas perdidos nas mudanças")
    # mover posições
    pg.click('[data-a="tacMove"]'); pg.wait_for_timeout(200)
    pg.query_selector('svg.tac g.ts[data-k="PL"] path').scroll_into_view_if_needed(); pg.wait_for_timeout(100)
    bb=pg.query_selector('svg.tac g.ts[data-k="PL"] path').bounding_box()
    pg.mouse.move(bb["x"]+bb["width"]/2,bb["y"]+bb["height"]/2); pg.mouse.down(); pg.mouse.move(bb["x"]+60,bb["y"]+40,steps=5); pg.mouse.up(); pg.wait_for_timeout(300)
    T=list(all_(pg).values())[0]; print("PL movido:", T["sl"]["PL"])
    if T["sl"]["PL"].get("x") is None: errs.append("arrastar")
    if pg.is_visible("#dlg"): errs.append("abriu janela ao arrastar")
    pg.click('[data-a="tacReset"]'); pg.wait_for_timeout(200)
    T=list(all_(pg).values())[0]
    if T["sl"]["PL"].get("x") is not None: errs.append("repor posições")
    pg.click('[data-a="tacMove"]'); pg.wait_for_timeout(200)
    # nome
    pg.fill('input[data-f="name"][data-col="tactics"]',"Bloco médio"); pg.press('input[data-f="name"][data-col="tactics"]',"Tab"); pg.wait_for_timeout(200)
    # imagem
    with pg.expect_download() as dl: pg.click('[data-a="tacPng"]')
    p=dl.value.path(); sz=os.path.getsize(p); print("png:", dl.value.suggested_filename, sz//1024, "KB")
    if not dl.value.suggested_filename.endswith(".png") or sz<20000: errs.append("imagem")
    import shutil; shutil.copy(p, os.path.join(CAP,"t35_tat.png.png"))
    # duplicar e escolher
    pg.click('[data-a="tacCopy"]'); pg.wait_for_timeout(300); chk(pg,"copia")
    chips=pg.eval_on_selector_all('[data-a="tacPick"]','e=>e.map(x=>x.innerText)'); print("esquemas:", chips)
    if "Bloco médio (cópia)" not in chips: errs.append("duplicar")
    # "Últimas alterações" conhece a coleção
    # telemóvel
    pg.set_viewport_size({"width":390,"height":844}); pg.wait_for_timeout(300)
    ov=pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); print("overflow 390:", ov)
    if ov>1: errs.append("overflow telemóvel")
    pg.screenshot(path=os.path.join(CAP,"t35_tat_m.png"),full_page=True)
    pg.set_viewport_size({"width":1280,"height":900}); pg.emulate_media(color_scheme="dark"); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(CAP,"t35_tat_dark.png"))
    # apagar a cópia
    pg.click('[data-a="tacDel"]'); pg.wait_for_timeout(200); pg.click('#dlgAsk [data-ask="1"]'); pg.wait_for_timeout(300)
    print("depois de apagar:", len(all_(pg)))
    if len(all_(pg))!=1: errs.append("apagar")
    # persistência após recarregar
    pg.reload(); pg.wait_for_timeout(1200); pg.click('nav [data-t="plantel"]'); pg.wait_for_timeout(200)
    pg.click('[data-a="plsub"][data-k="tat"]'); pg.wait_for_timeout(300)
    if not pg.query_selector("svg.tac") or "Bloco médio" not in pg.input_value('input[data-f="name"][data-col="tactics"]'): errs.append("não ficou guardado")
    b.close()
print("ERRORS:",errs)

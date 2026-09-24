import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
# Modelo de jogo 2026/27 (do PowerPoint): entra uma vez, sem repetir princípios já existentes, propostas marcadas,
# editar tira a marca, e os subprincípios ficam ligados ao princípio certo.
errs=[]
LSK="estrela-tecnico-v1"
MJ=json.load(open(os.path.join(ROOT,"data","modelo_jogo_2627.json")))
seed=json.load(open(os.path.join(ROOT,"data","seed_local.json")))
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":950})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(700)
    # browser com um princípio já criado à mão com o mesmo nome ("Conter", na transição defensiva)
    d=json.loads(json.dumps(seed)); d["meta"]["mig"]={"cal2627":"x","plantel_mon1":"x","exlib129":"x","staffdup1":"x","ex2609":"x"}
    d["principles"]={"pr_meu":{"name":"conter","moment":"trd","parent":"","desc":"meu","order":0}}
    pg.evaluate(f"localStorage.setItem('{LSK}',JSON.stringify({json.dumps(d)}))"); pg.reload(); pg.wait_for_timeout(1200)
    print("aviso:", pg.inner_text("#toast"))
    P=pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}')).principles")
    print("princípios:", len(P), "| propostas:", sum(1 for p in P.values() if p.get("prop")))
    if len(P)!=len(MJ): errs.append(f"contagem {len(P)} vs {len(MJ)}")
    if "mj_td_conter" in P or P["mj_td_c1"]["parent"]!="pr_meu": errs.append("repetiu ou subprincípio mal ligado")
    if P["mj_oo_c1"]["parent"]!="mj_oo_comuns" or P["mj_oo_c1"]["moment"]!="oo" or P["mj_bp_co"]["moment"]!="fbp": errs.append("estrutura")
    pg.reload(); pg.wait_for_timeout(1000)
    if len(pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}')).principles"))!=len(P): errs.append("correu duas vezes")
    pg.click('nav [data-t="treinos"]'); pg.click('[data-a="tsub"][data-k="modelo"]'); pg.wait_for_timeout(500)
    print("tags Proposta:", pg.eval_on_selector_all('#main .tag.warn:has-text("Proposta")',"e=>e.length"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","t25_modelo.png"), full_page=True)
    # editar uma proposta tira a marca
    pg.click('[data-a="prEdit"][data-id="mj_to_r1"]'); pg.wait_for_timeout(300); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(300)
    x=pg.evaluate(f"JSON.parse(localStorage.getItem('{LSK}')).principles.mj_to_r1"); print("depois de guardar:", x.get("prop"), x["parent"])
    if x.get("prop") or x["parent"]!="mj_to_rec": errs.append("editar proposta")
    # num treino: escolher princípio num bloco conta para o gráfico
    b.close()
print("ERRORS",errs)

import os, json, subprocess
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas"); os.makedirs(CAP,exist_ok=True)
from playwright.sync_api import sync_playwright
# Monitorização → "Respostas do dia": bem-estar e PSE tal como vieram dos formulários (resumo do Sheets com "respostas"),
# escolha do dia, contagens risco/atenção/OK, quem não respondeu, nome escrito de outra forma; script antigo sem respostas;
# e as funções do Apps Script (carimbo em número de série, respostasApp_, "Luís.A." = "Luís A.").
errs=[]
# --- Apps Script (node, com Utilities simulado)
js=r"""
const fs=require('fs'), vm=require('vm');
const pad=n=>String(n).padStart(2,'0');
const ctx={Utilities:{formatDate:(d,tz,f)=>f==='HH:mm'?pad(d.getHours())+':'+pad(d.getMinutes()):d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),ctx);
const r=vm.runInContext(`[
  chave_(dia_(46292.44449)), hora_(46292.44449), chave_(dia_('2026/09/28 12:26:52')), hora_('2026/09/28 12:26:52'),
  chave_(dia_('29/09/2026 07:04')), dia_(''), dia_(5), chave_(dia_(new Date(2026,8,29,7,4))),
  chaveNome_('Luís.A.')===chaveNome_('Luís A.'), chaveNome_('Rafa S.')===chaveNome_('Rafa S'),
  JSON.stringify(respostasApp_({agora:new Date(2026,8,29),bem:[
     {chave:'2026-09-29',hora:'07:04',jogador:'Luís A.',nomeBruto:'Luís.A.',sono:4,fadiga:4,dor:5,stress:4,txt:['4 - Bom','4 - Bem','5 - Sem Dor','4 - Tranquilo']},
     {chave:'2026-09-29',hora:'06:31',jogador:'Hugo R.',nomeBruto:'Hugo R.',sono:2,fadiga:3,dor:3,stress:4,txt:[]},
     {chave:'2026-09-20',hora:'09:00',jogador:'Velho',nomeBruto:'Velho',sono:4,fadiga:4,dor:4,stress:4}],
   pse:[{chave:'2026-09-27',hora:'18:00',jogador:'Pirlo',nomeBruto:'Pirlo',tipo:'Jogo',duracao:90,rpe:8,sRPE:720,sensacao:'Bem'}]}))
]`,ctx);
console.log(JSON.stringify(r));
"""
import tempfile
JS=os.path.join(tempfile.gettempdir(),"_t34.js"); open(JS,"w").write(js)
out=subprocess.run(["node",JS,os.path.join(ROOT,"tools/apps-script/monitorizacao_completo.gs")],capture_output=True,text=True)
print("gs:",out.stdout.strip()[:400], out.stderr[:300])
try:
    r=json.loads(out.stdout)
    exp=["2026-09-27","10:40","2026-09-28","12:26","2026-09-29",None,None,"2026-09-29",True,True]
    for i,e in enumerate(exp):
        if r[i]!=e: errs.append(f"gs {i}: {r[i]!r} != {e!r}")
    ra=json.loads(r[10])
    if [x["n"] for x in ra["bem"]]!=["Hugo R.","Luís A."]: errs.append("respostasApp_ bem "+str(ra["bem"]))
    if len(ra["pse"])!=1 or ra["pse"][0]["c"]!=720: errs.append("respostasApp_ pse")
except Exception as e: errs.append("gs "+str(e))

BASE=json.load(open(os.path.join(ROOT,"tests","monitorizacao_exemplo.json")))
URL="https://script.google.com/macros/s/TESTE/exec"
FIX={"d":json.loads(json.dumps(BASE))}
FIX["d"].pop("respostas",None)
def handler(route):
    route.fulfill(status=200, body=json.dumps(FIX["d"]), headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"})
def chk(pg,label):
    if pg.evaluate("document.querySelector('#main').innerText.includes('Algo correu mal')"): errs.append("RENDER FAIL: "+label)
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900}); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.route("https://script.google.com/**", handler)
    pg.clock.set_fixed_time("2026-09-23T10:00:00")
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(1200)
    pg.click('nav [data-t="mon"]'); pg.wait_for_timeout(200)
    pg.click('.bar [data-a="monCfg"]'); pg.wait_for_timeout(200)
    pg.fill('#dlg [name=url]',URL); pg.fill('#dlg [name=key]',"certa"); pg.click('#dlg [data-a="mSave"]'); pg.wait_for_timeout(1000); chk(pg,"mon")
    # script antigo: sem respostas -> explica o que fazer
    pg.click('[data-a="monV"][data-k="resp"]'); pg.wait_for_timeout(200); chk(pg,"resp antigo")
    t=pg.inner_text("#main"); print("antigo:", "ainda não envia" in t)
    if "ainda não envia" not in t: errs.append("aviso script antigo")
    # script novo
    FIX["d"]=BASE
    pg.click('.bar [data-a="monRefresh"]'); pg.wait_for_timeout(1000); chk(pg,"resp")
    chips=pg.eval_on_selector_all('[data-a="monDia"]','e=>e.map(x=>x.innerText+(x.classList.contains("on")?"*":""))'); print("dias:", chips)
    if not chips or chips[0]!="Hoje*" or "Ontem" not in chips: errs.append("chips dos dias")
    k=pg.inner_text('.kpi:has-text("Risco / atenção")').replace("\n"," "); print("kpi:", k)
    nb=len(pg.query_selector_all('table.resp >> nth=0 >> tbody tr')); np_=len(pg.query_selector_all('table.resp >> nth=1 >> tbody tr'))
    hoje=[x for x in BASE["respostas"]["bem"] if x["d"]=="2026-09-23"]; hp=[x for x in BASE["respostas"]["pse"] if x["d"]=="2026-09-23"]
    print("linhas:", nb, np_, "esperado", len(hoje), len(hp))
    if nb!=len(hoje) or np_!=len(hp): errs.append("linhas das tabelas")
    tots=[sum(x["i"]) for x in hoje]; r_=sum(1 for v in tots if v<=12); a_=sum(1 for v in tots if 13<=v<=16); o_=sum(1 for v in tots if v>=17)
    if f"{r_} / {a_} / {o_}" not in k: errs.append(f"contagens {k} vs {r_}/{a_}/{o_}")
    t=pg.inner_text("#main")
    for s in ["Sem resposta:","escreveu “Luís.A.”","Bom","Sem PSE:"]:
        if s not in t: errs.append("falta "+s)
    pg.screenshot(path=os.path.join(CAP,"t34_resp.png"),full_page=True)
    # outro dia
    pg.click('[data-a="monDia"]:has-text("Ontem")'); pg.wait_for_timeout(200); chk(pg,"ontem")
    ont=[x for x in BASE["respostas"]["bem"] if x["d"]=="2026-09-22"]
    n=len(pg.query_selector_all('table.resp >> nth=0 >> tbody tr')); print("ontem:", n, len(ont))
    if n!=len(ont): errs.append("linhas de ontem")
    # voltar à prontidão e à sub-aba de novo (fica o dia escolhido)
    pg.click('[data-a="monV"][data-k=""]'); pg.wait_for_timeout(200)
    if not pg.query_selector("table.tb.mon:not(.resp)"): errs.append("tabela da prontidão")
    # telemóvel: sem deslocamento horizontal da página
    pg.set_viewport_size({"width":390,"height":844}); pg.click('[data-a="monV"][data-k="resp"]'); pg.wait_for_timeout(300)
    ov=pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); print("overflow 390:", ov)
    if ov>1: errs.append("overflow no telemóvel")
    pg.screenshot(path=os.path.join(CAP,"t34_resp_m.png"))
    # tema escuro
    pg.set_viewport_size({"width":1280,"height":900}); pg.emulate_media(color_scheme="dark"); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(CAP,"t34_resp_dark.png"))
    b.close()
print("ERRORS:",errs)

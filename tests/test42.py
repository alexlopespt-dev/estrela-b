import os, json, subprocess, urllib.request, urllib.parse, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Folha do PSE com dois separadores: um antigo grande (sem formulário) e o ligado ao formulário (menos respostas).
# A resposta dada na app do atleta tem de ir para o separador ligado ao formulário (onde a equipa olha) — antes ia para
# o com mais respostas; a monitorização lê o mesmo separador; o diagnóstico diz o ficheiro, o separador e a linha.
errs=[]
KEY="BbcqfGe2wAsSXYXG8r8Cnbfa"; PORT=8794
ID_BEM="1w5BTGC_4J8565aigffuRKRFSeAOsqKK4WDgNnaAo8II"; ID_PSE="1lnH3j_dXdFSOw-6Ak9CdtRpWWjm1MIvJBEToQowX_3Q"
srv=subprocess.Popen(["node",os.path.join(ROOT,"tests","gas_servidor.js"),str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
assert "pronto" in srv.stdout.readline()
BASE=f"http://127.0.0.1:{PORT}"
def estado(): return json.loads(urllib.request.urlopen(BASE+"/__estado").read())
def prep(p): urllib.request.urlopen(urllib.request.Request(BASE+"/__prep",data=json.dumps(p).encode(),method="POST")).read()
def post(p): return json.loads(urllib.request.urlopen(urllib.request.Request(BASE+"/exec",data=json.dumps(p).encode(),method="POST")).read())
def get(q): return json.loads(urllib.request.urlopen(BASE+"/exec?"+urllib.parse.urlencode(q)).read())
T=datetime.date.today(); iso=lambda d: d.isoformat(); hoje=iso(T)
dia=lambda n: iso(T+datetime.timedelta(days=n)).replace("-","/")
TOK="tokMiguelV_abcdefghijklm"
H_BEM=["Carimbo de data/hora","Nome do Jogador","Qualidade do sono","Fadiga Geral","Dor Muscular","Stress"]
H_PSE=["Carimbo de data/hora","Nome do Jogador","Tipo de sessão","Duração da sessão","Quão intenso foi o treino? (PSE)","Como te sentes?"]
try:
  post({"a":"x"}); urllib.request.urlopen(BASE+"/__run?f=prepararDadosApp").read()
  antigo=[H_PSE]+[[dia(-40+i)+" 21:00:00","Rui","Treino","01:30:00","6 - Difícil","Bem"] for i in range(12)]   # 12 respostas antigas
  novo=[H_PSE,[dia(-1)+" 21:00:00","Rui","Treino","01:30:00","7 - Muito difícil","Cansado"],[hoje.replace("-","/")+" 07:00:00","Rui","Treino","01:00:00","5 - Moderado","Bem"]]
  prep({"nomes":["Miguel V.","Rui"],"respostas":[
    {"id":ID_BEM,"nome":"respostas","form":True,"linhas":[H_BEM,[dia(-1)+" 08:00:00","Rui","4 - Bom","4 - Bem","4 - Pouca Dor","4 - Tranquilo"]]},
    {"id":ID_PSE,"nome":"respostas","folha":"Respostas ao formulário 1","linhas":antigo,"outros":[{"folha":"Respostas ao formulário 2","form":True,"linhas":novo}]}]})
  ops=[{"c":"players","i":"mv","d":{"name":"Miguel Valério","n":8,"pos":"MC","atk":TOK}},{"c":"players","i":"ru","d":{"name":"Rui","n":1,"pos":"GR"}},
       {"c":"meta","i":"team","d":{"team":"Estrela B"}},
       {"c":"events","i":"tr_hoje","d":{"type":"treino","date":hoje,"time":"00:00","dur":75,"att":{}}}]
  print("dados:", post({"k":KEY,"a":"push","ops":ops}).get("ok"))
  r=post({"a":"atleta_pse","t":TOK,"tipo":"Treino","dur":75,"rpe":6}); print("PSE pela app:", r)
  if not r.get("ok"): errs.append("PSE não gravado "+json.dumps(r))
  tabs=estado()["respTabs"][ID_PSE]
  f1=tabs["Respostas ao formulário 1"]; f2=tabs["Respostas ao formulário 2"]
  print("separador antigo:", len(f1), "linhas | ligado ao formulário:", len(f2), "linhas | última:", f2[-1][:5])
  if len(f1)!=13: errs.append("escreveu no separador antigo (sem formulário)")
  if len(f2)!=4 or f2[3][1]!="Miguel V." or not str(f2[3][4]).startswith("6"): errs.append("não escreveu no separador ligado ao formulário")
  # a app do atleta vê-a (lê do mesmo separador) e não deixa responder outra vez
  a=get({"a":"atleta","t":TOK}); print("app vê o PSE de hoje:", a["respostas"]["pse"])
  if not a["respostas"]["pse"]: errs.append("a app não vê o PSE gravado")
  if post({"a":"atleta_pse","t":TOK,"tipo":"Treino","dur":75,"rpe":6}).get("erro")!="ja": errs.append("segunda resposta aceite")
  # diagnóstico da equipa técnica: ficheiro, separador e linha
  dg=get({"a":"atletas_diag","k":KEY}); fo=dg.get("fontes",{}).get("pse",{}); hj=[h for h in dg.get("hoje",[]) if h["t"]=="pse"]
  print("diagnóstico:", fo.get("separador"), "| ligado:", fo.get("form"), "| outros:", [(o["nome"],o["n"]) for o in fo.get("outros",[])])
  print("hoje:", hj)
  if dg.get("erros"): errs.append("erros no diagnóstico "+json.dumps(dg["erros"]))
  if fo.get("separador")!="Respostas ao formulário 2" or not fo.get("form") or [o["nome"] for o in fo.get("outros",[])]!=["Respostas ao formulário 1"]: errs.append("diagnóstico do separador")
  mv=[h for h in hj if h["pid"]=="mv"]
  if len(mv)!=1 or mv[0]["linha"]!=4 or mv[0]["escrito"]!="Miguel V.": errs.append("diagnóstico da linha de hoje "+json.dumps(hj))
finally:
  srv.kill()
print("ERRORS",errs)
